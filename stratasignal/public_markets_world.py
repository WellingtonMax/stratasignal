"""Prepare and publish bounded, public BACI and exchange-directory snapshots."""

import argparse
import csv
import gzip
import hashlib
import io
import json
import re
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from zipfile import ZipFile

from .schema import InputError, day, text_value, unique_object

VERSION = "202601"
YEARS = (2022, 2023, 2024)
MAX_METRIC = 2**53 - 1
MAX_JSON = 16 * 1024 * 1024
SOURCE = Path(__file__).with_name("data") / "mercados-globais.json.gz"
VENUE_TYPES = {"Q11691": "ações", "Q695817": "commodities", "Q2298435": "futuros"}
BR_PREDECESSORS = {"Q5065671", "Q796297"}

# Headings group products only within the same customs classification.
HEADINGS = {
    "2501": "Sal e cloreto de sódio", "2502": "Pirites de ferro não ustuladas",
    "2503": "Enxofre", "2504": "Grafita natural", "2505": "Areias naturais",
    "2506": "Quartzo e quartzitos", "2507": "Caulim e argilas caulínicas",
    "2508": "Argilas, andaluzita e terras refratárias", "2509": "Cré",
    "2510": "Fosfatos naturais", "2511": "Barita e witherita",
    "2512": "Terras siliciosas e diatomita", "2513": "Pedra-pomes e abrasivos naturais",
    "2514": "Ardósia", "2515": "Mármore, travertino e outras pedras calcárias",
    "2516": "Granito, basalto e outras pedras de construção", "2517": "Cascalho e pedra britada",
    "2518": "Dolomita", "2519": "Magnesita e magnésia", "2520": "Gipsita, anidrita e gesso",
    "2521": "Pedras calcárias para cal ou cimento", "2522": "Cal", "2523": "Cimentos hidráulicos",
    "2524": "Amianto", "2525": "Mica", "2526": "Esteatita e talco",
    "2528": "Boratos naturais", "2529": "Feldspato, leucita e fluorita",
    "2530": "Outras substâncias minerais",
    "2601": "Minério de ferro e concentrados", "2602": "Minério de manganês e concentrados",
    "2603": "Minério de cobre e concentrados", "2604": "Minério de níquel e concentrados",
    "2605": "Minério de cobalto e concentrados", "2606": "Minério de alumínio e concentrados (bauxita)",
    "2607": "Minério de chumbo e concentrados", "2608": "Minério de zinco e concentrados",
    "2609": "Minério de estanho e concentrados", "2610": "Minério de cromo e concentrados",
    "2611": "Minério de tungstênio e concentrados", "2612": "Minérios de urânio ou tório",
    "2613": "Minério de molibdênio e concentrados", "2614": "Minério de titânio e concentrados",
    "2615": "Minérios de nióbio, tântalo, vanádio ou zircônio",
    "2616": "Minérios de metais preciosos", "2617": "Outros minérios e concentrados",
    "2618": "Escória granulada da siderurgia", "2619": "Escórias e resíduos da siderurgia",
    "2620": "Cinzas e resíduos com metais", "2621": "Outras escórias e cinzas",
    "2701": "Carvão mineral", "2702": "Linhita", "2703": "Turfa", "2704": "Coque e semicoque",
    "7102": "Diamantes", "7103": "Pedras preciosas e semipreciosas",
    "7106": "Prata, em pó, em bruto ou semimanufaturada", "7108": "Ouro, em pó, em bruto ou semimanufaturado",
    "7110": "Platina e metais do grupo da platina", "7112": "Resíduos de metais preciosos",
    "7201": "Ferro-gusa", "7202": "Ferroligas", "7402": "Cobre não refinado e ânodos",
    "7403": "Cobre refinado e ligas em bruto", "7404": "Sucata de cobre", "7502": "Níquel em bruto",
    "7503": "Sucata de níquel", "7601": "Alumínio em bruto", "7602": "Sucata de alumínio",
    "7801": "Chumbo em bruto", "7901": "Zinco em bruto", "8001": "Estanho em bruto",
}
REFINED = {
    "250410": "Grafita natural em pó ou escamas", "250490": "Outras grafitas naturais",
    "260111": "Minério de ferro não aglomerado", "260112": "Minério de ferro aglomerado",
    "260120": "Pirites de ferro ustuladas", "280530": "Metais de terras raras, escândio e ítrio",
    "281820": "Óxido de alumínio (exceto corindo artificial)", "282200": "Óxidos e hidróxidos de cobalto",
    "282520": "Óxido e hidróxido de lítio", "283691": "Carbonatos de lítio",
    "284610": "Compostos de cério", "284690": "Outros compostos de terras raras, ítrio ou escândio",
    "810520": "Cobalto em bruto, mates e pós", "811292": "Outros metais da posição 8112 em bruto, resíduos e pós",
}


def _json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":")) + "\n").encode()


