"""Compare validated snapshots of one declared portfolio using one rule version."""

from . import __version__
from .analytics import analyze
from .schema import InputError, day, validate_bundle

METRICS = ("country_hhi", "supplier_hhi", "coverage_days", "max_nominal_lead_days",
           "priority_score", "stock_kg", "monthly_demand_kg")


def compare_bundles(previous, current, previous_sha256, current_sha256):
    validate_bundle(previous)
    validate_bundle(current)
    if not previous.get("portfolio_id") or not current.get("portfolio_id"):
        raise InputError("Comparação requer portfolio_id nos dois conjuntos")
    if previous["portfolio_id"] != current["portfolio_id"]:
        raise InputError("Os conjuntos pertencem a carteiras declaradas diferentes")
    if previous["dataset_kind"] != current["dataset_kind"]:
        raise InputError("Não é permitido comparar dados sintéticos com dados de cliente")
    if day(previous["as_of"]) >= day(current["as_of"]):
        raise InputError("A data do conjunto anterior deve preceder a do conjunto atual")
    old_report = analyze(previous, previous_sha256, enable_ml=False, include_intelligence=False)
    new_report = analyze(current, current_sha256, enable_ml=False, include_intelligence=False)
    old = {m["material"]: m for m in old_report["materials"]}
    new = {m["material"]: m for m in new_report["materials"]}

    def flags(report, material):
        return {(f["code"], f["material"], f["supplier"], f["evidence_id"]): f
                for f in report["metadata_flags"] if f["material"] == material}

    summary = {"comparable_materials": 0, "added_materials": 0, "removed_materials": 0,
               "specification_changes": 0, "new_signals": 0, "cleared_signals": 0}
    changes = []
    for material in sorted(set(old) | set(new)):
        before, after = old.get(material), new.get(material)
        change = {"material": material, "name": (after or before)["name"], "metrics": {},
                  "new_signals": [], "cleared_signals": [], "supplier_changes": {}, "country_share_changes": []}
        if before is None:
            change["status"] = "added"
            summary["added_materials"] += 1
        elif after is None:
            change["status"] = "removed"
            summary["removed_materials"] += 1
        elif before["name"] != after["name"]:
            change["status"] = "specification_changed"
            change["previous_name"] = before["name"]
            summary["specification_changes"] += 1
        else:
            change["status"] = "comparable"
            summary["comparable_materials"] += 1
            change["metrics"] = {key: {"previous": before[key], "current": after[key],
                                       "delta": round(after[key] - before[key], 6)} for key in METRICS}
            previous_flags, current_flags = flags(old_report, material), flags(new_report, material)
            # Stable identifiers distinguish disappearing signals from proven remediation.
            for key in sorted(current_flags.keys() - previous_flags.keys(), key=repr):
                change["new_signals"].append(current_flags[key])
            for key in sorted(previous_flags.keys() - current_flags.keys(), key=repr):
                change["cleared_signals"].append(previous_flags[key])
            summary["new_signals"] += len(change["new_signals"])
            summary["cleared_signals"] += len(change["cleared_signals"])
            old_suppliers = {p["supplier"]: p for p in before["suppliers"]}
            new_suppliers = {p["supplier"]: p for p in after["suppliers"]}
            change["supplier_changes"] = {
                "added": sorted(new_suppliers.keys() - old_suppliers.keys()),
                "removed": sorted(old_suppliers.keys() - new_suppliers.keys()),
                "changed": sorted(key for key in old_suppliers.keys() & new_suppliers.keys()
                                  if old_suppliers[key] != new_suppliers[key])}
            for code in sorted(set(before["country_shares"]) | set(after["country_shares"])):
                old_share, new_share = before["country_shares"].get(code, 0), after["country_shares"].get(code, 0)
                if abs(new_share - old_share) > 1e-9:
                    change["country_share_changes"].append({"country": code, "previous": old_share,
                                                            "current": new_share, "delta_percentage_points": round(100 * (new_share - old_share), 6)})
        changes.append(change)
    return {"portfolio_id": current["portfolio_id"], "previous_as_of": previous["as_of"],
            "current_as_of": current["as_of"], "elapsed_days": (day(current["as_of"]) - day(previous["as_of"])).days,
            "previous_input_sha256": previous_sha256, "current_input_sha256": current_sha256,
            "rule_version": __version__, "summary": summary, "materials": changes,
            "scope": "Os dois conjuntos foram recalculados com a mesma versão das regras. Mudanças de nome/especificação não recebem deltas. Sinais ausentes na análise atual não comprovam resolução. portfolio_id é declarado pelo operador; não autentica o cliente."}
