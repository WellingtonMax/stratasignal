import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest
from stratasignal.analytics import analyze
from stratasignal.demo import demo_bundle
from stratasignal.report import csp_hash, render_html, write_private, write_report, WEB
from stratasignal.schema import InputError, number, read_json, validate_bundle
from stratasignal.__main__ import main


class SecurityTests(unittest.TestCase):
    def test_nonfinite_boolean_and_huge_numeric_inputs_fail(self):
        for value in (float("nan"), float("inf"), True, 10 ** 500, -1):
            with self.subTest(value_type=type(value)):
                with self.assertRaises(InputError):
                    number(value)

    def test_duplicate_json_keys_are_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "input.json"
            p.write_text('{"positions":[],"positions":[1]}')
            with self.assertRaises(InputError):
                read_json(p)

    def test_json_size_limit(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "input.json"
            p.write_text('"' + "a" * 100 + '"')
            with self.assertRaises(InputError):
                read_json(p, max_bytes=50)

    def test_path_injection_cannot_be_an_identifier(self):
        data = demo_bundle()
        data["positions"][0]["supplier"] = "../../private"
        with self.assertRaises(InputError):
            validate_bundle(data)

    def test_unknown_fields_are_rejected(self):
        data = demo_bundle()
        data["send_to_url"] = "https://example.invalid"
        with self.assertRaises(InputError):
            validate_bundle(data)

    def test_embedded_script_is_inert_and_csp_is_hashed(self):
        data = demo_bundle()
        attack = '</script><script>globalThis.pwned=1</script><img src=x onerror="alert(1)">'
        for p in data["positions"]:
            if p["material"] == "graphite-flake":
                p["material_name"] = attack
        report = analyze(data, "a" * 64, enable_ml=False)
        html = render_html(report)
        self.assertNotIn(attack, html)
        self.assertIn("\\u003c/script\\u003e", html)
        self.assertIn(csp_hash((WEB / "app.js").read_text()), html)
        self.assertIn("connect-src 'none'", html)
        self.assertNotIn("unsafe-inline", html)
        self.assertNotIn("innerHTML", (WEB / "app.js").read_text())

    def test_report_refuses_existing_output_directory(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(FileExistsError):
                write_report(analyze(demo_bundle(), "a" * 64, enable_ml=False), d)

    def test_writer_refuses_symlink_without_touching_target(self):
        with tempfile.TemporaryDirectory() as d:
            target = Path(d) / "target"
            target.write_text("original")
            link = Path(d) / "link"
            link.symlink_to(target)
            with self.assertRaises(OSError):
                write_private(link, "changed")
            self.assertEqual(target.read_text(), "original")

    @unittest.skipIf(os.name == "nt", "POSIX permissions")
    def test_report_permissions_and_manifest_integrity(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "report"
            write_report(analyze(demo_bundle(), "a" * 64, enable_ml=False), out)
            self.assertEqual(out.stat().st_mode & 0o777, 0o700)
            manifest = json.loads((out / "manifest.json").read_text())
            for name, expected in manifest["artifacts"].items():
                p = out / name
                self.assertEqual(p.stat().st_mode & 0o777, 0o600)
                self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(), expected)

    def test_cli_invalid_scenario_does_not_write_output(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "report"
            self.assertEqual(main(["demo", "--out", str(out), "--without-ml", "--reduction", "2"]), 2)
            self.assertFalse(out.exists())

    def test_empty_client_history_is_supported_without_ml(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "report"
            self.assertEqual(main(["analyze", "--input", "examples/minimal-client.json", "--out", str(out), "--without-ml"]), 0)
            self.assertEqual(json.loads((out / "report.json").read_text())["dataset_kind"], "client")


if __name__ == "__main__":
    unittest.main()
