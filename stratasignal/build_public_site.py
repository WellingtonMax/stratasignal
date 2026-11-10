"""Build the public trade panorama alongside the separate synthetic workbench."""

import argparse
import hashlib
import json
import re
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

from . import __version__
from . import public_markets, public_markets_world, public_news
from .build_demo import build_demo
from .market import month
from .schema import InputError, day, rows, text_value, unique_object

API = "https://api-comexstat.mdic.gov.br"
PRODUCTS = ("25041000", "28369100", "72029300")
FLOWS = ("import", "export")
LOOKBACK = 3
MAX_BYTES = 1024 * 1024
MAX_ROWS = 2000
MAX_SAFE_INTEGER = 2**53 - 1
EDITION_DIRECTORY = "edicoes"


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _fetch(route, payload=None):
    headers = {"Accept": "application/json", "User-Agent": f"StrataSignal/{__version__}"}
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    request = Request(API + route, data=data, headers=headers)
    opener = build_opener(_NoRedirect())
    for attempt in range(2):
        try:
            with opener.open(request, timeout=20) as response:
                if response.headers.get_content_type() != "application/json":
                    raise InputError("O Comex Stat retornou um formato inesperado")
                raw = response.read(MAX_BYTES + 1)
            break
        except HTTPError as error:
            if error.code != 429 or attempt:
                raise InputError(f"Consulta ao Comex Stat retornou HTTP {error.code}") from error
            retry = error.headers.get("Retry-After", "12")
            if not retry.isascii() or not retry.isdecimal() or len(retry) > 2 or int(retry) > 30:
                raise InputError("Limite de consultas do Comex Stat. Aguarde para tentar novamente.") from error
            time.sleep(max(12, int(retry)))
        except (URLError, TimeoutError) as error:
            raise InputError("Não foi possível consultar o Comex Stat") from error
    if len(raw) > MAX_BYTES:
        raise InputError("Resposta do Comex Stat excede 1 MiB")
    try:
        response = json.loads(raw.decode("utf-8"), object_pairs_hook=unique_object)
    except (ValueError, RecursionError) as error:
        raise InputError("O Comex Stat retornou JSON inválido") from error
    if not isinstance(response, dict) or response.get("success") is not True or not isinstance(response.get("data"), dict):
        raise InputError("O Comex Stat não confirmou a consulta")
    return response["data"], hashlib.sha256(raw).hexdigest()


def _period(record):
    year, number = record.get("year"), record.get("monthNumber")
    if not isinstance(year, str) or not isinstance(number, str) or not re.fullmatch(r"[0-9]{1,2}", number):
        raise InputError("Período inesperado no Comex Stat")
    return month(f"{year}-{int(number):02d}")


def _metric(value):
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{1,16}", value):
        raise InputError("Métrica comercial inesperada")
    result = int(value)
    if result > MAX_SAFE_INTEGER:
        raise InputError("Métrica comercial fora do limite")
    return result


def _records(payload, flow, start, end):
    result, seen = [], set()
    for row in rows(payload.get("list"), MAX_ROWS):
        if not isinstance(row, dict):
            raise InputError("Registro comercial inválido")
        period = _period(row)
        ncm = row.get("coNcm")
        if ncm not in PRODUCTS or not start <= period <= end:
            raise InputError("Registro comercial fora da consulta")
        country = text_value(row.get("country"), 100).strip()
        key = (period, ncm, country.casefold())
        if key in seen:
            raise InputError("Registro comercial duplicado")
        seen.add(key)
        result.append({"month": period, "ncm": ncm, "country": country, "flow": flow,
                       "fob_usd": _metric(row.get("metricFOB")), "kg": _metric(row.get("metricKG"))})
    if any(sum(row[metric] for row in result) > MAX_SAFE_INTEGER for metric in ("fob_usd", "kg")):
        raise InputError("Total comercial fora do limite")
    return result


def collect_comex():
    """Fetch fixed public queries without accepting user data or destinations."""
    status, status_hash = _fetch("/general/dates/updated")
    end = _period(status)
    updated_on = day(status.get("updated"))
    fetched_at = datetime.now(timezone.utc)
    if end >= fetched_at.strftime("%Y-%m") or not day(end + "-01") <= updated_on <= fetched_at.date():
        raise InputError("Período ou atualização incompatível com a data de consulta")
    month_index = int(end[:4]) * 12 + int(end[5:]) - 1
    periods = [f"{index // 12:04d}-{index % 12 + 1:02d}" for index in range(month_index - LOOKBACK + 1, month_index + 1)]
    start = month(periods[0])
    records, response_hashes = [], {"updated": status_hash}
    for flow in FLOWS:
        query = {
            "flow": flow,
            "monthDetail": True,
            "period": {"from": start, "to": end},
            "filters": [{"filter": "ncm", "values": [int(code) for code in PRODUCTS]}],
            "details": ["country", "ncm"],
            "metrics": ["metricFOB", "metricKG"],
        }
        payload, response_hashes[flow] = _fetch("/general?language=pt", query)
        records.extend(_records(payload, flow, start, end))
    return {
        "schema_version": 1,
        "dataset_kind": "public_aggregate",
        "source": "Comex Stat · SECEX/MDIC",
        "updated_on": updated_on.isoformat(),
        "fetched_at": fetched_at.isoformat(timespec="seconds"),
        "months": periods,
        "response_sha256": response_hashes,
        "records": records,
    }


