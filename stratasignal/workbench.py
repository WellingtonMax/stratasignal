"""Single-operator, ephemeral workbench bound exclusively to IPv4 loopback."""

import copy
import hashlib
import hmac
import importlib.util
import json
import re
import secrets
import socket
import threading
import time
import webbrowser
from collections import deque
from functools import wraps
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from . import __version__
from .analytics import analyze, metadata_flags, scenario
from .comparison import compare_bundles
from .demo import demo_bundle, demo_previous_bundle
from .importer import bundle_from_csv, fingerprint, normalized_json, parse_json_text, preview_csv
from .report import render_html
from .schema import InputError, fields, unique_object, validate_bundle
from .jobs import AnalysisJob, BusyError, compute_report

UI = Path(__file__).with_name("ui")
MAX_REQUEST_BYTES = 64 * 1024 * 1024
TOKEN_TTL_SECONDS = 8 * 60 * 60


def locked(method):
    @wraps(method)
    def wrapped(self, *args, **kwargs):
        with self._lock:
            return method(self, *args, **kwargs)
    return wrapped


def summary(bundle):
    if bundle is None:
        return None
    return {"as_of": bundle["as_of"], "portfolio_id": bundle.get("portfolio_id"), "dataset_kind": bundle["dataset_kind"],
            "materials": len({p["material"] for p in bundle["positions"]}), "positions": len(bundle["positions"]),
            "orders": len(bundle["orders"]), "evidence": len(bundle["evidence"])}


