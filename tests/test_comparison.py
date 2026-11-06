import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from stratasignal.analytics import analyze
from stratasignal.comparison import compare_bundles
from stratasignal.__main__ import main, serialized
from stratasignal.schema import InputError, validate_bundle


def snapshots():
    previous = {
        "schema_version": 1, "dataset_kind": "synthetic", "portfolio_id": "pilot-demo",
        "as_of": "2026-10-06",
        "positions": [{"material": "graphite", "material_name": "Graphite specification A", "supplier": "SUP-A",
                       "origin_country": "CN", "allocation_share": 1.0, "monthly_demand_kg": 1000,
                       "stock_kg": 500, "nominal_lead_days": 30, "unit_cost_usd": 4}],
        "orders": [],
        "evidence": [{"id": "EV-A", "material": "graphite", "supplier": "SUP-A", "origin_country": "CN",
                      "observed_on": "2026-10-01", "issued_on": "2026-01-01", "expires_on": "2026-10-20", "sha256": "a" * 64}]
    }
    current = copy.deepcopy(previous)
    current["as_of"] = "2026-11-06"
    current["positions"][0]["stock_kg"] = 800
    return previous, current


class ComparisonTests(unittest.TestCase):
    def compare(self, previous, current):
        return compare_bundles(previous, current, "1" * 64, "2" * 64)

    def test_coverage_changes_and_document_expiration_are_separate_observations(self):
        previous, current = snapshots()
        result = self.compare(previous, current)
        self.assertEqual(result["elapsed_days"], 31)
        change = result["materials"][0]
        self.assertEqual(change["metrics"]["coverage_days"], {"previous": 15, "current": 24, "delta": 9})
        self.assertEqual(change["new_signals"][0]["code"], "expired_evidence")
        self.assertEqual(result["summary"]["new_signals"], 1)

    def test_diversification_tracks_concentration_and_supplier_changes(self):
        previous, current = snapshots()
        current["positions"][0]["allocation_share"] = .5
        new_position = copy.deepcopy(current["positions"][0])
        new_position.update(supplier="SUP-B", origin_country="BR")
        current["positions"].append(new_position)
        result = self.compare(previous, current)["materials"][0]
        self.assertEqual(result["metrics"]["country_hhi"]["delta"], -5000)
        self.assertEqual(result["supplier_changes"], {"added": ["SUP-B"], "removed": [], "changed": ["SUP-A"]})
        self.assertEqual(result["country_share_changes"][0]["delta_percentage_points"], 50)

    def test_disappearing_signal_is_reported_without_claiming_remediation(self):
        previous, current = snapshots()
        previous["evidence"][0]["expires_on"] = "2026-09-01"
        current["evidence"][0]["expires_on"] = "2027-01-01"
        result = self.compare(previous, current)
        self.assertEqual(result["summary"]["cleared_signals"], 1)
        self.assertEqual(result["materials"][0]["cleared_signals"][0]["code"], "expired_evidence")
        self.assertIn("não comprovam resolução", result["scope"])

    def test_changed_specification_suspends_deltas(self):
        previous, current = snapshots()
        current["positions"][0]["material_name"] = "Graphite specification B"
        result = self.compare(previous, current)
        self.assertEqual(result["materials"][0]["status"], "specification_changed")
        self.assertFalse(result["materials"][0]["metrics"])
        self.assertEqual(result["summary"]["specification_changes"], 1)
        self.assertEqual(result["summary"]["new_signals"], 0)

    def test_added_and_removed_materials_are_not_given_fabricated_deltas(self):
        previous, current = snapshots()
        before = copy.deepcopy(previous["positions"][0])
        before.update(material="old-material", material_name="Old material")
        after = copy.deepcopy(current["positions"][0])
        after.update(material="new-material", material_name="New material")
        previous["positions"].append(before)
        current["positions"].append(after)
        result = self.compare(previous, current)
        statuses = {m["material"]: m for m in result["materials"]}
        self.assertEqual(statuses["old-material"]["status"], "removed")
        self.assertEqual(statuses["new-material"]["status"], "added")
        self.assertFalse(statuses["new-material"]["metrics"])
        self.assertEqual(result["summary"]["cleared_signals"], 0)

    def test_different_portfolios_are_rejected(self):
        previous, current = snapshots()
        current["portfolio_id"] = "different-portfolio"
        with self.assertRaises(InputError):
            self.compare(previous, current)

    def test_synthetic_and_client_snapshots_cannot_be_mixed(self):
        previous, current = snapshots()
        current["dataset_kind"] = "client"
        with self.assertRaises(InputError):
            self.compare(previous, current)

    def test_missing_portfolio_id_preserves_analysis_compatibility_but_blocks_comparison(self):
        previous, current = snapshots()
        del previous["portfolio_id"]
        self.assertEqual(analyze(previous, "a" * 64, enable_ml=False)["dataset_kind"], "synthetic")
        with self.assertRaises(InputError):
            self.compare(previous, current)

    def test_nonchronological_snapshots_are_rejected(self):
        previous, current = snapshots()
        for cutoff in ("2026-10-06", "2026-10-05"):
            current["as_of"] = cutoff
            with self.subTest(cutoff=cutoff), self.assertRaises(InputError):
                self.compare(previous, current)

    def test_portfolio_identifier_is_bounded(self):
        previous, _ = snapshots()
        previous["portfolio_id"] = "../../another-client"
        with self.assertRaises(InputError):
            validate_bundle(previous)

    def test_cli_generates_current_report_and_anchors_both_input_hashes(self):
        previous, current = snapshots()
        with tempfile.TemporaryDirectory() as directory:
            old_path, new_path = Path(directory) / "old.json", Path(directory) / "new.json"
            old_path.write_text(serialized(previous), encoding="utf-8")
            new_path.write_text(serialized(current), encoding="utf-8")
            out = Path(directory) / "report"
            self.assertEqual(main(["compare", "--previous", str(old_path), "--current", str(new_path), "--out", str(out), "--without-ml"]), 0)
            report = json.loads((out / "report.json").read_text())
            manifest = json.loads((out / "manifest.json").read_text())
            self.assertEqual(report["comparison"]["previous_as_of"], previous["as_of"])
            self.assertEqual(manifest["previous_input_sha256"], hashlib.sha256(old_path.read_bytes()).hexdigest())
            self.assertEqual(manifest["input_sha256"], hashlib.sha256(new_path.read_bytes()).hexdigest())
            self.assertIn("comparison-table", (out / "report.html").read_text())

    def test_cli_invalid_comparison_does_not_create_an_output_directory(self):
        previous, current = snapshots()
        current["portfolio_id"] = "other"
        with tempfile.TemporaryDirectory() as directory:
            old_path, new_path = Path(directory) / "old.json", Path(directory) / "new.json"
            old_path.write_text(serialized(previous), encoding="utf-8")
            new_path.write_text(serialized(current), encoding="utf-8")
            out = Path(directory) / "report"
            self.assertEqual(main(["compare", "--previous", str(old_path), "--current", str(new_path), "--out", str(out), "--without-ml"]), 2)
            self.assertFalse(out.exists())

    def test_monthly_demo_provides_two_synthetic_inputs_and_a_known_coverage_change(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / "report"
            self.assertEqual(main(["demo", "--with-comparison", "--without-ml", "--out", str(out)]), 0)
            report = json.loads((out / "report.json").read_text())
            graphite = next(m for m in report["comparison"]["materials"] if m["material"] == "graphite-flake")
            self.assertEqual(graphite["metrics"]["coverage_days"]["delta"], 10)
            self.assertTrue((out / "input.synthetic.json").exists())
            self.assertTrue((out / "input.previous.synthetic.json").exists())


if __name__ == "__main__":
    unittest.main()
