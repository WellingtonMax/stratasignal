"""Reproducible synthetic capacity fixture and measured deterministic workload."""

import hashlib
import json
import platform
import time
import tracemalloc
from datetime import date, timedelta

from . import __version__
from .analytics import analyze
from .importer import fingerprint, normalized_json
from .schema import validate_bundle


def capacity_fixture(materials=100, suppliers=5, orders_per_position=40, evidence_per_position=10):
    data = {"schema_version": 1, "dataset_kind": "synthetic", "portfolio_id": "synthetic-capacity",
            "as_of": "2026-11-06", "positions": [], "orders": [], "evidence": []}
    origins = ("CN", "BR", "AU", "CL", "CA")
    for material_index in range(materials):
        material = f"M{material_index:03}"
        for supplier_index in range(suppliers):
            supplier = f"S{supplier_index:02}"
            origin = origins[supplier_index % len(origins)]
            data["positions"].append({"material": material, "material_name": "Especificação fictícia " + material,
                "supplier": supplier, "origin_country": origin, "allocation_share": 1 / suppliers,
                "monthly_demand_kg": 5000 + material_index * 10, "stock_kg": 6000 + material_index,
                "nominal_lead_days": 30 + supplier_index * 5, "unit_cost_usd": 1 + supplier_index / 10})
            for i in range(orders_per_position):
                ordered = date(2024, 1, 1) + timedelta(days=i * 19 + supplier_index)
                promised = ordered + timedelta(days=30 + supplier_index * 5)
                received = promised + timedelta(days=(-3, 0, 5, 14)[i % 4])
                data["orders"].append({"id": f"{material}-{supplier}-{i:03}", "material": material,
                    "supplier": supplier, "origin_country": origin, "ordered_on": ordered.isoformat(),
                    "promised_on": promised.isoformat(), "received_on": received.isoformat(), "quantity_kg": 1000 + i})
            for i in range(evidence_per_position):
                eid = f"E-{material}-{supplier}-{i:02}"
                data["evidence"].append({"id": eid, "material": material, "supplier": supplier,
                    "origin_country": origin, "observed_on": "2026-11-01", "issued_on": "2026-10-01",
                    "expires_on": "2027-10-01", "sha256": hashlib.sha256(eid.encode()).hexdigest()})
    validate_bundle(data)
    return data


def measure_capacity():
    data = capacity_fixture()
    raw = normalized_json(data)
    tracemalloc.start()
    started = time.perf_counter()
    report = analyze(data, fingerprint(data), enable_ml=False)
    elapsed = time.perf_counter() - started
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return {"product": "StrataSignal", "version": __version__, "dataset_kind": "synthetic",
        "python": platform.python_version(), "platform": platform.system(),
        "input_bytes": len(raw.encode()), "materials": len(report["materials"]),
        "positions": len(data["positions"]), "orders": len(data["orders"]), "evidence": len(data["evidence"]),
        "elapsed_seconds": round(elapsed, 4), "peak_traced_bytes": peak,
        "scope": "Um processo local, regras e inteligência descritiva, sem ML. Tempo inclui tracemalloc; pico rastreia alocações Python, não RSS total. Carga sintética não representa tráfego multiusuário ou SLA."}
