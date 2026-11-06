import copy
import unittest
from stratasignal.analytics import analyze, metadata_flags, scenario
from stratasignal.demo import demo_bundle
from stratasignal.schema import InputError, validate_bundle


class CoreTests(unittest.TestCase):
    def setUp(self):
        self.data = demo_bundle()
        self.report = analyze(self.data, "a" * 64, enable_ml=False)

    def test_country_hhi_and_stock_coverage_have_known_values(self):
        graphite = next(m for m in self.report["materials"] if m["material"] == "graphite-flake")
        self.assertAlmostEqual(graphite["country_hhi"], 5968)
        self.assertAlmostEqual(graphite["coverage_days"], 16.67)
        self.assertEqual(graphite["priority_score"], 69)

    def test_materials_do_not_mix_specifications(self):
        self.assertEqual(len(self.report["materials"]), 3)
        self.assertEqual(sum(m["monthly_demand_kg"] == 18000 for m in self.report["materials"]), 1)

    def test_full_shock_consumes_only_affected_supply(self):
        result = scenario(self.report["materials"], "CN", 45, 1)
        graphite = next(m for m in result["outcomes"] if m["material"] == "graphite-flake")
        # 18,000 / 30 * .72 * 45 - 10,000.
        self.assertEqual(graphite["uncovered_kg"], 9440)

    def test_zero_shock_does_not_create_a_deficit(self):
        result = scenario(self.report["materials"], "CN", 180, 0)
        self.assertTrue(all(m["uncovered_kg"] == 0 and m["stockout_day"] is None for m in result["outcomes"]))

    def test_unaffected_material_has_no_deficit(self):
        result = scenario(self.report["materials"], "CN", 180, 1)
        lithium = next(m for m in result["outcomes"] if m["material"] == "lithium-carbonate")
        self.assertEqual(lithium["affected_share"], 0)
        self.assertEqual(lithium["uncovered_kg"], 0)

    def test_metadata_flags_explain_distinct_problems(self):
        codes = {f["code"] for f in metadata_flags(self.data)}
        self.assertEqual(codes, {"shared_fingerprint", "expired_evidence", "origin_mismatch", "missing_evidence", "issue_after_observation"})

    def test_missing_evidence_does_not_mean_fraud(self):
        self.data["evidence"] = []
        flags = metadata_flags(self.data)
        self.assertEqual(len(flags), 6)
        self.assertTrue(all(f["code"] == "missing_evidence" for f in flags))

    def test_open_overdue_orders_count_as_observed_delays(self):
        self.data["orders"] = [{"id": "open-order", "material": "graphite-flake", "supplier": "CN-01", "origin_country": "CN", "ordered_on": "2026-08-01", "promised_on": "2026-09-01", "received_on": None, "quantity_kg": 200}]
        report = analyze(self.data, "a" * 64, enable_ml=False)
        m = next(m for m in report["materials"] if m["material"] == "graphite-flake")
        self.assertEqual((m["observed_orders"], m["observed_late_rate"]), (1, 1))

    def test_inconsistent_stock_per_material_is_rejected(self):
        self.data["positions"][1]["stock_kg"] += 1
        with self.assertRaises(InputError):
            validate_bundle(self.data)

    def test_allocations_must_sum_to_one(self):
        self.data["positions"][0]["allocation_share"] = .8
        with self.assertRaises(InputError):
            validate_bundle(self.data)

    def test_duplicate_orders_are_rejected(self):
        self.data["orders"].append(copy.deepcopy(self.data["orders"][0]))
        with self.assertRaises(InputError):
            validate_bundle(self.data)

    def test_orphan_orders_are_rejected(self):
        self.data["orders"][0]["supplier"] = "unregistered"
        with self.assertRaises(InputError):
            validate_bundle(self.data)

    def test_historical_cut_rejects_future_receipt(self):
        self.data["orders"][0]["received_on"] = "2027-01-01"
        with self.assertRaises(InputError):
            validate_bundle(self.data)


if __name__ == "__main__":
    unittest.main()
