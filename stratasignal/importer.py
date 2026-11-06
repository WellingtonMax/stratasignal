"""Explicit, bounded operational CSV mapping for the local workbench."""

import csv
import hashlib
import io
import json
import re
from datetime import datetime

from .schema import MAX_BYTES, MAX_POSITIONS, MAX_ORDERS, MAX_EVIDENCE, InputError, fields, identifier, text_value, unique_object, validate_bundle

TABLE_FIELDS = {
    "positions": ("material", "material_name", "supplier", "origin_country", "allocation_share", "monthly_demand_kg", "stock_kg", "nominal_lead_days", "unit_cost_usd"),
    "orders": ("id", "material", "supplier", "origin_country", "ordered_on", "promised_on", "received_on", "quantity_kg"),
    "evidence": ("id", "material", "supplier", "origin_country", "observed_on", "issued_on", "expires_on", "sha256"),
}
TABLE_LIMITS = {"positions": MAX_POSITIONS, "orders": MAX_ORDERS, "evidence": MAX_EVIDENCE}
NUMERIC = {"allocation_share", "monthly_demand_kg", "stock_kg", "nominal_lead_days", "unit_cost_usd", "quantity_kg"}
DATES = {"ordered_on", "promised_on", "received_on", "observed_on", "issued_on", "expires_on"}
NULLABLE = {"received_on", "issued_on", "expires_on"}
DOT_NUMBER = re.compile(r"[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:[eE][+-]?\d{1,3})?\Z")
COMMA_NUMBER = re.compile(r"[+-]?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?\Z")


def bounded_text(value):
    if not isinstance(value, str) or not value.strip() or len(value.encode("utf-8")) > MAX_BYTES:
        raise InputError("Arquivo vazio ou maior que 16 MiB")
    return value.lstrip("\ufeff")


def parse_json_text(value):
    raw = bounded_text(value)
    try:
        data = json.loads(raw, object_pairs_hook=unique_object,
                          parse_constant=lambda _: (_ for _ in ()).throw(InputError("Número não finito")))
    except (ValueError, RecursionError) as exc:
        raise InputError("JSON inválido, com chaves duplicadas ou números não finitos") from exc
    validate_bundle(data)
    return data


def csv_records(value, table, delimiter):
    if not isinstance(table, str) or table not in TABLE_FIELDS or delimiter not in (";", ",", "\t"):
        raise InputError("Tabela ou separador CSV inválido")
    raw = bounded_text(value)
    try:
        reader = csv.reader(io.StringIO(raw, newline=""), delimiter=delimiter, strict=True)
        headers = [h.strip() for h in next(reader)]
        if not headers or len(headers) > 64 or len(set(headers)) != len(headers):
            raise InputError("CSV requer cabeçalhos únicos; máximo de 64 colunas")
        for header in headers:
            text_value(header, 120)
        records = []
        for row in reader:
            if not row or all(not value.strip() for value in row):
                continue
            if len(row) != len(headers):
                raise InputError(f"Linha {reader.line_num}: quantidade de campos diferente do cabeçalho")
            if len(records) >= TABLE_LIMITS[table]:
                raise InputError(f"Limite de {TABLE_LIMITS[table]} registros na tabela {table}")
            records.append((reader.line_num, dict(zip(headers, row))))
    except (csv.Error, StopIteration) as exc:
        raise InputError("CSV vazio ou malformado; confira separador e aspas") from exc
    if not records:
        raise InputError("CSV sem registros")
    return headers, records


def preview_csv(value, table, delimiter):
    headers, records = csv_records(value, table, delimiter)
    return {"columns": headers, "rows": [r for _, r in records[:5]], "row_count": len(records),
            "fields": list(TABLE_FIELDS[table]), "nullable_fields": sorted(set(TABLE_FIELDS[table]) & NULLABLE)}


def numeric(value, number_format, percent=False):
    value = value.strip()
    if value.endswith("%"):
        if not percent:
            raise InputError("Selecione a unidade percentual para valores com %")
        value = value[:-1].strip()
    pattern = DOT_NUMBER if number_format == "decimal_dot" else COMMA_NUMBER
    if not pattern.fullmatch(value):
        raise InputError("Número incompatível com o formato selecionado")
    normalized = value.replace(",", "") if number_format == "decimal_dot" else value.replace(".", "").replace(",", ".")
    parsed = float(normalized)
    if not (-1e15 <= parsed <= 1e15):
        raise InputError("Número não finito ou fora dos limites")
    return parsed / 100 if percent else parsed


def mapped_table(spec, table):
    fields(spec, ("text", "delimiter", "mapping", "number_format", "date_format", "allocation_unit"))
    headers, records = csv_records(spec["text"], table, spec["delimiter"])
    mapping = spec["mapping"]
    if not isinstance(mapping, dict) or set(mapping) != set(TABLE_FIELDS[table]):
        raise InputError("Mapeie todos os campos da tabela selecionada")
    if spec["number_format"] not in ("decimal_dot", "decimal_comma") or spec["date_format"] not in ("iso", "br") or spec["allocation_unit"] not in ("fraction", "percent"):
        raise InputError("Formato de número, data ou participação inválido")
    used = []
    for field, column in mapping.items():
        if column is None and field in NULLABLE:
            continue
        if not isinstance(column, str) or column not in headers:
            raise InputError("Uma coluna selecionada não existe no arquivo")
        used.append(column)
    if len(used) != len(set(used)):
        raise InputError("Uma coluna não pode representar dois campos distintos")
    result = []
    for line, record in records:
        converted = {}
        for field in TABLE_FIELDS[table]:
            column = mapping[field]
            value = record[column].strip() if column is not None else ""
            try:
                if not value and field in NULLABLE:
                    converted[field] = None
                elif field in NUMERIC:
                    converted[field] = numeric(value, spec["number_format"], field == "allocation_share" and spec["allocation_unit"] == "percent")
                elif field in DATES and spec["date_format"] == "br":
                    if not re.fullmatch(r"\d{2}/\d{2}/\d{4}", value):
                        raise InputError("Use DD/MM/AAAA")
                    converted[field] = datetime.strptime(value, "%d/%m/%Y").date().isoformat()
                else:
                    converted[field] = value
            except (ValueError, OverflowError) as exc:
                message = str(exc) if isinstance(exc, InputError) else "Valor inválido para o formato escolhido"
                raise InputError(f"{table}, linha {line}, campo {field}: {message}") from exc
        result.append(converted)
    return result


def bundle_from_csv(payload):
    fields(payload, ("portfolio_id", "as_of", "dataset_kind", "tables"))
    identifier(payload["portfolio_id"])
    tables = payload["tables"]
    fields(tables, ("positions",), ("orders", "evidence"))
    bundle = {"schema_version": 1, "portfolio_id": payload["portfolio_id"], "as_of": payload["as_of"],
              "dataset_kind": payload["dataset_kind"], "positions": mapped_table(tables["positions"], "positions"),
              "orders": mapped_table(tables["orders"], "orders") if "orders" in tables else [],
              "evidence": mapped_table(tables["evidence"], "evidence") if "evidence" in tables else []}
    validate_bundle(bundle)
    return bundle


def normalized_json(bundle):
    raw = json.dumps(bundle, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    if len(raw.encode("utf-8")) > MAX_BYTES:
        raise InputError("Conjunto normalizado excede 16 MiB")
    return raw


def fingerprint(bundle):
    return hashlib.sha256(normalized_json(bundle).encode("utf-8")).hexdigest()
