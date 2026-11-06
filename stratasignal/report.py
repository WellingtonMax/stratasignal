"""Self-contained reports with hashed CSP and escaped inert JSON payloads."""

import base64
import hashlib
import json
import os
from pathlib import Path

WEB = Path(__file__).with_name("web")


def csp_hash(value):
    return "'sha256-" + base64.b64encode(hashlib.sha256(value.encode()).digest()).decode() + "'"


def render_html(report):
    script = (WEB / "app.js").read_text(encoding="utf-8")
    style = (WEB / "app.css").read_text(encoding="utf-8")
    payload = json.dumps(report, ensure_ascii=True, allow_nan=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    policy = "default-src 'none'; script-src " + csp_hash(script) + "; style-src " + csp_hash(style) + "; connect-src 'none'; img-src data:; object-src 'none'; base-uri 'none'; form-action 'none'"
    template = (WEB / "template.html").read_text(encoding="utf-8")
    return template.replace("{{CSP}}", policy).replace("{{STYLE}}", style).replace("{{SCRIPT}}", script).replace("{{DATA}}", payload)


def write_private(path, content):
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(path, flags, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as stream:
        stream.write(content)


def write_report(report, directory):
    output = Path(directory)
    output.mkdir(mode=0o700, parents=False, exist_ok=False)
    artifacts = {"report.json": json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
                 "report.html": render_html(report)}
    hashes = {}
    for name, content in artifacts.items():
        write_private(output / name, content)
        hashes[name] = hashlib.sha256(content.encode()).hexdigest()
    manifest = {"product": "StrataSignal", "version": report["version"], "input_sha256": report["input_sha256"],
                "dataset_kind": report["dataset_kind"], "as_of": report["as_of"], "artifacts": hashes,
                "note": "Hashes verificam consistência com este manifesto; não são assinatura digital nem prova de origem."}
    write_private(output / "manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    return output