def _validated_snapshot_bytes(path):
    """Read a retained public edition and reject malformed or unbounded input."""
    raw = Path(path).read_bytes()
    if len(raw) > MAX_BYTES:
        raise InputError("Edição retida do Comex Stat excede 1 MiB")
    try:
        snapshot = json.loads(raw.decode("utf-8"), object_pairs_hook=unique_object)
    except (UnicodeDecodeError, ValueError, RecursionError) as error:
        raise InputError("Edição retida do Comex Stat é inválida") from error
    if not isinstance(snapshot, dict) or snapshot.get("schema_version") != 1 or \
            snapshot.get("dataset_kind") != "public_aggregate" or \
            snapshot.get("source") != "Comex Stat · SECEX/MDIC":
        raise InputError("Contrato inesperado na edição retida do Comex Stat")
    months = snapshot.get("months")
    records = snapshot.get("records")
    if not isinstance(months, list) or not 1 <= len(months) <= 12 or \
            not all(isinstance(value, str) and month(value) == value for value in months) or \
            months != sorted(set(months)) or not isinstance(records, list) or len(records) > 4000:
        raise InputError("Cobertura inválida na edição retida do Comex Stat")
    seen = set()
    for record in records:
        if not isinstance(record, dict) or record.get("ncm") not in PRODUCTS or \
                record.get("flow") not in FLOWS or record.get("month") not in months or \
                not isinstance(record.get("country"), str) or not record["country"].strip() or \
                len(record["country"]) > 100 or type(record.get("fob_usd")) is not int or \
                type(record.get("kg")) is not int or min(record["fob_usd"], record["kg"]) < 0 or \
                max(record["fob_usd"], record["kg"]) > MAX_SAFE_INTEGER:
            raise InputError("Registro inválido na edição retida do Comex Stat")
        key = (record["month"], record["ncm"], record["flow"], record["country"].casefold())
        if key in seen:
            raise InputError("Registro duplicado na edição retida do Comex Stat")
        seen.add(key)
    day(snapshot.get("updated_on"))
    try:
        datetime.fromisoformat(snapshot.get("fetched_at"))
    except (TypeError, ValueError) as error:
        raise InputError("Data inválida na edição retida do Comex Stat") from error
    return raw, snapshot


def _write_trade_editions(output, snapshot_bytes, retained_snapshots):
    editions = output / EDITION_DIRECTORY
    editions.mkdir()
    candidates = [(snapshot_bytes, json.loads(snapshot_bytes))]
    candidates.extend(_validated_snapshot_bytes(path) for path in retained_snapshots)
    result = []
    for raw, snapshot in candidates:
        digest = hashlib.sha256(raw).hexdigest()
        relative = f"{EDITION_DIRECTORY}/comex-{digest}.json"
        target = output / relative
        if not target.exists():
            with target.open("xb") as stream:
                stream.write(raw)
        result.append({
            "path": relative,
            "sha256": digest,
            "updated_on": snapshot["updated_on"],
            "fetched_at": snapshot["fetched_at"],
        })
    return list({edition["sha256"]: edition for edition in result}.values())


def _read_news_feed(url):
    request = Request(url, headers={
        "Accept": "application/atom+xml, application/rss+xml, application/rdf+xml, application/xml",
        "User-Agent": f"StrataSignal/{__version__}",
    })
    try:
        with build_opener(_NoRedirect()).open(request, timeout=20) as response:
            if response.headers.get_content_type() not in {
                "application/atom+xml", "application/rss+xml", "application/rdf+xml", "application/xml", "text/xml",
            }:
                raise InputError("O feed de notícias retornou um formato inesperado")
            raw = response.read(public_news.MAX_FEED_BYTES + 1)
    except (URLError, TimeoutError) as error:
        raise InputError(f"Não foi possível consultar o feed oficial {url}") from error
    return raw


