"""One bounded analysis process; JSON-only results and explicit cancellation."""

import copy
import json
import multiprocessing
import os
import secrets
import threading
import time

from .schema import InputError

WALL_SECONDS = 90
CPU_SECONDS = 60
MEMORY_BYTES = 2 * 1024 ** 3
MAX_RESULT_BYTES = 64 * 1024 ** 2


class BusyError(InputError):
    pass


def compute_report(task):
    from .analytics import analyze
    from .comparison import compare_bundles
    from .importer import fingerprint
    data = task["current"]
    report = analyze(data, fingerprint(data), enable_ml=task["use_ml"])
    if task["compare_previous"]:
        old = task["previous"]
        report["comparison"] = compare_bundles(old, data, fingerprint(old), fingerprint(data))
    if task["source_hashes"]:
        report["source_files_sha256"] = copy.deepcopy(task["source_hashes"])
    return report


def resource_limits():
    try:
        import resource
    except ImportError:
        return "wall_timeout_only"
    for name, requested in (("RLIMIT_CPU", CPU_SECONDS), ("RLIMIT_AS", MEMORY_BYTES),
                            ("RLIMIT_NOFILE", 64), ("RLIMIT_CORE", 0)):
        if not hasattr(resource, name):
            continue
        kind = getattr(resource, name)
        _, hard = resource.getrlimit(kind)
        limit = requested if hard == resource.RLIM_INFINITY else min(requested, hard)
        resource.setrlimit(kind, (limit, limit))
    return "posix_resource_limits"


def analysis_worker(connection, task):
    try:
        # Child-only settings, before optional NumPy/BLAS imports.
        for key in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "NUMEXPR_NUM_THREADS"):
            os.environ[key] = "1"
        limits = resource_limits()
        report = compute_report(task)
        report["execution"] = {"mode": "isolated_process", "limits": limits,
                               "wall_seconds": WALL_SECONDS, "cpu_seconds": CPU_SECONDS,
                               "memory_bytes": MEMORY_BYTES if limits == "posix_resource_limits" else None}
        raw = json.dumps({"report": report}, ensure_ascii=True, allow_nan=False).encode("utf-8")
        if len(raw) > MAX_RESULT_BYTES:
            raise ValueError("result size")
        connection.send_bytes(raw)
    except BaseException:
        # No input rows, file names, dependency exceptions or traceback leave the child.
        try:
            connection.send_bytes(b'{"error":"A analise excedeu os limites ou nao pode ser concluida."}')
        except BaseException:
            pass
    finally:
        connection.close()


class AnalysisJob:
    def __init__(self, *, worker=analysis_worker, wall_seconds=WALL_SECONDS):
        self._lock = threading.RLock()
        self._thread = None
        self._cancel = threading.Event()
        self._record = None
        self._process = None
        self._finishing = False
        self._worker = worker
        self._wall = wall_seconds

    def start(self, task, completed):
        with self._lock:
            if self._thread and self._thread.is_alive():
                raise BusyError("Já há uma análise em execução ou encerramento. Aguarde e tente novamente.")
            job_id = secrets.token_hex(16)
            self._record = {"id": job_id, "state": "running"}
            self._cancel = threading.Event()
            self._finishing = False
            self._thread = threading.Thread(target=self._run, args=(task, completed), daemon=True)
            self._thread.start()
            return dict(self._record)

    def snapshot(self, job_id):
        with self._lock:
            if not self._record or job_id != self._record["id"]:
                raise InputError("Análise não encontrada nesta execução")
            return dict(self._record)

    def cancel(self):
        with self._lock:
            if self._finishing:
                return
            self._cancel.set()
            if self._process is not None and self._process.is_alive():
                self._process.terminate()

    def close(self):
        self.cancel()
        thread = self._thread
        if thread and thread is not threading.current_thread():
            thread.join(timeout=5)

    def _run(self, task, completed):
        context = multiprocessing.get_context("spawn")
        reader, writer = context.Pipe(duplex=False)
        process = context.Process(target=self._worker, args=(writer, task), daemon=True)
        timed_out = threading.Event()
        def stop_on_deadline():
            with self._lock:
                if self._finishing:
                    return
                timed_out.set()
                if self._process is process and process.is_alive():
                    process.terminate()
        timer = threading.Timer(self._wall, stop_on_deadline)
        timer.daemon = True
        state, error = "failed", "Não foi possível concluir a análise isolada."
        try:
            process.start()
            with self._lock:
                self._process = process
            timer.start()
            writer.close()
            deadline = time.monotonic() + self._wall
            while True:
                if self._cancel.is_set():
                    state, error = "cancelled", None
                    break
                if time.monotonic() >= deadline:
                    state, error = "timed_out", "A análise excedeu o tempo permitido. Reduza o conjunto ou desative o ML."
                    break
                if reader.poll(.05):
                    value = json.loads(reader.recv_bytes(MAX_RESULT_BYTES).decode("utf-8"))
                    if not isinstance(value, dict) or not isinstance(value.get("report"), dict):
                        break
                    with self._lock:
                        if self._cancel.is_set():
                            state, error = "cancelled", None
                        elif timed_out.is_set() or time.monotonic() >= deadline:
                            timed_out.set()
                        else:
                            self._finishing = True
                            timer.cancel()
                    if self._finishing:
                        state, error = ("succeeded", None) if completed(value["report"]) else ("stale", None)
                    break
                if not process.is_alive():
                    break
        except Exception:
            pass
        finally:
            timer.cancel()
            writer.close()
            reader.close()
            with self._lock:
                if process.pid is not None:
                    if process.is_alive():
                        process.terminate()
                    process.join(timeout=2)
                    if process.is_alive():
                        process.kill()
                        process.join(timeout=2)
                    process.close()
                self._process = None
                if timed_out.is_set():
                    state, error = "timed_out", "A análise excedeu o tempo permitido. Reduza o conjunto ou desative o ML."
                elif self._cancel.is_set():
                    state, error = "cancelled", None
                self._record.update(state=state)
                if error:
                    self._record["error"] = error
