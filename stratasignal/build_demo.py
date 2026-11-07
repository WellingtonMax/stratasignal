"""Build a static workbench demo exclusively from repository-owned synthetic data."""

import argparse
import json
import re
from pathlib import Path

from . import __version__
from .analytics import analyze
from .comparison import compare_bundles
from .demo import demo_bundle, demo_previous_bundle
from .importer import fingerprint, normalized_json
from .report import render_html
from .schema import InputError


def build_demo(directory, source_commit=None, enable_ml=True, *, public_home=False):
    if source_commit is not None and not re.fullmatch(r"[0-9a-f]{40}", source_commit):
        raise InputError("Commit de origem inválido")
    current, previous = demo_bundle(), demo_previous_bundle()
    if current["dataset_kind"] != "synthetic" or previous["dataset_kind"] != "synthetic":
        raise InputError("A demonstração pública requer dados fictícios")
    report = analyze(current, fingerprint(current), enable_ml=enable_ml)
    monthly = dict(report)
    monthly["comparison"] = compare_bundles(previous, current, fingerprint(previous), fingerprint(current))
    ui = Path(__file__).with_name("ui")
    assets = {name: (ui / name).read_text(encoding="utf-8") for name in ("index.html", "app.css", "app.js", "insights.js", "geo-map.css", "geo-map.js", "world-land.svg", "favicon.svg")}
    assets["index.html"] = assets["index.html"].replace('data-mode="local"', 'data-mode="demo"')
    if public_home:
        assets["index.html"] = assets["index.html"].replace('id="public-home" hidden', 'id="public-home"')
    assets["demo/current-report.json"] = json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    assets["demo/monthly-report.json"] = json.dumps(monthly, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    assets["demo/current-input.json"] = normalized_json(current)
    # Use the same JSON asset transport as reports: static hosts may normalize
    # .html paths through redirects, which strict fetch intentionally rejects.
    assets["demo/report-template.json"] = json.dumps({"html": render_html(report)}, ensure_ascii=True) + "\n"
    assets["source-manifest.json"] = json.dumps({"product": "StrataSignal", "version": __version__,
        "dataset_kind": "synthetic", "private_file_import": False,
        "source_repository": "https://github.com/WellingtonMax/stratasignal", "source_commit": source_commit,
        "model": "Precomputed only on the synthetic fixture; no customer data or server-side analysis in this build."}, indent=2) + "\n"
    output = Path(directory)
    output.mkdir(mode=0o755, parents=False, exist_ok=False)
    for name, content in assets.items():
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("x", encoding="utf-8", newline="\n") as stream:
            stream.write(content)
    return output


def main():
    parser = argparse.ArgumentParser(description="Build the synthetic-only public demonstration")
    parser.add_argument("--out", required=True)
    parser.add_argument("--source-commit")
    parser.add_argument("--without-ml", action="store_true")
    args = parser.parse_args()
    build_demo(args.out, args.source_commit, enable_ml=not args.without_ml)


if __name__ == "__main__":
    main()