def collect_news():
    """Read the fixed public news feeds without following redirects."""
    canada = _read_news_feed(public_news.FEED_URL)
    news = public_news.parse_feed(canada, datetime.now(timezone.utc))
    news["mdic_archives"] = []
    for feed_url in public_news.MDIC_EDITORIAL:
        raw = _read_news_feed(feed_url)
        metadata, items = public_news.parse_mdic_feed(raw, datetime.now(timezone.utc), feed_url=feed_url)
        if feed_url == public_news.MDIC_FEED_URL:
            news["mdic"] = metadata
        else:
            news["mdic_archives"].append(metadata)
        news["items"].extend(items)
    news["items"].sort(key=lambda item: item["published_on"], reverse=True)
    return news


def _news_manifest(news, news_bytes):
    snapshot = {
        "path": "news.json",
        "sha256": hashlib.sha256(news_bytes).hexdigest(),
        "source": news["source"],
        "feed_url": public_news.FEED_URL,
        "feed_updated_at": news["feed_updated_at"],
        "fetched_at": news["fetched_at"],
    }
    for key in ("mdic", "mdic_archives"):
        if key in news:
            snapshot[key] = news[key]
    return snapshot


def refresh_public_news(source, directory, source_commit=None):
    """Create a new public release from a verified Site while refreshing only curated news."""
    if source_commit is not None and not re.fullmatch(r"[0-9a-f]{40}", source_commit):
        raise InputError("Commit de origem inválido")
    source, output = Path(source), Path(directory)
    if output.exists():
        raise FileExistsError(output)
    if not source.is_dir() or any(path.is_symlink() for path in source.rglob("*")):
        raise InputError("Publicação anterior inválida")
    manifest_path = source / "source-manifest.json"
    if not manifest_path.is_file() or manifest_path.stat().st_size > MAX_BYTES:
        raise InputError("Manifesto público anterior inválido")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"), object_pairs_hook=unique_object)
    except (UnicodeDecodeError, ValueError, RecursionError) as error:
        raise InputError("Manifesto público anterior inválido") from error
    trade = manifest.get("trade_snapshot") if isinstance(manifest, dict) else None
    if not isinstance(manifest, dict) or manifest.get("product") != "StrataSignal" or \
            manifest.get("private_file_import") is not False or \
            manifest.get("dataset_kind") != "public_aggregate" or not isinstance(trade, dict):
        raise InputError("Contrato inesperado na publicação anterior")
    trade_path, trade_hash = trade.get("path"), trade.get("sha256")
    if trade_path != "comex.json" or not re.fullmatch(r"[0-9a-f]{64}", trade_hash or "") or \
            not (source / trade_path).is_file() or \
            hashlib.sha256((source / trade_path).read_bytes()).hexdigest() != trade_hash:
        raise InputError("Carga comercial anterior não confere com o manifesto")
    news = collect_news()
    news_bytes = (json.dumps(news, ensure_ascii=False, allow_nan=False, indent=2) + "\n").encode("utf-8")
    try:
        shutil.copytree(source, output)
        (output / "news.json").write_bytes(news_bytes)
        manifest["source_commit"] = source_commit
        manifest["news_snapshot"] = _news_manifest(news, news_bytes)
        (output / "source-manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n",
        )
    except Exception:
        shutil.rmtree(output, ignore_errors=True)
        raise
    return output


def _write_markets(output, ui):
    market = output / "mercados"
    market.mkdir()
    for source, target in (("markets-world.html", "index.html"), ("markets.html", "nacional.html"),
                           ("markets.js", "markets.js"), ("markets.css", "markets.css"),
                           ("markets-world.js", "markets-world.js"), ("markets-world.css", "markets-world.css"),
                           ("markets-quote.js", "markets-quote.js"), ("markets-issuers.js", "markets-issuers.js")):
        with (market / target).open("xb") as stream:
            stream.write((ui / source).read_bytes())
    snapshot = public_markets.SNAPSHOT
    raw = (json.dumps(snapshot, ensure_ascii=False, allow_nan=False, indent=2) + "\n").encode("utf-8")
    with (market / "dados.json").open("xb") as stream:
        stream.write(raw)
    issuer_snapshot = market / "markets-issuers.js"
    return {"path": "mercados/dados.json", "sha256": hashlib.sha256(raw).hexdigest(),
            "reviewed_on": snapshot["reviewed_on"], "global": public_markets_world.write_snapshot(market),
            "issuer_evidence": {"path": "mercados/markets-issuers.js",
                                "sha256": hashlib.sha256(issuer_snapshot.read_bytes()).hexdigest()}}


