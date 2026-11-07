"""Descriptive delivery reliability and bounded, conditional portfolio stress tests."""

import math
from collections import defaultdict

from .schema import day


def wilson_interval(successes, count):
    """95% Wilson interval for a descriptive binomial proportion; no independence guarantee."""
    if not count:
        return None
    z = 1.959963984540054
    p = successes / count
    denominator = 1 + z * z / count
    center = (p + z * z / (2 * count)) / denominator
    spread = z * math.sqrt(p * (1 - p) / count + z * z / (4 * count * count)) / denominator
    return [round(max(0, center - spread), 6), round(min(1, center + spread), 6)]


def nearest_rank(values, percentile):
    return sorted(values)[max(0, math.ceil(len(values) * percentile) - 1)] if values else None


def decision_support(data, materials, flags):
    as_of = day(data["as_of"])
    orders = defaultdict(list)
    monthly = defaultdict(lambda: dict(received_on_time=0, received_late=0, open_overdue=0, open_pending=0))
    for order in data["orders"]:
        orders[(order["material"], order["supplier"])].append(order)
        month = monthly[order["ordered_on"][:7]]
        if order["received_on"]:
            status = "received_late" if order["received_on"] > order["promised_on"] else "received_on_time"
        else:
            status = "open_overdue" if order["promised_on"] < data["as_of"] else "open_pending"
        month[status] += 1
    names = {m["material"]: m["name"] for m in materials}
    performance = []
    for position in data["positions"]:
        own = orders[(position["material"], position["supplier"])]
        received = [o for o in own if o["received_on"]]
        settled = [o for o in own if o["received_on"] or o["promised_on"] < data["as_of"]]
        late = sum((o["received_on"] or data["as_of"]) > o["promised_on"] for o in settled)
        leads = [(day(o["received_on"]) - day(o["ordered_on"])).days for o in received]
        overdue = [o for o in own if not o["received_on"] and o["promised_on"] < data["as_of"]]
        performance.append({"material": position["material"], "name": names[position["material"]],
            "supplier": position["supplier"], "observed_orders": len(settled), "late_orders": late,
            "late_rate": round(late / len(settled), 6) if settled else None,
            "late_rate_interval_95": wilson_interval(late, len(settled)),
            "received_orders": len(received), "received_lead_p50_days": nearest_rank(leads, .5),
            "received_lead_p90_days": nearest_rank(leads, .9) if len(leads) >= 10 else None,
            "open_overdue_orders": len(overdue), "not_yet_observable": len(own) - len(settled),
            "maximum_open_overdue_days": max(((as_of - day(o["promised_on"])).days for o in overdue), default=0),
            "sample_status": "descriptive" if len(settled) >= 20 else "small_sample"})
    # No averaging unweighted quantities across incompatible mineral grades.
    exposure = defaultdict(lambda: {"materials": set(), "reference_monthly_usd": 0.0})
    for material in materials:
        for supplier in material["suppliers"]:
            item = exposure[supplier["origin_country"]]
            item["materials"].add(material["material"])
            item["reference_monthly_usd"] += material["monthly_demand_kg"] * supplier["allocation_share"] * supplier["unit_cost_usd"]
    dependencies = [{"country": code, "materials": sorted(value["materials"]),
                     "reference_monthly_usd": round(value["reference_monthly_usd"], 2)} for code, value in exposure.items()]
    dependencies.sort(key=lambda d: (-d["reference_monthly_usd"], d["country"]))
    # All origins remain in dependencies; only the largest 12 enter this bounded grid.
    matrix = []
    for origin in dependencies[:12]:
        code = origin["country"]
        for days in (30, 60, 90):
            for reduction in (.25, .5, 1):
                shortfalls = []
                value = 0.0
                for material in materials:
                    share = material["country_shares"].get(code, 0)
                    uncovered = max(0, material["monthly_demand_kg"] / 30 * share * reduction * days - material["stock_kg"])
                    if uncovered > 1e-9:
                        shortfalls.append(material["material"])
                        value += uncovered * material["weighted_unit_cost_usd"]
                matrix.append({"country": code, "duration_days": days, "reduction": reduction,
                    "materials_without_coverage": shortfalls, "replacement_reference_usd": round(value, 2)})
    covered = {(e["material"], e["supplier"]) for e in data["evidence"]}
    flagged = {(f["material"], f["supplier"]) for f in flags}
    return {"supplier_performance": performance, "origin_dependencies": dependencies,
        "delivery_months": [{"month": month, **monthly[month]} for month in sorted(monthly)],
        "stress_matrix": matrix, "stress_grid": {"countries_evaluated": min(12, len(dependencies)),
            "countries_outside_grid": max(0, len(dependencies) - 12), "durations_days": [30, 60, 90],
            "reductions": [.25, .5, 1], "selection": "Top 12 origens pelo custo mensal declarado de referência."},
        "data_quality": {"positions": len(data["positions"]), "positions_with_evidence": len(covered),
            "positions_flagged": len(flagged), "unknown_origin_positions": sum(p["origin_country"] == "ZZ" for p in data["positions"])},
        "scope": "Taxas e intervalos descrevem o histórico declarado; independência e estabilidade não são garantidas. P90 usa apenas recebimentos concluídos (mínimo 10), exclui pedidos abertos e pode subestimar a cauda. A grade testa uma origem de cada vez; seus cenários não são aditivos, probabilidades ou perdas financeiras."}
