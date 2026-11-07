import copy
import json
import unittest
from datetime import date, timedelta

from stratasignal.analytics import analyze, scenario
from stratasignal.benchmark import capacity_fixture
from stratasignal.intelligence import decision_support, wilson_interval
from stratasignal.schema import InputError, MAX_BYTES, text_value, validate_bundle
from stratasignal.importer import normalized_json


def small_bundle():
    return {"schema_version": 1, "dataset_kind": "synthetic", "portfolio_id": "history-test", "as_of": "2026-11-06",
        "positions": [{"material": "M", "material_name": "Material fictício", "supplier": "S", "origin_country": "CN",
            "allocation_share": 1, "monthly_demand_kg": 300, "stock_kg": 30, "nominal_lead_days": 31, "unit_cost_usd": 10}],
        "orders": [], "evidence": []}


class IntelligenceTests(unittest.TestCase):
    def test_wilson_interval_shows_small_sample_uncertainty_and_empty_history(self):
        self.assertIsNone(wilson_interval(0, 0))
        low, high = wilson_interval(5, 10)
        self.assertAlmostEqual(low, .236593, places=5)
        self.assertAlmostEqual(high, .763407, places=5)
        self.assertGreater(wilson_interval(0, 1)[1], .79)

    def test_open_overdue_orders_count_as_late_but_do_not_enter_received_p90(self):
        data = small_bundle()
        for i in range(1, 11):
            data["orders"].append({"id": "O"+str(i), "material": "M", "supplier": "S", "origin_country": "CN",
                "ordered_on": "2026-01-01", "promised_on": "2026-02-01",
                "received_on": (date(2026, 1, 1)+timedelta(days=i*10)).isoformat(), "quantity_kg": 10})
        for oid, promised in (("overdue", "2026-08-01"), ("pending", "2026-12-01")):
            data["orders"].append({"id": oid, "material": "M", "supplier": "S", "origin_country": "CN",
                "ordered_on": "2026-07-01", "promised_on": promised, "received_on": None, "quantity_kg": 10})
        intelligence = analyze(data, "a"*64, enable_ml=False)["intelligence"]
        self.assertEqual(intelligence["delivery_months"], [
            {"month": "2026-01", "received_on_time": 3, "received_late": 7, "open_overdue": 0, "open_pending": 0},
            {"month": "2026-07", "received_on_time": 0, "received_late": 0, "open_overdue": 1, "open_pending": 1},
        ])
        result = intelligence["supplier_performance"][0]
        self.assertEqual((result["observed_orders"], result["late_orders"], result["not_yet_observable"]), (11, 8, 1))
        self.assertEqual((result["received_lead_p90_days"], result["open_overdue_orders"]), (90, 1))
        self.assertEqual(result["sample_status"], "small_sample")

    def test_no_orders_yields_no_estimate_or_percentile_and_serializes_finitely(self):
        result = analyze(small_bundle(), "a"*64, enable_ml=False)
        position = result["intelligence"]["supplier_performance"][0]
        self.assertEqual(result["intelligence"]["delivery_months"], [])
        self.assertIsNone(position["late_rate"])
        self.assertIsNone(position["received_lead_p90_days"])
        json.dumps(result, allow_nan=False)

    def test_every_stress_cell_matches_the_existing_conditional_engine(self):
        data = capacity_fixture(materials=4, orders_per_position=2, evidence_per_position=1)
        report = analyze(data, "a"*64, enable_ml=False)
        for cell in report["intelligence"]["stress_matrix"]:
            result = scenario(report["materials"], cell["country"], cell["duration_days"], cell["reduction"])
            self.assertEqual(set(cell["materials_without_coverage"]), {o["material"] for o in result["outcomes"] if o["uncovered_kg"] > 0})
            self.assertAlmostEqual(cell["replacement_reference_usd"], sum(o["replacement_reference_usd"] for o in result["outcomes"]), delta=.03)

    def test_known_single_origin_shortfall_has_reference_cost_not_aggregated_mineral_kg(self):
        result = analyze(small_bundle(), "a"*64, enable_ml=False)["intelligence"]
        cell = next(c for c in result["stress_matrix"] if c["duration_days"]==30 and c["reduction"]==1)
        self.assertEqual(cell["replacement_reference_usd"], 2700)
        self.assertEqual(result["origin_dependencies"][0]["reference_monthly_usd"], 3000)
        self.assertNotIn("total_mineral_kg", cell)

    def test_stress_grid_is_bounded_without_dropping_other_country_dependencies(self):
        data = small_bundle()
        data["positions"] = [{**data["positions"][0], "material": "M"+str(i), "origin_country": "A"+chr(65+i)} for i in range(13)]
        result = analyze(data, "a"*64, enable_ml=False)["intelligence"]
        self.assertEqual((len(result["origin_dependencies"]), len(result["stress_matrix"])), (13, 108))
        self.assertEqual(result["stress_grid"]["countries_outside_grid"], 1)

    def test_unicode_directional_spoofing_controls_are_rejected(self):
        for value in ("grade\u202e123", "supplier\u200bhidden", "label\x85next"):
            with self.assertRaises(InputError):
                text_value(value)
        self.assertEqual(text_value("Óxido NdPr · 氧化物"), "Óxido NdPr · 氧化物")


class CapacityTests(unittest.TestCase):
    def test_full_declared_capacity_validates_and_preserves_material_and_position_counts(self):
        data = capacity_fixture()
        self.assertLess(len(normalized_json(data).encode()), MAX_BYTES)
        report = analyze(data, "a"*64, enable_ml=False)
        self.assertEqual((len(report["materials"]), len(report["intelligence"]["supplier_performance"])), (100, 500))
        self.assertEqual((len(data["orders"]), len(data["evidence"])), (20000, 5000))
        self.assertEqual(sum(m["observed_orders"] for m in report["materials"]), 20000)
        self.assertEqual(report["metadata_flags"], [])
        data["orders"].append(copy.deepcopy(data["orders"][0]))
        with self.assertRaises(InputError):
            validate_bundle(data)


if __name__ == "__main__":
    unittest.main()
