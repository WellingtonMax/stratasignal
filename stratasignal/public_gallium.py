"""Validate the curated gallium evidence and prepare a public Markets edition."""

import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

from .schema import InputError, country, day, fields, identifier, number, read_json, rows, text_value

SOURCE = Path(__file__).with_name("data") / "galio.json"
SUPPLY_STAGES = {"primary_recovery": "gallium_metal", "purification": "gallium_high_purity"}
STAGES = ("bauxite", "alumina", *SUPPLY_STAGES, "semiconductors")
STATUSES = ("operation_documented", "coverage_gap", "research_reported", "project_announced", "application_documented")
PRODUCTS = ("bauxite", "alumina", "gallium_metal", "gallium_high_purity", "gallium_compounds")
SOURCE_HOSTS = {
    "www.hydro.com", "agenciadenoticias.bndes.gov.br", "www.riotinto.com", "www.canada.ca",
    "pubs.usgs.gov", "portal.if.usp.br", "www.gov.br", "www.wcoomd.org",
}


def _source_date(value, reviewed):
    if value is None:
        return None
    # A year or month can be all the source reports. Keep its original precision.
    date_text = text_value(value, 10)
    if re.fullmatch(r"[0-9]{4}", date_text):
        date_text += "-01-01"
    elif re.fullmatch(r"[0-9]{4}-[0-9]{2}", date_text):
        date_text += "-01"
    parsed = day(date_text)
    if parsed > reviewed:
        raise InputError("Data da evidência posterior à revisão")
    return parsed


def _source(source, reviewed):
    fields(source, ("publisher", "url", "published_on", "updated_on", "kind"))
    text_value(source["publisher"])
    url = text_value(source["url"], 512)
    try:
        parsed = urlsplit(url)
    except ValueError as exc:
        raise InputError("Endereço de fonte do gálio inválido") from exc
    if (parsed.scheme != "https" or parsed.netloc not in SOURCE_HOSTS
            or "\\" in url or any(character.isspace() for character in url)):
        raise InputError("Endereço de fonte do gálio inválido")
    if source["kind"] not in ("company", "government", "research", "classification"):
        raise InputError("Tipo de fonte do gálio inválido")
    _source_date(source["published_on"], reviewed)
    _source_date(source["updated_on"], reviewed)


def _commercial_record(record):
    stage = record["stage"]
    return (
        stage in SUPPLY_STAGES
        and record["status"] == "operation_documented"
        and record["product"] == SUPPLY_STAGES[stage]
        and record["country"] not in (None, "ZZ")
        and record["facility_id"] is not None
        and record["reference_period"] is not None
        and (record["measure"] or {}).get("kind") == "commercial_production"
    )


def _validate_record(record, sources, reviewed):
    fields(record, ("id", "stage", "status", "country", "place", "facility_id", "reference_period",
                    "product", "title", "summary", "limit", "sources", "measure"), ("planned_operation_year",))
    identifier(record["id"])
    if record["stage"] not in STAGES or record["status"] not in STATUSES:
        raise InputError("Etapa ou situação industrial inválida")
    if record["product"] not in (*PRODUCTS, None):
        raise InputError("Produto industrial inválido")
    if record["country"] is not None:
        country(record["country"])
    for key in ("title", "place", "summary", "limit"):
        text_value(record[key], 420)
    if record["facility_id"] is not None:
        identifier(record["facility_id"])
    reference = _source_date(record["reference_period"], reviewed)
    references = [identifier(key) for key in rows(record["sources"], 5, allow_empty=False)]
    if len(set(references)) != len(references) or not set(references) <= sources.keys():
        raise InputError("Referência de fonte do gálio inválida")
    if "planned_operation_year" in record:
        year = record["planned_operation_year"]
        if (record["status"] != "project_announced" or reference is None
                or type(year) is not int or not reference.year <= year <= 2100):
            raise InputError("Ano previsto de operação inválido")

    measure = record["measure"]
    if measure is None:
        return
    fields(measure, ("kind", "value", "unit"))
    number(measure["value"])
    if measure["kind"] == "commercial_production":
        if measure["unit"] != "t_gallium" or not _commercial_record(record):
            raise InputError("Produção comercial exige processo, produto, instalação e período compatíveis")
    elif (measure["kind"] != "announced_capacity_upper_bound" or measure["unit"] != "t_gallium_per_year"
          or record["status"] != "project_announced" or record["stage"] != "primary_recovery"
          or record["product"] != "gallium_metal"):
        raise InputError("Capacidade anunciada inválida")


