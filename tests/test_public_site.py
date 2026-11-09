import hashlib
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
from zipfile import ZipFile

from stratasignal.build_public_site import (
    build_public_site, collect_comex, collect_news, refresh_public_news,
)
from stratasignal.public_markets_world import VERSION, YEARS, _aggregate
from stratasignal.public_news import (
    EDITORIAL, FEED_URL, MAX_FEED_BYTES, MDIC_ARTICLE, MDIC_FEED_URL,
    MDIC_NOVEMBER_ARTICLE, MDIC_NOVEMBER_FEED_URL, MDIC_NOVEMBER_SEMINAR, SOURCE, parse_feed, parse_mdic_feed,
)
from stratasignal.schema import InputError


def metadata():
    return {"year": "2025", "monthNumber": "01", "updated": "2025-02-06"}


def trade_record(**changes):
    return {
        "year": "2024", "monthNumber": "12", "coNcm": "25041000",
        "country": "China", "metricFOB": "1200", "metricKG": "700",
    } | changes


def reply(data):
    return data, "a" * 64


def atom_feed(*urls, updated="2026-11-06T15:41:37-05:00"):
    entries = "".join(
        f'<entry><id>{url}</id><link href="{url}"/><summary type="html">TEXTO EXTERNO</summary></entry>'
        for url in urls
    )
    return (f'<feed xmlns="http://www.w3.org/2005/Atom"><title>{SOURCE}</title>'
            f'<updated>{updated}</updated><link rel="self" href="http://localhost/feed"/>{entries}</feed>').encode()


def mdic_feed(feed_url, article, published_on, *additional):
    entries = "".join(
        f'<item rdf:about="{url}"><link>{url}</link>'
        f'<dc:date>{date}T21:15:00Z</dc:date><description>UNTRUSTED</description></item>'
        for url, date in ((article, published_on), *additional)
    )
    return ('<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"'
            ' xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">'
            f'<channel rdf:about="{feed_url}"/>{entries * 2}</rdf:RDF>').encode()


FETCHED_AT = datetime(2026, 11, 7, 18, 0, tzinfo=timezone.utc)


