import copy
import csv
import hashlib
import http.client
import io
import json
import re
import socket
import tempfile
import threading
import time
import unittest
from pathlib import Path

from stratasignal.build_demo import build_demo
from stratasignal.demo import demo_bundle, demo_previous_bundle
from stratasignal.importer import (
    TABLE_FIELDS, bundle_from_csv, fingerprint, mapped_table, normalized_json,
    parse_json_text, preview_csv,
)
from stratasignal.schema import InputError
from stratasignal.workbench import MAX_REQUEST_BYTES, LocalPolicy, Workspace, create_server


def table_spec(table, records, *, comma=False, percent=False, br_dates=False):
    headers = list(TABLE_FIELDS[table])
    stream = io.StringIO(newline="")
    writer = csv.writer(stream, delimiter=";")
    writer.writerow(headers)
    for record in records:
        row = []
        for key in headers:
            value = record[key]
            if key == "allocation_share" and percent:
                value *= 100
            if type(value) in (int, float):
                value = str(value).replace(".", ",") if comma else str(value)
                if key == "allocation_share" and percent:
                    value += "%"
            if br_dates and key.endswith("_on") and value:
                value = "/".join(value.split("-")[::-1])
            row.append("" if value is None else value)
        writer.writerow(row)
    return {"text": stream.getvalue(), "delimiter": ";", "mapping": dict(zip(headers, headers)),
            "number_format": "decimal_comma" if comma else "decimal_dot",
            "date_format": "br" if br_dates else "iso", "allocation_unit": "percent" if percent else "fraction"}


def csv_payload(bundle, **options):
    return {"portfolio_id": bundle["portfolio_id"], "as_of": bundle["as_of"],
            "dataset_kind": bundle["dataset_kind"],
            "tables": {name: table_spec(name, bundle[name], **options) for name in TABLE_FIELDS if bundle[name]}}


