import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from stratasignal.public_gallium import assess_supply, load_edition, trade_scope, write_snapshot
from stratasignal.schema import InputError


class GalliumEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.edition = load_edition()

    def read_candidate(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "candidate.json"
            path.write_text(json.dumps(self.edition), encoding="utf-8")
            return load_edition(path)

    def test_current_cases_distinguish_research_capacity_and_unavailable_production(self):
        records = {record["id"]: record for record in self.edition["records"]}
        self.assertEqual(list(records), [f"GA-{i:02}" for i in range(1, 9)])
        for code, stage in (("BR", "primary_recovery"), ("BR", "purification"),
                            ("US", "primary_recovery"), ("US", "purification"), ("CA", "primary_recovery")):
            with self.subTest(country=code, stage=stage):
                self.assertEqual(assess_supply(self.edition, code, stage),
                                 {"country": code, "stage": stage, "status": "unavailable", "evidence_ids": []})
        self.assertEqual(records["GA-02"]["product"], "alumina")
        self.assertEqual(records["GA-04"]["country"], "US")
        self.assertEqual(records["GA-04"]["status"], "research_reported")
        self.assertEqual(records["GA-05"]["measure"],
                         {"kind": "announced_capacity_upper_bound", "value": 4, "unit": "t_gallium_per_year"})

    def test_commercial_production_requires_compatible_evidence(self):
        candidate = self.edition["records"][2]
        # Fictional amendment exercises the rule and is never packaged.
        candidate.update(
            id="synthetic-recovery", product="gallium_metal", status="operation_documented",
            facility_id="synthetic-installation", reference_period="2025",
            measure={"kind": "commercial_production", "value": 0, "unit": "t_gallium"},
        )
        approved = self.read_candidate()
        self.assertEqual(assess_supply(approved, "BR", "primary_recovery")["evidence_ids"], ["synthetic-recovery"])
        self.assertEqual(assess_supply(approved, "BR", "purification")["status"], "unavailable")
        self.assertEqual(assess_supply(approved, "US", "primary_recovery")["status"], "unavailable")
        for key, invalid in (("product", "alumina"), ("status", "research_reported"),
                             ("status", "project_announced"), ("facility_id", None), ("reference_period", None)):
            with self.subTest(key=key, invalid=invalid):
                previous = candidate[key]
                candidate[key] = invalid
                with self.assertRaisesRegex(InputError, "Produção comercial exige"):
                    self.read_candidate()
                candidate[key] = previous
        candidate["measure"]["unit"] = "t_alumina"
        with self.assertRaisesRegex(InputError, "Produção comercial exige"):
            self.read_candidate()
        candidate["measure"]["unit"] = "t_gallium"
        for invalid in (True, float("nan"), -1):
            candidate["measure"]["value"] = invalid
            with self.subTest(value=invalid), self.assertRaises(InputError):
                self.read_candidate()

    def test_trade_scope_keeps_group_codes_separate_and_requires_valid_coverage(self):
        common = {"system": "NCM", "revision": "classif-2026-11-10", "code": "81129200",
                  "start": "2022-04-01", "end": "2024-12-31"}
        for code in ("81129200", "81129900"):
            scope = trade_scope(self.edition, **(common | {"code": code}))
            self.assertEqual(scope["status"], "group_only")
            self.assertEqual(scope["classification"]["code"], code)
            self.assertEqual(scope["classification"]["scope"], "group")
            self.assertIsNone(scope["gallium_amounts"])
        for difference in ({"start": "2022-03-31"}, {"revision": "2017"}, {"system": "HS"},
                           {"code": "811292"}, {"end": "2026-11-11"}):
            scope = trade_scope(self.edition, **(common | difference))
            self.assertEqual(scope, {"status": "classification_unavailable", "classification": None,
                                     "gallium_amounts": None})

    def test_rejects_unapproved_source_urls_and_duplicate_evidence(self):
        source = self.edition["sources"]["hydro-mina"]
        previous = source["url"]
        for url in ("javascript:alert(1)", "https://example.com/source", "https://user@www.hydro.com/source"):
            source["url"] = url
            with self.subTest(url=url), self.assertRaisesRegex(InputError, "Endereço de fonte"):
                self.read_candidate()
        source["url"] = previous
        self.edition["records"].append(self.edition["records"][0])
        with self.assertRaisesRegex(InputError, "Evidência do gálio duplicada"):
            self.read_candidate()

    def test_writing_same_edition_is_reproducible_and_exclusive(self):
        with tempfile.TemporaryDirectory() as a, tempfile.TemporaryDirectory() as b:
            first = write_snapshot(a, "202601", (2022, 2023, 2024))
            second = write_snapshot(b, "202601", (2022, 2023, 2024))
            self.assertEqual(first, second)
            relative = Path(first["path"]).relative_to("mercados")
            self.assertEqual((Path(a) / relative).read_bytes(), (Path(b) / relative).read_bytes())
            with self.assertRaises(FileExistsError):
                write_snapshot(a, "202601", (2022, 2023, 2024))
            original = (Path(a) / relative).read_bytes()
            self.edition["records"][0]["summary"] += " Revisão sintética para testar a retenção."
            with patch("stratasignal.public_gallium.load_edition", return_value=self.edition):
                revised = write_snapshot(a, "202601", (2022, 2023, 2024))
            self.assertNotEqual(revised["sha256"], first["sha256"])
            self.assertEqual((Path(a) / relative).read_bytes(), original)