def _hash_file(path):
    with Path(path).open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def _countries(path):
    raw = Path(path).read_text(encoding="utf-8")
    if len(raw) > 3_000_000:
        raise InputError("Tabela M49 excede o limite")
    table = re.search(r'<table id\s*=\s*"downloadTableEN"[^>]*>(.*?)</table>', raw, re.S)
    if not table:
        raise InputError("Tabela M49 em inglês ausente")
    codes = {}
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", table[1], re.S):
        cells = [cell.strip() for cell in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
        if len(cells) >= 12 and re.fullmatch(r"\d{3}", cells[9]) and re.fullmatch(r"[A-Z]{2}", cells[10]):
            codes[int(cells[9])] = cells[10]
    if not 240 <= len(codes) <= 260 or len(set(codes.values())) != len(codes):
        raise InputError("Cobertura M49 inesperada")
    return codes


def _csv(archive, name, limit):
    member = archive.getinfo(name)
    if not 0 < member.file_size <= limit or archive.namelist().count(name) != 1:
        raise InputError(f"Tamanho ou duplicidade inválida no membro {name}")
    return io.TextIOWrapper(archive.open(member), encoding="utf-8-sig", newline="")


def _catalog(archive):
    products, lookup = {}, {}
    with _csv(archive, f"product_codes_HS22_V{VERSION}.csv", 1_000_000) as stream:
        for row in csv.DictReader(stream):
            code = row["code"]
            heading = code[:4]
            if not re.fullmatch(r"[0-9]{6}", code):
                raise InputError("Código HS6 inválido")
            keys = []
            if heading in HEADINGS:
                products[heading] = [HEADINGS[heading], heading[:2], None]
                keys.append(heading)
            if heading[:2] in {"25", "26"} or code in REFINED:
                description = REFINED.get(code, row["description"])
                products[code] = [text_value(description, 800), "hs6" if heading[:2] in {"25", "26"} else "refinado", heading]
                keys.append(code)
            if keys:
                lookup[code] = keys
    if not set(HEADINGS) <= products.keys() or not set(REFINED) <= products.keys():
        raise InputError("Catálogo HS22 incompleto")
    return dict(sorted(products.items())), lookup


def _metric(value):
    if not re.fullmatch(r"[0-9]{1,15}(?:\.[0-9]{1,20})?(?:[eE][+-]?[0-9]{1,2})?", value):
        raise InputError("Métrica comercial inválida")
    result = round(Decimal(value) * 1000)
    if result > MAX_METRIC:
        raise InputError("Métrica comercial fora do limite")
    return result


def _add(by_country, country, slot, usd, kg):
    series = by_country.setdefault(country, [None] * (2 * len(YEARS)))
    previous = series[slot]
    known, total = int(kg is not None), 1
    if previous:
        usd += previous[0]
        known += previous[2]
        total += previous[3]
        kg = ((kg or 0) + (previous[1] or 0)) if known else None
    if usd > MAX_METRIC or (kg is not None and kg > MAX_METRIC):
        raise InputError("Total comercial fora do limite")
    series[slot] = [usd, kg, known, total]


def _aggregate(archive, lookup, countries, trade):
    counts = {}
    for index, year in enumerate(YEARS):
        seen = set()
        with _csv(archive, f"BACI_HS22_Y{year}_V{VERSION}.csv", 450_000_000) as stream:
            reader = csv.reader(stream)
            if next(reader) != ["t", "i", "j", "k", "v", "q"]:
                raise InputError("Cabeçalho BACI inesperado")
            for period, exporter, importer, product, value, quantity in reader:
                codes = lookup.get(product)
                if codes is None:
                    continue
                key = (exporter, importer, product)
                if period != str(year) or key in seen or exporter not in countries or importer not in countries:
                    raise InputError("Fluxo BACI inválido ou duplicado")
                seen.add(key)
                usd = _metric(value)
                kg = None if quantity in {"", "NA"} else _metric(quantity)
                for code in codes:
                    by_country = trade[code]
                    _add(by_country, "WORLD", 2 * index, usd, kg)
                    _add(by_country, "WORLD", 2 * index + 1, usd, kg)
                    if countries[exporter]:
                        _add(by_country, countries[exporter], 2 * index, usd, kg)
                    if countries[importer]:
                        _add(by_country, countries[importer], 2 * index + 1, usd, kg)
        if not seen:
            raise InputError(f"Sem fluxos BACI em {year}")
        counts[str(year)] = len(seen)
    return counts


def _venues(path, country_codes, checked_on):
    if path.stat().st_size > 3_000_000:
        raise InputError("Carga de bolsas excede o limite")
    bindings = json.loads(path.read_bytes(), object_pairs_hook=unique_object)["results"]["bindings"]
    if not isinstance(bindings, list) or not 0 < len(bindings) < 2000:
        raise InputError("Cobertura de bolsas vazia ou truncada")
    closed = set()
    venues = {}
    for item in bindings:
        identifier = item["venue"]["value"].removeprefix("http://www.wikidata.org/entity/")
        kind = item["type"]["value"].removeprefix("http://www.wikidata.org/entity/")
        country = item["iso"]["value"]
        if not re.fullmatch(r"Q[1-9][0-9]{0,11}", identifier) or kind not in VENUE_TYPES:
            raise InputError("Identificador de bolsa inválido")
        end = item.get("closed", {}).get("value", "")[:10]
        if re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", end) and end <= checked_on:
            closed.add(identifier)
        if country in country_codes:
            key = country, identifier
            label = text_value(item["label"]["value"], 240)
            venues.setdefault(key, [country, identifier, label, []])[3].append(VENUE_TYPES[kind])
    # B3's official history confirms the consolidation of Bovespa and CETIP.
    result = [[country, identifier, label, sorted(set(kinds))]
              for country, identifier, label, kinds in sorted(venues.values())
              if identifier not in closed | BR_PREDECESSORS]
    result.append(["BR", "BR-B3", "B3 · Brasil, Bolsa, Balcão", ["ações", "commodities", "futuros"]])
    return result


def prepare(archive_path, m49_path, venues_path, checked_on, output):
    checked_on = day(checked_on).isoformat()
    if Path(archive_path).stat().st_size > 420_000_000:
        raise InputError("Arquivo BACI excede o limite")
    m49 = _countries(m49_path)
    country_codes = sorted(set(m49.values()) | {"TW", "XK"})
    with ZipFile(archive_path) as archive:
        products, lookup = _catalog(archive)
        with _csv(archive, f"country_codes_V{VERSION}.csv", 20_000) as stream:
            countries = {row["country_code"]: row["country_iso2"] or m49.get(int(row["country_code"]))
                         for row in csv.DictReader(stream)}
        countries = {key: code if code in country_codes else None for key, code in countries.items()}
        trade = {code: {} for code in products}
        counts = _aggregate(archive, lookup, countries, trade)
    venues = _venues(Path(venues_path), country_codes, checked_on)
    catalog = {
        "schema_version": 2, "dataset_kind": "world_mineral_trade", "years": list(YEARS),
        "release": VERSION, "published_on": "2026-01-22", "checked_on": checked_on,
        "countries": country_codes, "products": products, "venues": venues,
        "source_sha256": {"baci": _hash_file(archive_path), "m49": _hash_file(m49_path), "venues": _hash_file(venues_path)},
        "source_flow_counts": counts,
    }
    with Path(output).open("xb") as stream:
        stream.write(gzip.compress(_json_bytes({"catalog": catalog, "trade": trade}), mtime=0))
    return catalog


def write_snapshot(directory):
    with gzip.open(SOURCE, "rb") as stream:
        raw = stream.read(MAX_JSON + 1)
    if len(raw) > MAX_JSON:
        raise InputError("Carga mundial excede o limite")
    data = json.loads(raw, object_pairs_hook=unique_object)
    catalog, trade = data["catalog"], data["trade"]
    if (catalog["dataset_kind"] != "world_mineral_trade" or catalog["schema_version"] != 2
            or set(catalog["products"]) != trade.keys()):
        raise InputError("Carga mundial inconsistente")
    paths = directory / "comercio"
    paths.mkdir()
    hashes = {}
    for code, series in trade.items():
        if not re.fullmatch(r"[0-9]{4}(?:[0-9]{2})?", code):
            raise InputError("Identificador de arquivo comercial inválido")
        content = _json_bytes({"code": code, "series": series})
        with (paths / f"{code}.json").open("xb") as stream:
            stream.write(content)
        hashes[code] = hashlib.sha256(content).hexdigest()
    catalog["trade_sha256"] = hashes
    content = _json_bytes(catalog)
    with (directory / "catalogo.json").open("xb") as stream:
        stream.write(content)
    return {"path": "mercados/catalogo.json", "sha256": hashlib.sha256(content).hexdigest(),
            "release": catalog["release"], "checked_on": catalog["checked_on"]}


def main():
    parser = argparse.ArgumentParser(description="Prepare the reviewed global mineral trade snapshot")
    parser.add_argument("--baci", type=Path, required=True)
    parser.add_argument("--m49", type=Path, required=True)
    parser.add_argument("--venues", type=Path, required=True)
    parser.add_argument("--checked-on", default=date.today().isoformat())
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    try:
        catalog = prepare(args.baci, args.m49, args.venues, args.checked_on, args.out)
    except (InputError, OSError, ValueError, InvalidOperation, KeyError) as error:
        parser.error(str(error))
    print(f'{len(catalog["countries"])} países e áreas, {len(catalog["products"])} recortes HS, '
          f'{len(catalog["venues"])} vínculos de bolsas a países')


if __name__ == "__main__":
    main()