class ImportTests(unittest.TestCase):
    def setUp(self):
        self.bundle = demo_bundle()
        self.bundle["orders"] = self.bundle["orders"][:2]

    def test_brazilian_csv_round_trip_preserves_units_dates_and_null_receipts(self):
        payload = csv_payload(self.bundle, comma=True, percent=True, br_dates=True)
        imported = bundle_from_csv(payload)
        self.assertEqual(imported, self.bundle)
        self.assertEqual(imported["positions"][0]["allocation_share"], .72)

    def test_arbitrary_headers_are_mapped_explicitly(self):
        payload = csv_payload(self.bundle)
        spec = payload["tables"]["positions"]
        columns = list(TABLE_FIELDS["positions"])
        new_headers = ["Coluna " + str(i) for i in range(len(columns))]
        spec["text"] = spec["text"].replace(";".join(columns), ";".join(new_headers), 1)
        spec["mapping"] = dict(zip(columns, new_headers))
        self.assertEqual(bundle_from_csv(payload), self.bundle)

    def test_optional_orders_and_evidence_support_initial_diagnostic(self):
        payload = csv_payload(self.bundle)
        payload["tables"] = {"positions": payload["tables"]["positions"]}
        imported = bundle_from_csv(payload)
        self.assertEqual((imported["orders"], imported["evidence"]), ([], []))

    def test_bom_and_grouped_brazilian_quantities_are_accepted(self):
        payload = csv_payload(self.bundle, comma=True, percent=True)
        spec = payload["tables"]["positions"]
        spec["text"] = "\ufeff" + spec["text"].replace("18000;", "18.000,00;")
        self.assertEqual(bundle_from_csv(payload), self.bundle)

    def test_wrong_locale_is_rejected_instead_of_guessing(self):
        payload = csv_payload(self.bundle, comma=True, percent=True)
        payload["tables"]["positions"]["number_format"] = "decimal_dot"
        with self.assertRaisesRegex(InputError, "linha 2, campo allocation_share"):
            bundle_from_csv(payload)

    def test_percent_sign_requires_explicit_percent_unit(self):
        payload = csv_payload(self.bundle, percent=True)
        payload["tables"]["positions"]["allocation_unit"] = "fraction"
        with self.assertRaisesRegex(InputError, "unidade percentual"):
            bundle_from_csv(payload)

    def test_non_iso_date_requires_explicit_date_format(self):
        payload = csv_payload(self.bundle, br_dates=True)
        payload["tables"]["orders"]["date_format"] = "iso"
        with self.assertRaises(InputError):
            bundle_from_csv(payload)

    def test_nullable_documentary_dates_can_be_unmapped(self):
        spec = table_spec("evidence", self.bundle["evidence"])
        spec["mapping"]["issued_on"] = None
        result = mapped_table(spec, "evidence")
        self.assertTrue(all(row["issued_on"] is None for row in result))

    def test_duplicate_headers_and_incomplete_rows_fail_before_import(self):
        for text in ("a;a\n1;2\n", "a;b\n1\n", 'a;b\n"unterminated;2\n'):
            with self.subTest(text=text), self.assertRaises(InputError):
                preview_csv(text, "positions", ";")

    def test_same_column_cannot_supply_two_distinct_fields(self):
        spec = table_spec("positions", self.bundle["positions"])
        spec["mapping"]["supplier"] = "material"
        with self.assertRaisesRegex(InputError, "dois campos"):
            mapped_table(spec, "positions")

    def test_preview_is_bounded_and_reports_total_record_count(self):
        spec = table_spec("positions", self.bundle["positions"])
        preview = preview_csv(spec["text"], "positions", ";")
        self.assertEqual((preview["row_count"], len(preview["rows"])), (6, 5))
        with self.assertRaises(InputError):
            preview_csv("a\n" + "value\n" * 501, "positions", ";")

    def test_json_import_rejects_duplicate_nonfinite_and_unknown_fields(self):
        raw = normalized_json(self.bundle)
        for text in (raw.replace('"schema_version": 1', '"schema_version": 1,"schema_version": 1'),
                     raw.replace('"stock_kg": 10000', '"stock_kg": NaN'),
                     raw.replace('"schema_version": 1', '"extra": true,"schema_version": 1')):
            with self.subTest(text=text[:60]), self.assertRaises(InputError):
                parse_json_text(text)
        self.assertEqual(parse_json_text("\ufeff" + raw), self.bundle)


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.workspace = Workspace()
        self.workspace.load_demo({"with_previous": True})

    def test_comparison_and_no_shock_export_reflect_latest_assumptions(self):
        result = self.workspace.run({"use_ml": False, "compare_previous": True})
        report = result["report"]
        self.assertEqual(len(report["comparison"]["materials"]), 3)
        self.workspace.simulate({"country": "CN", "duration_days": 180, "reduction": 0,
                                 "input_sha256": report["input_sha256"]})
        exported = json.loads(self.workspace.export("json")[0])
        self.assertEqual(exported["scenario"]["reduction"], 0)
        self.assertTrue(all(row["uncovered_kg"] == 0 for row in exported["scenario"]["outcomes"]))
        html = self.workspace.export("html")[0]
        payload = re.search(r'<script id="report-data" type="application/json">(.*?)</script>', html, re.S)[1]
        self.assertEqual(json.loads(payload)["scenario"]["reduction"], 0)

    def test_import_is_atomic_and_invalid_input_retains_previous_analysis(self):
        self.workspace.run({"use_ml": False, "compare_previous": True})
        before = copy.deepcopy(self.workspace.report)
        with self.assertRaises(InputError):
            self.workspace.import_data({"slot": "current", "kind": "json", "data": '{"broken":true}'})
        self.assertEqual(self.workspace.report, before)
        self.assertIsNotNone(self.workspace.previous)

    def test_replacing_current_invalidates_baseline_and_report(self):
        self.workspace.run({"use_ml": False, "compare_previous": True})
        self.workspace.import_data({"slot": "current", "kind": "json", "data": normalized_json(demo_bundle())})
        self.assertIsNone(self.workspace.previous)
        self.assertIsNone(self.workspace.report)
        with self.assertRaises(InputError):
            self.workspace.export("json")
        self.assertEqual(json.loads(self.workspace.export("input")[0]), demo_bundle())

    def test_rejected_baseline_does_not_change_valid_state(self):
        wrong = demo_previous_bundle()
        wrong["portfolio_id"] = "different-portfolio"
        before = copy.deepcopy(self.workspace.previous)
        with self.assertRaises(InputError):
            self.workspace.import_data({"slot": "previous", "kind": "json", "data": normalized_json(wrong)})
        self.assertEqual(self.workspace.previous, before)

    def test_stale_simulation_and_noninteger_duration_are_rejected(self):
        self.workspace.run({"use_ml": False, "compare_previous": False})
        params = {"country": "CN", "duration_days": 45, "reduction": 1, "input_sha256": "0" * 64}
        with self.assertRaisesRegex(InputError, "carteira mudou"):
            self.workspace.simulate(params)
        params.update(input_sha256=self.workspace.report["input_sha256"], duration_days=True)
        with self.assertRaises(InputError):
            self.workspace.simulate(params)

    def test_report_keeps_original_bytes_and_normalized_bundle_hashes(self):
        text = "\ufeff" + json.dumps(demo_bundle(), ensure_ascii=False)
        self.workspace.import_data({"slot": "current", "kind": "json", "data": text})
        report = self.workspace.run({"use_ml": False, "compare_previous": False})["report"]
        self.assertEqual(report["input_sha256"], fingerprint(demo_bundle()))
        self.assertEqual(report["source_files_sha256"]["current"]["json"], hashlib.sha256(text.encode()).hexdigest())
        self.assertNotEqual(report["input_sha256"], report["source_files_sha256"]["current"]["json"])


class WorkbenchHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server, cls.token, cls.workspace = create_server(0)
        cls.port = cls.server.server_port
        cls.origin = "http://127.0.0.1:" + str(cls.port)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)

    def setUp(self):
        self.workspace.__init__()
        self.server.policy = LocalPolicy()

    def request(self, method, path, payload=None, *, headers=None, authenticated=True, origin=True):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        request_headers = {}
        if authenticated:
            request_headers["Authorization"] = "Bearer " + self.token
        if origin:
            request_headers["Origin"] = self.origin
        body = json.dumps(payload).encode() if payload is not None else None
        if body:
            request_headers["Content-Type"] = "application/json"
        request_headers.update(headers or {})
        connection.request(method, path, body=body, headers=request_headers)
        response = connection.getresponse()
        result = response.status, dict(response.getheaders()), response.read()
        connection.close()
        return result

    def test_loopback_binding_and_only_allowlisted_static_assets_are_served(self):
        self.assertEqual(self.server.server_address[0], "127.0.0.1")
        for path in ("/", "/app.css", "/app.js", "/geo-map.js", "/geo-map.css", "/world-land.svg", "/favicon.svg"):
            with self.subTest(path=path):
                code, headers, body = self.request("GET", path, authenticated=False, origin=False)
                self.assertEqual(code, 200)
                self.assertGreater(len(body), 100)
                self.assertNotIn(self.token.encode(), body)
                self.assertEqual(headers["Cache-Control"], "no-store")
        for path in ("/../pyproject.toml", "/%2e%2e/SECURITY.md", "/stratasignal/workbench.py"):
            self.assertEqual(self.request("GET", path)[0], 404)

    def test_credentials_are_required_for_reads_and_mutations(self):
        self.assertEqual(self.request("GET", "/api/status", authenticated=False)[0], 401)
        self.assertEqual(self.request("POST", "/api/demo", {"with_previous": True}, authenticated=False)[0], 401)
        self.assertEqual(self.request("GET", "/api/status", headers={"Authorization": "Bearer wrong"})[0], 401)
        self.assertEqual(self.request("GET", "/api/status", origin=False)[0], 200)

    def test_host_and_origin_guards_block_rebinding_and_cross_site_changes(self):
        for path in ("/", "/api/status"):
            self.assertEqual(self.request("GET", path, headers={"Host": "attacker.invalid"})[0], 403)
        self.assertEqual(self.request("POST", "/api/reset", {}, origin=False)[0], 403)
        self.assertEqual(self.request("POST", "/api/reset", {}, headers={"Origin": "https://attacker.invalid"})[0], 403)
        code, headers, _ = self.request("OPTIONS", "/api/reset", headers={"Origin": "null"})
        self.assertEqual(code, 403)
        self.assertNotIn("Access-Control-Allow-Origin", headers)

    def test_request_size_type_duplicate_keys_and_nested_wrong_types_are_bounded(self):
        self.assertEqual(self.request("POST", "/api/reset", {}, headers={"Content-Length": str(MAX_REQUEST_BYTES + 1)})[0], 413)
        self.assertEqual(self.request("POST", "/api/reset", {}, headers={"Content-Type": "text/plain"})[0], 415)
        self.assertEqual(self.request("POST", "/api/preview-csv", {"text": "a\n1", "table": {}, "delimiter": ";"})[0], 400)
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        connection.request("POST", "/api/demo", '{"with_previous":true,"with_previous":false}',
                           {"Origin": self.origin, "Authorization": "Bearer " + self.token, "Content-Type": "application/json"})
        response = connection.getresponse()
        self.assertEqual(response.status, 400)
        response.read()
        connection.close()
        self.assertIsNone(self.workspace.current)

    def test_duplicate_host_and_transfer_encoding_are_rejected(self):
        for extra, expected in (([("Host", "attacker.invalid")], 403), ([("Transfer-Encoding", "chunked")], 400)):
            connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
            connection.putrequest("POST", "/api/reset")
            for name, value in [("Origin", self.origin), ("Authorization", "Bearer " + self.token),
                                ("Content-Type", "application/json"), ("Content-Length", "2")] + extra:
                connection.putheader(name, value)
            connection.endheaders(b"{}")
            response = connection.getresponse()
            self.assertEqual(response.status, expected)
            response.read()
            connection.close()

    def test_complete_http_flow_exports_scenario_then_reset_removes_data(self):
        self.assertEqual(self.request("POST", "/api/demo", {"with_previous": True})[0], 200)
        code, _, raw = self.request("POST", "/api/analyze", {"use_ml": False, "compare_previous": True})
        self.assertEqual(code, 202)
        job_id = json.loads(raw)["job"]["id"]
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            result = json.loads(self.request("GET", "/api/jobs/" + job_id)[2])
            if result["job"]["state"] != "running":
                break
            time.sleep(.01)
        self.assertEqual(result["job"]["state"], "succeeded")
        report = result["report"]
        self.assertEqual(self.request("POST", "/api/scenario", {"country": "CN", "duration_days": 45,
            "reduction": 0, "input_sha256": report["input_sha256"]})[0], 200)
        code, headers, raw = self.request("GET", "/api/export/json")
        self.assertEqual(code, 200)
        self.assertEqual(headers["Content-Disposition"], 'attachment; filename="stratasignal-report.json"')
        self.assertEqual(json.loads(raw)["scenario"]["reduction"], 0)
        self.assertEqual(headers["X-Frame-Options"], "DENY")
        self.assertNotIn("unsafe-inline", headers["Content-Security-Policy"])
        self.assertEqual(self.request("POST", "/api/reset", {})[0], 200)
        self.assertEqual(self.request("GET", "/api/export/json")[0], 400)
        self.assertIsNone(json.loads(self.request("GET", "/api/status")[2])["status"]["current"])

    def test_fetch_metadata_compressed_payloads_and_oversized_headers_fail_closed(self):
        self.assertEqual(self.request("GET", "/api/status", headers={"Sec-Fetch-Site":"cross-site"})[0],403)
        self.assertEqual(self.request("POST", "/api/reset", {}, headers={"Content-Encoding":"gzip"})[0],415)
        self.assertEqual(self.request("POST", "/api/reset", {}, headers={"Expect":"100-continue"})[0],415)
        self.assertEqual(self.request("GET", "/api/status", headers={"X-Oversized":"x"*17000})[0],431)

    def test_expired_token_cannot_read_or_modify_existing_workspace(self):
        self.workspace.load_demo({"with_previous":False})
        self.server.policy.started -= 8*60*60+1
        self.assertEqual(self.request("GET", "/api/status")[0],401)
        self.assertEqual(self.request("POST", "/api/reset", {})[0],401)
        self.assertIsNotNone(self.workspace.current)

    def test_authentication_failures_are_limited_without_locking_out_valid_access(self):
        for _ in range(20):
            self.assertEqual(self.request("GET", "/api/status", authenticated=False)[0],401)
        code,headers,_=self.request("GET", "/api/status", authenticated=False)
        self.assertEqual(code,429)
        self.assertEqual(headers["Retry-After"],"60")
        self.assertEqual(self.request("GET", "/api/status")[0],200)

    def test_mutation_quota_preserves_authenticated_status_access(self):
        for _ in range(60):
            self.assertEqual(self.request("POST", "/api/reset", {})[0],200)
        self.assertEqual(self.request("POST", "/api/reset", {})[0],429)
        self.assertEqual(self.request("GET", "/api/status")[0],200)

    def test_duplicate_origin_and_authorization_headers_are_not_combined_or_accepted(self):
        for header,value,expected in (("Origin",self.origin,403),("Authorization","Bearer "+self.token,401)):
            connection=http.client.HTTPConnection("127.0.0.1",self.port,timeout=5)
            connection.putrequest("POST","/api/reset")
            for name,text in [("Origin",self.origin),("Authorization","Bearer "+self.token),("Content-Type","application/json"),("Content-Length","2"),(header,value)]:
                connection.putheader(name,text)
            connection.endheaders(b"{}")
            response=connection.getresponse();self.assertEqual(response.status,expected);response.read();connection.close()

    def test_status_remains_available_during_analysis_and_cancel_does_not_restore_data(self):
        from stratasignal.jobs import AnalysisJob
        from tests.test_jobs import slow_worker
        self.workspace.jobs.close()
        self.workspace.jobs=AnalysisJob(worker=slow_worker,wall_seconds=2)
        self.workspace.load_demo({"with_previous":True})
        code,_,raw=self.request("POST","/api/analyze",{"use_ml":False,"compare_previous":True})
        self.assertEqual(code,202);job_id=json.loads(raw)["job"]["id"]
        self.assertEqual(self.request("GET","/api/status")[0],200)
        self.assertEqual(json.loads(self.request("GET","/api/jobs/"+job_id)[2])["job"]["state"],"running")
        self.assertEqual(self.request("POST","/api/analyze",{"use_ml":False,"compare_previous":False})[0],409)
        self.assertEqual(self.request("POST","/api/cancel",{"job_id":job_id})[0],200)
        self.workspace.jobs.close()
        self.assertEqual(json.loads(self.request("GET","/api/jobs/"+job_id)[2])["job"]["state"],"cancelled")
        self.assertIsNone(self.workspace.report)
        self.assertEqual(self.request("GET","/api/jobs/"+"0"*32)[0],404)

    def test_connection_pressure_is_bounded_instead_of_creating_unlimited_threads(self):
        sockets=[]
        try:
            for _ in range(8):
                connection=socket.create_connection(("127.0.0.1",self.port),timeout=3)
                connection.sendall(b"GET / HTTP/1.0\r\n")
                sockets.append(connection)
            deadline=time.monotonic()+2
            while self.server._connections._value and time.monotonic()<deadline:
                time.sleep(.01)
            self.assertEqual(self.request("GET","/api/status")[0],503)
        finally:
            for connection in sockets:connection.close()

    def test_two_incomplete_uploads_do_not_block_status_and_reject_a_third_body(self):
        sockets=[]
        try:
            for _ in range(2):
                connection=socket.create_connection(("127.0.0.1",self.port),timeout=3)
                headers=f"POST /api/reset HTTP/1.0\r\nHost: 127.0.0.1:{self.port}\r\nOrigin: {self.origin}\r\nAuthorization: Bearer {self.token}\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{{"
                connection.sendall(headers.encode());sockets.append(connection)
            deadline=time.monotonic()+2
            while self.server.body_slots._value and time.monotonic()<deadline:time.sleep(.01)
            self.assertEqual(self.request("GET","/api/status")[0],200)
            self.assertEqual(self.request("POST","/api/reset",{})[0],429)
        finally:
            for connection in sockets:connection.close()


