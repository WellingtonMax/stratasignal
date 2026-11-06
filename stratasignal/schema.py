"""Bounded, strict inputs. Unknown and duplicate fields fail closed."""

import hashlib
import json
import math
import re
from datetime import date
from pathlib import Path

MAX_BYTES = 4 * 1024 * 1024
ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,63}\Z")


class InputError(ValueError):
    pass


def unique_object(pairs):
    out = {}
    for key, value in pairs:
        if key in out:
            raise InputError("Chave JSON duplicada")
        out[key] = value
    return out


def read_json(path, max_bytes=MAX_BYTES):
    with Path(path).open("rb") as stream:
        raw = stream.read(max_bytes + 1)
    if len(raw) > max_bytes:
        raise InputError("Arquivo excede o limite de tamanho")
    try:
        value = json.loads(raw.decode("utf-8-sig"), object_pairs_hook=unique_object,
                           parse_constant=lambda _: (_ for _ in ()).throw(InputError("Número não finito")))
    except (UnicodeError, ValueError, RecursionError) as exc:
        raise InputError("JSON inválido") from exc
    return value, hashlib.sha256(raw).hexdigest()


def fields(obj, required, optional=()):
    if not isinstance(obj, dict) or set(obj) - set(required) - set(optional) or set(required) - set(obj):
        raise InputError("Campos ausentes ou desconhecidos")


def identifier(value):
    if not isinstance(value, str) or not ID.fullmatch(value):
        raise InputError("Identificador inválido")
    return value


def text_value(value, limit=160):
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise InputError("Texto inválido")
    if any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise InputError("Caractere de controle não permitido")
    return value


def number(value, low=0, high=1e12, positive=False):
    if type(value) not in (int, float) or not low <= value <= high or not math.isfinite(value):
        raise InputError("Número fora dos limites")
    if positive and value <= 0:
        raise InputError("Número deve ser positivo")
    return float(value)


def day(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise InputError("Data deve usar AAAA-MM-DD")
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise InputError("Data inexistente") from exc
    if not 1997 <= parsed.year <= 2100:
        raise InputError("Ano fora dos limites")
    return parsed


def country(value):
    # ISO-style codes are supplied by the customer; ZZ explicitly means unknown.
    if not isinstance(value, str) or not re.fullmatch(r"[A-Z]{2}", value):
        raise InputError("País deve usar duas letras maiúsculas; ZZ indica desconhecido")
    return value


def rows(value, maximum, allow_empty=True):
    if not isinstance(value, list) or len(value) > maximum or (not allow_empty and not value):
        raise InputError("Quantidade de registros inválida")
    return value


def validate_bundle(data):
    fields(data, ("schema_version", "dataset_kind", "as_of", "positions", "orders", "evidence"))
    if type(data["schema_version"]) is not int or data["schema_version"] != 1:
        raise InputError("Versão de esquema não suportada")
    if data["dataset_kind"] not in ("synthetic", "client"):
        raise InputError("Natureza do conjunto deve ser synthetic ou client")
    as_of = day(data["as_of"])
    positions = rows(data["positions"], 64, allow_empty=False)
    known = {}
    material_settings = {}
    totals = {}
    for p in positions:
        fields(p, ("material", "material_name", "supplier", "origin_country", "allocation_share",
                   "monthly_demand_kg", "stock_kg", "nominal_lead_days", "unit_cost_usd"))
        key = (identifier(p["material"]), identifier(p["supplier"]))
        if key in known:
            raise InputError("Posição material/fornecedor duplicada")
        text_value(p["material_name"])
        country(p["origin_country"])
        number(p["allocation_share"], high=1, positive=True)
        number(p["monthly_demand_kg"], positive=True)
        number(p["stock_kg"])
        number(p["nominal_lead_days"], high=365, positive=True)
        number(p["unit_cost_usd"], high=1e7, positive=True)
        settings = (p["material_name"], p["monthly_demand_kg"], p["stock_kg"])
        if key[0] in material_settings and material_settings[key[0]] != settings:
            raise InputError("Demanda, estoque e especificação devem coincidir por material")
        material_settings[key[0]] = settings
        totals[key[0]] = totals.get(key[0], 0) + p["allocation_share"]
        known[key] = p
    if len(totals) > 20 or any(abs(v - 1) > 1e-6 for v in totals.values()):
        raise InputError("Alocações devem somar 1 para cada material; máximo de 20 materiais")
    seen = set()
    for o in rows(data["orders"], 3000):
        fields(o, ("id", "material", "supplier", "origin_country", "ordered_on", "promised_on", "received_on", "quantity_kg"))
        oid = identifier(o["id"])
        if oid in seen:
            raise InputError("Pedido duplicado")
        seen.add(oid)
        if (identifier(o["material"]), identifier(o["supplier"])) not in known:
            raise InputError("Pedido sem posição cadastrada")
        country(o["origin_country"])
        ordered, promised = day(o["ordered_on"]), day(o["promised_on"])
        if not ordered <= as_of or not 1 <= (promised - ordered).days <= 365:
            raise InputError("Cronologia do pedido inválida")
        if o["received_on"] is not None and not ordered <= day(o["received_on"]) <= as_of:
            raise InputError("Recebimento inválido ou posterior à data de corte")
        number(o["quantity_kg"], positive=True)
    seen = set()
    for e in rows(data["evidence"], 500):
        fields(e, ("id", "material", "supplier", "origin_country", "observed_on", "issued_on", "expires_on", "sha256"))
        eid = identifier(e["id"])
        if eid in seen:
            raise InputError("Evidência duplicada")
        seen.add(eid)
        if (identifier(e["material"]), identifier(e["supplier"])) not in known:
            raise InputError("Evidência sem posição cadastrada")
        country(e["origin_country"])
        if day(e["observed_on"]) > as_of:
            raise InputError("Evidência ainda não observável na data de corte")
        for key in ("issued_on", "expires_on"):
            if e[key] is not None:
                day(e[key])
        if not isinstance(e["sha256"], str) or not re.fullmatch(r"[0-9a-f]{64}", e["sha256"]):
            raise InputError("SHA-256 inválido")
    return data
