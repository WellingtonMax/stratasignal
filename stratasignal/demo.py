"""Deterministic fictional procurement data; never presented as customer results."""

import hashlib
import random
from datetime import date, timedelta


def demo_bundle():
    rng = random.Random(203101)
    catalog = [
        ("graphite-flake", "Grafita natural · flocos 95% (fictícia)", 18000, 10000, [("CN-01", "CN", .72, 38, 4.2), ("BR-01", "BR", .28, 24, 4.8)]),
        ("ndpr-oxide", "Óxido NdPr · especificação demonstrativa", 1200, 650, [("CN-02", "CN", .85, 50, 62), ("MY-01", "MY", .15, 42, 69)]),
        ("lithium-carbonate", "Carbonato de lítio · grau industrial (fictício)", 6000, 18000, [("CL-01", "CL", .55, 28, 11), ("AR-01", "AR", .45, 25, 12)]),
    ]
    data = {"schema_version": 1, "dataset_kind": "synthetic", "as_of": "2026-11-06", "positions": [], "orders": [], "evidence": []}
    as_of = date.fromisoformat(data["as_of"])
    for material, name, demand, stock, suppliers in catalog:
        for supplier, origin, allocation, lead, cost in suppliers:
            data["positions"].append({"material": material, "material_name": name, "supplier": supplier,
                                      "origin_country": origin, "allocation_share": allocation,
                                      "monthly_demand_kg": demand, "stock_kg": stock,
                                      "nominal_lead_days": lead, "unit_cost_usd": cost})
            for i in range(130):
                placed = date(2024, 1, 1) + timedelta(days=i * 7 + rng.randint(0, 3))
                quoted = lead + rng.randint(-8, 8)
                quantity = round(demand * allocation * rng.uniform(.4, 1.7), 2)
                # Artificial learnable pattern for exercising the evaluation pipeline.
                chance = .12 + .45 * (quantity > demand * allocation * 1.1) + .22 * (quoted < lead - 2)
                delay = rng.randint(2, 18) if rng.random() < chance else -rng.randint(0, 5)
                promised = placed + timedelta(days=quoted)
                received = promised + timedelta(days=delay)
                data["orders"].append({"id": f"{material}-{supplier}-{i:03}", "material": material, "supplier": supplier,
                                       "origin_country": origin, "ordered_on": placed.isoformat(),
                                       "promised_on": promised.isoformat(), "received_on": received.isoformat() if received <= as_of else None,
                                       "quantity_kg": quantity})
            if supplier != "MY-01":
                digest_source = "shared-demo-template" if supplier in ("CN-01", "BR-01") else supplier
                data["evidence"].append({"id": "EV-" + supplier, "supplier": supplier, "material": material,
                                         "origin_country": "CN" if supplier == "BR-01" else origin,
                                         "observed_on": "2026-10-20", "issued_on": "2026-10-25" if supplier == "CN-02" else "2026-01-10",
                                         "expires_on": "2026-09-30" if supplier == "CN-01" else "2027-01-10",
                                         "sha256": hashlib.sha256(digest_source.encode()).hexdigest()})
    return data