class PublicSiteTests(unittest.TestCase):
    @patch("stratasignal.build_public_site.collect_news")
    @patch("stratasignal.build_public_site._fetch")
    def test_build_keeps_public_snapshots_outside_the_synthetic_workbench(self, fetch, news):
        fetch.side_effect = [reply(metadata()), reply({"list": [trade_record()]}), reply({"list": []})]
        news.return_value = parse_feed(atom_feed(next(iter(EDITORIAL))), FETCHED_AT)
        november, items = parse_mdic_feed(
            mdic_feed(MDIC_NOVEMBER_FEED_URL, MDIC_NOVEMBER_ARTICLE, "2026-11-05"),
            FETCHED_AT, feed_url=MDIC_NOVEMBER_FEED_URL,
        )
        news.return_value["mdic_archives"] = [november]
        news.return_value["items"].extend(items)
        with tempfile.TemporaryDirectory() as directory:
            output = build_public_site(Path(directory) / "site", "b" * 40, enable_ml=False)
            public_bytes = (output / "comex.json").read_bytes()
            public = json.loads(public_bytes)
            manifest = json.loads((output / "source-manifest.json").read_text())
            demo = json.loads((output / "carteira/source-manifest.json").read_text())
            self.assertEqual(public["months"], ["2024-11", "2024-12", "2025-01"])
            self.assertEqual(public["records"], [{
                "month": "2024-12", "ncm": "25041000", "country": "China", "flow": "import",
                "fob_usd": 1200, "kg": 700,
            }])
            self.assertEqual(manifest["trade_snapshot"]["sha256"], hashlib.sha256(public_bytes).hexdigest())
            edition = manifest["trade_snapshot"]["editions"][0]
            self.assertEqual(edition["path"], manifest["trade_snapshot"]["edition_path"])
            self.assertEqual((output / edition["path"]).read_bytes(), public_bytes)
            basemap = output / manifest["partner_map"]["basemap_path"]
            self.assertEqual(manifest["partner_map"]["basemap_sha256"], hashlib.sha256(basemap.read_bytes()).hexdigest())
            self.assertIn('href="/carteira/world-land.svg"', (output / "mapa/index.html").read_text(encoding="utf-8"))
            self.assertEqual(manifest["dataset_kind"], "public_aggregate")
            self.assertEqual(demo["dataset_kind"], "synthetic")
            self.assertEqual(manifest["source_commit"], demo["source_commit"])
            self.assertFalse(manifest["private_file_import"])
            self.assertFalse(demo["private_file_import"])
            self.assertFalse((output / "carteira/comex.json").exists())
            self.assertFalse((output / "carteira/news.json").exists())
            markets = manifest["markets_snapshot"]
            markets_bytes = (output / markets["path"]).read_bytes()
            self.assertEqual(markets["sha256"], hashlib.sha256(markets_bytes).hexdigest())
            market_data = json.loads(markets_bytes)
            self.assertEqual(set(market_data["countries"]), {"BR", "AU"})
            self.assertEqual(market_data["dataset_kind"], "public_markets_snapshot")
            self.assertFalse((output / "carteira/mercados").exists())
            self.assertIn('href="/mercados/"', (output / "index.html").read_text(encoding="utf-8"))
            for route in ("panorama", "mapa", "noticias"):
                page = output / ("index.html" if route == "panorama" else f"{route}/index.html")
                markup = page.read_text(encoding="utf-8")
                self.assertIn(f'data-view="{route}"', markup)
                self.assertIn(f'data-market-nav="{route}"', markup)
                self.assertEqual(markup.count('aria-current="page"'), 1)
                self.assertIn(f'data-market-nav="{route}" ' + (
                    'href="/" aria-current="page"' if route == "panorama" else 'aria-current="page"'
                ), markup)
            self.assertTrue((output / "mercados/index.html").is_file())
            self.assertTrue((output / "mercados/nacional.html").is_file())
            self.assertTrue((output / "mercados/markets.js").is_file())
            issuers = markets["issuer_evidence"]
            self.assertEqual(issuers["path"], "mercados/markets-issuers.js")
            self.assertEqual(issuers["sha256"], hashlib.sha256((output / issuers["path"]).read_bytes()).hexdigest())
            self.assertIn('src="markets-issuers.js"', (output / "mercados/index.html").read_text(encoding="utf-8"))
            world = (output / markets["global"]["path"]).read_bytes()
            self.assertEqual(markets["global"]["sha256"], hashlib.sha256(world).hexdigest())
            catalog = json.loads(world)
            self.assertIn("AQ", catalog["countries"])
            self.assertIn("2603", catalog["products"])
            self.assertEqual(catalog["products"].keys(), catalog["trade_sha256"].keys())
            for code, expected in catalog["trade_sha256"].items():
                self.assertEqual(hashlib.sha256((output / f"mercados/comercio/{code}.json").read_bytes()).hexdigest(), expected)
            news_bytes = (output / "news.json").read_bytes()
            self.assertEqual(json.loads(news_bytes), news.return_value)
            self.assertEqual(manifest["news_snapshot"]["sha256"], hashlib.sha256(news_bytes).hexdigest())
            self.assertEqual(manifest["news_snapshot"]["feed_updated_at"], "2026-11-06T20:41:37+00:00")
            self.assertEqual(manifest["news_snapshot"]["mdic_archives"], [november])
            demo_page = (output / "carteira/index.html").read_text(encoding="utf-8")
            nav_start = '<nav id="public-navigation" class="workbench-public-nav"'
            self.assertIn(nav_start, demo_page)
            navigation = demo_page.split(nav_start, 1)[1].split("</nav>", 1)[0]
            for route in ("/", "/mapa/", "/mercados/", "/noticias/"):
                self.assertIn(f'href="{route}"', navigation)
            self.assertIn('href="/carteira/" aria-current="page"', navigation)
            self.assertEqual([call.args[1]["flow"] for call in fetch.call_args_list[1:]], ["import", "export"])
            self.assertEqual(fetch.call_args_list[1].args[1]["period"], {"from": "2024-11", "to": "2025-01"})
            with self.assertRaises(FileExistsError):
                build_public_site(output)
            self.assertEqual(fetch.call_count, 3)
            news.assert_called_once_with()

    @patch("stratasignal.build_public_site.collect_news")
    @patch("stratasignal.build_public_site._fetch")
    def test_build_retains_two_content_addressed_trade_editions(self, fetch, news):
        fetch.side_effect = [reply(metadata()), reply({"list": [trade_record()]}), reply({"list": []})]
        news.return_value = parse_feed(atom_feed(next(iter(EDITORIAL))), FETCHED_AT)
        previous = {
            "schema_version": 1, "dataset_kind": "public_aggregate", "source": "Comex Stat · SECEX/MDIC",
            "updated_on": "2025-01-31", "fetched_at": "2025-02-01T12:00:00+00:00",
            "months": ["2024-10", "2024-11", "2024-12"], "response_sha256": {},
            "records": [{"month": "2024-12", "ncm": "25041000", "country": "China",
                         "flow": "import", "fob_usd": 1100, "kg": 700}],
        }
        with tempfile.TemporaryDirectory() as directory:
            retained = Path(directory) / "previous.json"
            retained.write_text(json.dumps(previous, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            output = build_public_site(Path(directory) / "site", "b" * 40, enable_ml=False,
                                       retained_trade_snapshots=[retained])
            manifest = json.loads((output / "source-manifest.json").read_text())
            editions = manifest["trade_snapshot"]["editions"]
            self.assertEqual(len(editions), 2)
            self.assertEqual(json.loads((output / editions[1]["path"]).read_text()), previous)
            self.assertEqual(editions[1]["sha256"], hashlib.sha256(retained.read_bytes()).hexdigest())
            self.assertNotEqual(editions[0]["sha256"], editions[1]["sha256"])

    @patch("stratasignal.build_public_site.collect_news")
    @patch("stratasignal.build_public_site._fetch")
    def test_news_refresh_preserves_verified_release_and_replaces_only_news_provenance(self, fetch, news):
        fetch.side_effect = [reply(metadata()), reply({"list": [trade_record()]}), reply({"list": []})]
        first = parse_feed(atom_feed(next(iter(EDITORIAL))), FETCHED_AT)
        second = json.loads(json.dumps(first))
        second["fetched_at"] = "2026-11-08T18:00:00+00:00"
        news.side_effect = [first, second]
        with tempfile.TemporaryDirectory() as directory:
            source = build_public_site(Path(directory) / "source", "b" * 40, enable_ml=False)
            marker = source / "preserved.txt"
            marker.write_text("mesmos bytes\n", encoding="utf-8")
            trade_before = (source / "comex.json").read_bytes()
            output = refresh_public_news(source, Path(directory) / "refreshed", "c" * 40)
            manifest = json.loads((output / "source-manifest.json").read_text())
            news_bytes = (output / "news.json").read_bytes()
            self.assertEqual((output / "comex.json").read_bytes(), trade_before)
            self.assertEqual((output / "preserved.txt").read_bytes(), marker.read_bytes())
            self.assertEqual(json.loads(news_bytes), second)
            self.assertEqual(manifest["source_commit"], "c" * 40)
            self.assertEqual(manifest["news_snapshot"]["sha256"], hashlib.sha256(news_bytes).hexdigest())
            self.assertEqual(manifest["news_snapshot"]["fetched_at"], second["fetched_at"])
            self.assertEqual(fetch.call_count, 3)
            with self.assertRaises(FileExistsError):
                refresh_public_news(source, output, "c" * 40)
            (source / "comex.json").write_bytes(b"adulterada")
            with self.assertRaisesRegex(InputError, "não confere"):
                refresh_public_news(source, Path(directory) / "rejected", "c" * 40)
            self.assertFalse((Path(directory) / "rejected").exists())
            (source / "source-manifest.json").write_text("[]\n", encoding="utf-8")
            with self.assertRaisesRegex(InputError, "Contrato inesperado"):
                refresh_public_news(source, Path(directory) / "invalid-manifest", "c" * 40)
            self.assertEqual(news.call_count, 2)

    @patch("stratasignal.build_public_site._read_news_feed")
    def test_news_refresh_rejects_unsafe_xml_before_creating_an_edition(self, read):
        atom = atom_feed(next(iter(EDITORIAL)))
        unsafe = b'<!DOCTYPE rdf:RDF SYSTEM "https://example.invalid/feed.dtd">'
        read.side_effect = [atom, unsafe + mdic_feed(MDIC_FEED_URL, MDIC_ARTICLE, "2026-09-16")]
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "published"
            source.mkdir()
            trade = b"{}"
            (source / "comex.json").write_bytes(trade)
            (source / "news.json").write_text("{}\n", encoding="utf-8")
            manifest = source / "source-manifest.json"
            previous = json.dumps({
                "product": "StrataSignal", "dataset_kind": "public_aggregate", "private_file_import": False,
                "trade_snapshot": {"path": "comex.json", "sha256": hashlib.sha256(trade).hexdigest()},
            })
            manifest.write_text(previous, encoding="utf-8")
            output = Path(directory) / "rejected"
            with patch("stratasignal.build_public_site.datetime", wraps=datetime) as clock:
                clock.now.return_value = FETCHED_AT
                with self.assertRaisesRegex(InputError, "Declaração XML proibida"):
                    refresh_public_news(source, output, "c" * 40)
            self.assertFalse(output.exists())
            self.assertEqual(manifest.read_text(encoding="utf-8"), previous)
            self.assertEqual((source / "news.json").read_text(encoding="utf-8"), "{}\n")
            self.assertEqual([call.args[0] for call in read.call_args_list], [FEED_URL, MDIC_FEED_URL])

    @patch("stratasignal.build_public_site.collect_news")
    @patch("stratasignal.build_public_site._fetch")
    def test_build_rejects_malformed_retained_trade_edition(self, fetch, news):
        fetch.side_effect = [reply(metadata()), reply({"list": [trade_record()]}), reply({"list": []})]
        news.return_value = parse_feed(atom_feed(next(iter(EDITORIAL))), FETCHED_AT)
        with tempfile.TemporaryDirectory() as directory:
            retained = Path(directory) / "previous.json"
            retained.write_text(json.dumps({
                "schema_version": 1, "dataset_kind": "public_aggregate", "source": "Comex Stat · SECEX/MDIC",
                "updated_on": "2025-01-31", "fetched_at": "2025-02-01T12:00:00+00:00",
                "months": ["2024-12"], "records": [{"month": "2024-12", "ncm": "25041000",
                    "country": "China", "flow": "import", "fob_usd": True, "kg": 700}],
            }), encoding="utf-8")
            with self.assertRaisesRegex(InputError, "Registro inválido"):
                build_public_site(Path(directory) / "site", "b" * 40, enable_ml=False,
                                  retained_trade_snapshots=[retained])
            self.assertFalse((Path(directory) / "site").exists())

    @patch("stratasignal.build_public_site._fetch")
    def test_invalid_or_duplicate_public_records_do_not_build(self, fetch):
        cases = [
            [trade_record(), trade_record(country="china")],
            [trade_record(monthNumber="10")],
            [trade_record(coNcm="00000000")],
            [trade_record(metricFOB="Infinity")],
            [trade_record(country="A\u202eB")],
        ]
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "site"
            for records in cases:
                with self.subTest(records=records):
                    fetch.side_effect = [reply(metadata()), reply({"list": records})]
                    with self.assertRaises(InputError):
                        build_public_site(output, enable_ml=False)
                    self.assertFalse(output.exists())

    @patch("stratasignal.build_public_site._fetch")
    def test_invalid_period_is_rejected_before_trade_requests(self, fetch):
        fetch.return_value = reply(metadata() | {"updated": "2024-12-30"})
        with self.assertRaises(InputError):
            collect_comex()
        fetch.assert_called_once_with("/general/dates/updated")


class WorldMarketsTests(unittest.TestCase):
    def test_bilateral_flows_count_once_and_preserve_partial_weight(self):
        with tempfile.TemporaryDirectory() as directory, ZipFile(Path(directory) / "trades.zip", "w") as archive:
            for year in YEARS:
                archive.writestr(f"BACI_HS22_Y{year}_V{VERSION}.csv", (
                    "t,i,j,k,v,q\n"
                    f"{year},1,2,260111,2.25,3.5\n"
                    f"{year},1,3,260111,1.5,NA\n"
                    f"{year},2,1,260112,0.0004,0\n"
                ))
            trade = {"2601": {}, "260111": {}}
            counts = _aggregate(archive, {"260111": ["2601", "260111"], "260112": ["2601"]},
                                {"1": "BR", "2": "AU", "3": None}, trade)
        self.assertEqual(counts, {str(year): 3 for year in YEARS})
        self.assertEqual(trade["2601"]["WORLD"][:2], [[3750, 3500, 2, 3], [3750, 3500, 2, 3]])
        self.assertEqual(trade["2601"]["BR"][:2], [[3750, 3500, 1, 2], [0, 0, 1, 1]])
        self.assertEqual(trade["260111"]["AU"][:2], [None, [2250, 3500, 1, 1]])


class NewsFeedTests(unittest.TestCase):
    def test_mdic_rss_keeps_curated_policy_context_and_separate_provenance(self):
        raw = mdic_feed(MDIC_FEED_URL, MDIC_ARTICLE, "2026-09-16")
        source, items = parse_mdic_feed(raw, FETCHED_AT)
        self.assertEqual(source["feed_entries"], 2)
        self.assertEqual(source["feed_sha256"], hashlib.sha256(raw).hexdigest())
        self.assertIsNone(source["feed_updated_at"])
        self.assertEqual([(x["source_id"], x["ncm"], x["countries"]) for x in items],
                         [("mdic", "25041000", ["Brasil"])])
        self.assertNotIn("UNTRUSTED", json.dumps(items))
        with self.assertRaises(InputError):
            parse_mdic_feed(raw.replace(b"2026-09-16", b"2026-09-17"), FETCHED_AT)

    @patch("stratasignal.build_public_site._read_news_feed")
    def test_november_archive_deduplicates_two_stories_tagged_with_both_minerals(self, read):
        september = mdic_feed(MDIC_FEED_URL, MDIC_ARTICLE, "2026-09-16")
        november = mdic_feed(MDIC_NOVEMBER_FEED_URL, MDIC_NOVEMBER_ARTICLE, "2026-11-05",
                            (MDIC_NOVEMBER_SEMINAR, "2026-11-03"))
        read.side_effect = [atom_feed(next(iter(EDITORIAL))), september, november]
        with patch("stratasignal.build_public_site.datetime", wraps=datetime) as clock:
            clock.now.return_value = FETCHED_AT
            news = collect_news()
        self.assertEqual([call.args[0] for call in read.call_args_list],
                         [FEED_URL, MDIC_FEED_URL, MDIC_NOVEMBER_FEED_URL])
        self.assertEqual([item["published_on"] for item in news["items"]],
                         ["2026-11-05", "2026-11-03", "2026-10-28", "2026-09-16"])
        self.assertEqual(news["mdic"]["feed_sha256"], hashlib.sha256(september).hexdigest())
        self.assertEqual(news["mdic_archives"][0]["feed_sha256"], hashlib.sha256(november).hexdigest())
        for article in news["items"][:2]:
            self.assertEqual(article["feed_url"], MDIC_NOVEMBER_FEED_URL)
            self.assertEqual(article["ncm"], "25041000")
            self.assertEqual(article["related_ncms"], ["28369100"])
            self.assertNotIn("UNTRUSTED", article["summary"])
        with self.assertRaises(InputError):
            parse_mdic_feed(november, FETCHED_AT, feed_url=MDIC_FEED_URL)

    def test_reconciles_reviewed_urls_and_ignores_feed_markup(self):
        primary, second = EDITORIAL
        raw = atom_feed(second, primary, primary, primary.replace("www.canada.ca", "www.canada.ca.example.invalid"))
        raw = raw.replace(b"TEXTO EXTERNO", b"<![CDATA[TEXTO EXTERNO <!DOCTYPE feed>]]>")
        news = parse_feed(raw, FETCHED_AT)
        self.assertEqual(news["feed_entries"], 4)
        self.assertEqual(news["feed_updated_at"], "2026-11-06T20:41:37+00:00")
        self.assertEqual(news["feed_sha256"], hashlib.sha256(raw).hexdigest())
        self.assertEqual([item["url"] for item in news["items"]], [primary, second])
        self.assertEqual([item["event_on"] for item in news["items"]], ["2026-10-28", None])
        self.assertNotIn("TEXTO EXTERNO", json.dumps(news))
        self.assertNotIn("localhost", json.dumps(news))

    def test_rejects_document_type_declarations_in_atom_and_rdf(self):
        feeds = (
            (parse_feed, "feed", atom_feed()),
            (parse_mdic_feed, "rdf:RDF", mdic_feed(MDIC_FEED_URL, MDIC_ARTICLE, "2026-09-16")),
        )
        for parse, root, raw in feeds:
            for declaration in (
                f'<!DOCTYPE {root} [<!ENTITY x "invalid">]>',
                f'<!DOCTYPE {root} SYSTEM "https://example.invalid/feed.dtd">',
            ):
                with self.subTest(root=root, declaration=declaration):
                    with self.assertRaisesRegex(InputError, "Declaração XML proibida"):
                        parse(declaration.encode() + raw, FETCHED_AT)

    def test_rejects_unbounded_and_invalid_feeds(self):
        samples = [
            b"\xff",
            b"x" * (MAX_FEED_BYTES + 1),
            atom_feed(*(["https://example.invalid/"] * 51)),
            atom_feed(updated="2026-11-06T15:41:37"),
            atom_feed(updated="2026-11-08T15:41:37-05:00"),
            atom_feed().replace(SOURCE.encode(), b"Different source"),
            b"<invalid>",
        ]
        for raw in samples:
            with self.subTest(size=len(raw)), self.assertRaises(InputError):
                parse_feed(raw, FETCHED_AT)