class Workspace:
    def __init__(self):
        self._lock = threading.RLock()
        self.jobs = AnalysisJob()
        self.revision = 0
        self.report_job_id = None
        self.current = None
        self.previous = None
        self.report = None
        self.source_hashes = {}

    @locked
    def status(self):
        return {"version": __version__, "mode": "local", "current": summary(self.current), "previous": summary(self.previous),
                "report_ready": self.report is not None, "ml_available": importlib.util.find_spec("sklearn") is not None}

    @locked
    def import_data(self, payload):
        fields(payload, ("slot", "kind", "data"))
        if payload["slot"] not in ("current", "previous") or payload["kind"] not in ("json", "csv"):
            raise InputError("Tipo de importação inválido")
        if payload["slot"] == "previous" and self.current is None:
            raise InputError("Carregue primeiro a carteira atual")
        hashes = {}
        if payload["kind"] == "json":
            bundle = parse_json_text(payload["data"])
            hashes["json"] = hashlib.sha256(payload["data"].encode("utf-8")).hexdigest()
        else:
            bundle = bundle_from_csv(payload["data"])
            hashes = {table: hashlib.sha256(spec["text"].encode("utf-8")).hexdigest() for table, spec in payload["data"]["tables"].items()}
        normalized_json(bundle)
        if payload["slot"] == "previous":
            compare_bundles(bundle, self.current, fingerprint(bundle), fingerprint(self.current))
            self.previous = copy.deepcopy(bundle)
            self.source_hashes["previous"] = hashes
        else:
            self.current = copy.deepcopy(bundle)
            self.previous = None
            self.source_hashes = {"current": hashes}
        self.report = None
        self.report_job_id = None
        self.revision += 1
        self.jobs.cancel()
        return {"status": self.status(), "review": self.review()}

    @locked
    def review(self):
        if self.current is None:
            return None
        return {"summary": summary(self.current), "positions": self.current["positions"][:5],
                "metadata_flags": metadata_flags(self.current),
                "notes": ["Quantidades em kg; custos em USD/kg; alocações somam 100% por especificação.",
                          "Campos e origens são declarados; a validação estrutural não comprova origem física."]}

    @locked
    def load_demo(self, payload):
        fields(payload, ("with_previous",))
        if type(payload["with_previous"]) is not bool:
            raise InputError("Opção de demonstração inválida")
        self.current = demo_bundle()
        self.previous = demo_previous_bundle() if payload["with_previous"] else None
        self.source_hashes = {}
        self.report = None
        self.report_job_id = None
        self.revision += 1
        self.jobs.cancel()
        return {"status": self.status(), "review": self.review()}

    @locked
    def analysis_task(self, payload):
        fields(payload, ("use_ml", "compare_previous"))
        if any(type(payload[k]) is not bool for k in payload):
            raise InputError("Opções de análise inválidas")
        if self.current is None:
            raise InputError("Carregue e confira uma carteira antes de analisar")
        if payload["compare_previous"]:
            if self.previous is None:
                raise InputError("Carregue o conjunto anterior para comparar períodos")
        return copy.deepcopy({"current": self.current, "previous": self.previous if payload["compare_previous"] else None,
            "source_hashes": self.source_hashes, **payload})

    @locked
    def run(self, payload):
        # Synchronous library use only. HTTP analyses always use the bounded process.
        self.report = compute_report(self.analysis_task(payload))
        return {"status": self.status(), "report": self.report}

    @locked
    def submit(self, payload):
        task = self.analysis_task(payload)
        revision = self.revision
        def completed(report):
            with self._lock:
                if self.revision != revision:
                    return False
                self.report = report
                self.report_job_id = self.jobs.snapshot(job_id)["id"]
                return True
        job = self.jobs.start(task, completed)
        job_id = job["id"]
        return {"job": job}

    @locked
    def job_result(self, job_id):
        job = self.jobs.snapshot(job_id)
        value = {"job": job}
        if job["state"] == "succeeded" and self.report_job_id == job_id and self.report is not None:
            value.update(status=self.status(), report=self.report)
        elif job["state"] == "succeeded":
            value["job"]["state"] = "stale"
        return value

    @locked
    def clear(self):
        self.jobs.cancel()
        self.revision += 1
        self.current = self.previous = self.report = None
        self.report_job_id = None
        self.source_hashes = {}
        return {"status": self.status()}

    @locked
    def cancel_job(self, payload):
        fields(payload, ("job_id",))
        if not isinstance(payload["job_id"], str) or not re.fullmatch(r"[0-9a-f]{32}", payload["job_id"]):
            raise InputError("Identificador de análise inválido")
        job = self.jobs.snapshot(payload["job_id"])
        if job["state"] == "running" and self.report_job_id != payload["job_id"]:
            self.revision += 1
            self.jobs.cancel()
        return {"job": self.jobs.snapshot(payload["job_id"])}

    @locked
    def simulate(self, payload):
        fields(payload, ("country", "duration_days", "reduction", "input_sha256"))
        if self.report is None:
            raise InputError("Execute a análise antes de simular")
        if payload["input_sha256"] != self.report["input_sha256"]:
            raise InputError("A carteira mudou; atualize a análise antes de simular")
        if type(payload["duration_days"]) is not int:
            raise InputError("Duração deve ser um número inteiro de dias")
        outcome = scenario(self.report["materials"], payload["country"], payload["duration_days"], payload["reduction"])
        self.report["scenario"] = outcome
        return {"scenario": outcome}

    @locked
    def export(self, kind):
        if kind == "input" and self.current is not None:
            return normalized_json(self.current), "application/json", "stratasignal-input.json"
        if self.report is None:
            raise InputError("Execute uma análise antes de exportar resultados")
        if kind == "json":
            return json.dumps(self.report, ensure_ascii=False, indent=2, allow_nan=False) + "\n", "application/json", "stratasignal-report.json"
        if kind == "html":
            return render_html(self.report), "text/html; charset=utf-8", "stratasignal-report.html"
        raise InputError("Formato de exportação inválido")


def parse_request(raw):
    try:
        return json.loads(raw.decode("utf-8"), object_pairs_hook=unique_object,
                          parse_constant=lambda _: (_ for _ in ()).throw(InputError("Número não finito")))
    except (ValueError, UnicodeError, RecursionError) as exc:
        raise InputError("Requisição JSON inválida") from exc


class LocalPolicy:
    def __init__(self):
        self.started = time.monotonic()
        self._lock = threading.Lock()
        self._windows = {"authentication": deque(), "mutations": deque(), "exports": deque()}

    def allow(self, category):
        maximum = {"authentication": 20, "mutations": 60, "exports": 40}[category]
        now = time.monotonic()
        with self._lock:
            window = self._windows[category]
            while window and window[0] <= now - 60:
                window.popleft()
            if len(window) >= maximum:
                return False
            window.append(now)
            return True


