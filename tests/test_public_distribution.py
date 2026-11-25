"""Evidence release tests; no API work from tests."""
import copy
import hashlib
import json
import tempfile
import unittest
from collections import defaultdict
from pathlib import Path

from stratasignal.public_distribution import SOURCE, eligible, write_distribution
from stratasignal.schema import InputError


class DistributionTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(SOURCE.read_text(encoding="utf-8"))
        groups = defaultdict(lambda: [0, 0])
        for row in self.data["records"]:
            amounts = groups[row["month"], row["flow"], row["country"]]
            amounts[0] += row["fob_usd"]
            amounts[1] += row["kg"]
        self.snapshot = {"months": self.data["months"], "records": [
            {"month": key[0], "flow": key[1], "country": key[2], "ncm": "25041000",
             "fob_usd": values[0], "kg": values[1]} for key, values in groups.items()]}

    def test_hash_linked_edition_only_when_trade_totals_match(self):
        self.assertTrue(eligible(self.snapshot, self.data))
        self.assertEqual(len(self.snapshot["records"]), 69)
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "edicoes").mkdir()
            info = write_distribution(root, self.snapshot, "b" * 64)
            output = (root / info["path"]).read_bytes()
            self.assertEqual(hashlib.sha256(output).hexdigest(), info["sha256"])
            self.assertEqual(json.loads(output)["trade_sha256"], "b" * 64)
            self.snapshot["records"][0]["kg"] += 1
            self.assertIsNone(write_distribution(root, self.snapshot, "b" * 64))

    def test_duplicate_or_unrecognized_mode_is_a_build_error(self):
        duplicate = copy.deepcopy(self.data)
        duplicate["records"].append(duplicate["records"][0])
        with self.assertRaises(InputError):
            eligible(self.snapshot, duplicate)
        invalid = copy.deepcopy(self.data)
        invalid["records"][0]["mode"] = "rota_sugerida"
        with self.assertRaises(InputError):
            eligible(self.snapshot, invalid)
