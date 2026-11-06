"""Explainable exposure, metadata triage, and deterministic stress scenarios."""

from collections import defaultdict
from .schema import country, day, number, validate_bundle


def metadata_flags(data):
    positions = {(p["material"], p["supplier"]): p for p in data["positions"]}
    flags = []
    evidence = defaultdict(list)
    fingerprints = defaultdict(set)
    for e in data["evidence"]:
        evidence[(e["material"], e["supplier"])].append(e)
        fingerprints[e["sha256"]].add(e["supplier"])
    for key, p in positions.items():
        def flag(code, eid=None):
            flags.append({"code": code, "material": key[0], "supplier": key[1], "evidence_id": eid})
        if not evidence[key]:
            flag("missing_evidence")
        if p["origin_country"] == "ZZ":
            flag("unknown_origin")
        for e in evidence[key]:
            if e["origin_country"] == "ZZ" or e["origin_country"] != p["origin_country"]:
                flag("origin_mismatch", e["id"])
            if e["issued_on"] is None:
                flag("missing_issue_date", e["id"])
            elif e["issued_on"] > e["observed_on"]:
                flag("issue_after_observation", e["id"])
            if e["expires_on"] is not None and e["expires_on"] < data["as_of"]:
                flag("expired_evidence", e["id"])
            if e["expires_on"] and e["issued_on"] and e["expires_on"] < e["issued_on"]:
                flag("invalid_validity_window", e["id"])
            if len(fingerprints[e["sha256"]]) > 1:
                flag("shared_fingerprint", e["id"])
    return flags


def scenario(materials, shock_country="CN", duration_days=45, reduction=1.0):
    country(shock_country)
    number(duration_days, high=180, positive=True)
    number(reduction, high=1)
    outcomes = []
    for m in materials:
        share = sum(s["allocation_share"] for s in m["suppliers"] if s["origin_country"] == shock_country)
        daily_gap = m["monthly_demand_kg"] / 30 * share * reduction
        deficit = max(0, daily_gap * duration_days - m["stock_kg"])
        outcomes.append({"material": m["material"], "affected_share": round(share, 6),
                         "stockout_day": round(m["stock_kg"] / daily_gap, 1) if daily_gap > 0 else None,
                         "uncovered_kg": round(deficit, 2),
                         "replacement_reference_usd": round(deficit * m["weighted_unit_cost_usd"], 2)})
    return {"country": shock_country, "duration_days": duration_days, "reduction": reduction,
            "assumption": "Fluxo normal = demanda constante; redução começa no dia 0; estoque integralmente utilizável. Sem reposição extraordinária.",
            "outcomes": outcomes}


def analyze(data, input_sha256, *, shock_country="CN", duration_days=45, reduction=1, enable_ml=True):
    validate_bundle(data)
    flags = metadata_flags(data)
    materials = []
    for material in sorted({p["material"] for p in data["positions"]}):
        positions = [p for p in data["positions"] if p["material"] == material]
        first = positions[0]
        countries = defaultdict(float)
        for p in positions:
            countries[p["origin_country"]] += p["allocation_share"]
        hhi = sum(v * v for v in countries.values())
        coverage = first["stock_kg"] / (first["monthly_demand_kg"] / 30)
        lead = max(p["nominal_lead_days"] for p in positions)
        flagged = {f["supplier"] for f in flags if f["material"] == material}
        # Operational triage rule, deliberately separate from estimated probabilities.
        score = round(100 * (0.4 * hhi + 0.35 * max(0, 1 - coverage / lead) + 0.25 * len(flagged) / len(positions)))
        material_orders = [o for o in data["orders"] if o["material"] == material]
        settled = [o for o in material_orders if o["received_on"] is not None or o["promised_on"] < data["as_of"]]
        late = sum((o["received_on"] or data["as_of"]) > o["promised_on"] for o in settled)
        suppliers = [{k: p[k] for k in ("supplier", "origin_country", "allocation_share", "nominal_lead_days", "unit_cost_usd")} for p in positions]
        actions = []
        if max(countries.values()) >= 0.6:
            actions.append("Avaliar segunda origem para a mesma especificação; homologação técnica antes de alterar compras.")
        if coverage < lead:
            actions.append("Revisar reposição e estoque de segurança: cobertura inferior ao maior prazo nominal.")
        if flagged:
            actions.append("Conferir evidências das posições sinalizadas com os emissores e responsáveis por compras.")
        if not actions:
            actions.append("Manter revisão periódica das alocações e evidências.")
        materials.append({"material": material, "name": first["material_name"],
                          "monthly_demand_kg": first["monthly_demand_kg"], "stock_kg": first["stock_kg"],
                          "weighted_unit_cost_usd": sum(p["unit_cost_usd"] * p["allocation_share"] for p in positions),
                          "coverage_days": round(coverage, 2), "max_nominal_lead_days": lead,
                          "country_hhi": round(hhi * 10000, 2),
                          "supplier_hhi": round(sum(p["allocation_share"] ** 2 for p in positions) * 10000, 2),
                          "top_origin_share": round(max(countries.values()), 6),
                          "country_shares": dict(sorted(countries.items())), "priority_score": score,
                          "priority": "alta" if score >= 60 else "moderada" if score >= 35 else "rotina",
                          "evidence_flags": sum(f["material"] == material for f in flags),
                          "observed_orders": len(settled), "observed_late_orders": late,
                          "observed_late_rate": round(late / len(settled), 4) if settled else None,
                          "suppliers": suppliers, "actions": actions})
    materials.sort(key=lambda m: (-m["priority_score"], m["material"]))
    model = {"status": "disabled", "predictions": [], "reason": "Machine learning desativado nesta execução."}
    if enable_ml:
        from .ml import evaluate_delay_model
        model = evaluate_delay_model(data)
    report = {"product": "StrataSignal", "version": "0.1.0", "schema_version": 1,
              "dataset_kind": data["dataset_kind"], "as_of": data["as_of"], "input_sha256": input_sha256,
              "scope": "Abastecimento declarado pelo cliente; um material representa uma especificação técnica homogênea.",
              "materials": materials, "metadata_flags": flags, "delay_model": model,
              "limitations": ["Pontuação de prioridade é uma regra de triagem, não probabilidade de crise.",
                              "Metadados e hashes não comprovam autenticidade, origem física ou conformidade.",
                              "Simulações condicionais não são previsões de eventos geopolíticos.",
                              "Preços unitários são informados no conjunto; custo de referência não é prejuízo ou economia prevista."]}
    report["scenario"] = scenario(materials, shock_country, duration_days, reduction)
    return report
