"""Publish an edition-linked breakdown of graphite modal and customs unit statistics."""

import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

from .schema import InputError

SOURCE = Path(__file__).parent / "data" / "graphite-distribution.json"
PRODUCT = "25041000"
FLOWS = {"import", "export"}
KINDS = {"MARITIMA", "AEREA", "RODOVIARIA", "VICINAL FRONTEIRICO"}
KEYS = {"month", "flow", "country", "mode", "customs_unit", "fob_usd", "kg"}
MAX = 2**53 - 1


def eligible(snapshot, dataset):
    """Require an exact reconciliation by month, flow, country and each metric."""
    if (dataset["dataset_kind"] != "graphite_transport_aggregate" or dataset["ncm"] != PRODUCT
            or set(dataset["source_sha256"]) != FLOWS
            or any(not re.fullmatch(r"[0-9a-f]{64}", h) for h in dataset["source_sha256"].values())):
        raise InputError("Metadados de distribuição da grafita inválidos")
    if snapshot["months"] != dataset["months"]:
        return False
    expected = {(r["month"], r["flow"], r["country"]): (r["fob_usd"], r["kg"])
                for r in snapshot["records"] if r["ncm"] == PRODUCT}
    actual = defaultdict(lambda: [0, 0])
    unique = set()
    if not 0 < len(dataset["records"]) <= 500:
        raise InputError("Quantidade inválida de registros de distribuição")
    for row in dataset["records"]:
        if (set(row) != KEYS or row["flow"] not in FLOWS or row["mode"] not in KINDS
                or row["month"] not in dataset["months"]
                or not isinstance(row["country"], str) or not 0 < len(row["country"]) <= 120
                or not re.fullmatch(r"[0-9]{7} - [^\r\n]{1,120}", row["customs_unit"])
                or any(type(row[key]) is not int or not 0 <= row[key] <= MAX for key in ("fob_usd", "kg"))):
            raise InputError("Registro de distribuição da grafita inválido")
        group = (row["month"], row["flow"], row["country"])
        unique_key = group + (row["mode"], row["customs_unit"])
        if unique_key in unique:
            raise InputError("Registro duplicado de distribuição da grafita")
        unique.add(unique_key)
        pair = actual[group]
        pair[0] += row["fob_usd"]
        pair[1] += row["kg"]
    return expected == {key: tuple(metrics) for key, metrics in actual.items()}


def write_distribution(output, snapshot, snapshot_sha, *, source=SOURCE):
    dataset = json.loads(source.read_text(encoding="utf-8"))
    if not eligible(snapshot, dataset):
        return None
    edition = {**dataset, "trade_sha256": snapshot_sha}
    payload = (json.dumps(edition, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode("utf-8")
    sha = hashlib.sha256(payload).hexdigest()
    relative = f"edicoes/grafita-vias-{sha}.json"
    with (output / relative).open("xb") as stream:
        stream.write(payload)
    return {"path": relative, "sha256": sha, "trade_sha256": snapshot_sha}
