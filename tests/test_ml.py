import importlib.util
import unittest
from unittest.mock import patch
from datetime import date
from stratasignal.demo import demo_bundle
from stratasignal.ml import evaluate_delay_model, feature_rows, outcome


class TemporalFeatureTests(unittest.TestCase):
    def test_late_outcome_is_known_at_deadline_even_if_order_is_open(self):
        o = {"promised_on": "2026-02-10", "received_on": None}
        self.assertEqual(outcome(o), (1, date(2026, 2, 11)))

    def test_future_outcomes_do_not_enter_order_time_features(self):
        orders = [
            {"id": "A", "material": "M", "supplier": "S", "ordered_on": "2026-01-01", "promised_on": "2026-02-10", "received_on": "2026-02-20", "quantity_kg": 10},
            {"id": "B", "material": "M", "supplier": "S", "ordered_on": "2026-01-20", "promised_on": "2026-02-20", "received_on": "2026-02-19", "quantity_kg": 10},
            {"id": "C", "material": "M", "supplier": "S", "ordered_on": "2026-02-12", "promised_on": "2026-03-12", "received_on": None, "quantity_kg": 10},
        ]
        features = feature_rows(orders)
        self.assertEqual(features[1]["x"]["historical_late_rate"], .5)
        self.assertEqual(features[2]["x"]["historical_late_rate"], .6)
        orders[1]["received_on"] = "2026-02-25"
        changed = feature_rows(orders)
        self.assertEqual(features[1]["x"], changed[1]["x"])
        self.assertEqual(features[2]["x"], changed[2]["x"])


@unittest.skipUnless(importlib.util.find_spec("sklearn"), "ML optional dependency not installed")
class ModelTests(unittest.TestCase):
    def test_demo_model_is_explicitly_synthetic(self):
        result = evaluate_delay_model(demo_bundle())
        self.assertEqual(result["status"], "synthetic_demo")
        self.assertEqual(len(result["predictions"]), 6)
        self.assertLess(result["evaluation"]["latest_train_label_on"], result["evaluation"]["cutoff"])
        self.assertLess(result["evaluation"]["brier"], result["evaluation"]["baseline_brier"])

    def test_insufficient_history_abstains(self):
        data = demo_bundle()
        data["orders"] = data["orders"][:20]
        self.assertEqual(evaluate_delay_model(data)["status"], "abstained")

    def test_single_class_history_abstains(self):
        data = demo_bundle()
        for order in data["orders"]:
            order["received_on"] = order["promised_on"]
        self.assertEqual(evaluate_delay_model(data)["status"], "abstained")

    def test_worse_than_baseline_abstains(self):
        with patch("sklearn.metrics.brier_score_loss", side_effect=[.9, .2]):
            result = evaluate_delay_model(demo_bundle())
        self.assertEqual(result["status"], "abstained")
        self.assertFalse(result["predictions"])

    def test_out_of_distribution_quantity_suppresses_position_estimate(self):
        data = demo_bundle()
        for p in data["positions"]:
            p["monthly_demand_kg"] *= 1000
        result = evaluate_delay_model(data)
        self.assertTrue(all(p["estimated_delay_probability"] is None for p in result["predictions"]))

    def test_open_not_due_orders_are_right_censored(self):
        data = demo_bundle()
        data["orders"].append({"id": "NEW", "supplier": "CN-01", "material": "graphite-flake", "origin_country": "CN", "ordered_on": "2026-11-01", "promised_on": "2026-12-01", "received_on": None, "quantity_kg": 1000})
        result = evaluate_delay_model(data)
        self.assertEqual(result["evaluation"]["right_censored_orders"], 1)


if __name__ == "__main__":
    unittest.main()