class LocalServer(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 8

    def __init__(self, address, handler, workspace):
        self.workspace = workspace
        self.policy = LocalPolicy()
        self._connections = threading.BoundedSemaphore(8)
        self.body_slots = threading.BoundedSemaphore(2)
        super().__init__(address, handler)

    def process_request(self, request, client_address):
        if not self._connections.acquire(blocking=False):
            try:
                body = b'{"error":"Limite de conexoes simultaneas"}'
                request.settimeout(1)
                request.sendall(b"HTTP/1.0 503 Service Unavailable\r\nConnection: close\r\nCache-Control: no-store\r\nContent-Type: application/json\r\nContent-Length: " + str(len(body)).encode() + b"\r\n\r\n" + body)
            except OSError:
                pass
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except BaseException:
            self._connections.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self._connections.release()

    def server_close(self):
        self.workspace.jobs.close()
        super().server_close()


def handler_class(workspace, token):
    class Handler(BaseHTTPRequestHandler):
        server_version = "StrataSignal"
        sys_version = ""
        protocol_version = "HTTP/1.0"

        def setup(self):
            super().setup()
            self.connection.settimeout(10)

        def log_message(self, *_):
            # No URL, authorization header, uploaded content or customer data is logged.
            return

        @property
        def origin(self):
            return "http://127.0.0.1:" + str(self.server.server_port)

        def send_bytes(self, status, content, content_type="application/json; charset=utf-8", filename=None):
            if isinstance(content, str):
                content = content.encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Cross-Origin-Resource-Policy", "same-origin")
            self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
            self.send_header("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data: https://gibs.earthdata.nasa.gov; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'")
            self.send_header("Connection", "close")
            if status == 429:
                self.send_header("Retry-After", "60")
            if filename:
                self.send_header("Content-Disposition", 'attachment; filename="' + filename + '"')
            self.end_headers()
            try:
                self.wfile.write(content)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def send_json(self, status, value):
            self.send_bytes(status, json.dumps(value, ensure_ascii=True, allow_nan=False))

        def guard(self, protected=False, mutation=False):
            if len(self.path) > 2048 or sum(len(k) + len(v) for k, v in self.headers.items()) > 16384:
                self.send_json(431, {"error": "Endereço ou cabeçalhos excedem o limite"})
                return False
            hosts = self.headers.get_all("Host", [])
            if hosts != ["127.0.0.1:" + str(self.server.server_port)]:
                self.send_json(403, {"error": "Endereço local inválido"})
                return False
            origins = self.headers.get_all("Origin", [])
            if (mutation and origins != [self.origin]) or (origins and origins != [self.origin]):
                self.send_json(403, {"error": "Origem da requisição inválida"})
                return False
            fetch_sites = self.headers.get_all("Sec-Fetch-Site", [])
            if fetch_sites and (len(fetch_sites) != 1 or fetch_sites[0] not in ("same-origin", "none")):
                self.send_json(403, {"error": "Contexto de navegação inválido"})
                return False
            if protected:
                values = self.headers.get_all("Authorization", [])
                expected = "Bearer " + token
                expired = time.monotonic() - self.server.policy.started >= TOKEN_TTL_SECONDS
                if expired or len(values) != 1 or len(values[0]) > 256 or not hmac.compare_digest(values[0].encode("utf-8"), expected.encode("utf-8")):
                    code = 401 if self.server.policy.allow("authentication") else 429
                    self.send_json(code, {"error": "Acesso local inválido ou expirado. Reinicie o painel para renovar o acesso."})
                    return False
            if mutation and not self.server.policy.allow("mutations"):
                self.send_json(429, {"error": "Limite de operações por minuto. Aguarde para continuar."})
                return False
            return True

        def do_GET(self):
            if not self.guard(protected=self.path.startswith("/api/")):
                return
            assets = {"/": ("index.html", "text/html; charset=utf-8"), "/app.css": ("app.css", "text/css; charset=utf-8"),
                      "/app.js": ("app.js", "text/javascript; charset=utf-8"),
                      "/insights.js": ("insights.js", "text/javascript; charset=utf-8"),
                      "/geo-map.js": ("geo-map.js", "text/javascript; charset=utf-8"),
                      "/geo-map.css": ("geo-map.css", "text/css; charset=utf-8"),
                      "/world-land.svg": ("world-land.svg", "image/svg+xml"), "/favicon.svg": ("favicon.svg", "image/svg+xml")}
            if self.path in assets:
                name, mime = assets[self.path]
                self.send_bytes(200, (UI / name).read_bytes(), mime)
            elif self.path == "/api/status":
                self.send_json(200, {"status": workspace.status()})
            elif re.fullmatch(r"/api/jobs/[0-9a-f]{32}", self.path):
                try:
                    self.send_json(200, workspace.job_result(self.path.rsplit("/", 1)[1]))
                except InputError as exc:
                    self.send_json(404, {"error": str(exc)})
            elif self.path in ("/api/export/input", "/api/export/json", "/api/export/html"):
                if not self.server.policy.allow("exports"):
                    self.send_json(429, {"error": "Limite de exportações por minuto"})
                    return
                try:
                    content, mime, name = workspace.export(self.path.rsplit("/", 1)[1])
                    self.send_bytes(200, content, mime, name)
                except InputError as exc:
                    self.send_json(400, {"error": str(exc)})
            else:
                self.send_json(404, {"error": "Recurso não encontrado"})

        def do_POST(self):
            if not self.guard(protected=True, mutation=True):
                return
            if self.headers.get_all("Transfer-Encoding") or len(self.headers.get_all("Content-Length", [])) != 1:
                self.send_json(400, {"error": "Enquadramento de requisição inválido"})
                return
            length = self.headers.get("Content-Length", "")
            if not re.fullmatch(r"[0-9]{1,8}", length) or not 0 < int(length) <= MAX_REQUEST_BYTES:
                self.send_json(413, {"error": "A requisição deve ter até 64 MiB"})
                return
            if self.headers.get_all("Content-Encoding") or self.headers.get_all("Expect"):
                self.send_json(415, {"error": "Compressão e envio antecipado não são suportados"})
                return
            if len(self.headers.get_all("Content-Type", [])) != 1 or self.headers.get_content_type() != "application/json":
                self.send_json(415, {"error": "Envie dados no formato JSON"})
                return
            if not self.server.body_slots.acquire(blocking=False):
                self.send_json(429, {"error": "Há arquivos sendo processados. Aguarde e tente novamente."})
                return
            try:
                raw = self.rfile.read(int(length))
                if len(raw) != int(length):
                    raise InputError("Requisição incompleta")
                payload = parse_request(raw)
                if self.path == "/api/import":
                    result = workspace.import_data(payload)
                elif self.path == "/api/preview-csv":
                    fields(payload, ("text", "table", "delimiter"))
                    result = preview_csv(payload["text"], payload["table"], payload["delimiter"])
                elif self.path == "/api/demo":
                    result = workspace.load_demo(payload)
                elif self.path == "/api/analyze":
                    result = workspace.submit(payload)
                elif self.path == "/api/cancel":
                    result = workspace.cancel_job(payload)
                elif self.path == "/api/scenario":
                    result = workspace.simulate(payload)
                elif self.path == "/api/reset":
                    fields(payload, ())
                    result = workspace.clear()
                else:
                    self.send_json(404, {"error": "Operação não encontrada"})
                    return
                self.send_json(202 if self.path == "/api/analyze" else 200, result)
            except BusyError as exc:
                self.send_json(409, {"error": str(exc)})
            except (InputError, ValueError, OverflowError) as exc:
                self.send_json(400, {"error": str(exc) if isinstance(exc, InputError) else "Dados inválidos"})
            except (TimeoutError, socket.timeout):
                self.send_json(408, {"error": "Tempo de envio excedido"})
            finally:
                self.server.body_slots.release()

        def do_OPTIONS(self):
            if self.guard():
                self.send_json(405, {"error": "Método não permitido"})

    return Handler


def create_server(port=8765, *, token=None, workspace=None):
    if type(port) is not int or not 0 <= port <= 65535:
        raise InputError("Porta inválida")
    workspace = workspace if workspace is not None else Workspace()
    token = token if token is not None else secrets.token_urlsafe(32)
    if not isinstance(token, str) or not re.fullmatch(r"[A-Za-z0-9_-]{32,128}", token):
        raise InputError("Credencial local inválida")
    server = LocalServer(("127.0.0.1", port), handler_class(workspace, token), workspace)
    server.timeout = 1
    return server, token, workspace


def serve(port=8765, open_browser=True):
    server, token, _ = create_server(port)
    url = "http://127.0.0.1:" + str(server.server_port) + "/#access=" + token
    print("StrataSignal", __version__, "· painel local. Os dados permanecem na memória desta execução.")
    print("Abra este endereço no navegador:", url)
    print("Encerre com Ctrl+C. Nenhum arquivo importado é gravado automaticamente.")
    print("A credencial desta execução expira em 8 horas; reinicie o painel para renová-la.")
    try:
        if open_browser:
            try:
                webbrowser.open(url)
            except webbrowser.Error:
                print("Abra o endereço acima manualmente no seu navegador.")
        server.serve_forever(poll_interval=0.3)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0