def _validate_classification(group, sources, reviewed):
    fields(group, ("system", "revision", "code", "scope", "label", "valid_from", "verified_through", "source"))
    lengths = {"HS": 6, "NCM": 8}
    system = text_value(group["system"], 3)
    code = text_value(group["code"], 8)
    if (system not in lengths or not re.fullmatch(rf"[0-9]{{{lengths[system]}}}", code)
            or group["scope"] != "group"):
        raise InputError("Código da classificação do gálio inválido")
    identifier(group["revision"])
    text_value(group["label"])
    if not day(group["valid_from"]) <= day(group["verified_through"]) <= reviewed:
        raise InputError("Vigência da classificação inválida")
    source = sources.get(identifier(group["source"]))
    if source is None or source["kind"] != "classification":
        raise InputError("Fonte da classificação inválida")
    return system, group["revision"], code


def load_edition(path=SOURCE):
    edition, _ = read_json(path, max_bytes=64 * 1024)
    fields(edition, ("schema_version", "dataset_kind", "material", "reviewed_on", "coverage",
                     "sources", "records", "concentration", "classifications"))
    if (type(edition["schema_version"]) is not int or edition["schema_version"] != 1
            or edition["dataset_kind"] != "public_documentary_evidence" or edition["material"] != "gallium"):
        raise InputError("Edição pública do gálio inválida")
    reviewed = day(edition["reviewed_on"])
    text_value(edition["coverage"], 420)
    sources = edition["sources"]
    if not isinstance(sources, dict) or not 1 <= len(sources) <= 20:
        raise InputError("Quantidade de fontes do gálio inválida")
    for key, source in sources.items():
        identifier(key)
        _source(source, reviewed)
    records = rows(edition["records"], 40, allow_empty=False)
    for record in records:
        _validate_record(record, sources, reviewed)
    if len({record["id"] for record in records}) != len(records):
        raise InputError("Evidência do gálio duplicada")
    concentration = edition["concentration"]
    fields(concentration, ("country", "share_percent", "year", "scope", "method", "source"))
    country(concentration["country"])
    number(concentration["share_percent"], high=100)
    if (type(concentration["year"]) is not int or not 1997 <= concentration["year"] <= reviewed.year
            or concentration["scope"] != "world_primary_low_purity_gallium"
            or concentration["method"] != "published_estimate"
            or identifier(concentration["source"]) not in sources):
        raise InputError("Escopo da concentração do gálio inválido")
    groups = rows(edition["classifications"], 10, allow_empty=False)
    keys = [_validate_classification(group, sources, reviewed) for group in groups]
    if len(set(keys)) != len(keys):
        raise InputError("Classificação do gálio duplicada")
    return edition


def assess_supply(edition, country_code, stage):
    """Return compatible historical production observations, without adding them."""
    if stage not in SUPPLY_STAGES:
        raise InputError("Etapa de oferta de gálio inválida")
    country(country_code)
    evidence = [record["id"] for record in edition["records"]
                if record["country"] == country_code and record["stage"] == stage and _commercial_record(record)]
    return {"country": country_code, "stage": stage, "status": "documented" if evidence else "unavailable",
            "evidence_ids": evidence}


def trade_scope(edition, *, system, revision, code, start, end):
    """Resolve scope and checked coverage without assigning group totals to gallium."""
    if day(end) < day(start):
        raise InputError("Período comercial invertido")
    group = next((group for group in edition["classifications"]
                  if (group["system"], group["revision"], group["code"]) == (system, revision, code)), None)
    if group is None or not group["valid_from"] <= start <= end <= group["verified_through"]:
        return {"status": "classification_unavailable", "classification": None, "gallium_amounts": None}
    return {"status": "group_only", "classification": group, "gallium_amounts": None}


def write_snapshot(directory, baci_edition, baci_years):
    edition = load_edition()
    edition["brazil_supply"] = [assess_supply(edition, "BR", stage) for stage in SUPPLY_STAGES]
    edition["baci_context"] = {
        "edition": baci_edition, "years": list(baci_years),
        **trade_scope(edition, system="HS", revision="2022", code="811292",
                      start=f"{baci_years[0]}-01-01", end=f"{baci_years[-1]}-12-31"),
    }
    raw = (json.dumps(edition, ensure_ascii=False, allow_nan=False, indent=2) + "\n").encode("utf-8")
    digest = hashlib.sha256(raw).hexdigest()
    editions = Path(directory) / "edicoes"
    editions.mkdir(exist_ok=True)
    name = f"galio-{digest}.json"
    with (editions / name).open("xb") as stream:
        stream.write(raw)
    return {"path": f"mercados/edicoes/{name}", "sha256": digest, "reviewed_on": edition["reviewed_on"]}