class PublicDemoBuildTests(unittest.TestCase):
    def test_static_build_is_synthetic_only_and_records_source_commit(self):
        with tempfile.TemporaryDirectory() as directory:
            output = build_demo(Path(directory) / "demo", "a" * 40, enable_ml=False)
            manifest = json.loads((output / "source-manifest.json").read_text())
            self.assertEqual(manifest["source_commit"], "a" * 40)
            self.assertFalse(manifest["private_file_import"])
            self.assertEqual(manifest["dataset_kind"], "synthetic")
            self.assertIn('data-mode="demo"', (output / "index.html").read_text())
            self.assertTrue((output / "geo-map.js").exists())
            self.assertTrue((output / "geo-map.css").exists())
            self.assertTrue((output / "world-land.svg").exists())
            self.assertNotIn('data-mode="local"', (output / "index.html").read_text())
            current = json.loads((output / "demo/current-input.json").read_text())
            self.assertEqual(current, demo_bundle())
            template = json.loads((output / "demo/report-template.json").read_text())["html"]
            self.assertIn('<script id="report-data" type="application/json">', template)
            self.assertFalse((output / "demo/report-template.html").exists())
            self.assertEqual(len(list(output.rglob("*.*"))), 13)
            with self.assertRaises(FileExistsError):
                build_demo(output, enable_ml=False)

    def test_bad_source_commit_is_rejected_without_creating_output(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "demo"
            with self.assertRaises(InputError):
                build_demo(output, "../private-data", enable_ml=False)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
