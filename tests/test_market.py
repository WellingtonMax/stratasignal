import copy
import tempfile
from pathlib import Path
import unittest
from stratasignal.market import import_comex, market_summary, validate_query
from stratasignal.schema import InputError

HEADER = "CO_ANO;CO_MES;CO_NCM;CO_PAIS;KG_LIQUIDO;VL_FOB;VL_FRETE;VL_SEGURO\n"
# Synthetic contract fixture matching the documented MDIC layout; NOT official observations.
BODY = "2026;01;25041000;160;100;200;1;1\n2026;01;25041000;160;50;90;1;1\n2026;01;25041000;105;50;100;1;1\n2026;02;99999999;160;9999;99999;1;1\n"


class MarketTests(unittest.TestCase):
    def load(self, content=HEADER + BODY, **kwargs):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "official-layout-fixture.csv"
            p.write_text(content)
            return import_comex(p, "25041000", "2026-01", "2026-09", **kwargs)

    def test_adapter_filters_and_aggregates_documented_rows(self):
        snapshot = self.load()
        self.assertEqual(snapshot["source_rows_matched"], 3)
        self.assertEqual(sum(r["kg"] for r in snapshot["records"]), 200)
        snapshot["imported_at"] = "2026-11-06T00:00:00+00:00"
        summary = market_summary(snapshot, "2026-11-06")
        self.assertEqual(summary["country_hhi"], 6250)
        self.assertEqual(summary["countries"][0]["share"], .75)

    def test_public_totals_do_not_infer_supplier_identity_or_purity(self):
        snapshot = self.load()
        snapshot["imported_at"] = "2026-11-06T00:00:00+00:00"
        summary = market_summary(snapshot, "2026-11-06")
        self.assertIn("não mede oferta mundial", summary["scope"])
        self.assertNotIn("supplier", summary)

    def test_duplicate_headers_rejected(self):
        with self.assertRaises(InputError):
            self.load(HEADER.replace("VL_SEGURO", "CO_ANO") + BODY)

    def test_negative_and_nonfinite_public_values_rejected(self):
        for value in ("-100", "nan", "inf"):
            with self.subTest(value=value), self.assertRaises(InputError):
                self.load(HEADER + BODY.replace(";100;200;", ";" + value + ";200;"))

    def test_import_file_cannot_be_labeled_as_export(self):
        with self.assertRaises(InputError):
            self.load(flow="export")

    def test_empty_public_filter_is_explicit(self):
        snapshot = self.load(HEADER + BODY.replace("25041000", "99999999"))
        snapshot["imported_at"] = "2026-11-06T00:00:00+00:00"
        summary = market_summary(snapshot, "2026-11-06")
        self.assertEqual(summary["total_kg"], 0)
        self.assertIsNone(summary["country_hhi"])

    def test_future_public_snapshot_is_rejected(self):
        snapshot = self.load()
        snapshot["imported_at"] = "2026-11-07T00:00:00+00:00"
        with self.assertRaises(InputError):
            market_summary(snapshot, "2026-11-06")

    def test_duplicate_public_aggregates_rejected(self):
        snapshot = self.load()
        snapshot["imported_at"] = "2026-11-06T00:00:00+00:00"
        snapshot["records"].append(copy.deepcopy(snapshot["records"][0]))
        with self.assertRaises(InputError):
            market_summary(snapshot, "2026-11-06")

    def test_ncm_and_periods_are_explicit_and_bounded(self):
        for ncm, start, end in (("auto", "2026-01", "2026-09"), ("25041000", "2027-01", "2026-09"), ("25041000", "2010-01", "2026-09")):
            with self.assertRaises(InputError):
                validate_query(ncm, start, end, "import")


if __name__ == "__main__":
    unittest.main()
