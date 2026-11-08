import hashlib
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from stratasignal.build_public_site import build_public_site, collect_comex, collect_news
from stratasignal.public_news import (
    EDITORIAL, FEED_URL, MAX_FEED_BYTES, MDIC_ARTICLE, MDIC_FEED_URL,
    MDIC_NOVEMBER_ARTICLE, MDIC_NOVEMBER_FEED_URL, SOURCE, parse_feed, parse_mdic_feed,
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


def mdic_feed(feed_url, article, published_on):
    entry = (f'<item rdf:about="{article}"><link>{article}</link>'
             f'<dc:date>{published_on}T21:15:00Z</dc:date><description>UNTRUSTED</description></item>')
    return ('<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"'
            ' xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">'
            f'<channel rdf:about="{feed_url}"/>{entry * 2}</rdf:RDF>').encode()


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
            basemap = output / manifest["partner_map"]["basemap_path"]
            self.assertEqual(manifest["partner_map"]["basemap_sha256"], hashlib.sha256(basemap.read_bytes()).hexdigest())
            self.assertIn('href="carteira/world-land.svg"', (output / "index.html").read_text(encoding="utf-8"))
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
            self.assertIn('href="mercados/"', (output / "index.html").read_text(encoding="utf-8"))
            self.assertTrue((output / "mercados/index.html").is_file())
            self.assertTrue((output / "mercados/markets.js").is_file())
            news_bytes = (output / "news.json").read_bytes()
            self.assertEqual(json.loads(news_bytes), news.return_value)
            self.assertEqual(manifest["news_snapshot"]["sha256"], hashlib.sha256(news_bytes).hexdigest())
            self.assertEqual(manifest["news_snapshot"]["feed_updated_at"], "2026-11-06T20:41:37+00:00")
            self.assertEqual(manifest["news_snapshot"]["mdic_archives"], [november])
            self.assertIn('id="public-home" class=', (output / "carteira/index.html").read_text())
            self.assertEqual([call.args[1]["flow"] for call in fetch.call_args_list[1:]], ["import", "export"])
            self.assertEqual(fetch.call_args_list[1].args[1]["period"], {"from": "2024-11", "to": "2025-01"})
            with self.assertRaises(FileExistsError):
                build_public_site(output)
            self.assertEqual(fetch.call_count, 3)
            news.assert_called_once_with()

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
    def test_november_archive_adds_one_story_for_two_minerals(self, read):
        september = mdic_feed(MDIC_FEED_URL, MDIC_ARTICLE, "2026-09-16")
        november = mdic_feed(MDIC_NOVEMBER_FEED_URL, MDIC_NOVEMBER_ARTICLE, "2026-11-05")
        read.side_effect = [atom_feed(next(iter(EDITORIAL))), september, november]
        with patch("stratasignal.build_public_site.datetime", wraps=datetime) as clock:
            clock.now.return_value = FETCHED_AT
            news = collect_news()
        self.assertEqual([call.args[0] for call in read.call_args_list],
                         [FEED_URL, MDIC_FEED_URL, MDIC_NOVEMBER_FEED_URL])
        self.assertEqual([item["published_on"] for item in news["items"]],
                         ["2026-11-05", "2026-10-28", "2026-09-16"])
        self.assertEqual(news["mdic"]["feed_sha256"], hashlib.sha256(september).hexdigest())
        self.assertEqual(news["mdic_archives"][0]["feed_sha256"], hashlib.sha256(november).hexdigest())
        article = news["items"][0]
        self.assertEqual(article["feed_url"], MDIC_NOVEMBER_FEED_URL)
        self.assertEqual(article["ncm"], "25041000")
        self.assertEqual(article["related_ncms"], ["28369100"])
        self.assertNotIn("UNTRUSTED", article["summary"])
        with self.assertRaises(InputError):
            parse_mdic_feed(november, FETCHED_AT, feed_url=MDIC_FEED_URL)

    def test_reconciles_reviewed_urls_and_ignores_feed_markup(self):
        primary, second = EDITORIAL
        raw = atom_feed(second, primary, primary, primary.replace("www.canada.ca", "www.canada.ca.example.invalid"))
        news = parse_feed(raw, FETCHED_AT)
        self.assertEqual(news["feed_entries"], 4)
        self.assertEqual(news["feed_updated_at"], "2026-11-06T20:41:37+00:00")
        self.assertEqual(news["feed_sha256"], hashlib.sha256(raw).hexdigest())
        self.assertEqual([item["url"] for item in news["items"]], [primary, second])
        self.assertEqual([item["event_on"] for item in news["items"]], ["2026-10-28", None])
        self.assertNotIn("TEXTO EXTERNO", json.dumps(news))
        self.assertNotIn("localhost", json.dumps(news))

    def test_rejects_doctype_unbounded_and_invalid_feeds(self):
        samples = [
            b'<!DOCTYPE feed [<!ENTITY x "invalid">]>' + atom_feed(),
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
