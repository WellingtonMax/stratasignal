import hashlib
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from stratasignal.build_public_site import build_public_site, collect_comex
from stratasignal.public_news import EDITORIAL, MAX_FEED_BYTES, SOURCE, parse_feed
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


FETCHED_AT = datetime(2026, 11, 7, 18, 0, tzinfo=timezone.utc)


class PublicSiteTests(unittest.TestCase):
    @patch("stratasignal.build_public_site.collect_news")
    @patch("stratasignal.build_public_site._fetch")
    def test_build_keeps_public_snapshots_outside_the_synthetic_workbench(self, fetch, news):
        fetch.side_effect = [reply(metadata()), reply({"list": [trade_record()]}), reply({"list": []})]
        news.return_value = parse_feed(atom_feed(next(iter(EDITORIAL))), FETCHED_AT)
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
            self.assertEqual(manifest["dataset_kind"], "public_aggregate")
            self.assertEqual(demo["dataset_kind"], "synthetic")
            self.assertEqual(manifest["source_commit"], demo["source_commit"])
            self.assertFalse(manifest["private_file_import"])
            self.assertFalse(demo["private_file_import"])
            self.assertFalse((output / "carteira/comex.json").exists())
            self.assertFalse((output / "carteira/news.json").exists())
            news_bytes = (output / "news.json").read_bytes()
            self.assertEqual(json.loads(news_bytes), news.return_value)
            self.assertEqual(manifest["news_snapshot"]["sha256"], hashlib.sha256(news_bytes).hexdigest())
            self.assertEqual(manifest["news_snapshot"]["feed_updated_at"], "2026-11-06T20:41:37+00:00")
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
