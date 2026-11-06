"""Streaming adapter for the MDIC's documented semicolon-delimited public CSV."""

import csv
import hashlib
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from .schema import InputError, day, fields, number, rows

SOURCE_PAGE = "https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/estatisticas/base-de-dados-bruta"
MAX_SOURCE_BYTES = 512 * 1024 * 1024
MAX_SOURCE_ROWS = 5_000_000


def month(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}", value):
        raise InputError("Mês deve usar AAAA-MM")
    day(value + "-01")
    return value


def validate_query(ncm, start, end, flow):
    if not isinstance(ncm, str) or not re.fullmatch(r"\d{8}", ncm):
        raise InputError("NCM deve ter oito dígitos")
    month(start)
    month(end)
    span = (int(end[:4]) - int(start[:4])) * 12 + int(end[5:]) - int(start[5:])
    if not 0 <= span < 60 or flow not in ("import", "export"):
        raise InputError("Fluxo inválido ou período fora de 1–60 meses")


def import_comex(path, ncm, start, end, flow="import"):
    """No URLs, downloads, credentials, or customer data transmission."""
    validate_query(ncm, start, end, flow)
    digest = hashlib.sha256()
    groups = defaultdict(lambda: [0.0, 0.0])
    matched = 0
    with Path(path).open("rb") as stream:
        total_bytes = 0

        def lines():
            nonlocal total_bytes
            first = True
            while True:
                line = stream.readline(8193)
                if not line:
                    return
                total_bytes += len(line)
                if total_bytes > MAX_SOURCE_BYTES or len(line) > 8192:
                    raise InputError("Arquivo Comex excede o limite de bytes ou tamanho de linha")
                digest.update(line)
                try:
                    yield line.decode("utf-8-sig" if first else "utf-8")
                except UnicodeError as exc:
                    raise InputError("CSV público deve estar em UTF-8; campos documentados são numéricos") from exc
                first = False

        reader = csv.DictReader(lines(), delimiter=";", strict=True)
        required = {"CO_ANO", "CO_MES", "CO_NCM", "CO_PAIS", "KG_LIQUIDO", "VL_FOB"}
        header = reader.fieldnames or []
        if len(header) != len(set(header)) or not required <= set(header):
            raise InputError("Cabeçalho Comex ausente ou duplicado")
        if flow == "import" and not {"VL_FRETE", "VL_SEGURO"} <= set(header):
            raise InputError("Layout de importação requer VL_FRETE e VL_SEGURO")
        if flow == "export" and {"VL_FRETE", "VL_SEGURO"} & set(header):
            raise InputError("Layout de importação não pode ser rotulado como exportação")
        try:
            for index, record in enumerate(reader, 1):
                if index > MAX_SOURCE_ROWS:
                    raise InputError("Arquivo Comex excede o limite de linhas")
                if None in record or any(record.get(k) is None for k in required):
                    raise InputError("Linha Comex com campos ausentes ou excedentes")
                if record["CO_NCM"] != ncm:
                    continue
                try:
                    period = f"{int(record['CO_ANO']):04}-{int(record['CO_MES']):02}"
                    month(period)
                    code = record["CO_PAIS"]
                    if not re.fullmatch(r"\d{1,4}", code):
                        raise InputError("Código de país MDIC inválido")
                    kg, fob = float(record["KG_LIQUIDO"]), float(record["VL_FOB"])
                    number(kg, high=1e15)
                    number(fob, high=1e15)
                except (ValueError, TypeError) as exc:
                    raise InputError("Valor inválido em linha selecionada do Comex") from exc
                if start <= period <= end:
                    groups[(period, code)][0] += kg
                    groups[(period, code)][1] += fob
                    matched += 1
        except csv.Error as exc:
            raise InputError("CSV público malformado") from exc
    return {"schema_version": 1, "dataset_kind": "public_aggregate", "source": "MDIC / Comex Stat",
            "source_url": SOURCE_PAGE, "imported_at": datetime.now(timezone.utc).isoformat(),
            "ncm": ncm, "start": start, "end": end, "flow": flow, "source_sha256": digest.hexdigest(),
            "source_rows_matched": matched,
            "records": [{"month": p, "country_code": c, "kg": v[0], "fob_usd": v[1]} for (p, c), v in sorted(groups.items())]}


def market_summary(snapshot, as_of):
    fields(snapshot, ("schema_version", "dataset_kind", "source", "source_url", "imported_at", "ncm", "start", "end", "flow", "source_sha256", "source_rows_matched", "records"))
    if type(snapshot["schema_version"]) is not int or snapshot["schema_version"] != 1 or snapshot["dataset_kind"] != "public_aggregate" or snapshot["source"] != "MDIC / Comex Stat" or snapshot["source_url"] != SOURCE_PAGE:
        raise InputError("Proveniência pública inválida")
    validate_query(snapshot["ncm"], snapshot["start"], snapshot["end"], snapshot["flow"])
    try:
        imported_at = datetime.fromisoformat(snapshot["imported_at"])
        if imported_at.tzinfo is None:
            raise ValueError("timezone")
    except (TypeError, ValueError) as exc:
        raise InputError("Data de importação inválida") from exc
    if imported_at.date() > day(as_of) or snapshot["end"] >= as_of[:7]:
        raise InputError("Snapshot posterior ao corte ou inclui mês incompleto")
    if not isinstance(snapshot["source_sha256"], str) or not re.fullmatch(r"[0-9a-f]{64}", snapshot["source_sha256"]):
        raise InputError("Hash público inválido")
    number(snapshot["source_rows_matched"], high=MAX_SOURCE_ROWS)
    countries = defaultdict(float)
    monthly = defaultdict(float)
    seen = set()
    for r in rows(snapshot["records"], 30000):
        fields(r, ("month", "country_code", "kg", "fob_usd"))
        month(r["month"])
        if not snapshot["start"] <= r["month"] <= snapshot["end"] or not isinstance(r["country_code"], str) or not re.fullmatch(r"\d{1,4}", r["country_code"]):
            raise InputError("Registro fora do filtro público")
        key = (r["month"], r["country_code"])
        if key in seen:
            raise InputError("Registro público agregado duplicado")
        seen.add(key)
        number(r["kg"], high=1e15)
        number(r["fob_usd"], high=1e15)
        countries[r["country_code"]] += r["kg"]
        monthly[r["month"]] += r["kg"]
    total = sum(countries.values())
    return {k: snapshot[k] for k in ("source", "source_url", "imported_at", "ncm", "start", "end", "flow", "source_sha256")} | {
        "dataset_kind": "public_aggregate", "rows": len(seen), "total_kg": total,
        "country_hhi": round(sum((v / total) ** 2 for v in countries.values()) * 10000, 2) if total else None,
        "countries": [{"code": c, "name": "País MDIC " + c, "kg": kg, "share": round(kg / total, 6) if total else 0}
                      for c, kg in sorted(countries.items(), key=lambda x: -x[1])],
        "monthly_kg": dict(sorted(monthly.items())),
        "scope": "Arquivo fornecido pelo operador, atribuído ao Comex Stat; autenticidade não verificada. Fluxo agregado brasileiro por NCM: não mede oferta mundial, fornecedor, pureza ou estágio de refino. FOB/kg não é cotação de mercado."}