def _write_observatory_ui(output, ui):
    """Write the three public routes from the shared observatory layout."""
    template = (ui / "market.html").read_text(encoding="utf-8")
    with (output / "index.html").open("x", encoding="utf-8") as stream:
        stream.write(template)
    for view, title, description in (
        ("mapa", "Parceiros comerciais do Brasil",
         "Explore os parceiros do Brasil no comércio de grafita natural, carbonatos de lítio e ferronióbio."),
        ("noticias", "Notícias da cadeia mineral",
         "Leia a curadoria de comunicados oficiais sobre grafita, lítio e políticas minerais."),
    ):
        page = template.replace('data-view="panorama"', f'data-view="{view}"')
        page = page.replace(' aria-current="page"', "").replace(
            f'data-market-nav="{view}"', f'data-market-nav="{view}" aria-current="page"',
        )
        page = re.sub(r"<title>[^<]+</title>", f"<title>StrataSignal · {title}</title>", page, count=1)
        page = re.sub(r'<meta name="description" content="[^"]+">', f'<meta name="description" content="{description}">', page, count=1)
        if view == "noticias":
            page = page.replace('aria-labelledby="market-context-title"', 'aria-labelledby="market-news-title"')
        directory = output / view
        directory.mkdir()
        with (directory / "index.html").open("x", encoding="utf-8") as stream:
            stream.write(page)
    for name in ("market.js", "market.css", "app.css", "favicon.svg"):
        with (output / name).open("xb") as stream:
            stream.write((ui / name).read_bytes())


def build_public_site(directory, source_commit=None, *, enable_ml=True, retained_trade_snapshots=()):
    if source_commit is not None and not re.fullmatch(r"[0-9a-f]{40}", source_commit):
        raise InputError("Commit de origem inválido")
    output = Path(directory)
    if output.exists():
        raise FileExistsError(output)
    snapshot = collect_comex()
    snapshot_bytes = (json.dumps(snapshot, ensure_ascii=False, allow_nan=False, indent=2) + "\n").encode("utf-8")
    news = collect_news()
    news_bytes = (json.dumps(news, ensure_ascii=False, allow_nan=False, indent=2) + "\n").encode("utf-8")
    ui = Path(__file__).with_name("ui")
    output.mkdir(mode=0o755, parents=False, exist_ok=False)
    try:
        build_demo(output / "carteira", source_commit, enable_ml=enable_ml, public_home=True)
        _write_observatory_ui(output, ui)
        with (output / "comex.json").open("xb") as stream:
            stream.write(snapshot_bytes)
        editions = _write_trade_editions(output, snapshot_bytes, retained_trade_snapshots)
        with (output / "news.json").open("xb") as stream:
            stream.write(news_bytes)
        manifest = {
            "product": "StrataSignal", "version": __version__, "source_commit": source_commit,
            "source_repository": "https://github.com/WellingtonMax/stratasignal",
            "private_file_import": False, "dataset_kind": "public_aggregate",
            "trade_snapshot": {"path": "comex.json", "sha256": hashlib.sha256(snapshot_bytes).hexdigest(),
                               "source": snapshot["source"], "fetched_at": snapshot["fetched_at"],
                               "edition_path": editions[0]["path"], "editions": editions},
            "news_snapshot": _news_manifest(news, news_bytes),
            "markets_snapshot": _write_markets(output, ui),
            "synthetic_workbench": "carteira/source-manifest.json",
            "partner_map": {
                "basemap_path": "carteira/world-land.svg",
                "basemap_sha256": hashlib.sha256((output / "carteira/world-land.svg").read_bytes()).hexdigest(),
                "anchor_source": "Natural Earth · Admin 0 – Countries 5.1.1",
            },
        }
        with (output / "source-manifest.json").open("x", encoding="utf-8", newline="\n") as stream:
            stream.write(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    except Exception:
        shutil.rmtree(output)
        raise
    return output


def main():
    parser = argparse.ArgumentParser(description="Build the public trade panorama and synthetic workbench")
    parser.add_argument("--out", required=True)
    parser.add_argument("--source-commit")
    parser.add_argument("--without-ml", action="store_true")
    parser.add_argument("--retain-trade-snapshot", action="append", default=[])
    parser.add_argument("--refresh-news-from",
                        help="Reutilizar uma publicação validada e atualizar apenas a curadoria de notícias")
    args = parser.parse_args()
    try:
        if args.refresh_news_from:
            if args.retain_trade_snapshot or args.without_ml:
                parser.error("--refresh-news-from não aceita opções de build completo")
            refresh_public_news(args.refresh_news_from, args.out, args.source_commit)
        else:
            build_public_site(args.out, args.source_commit, enable_ml=not args.without_ml,
                              retained_trade_snapshots=args.retain_trade_snapshot)
    except (InputError, OSError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
