"""Experimental delay estimates with temporal holdout and matured-label gating."""

import heapq
import math
from collections import defaultdict
from datetime import timedelta
from .schema import day


def outcome(order):
    """Lateness is known the day after the deadline, including still-open orders."""
    promised = day(order["promised_on"])
    received = day(order["received_on"]) if order["received_on"] else None
    late = received is None or received > promised
    known_on = promised + timedelta(days=1) if late else received
    return int(late), known_on


def feature_rows(orders):
    """Only outcomes observable strictly before order placement enter its features."""
    history = defaultdict(lambda: [0, 0])
    pending = []
    result = []
    for o in sorted(orders, key=lambda r: (r["ordered_on"], r["id"])):
        placed = day(o["ordered_on"])
        while pending and pending[0][0] < placed:
            _, _, key, label = heapq.heappop(pending)
            history[key][0] += 1
            history[key][1] += label
        key = (o["material"], o["supplier"])
        n, late = history[key]
        features = {"log_quantity": math.log1p(o["quantity_kg"]),
                    "quoted_lead_days": (day(o["promised_on"]) - placed).days,
                    "historical_late_rate": (late + 2) / (n + 4),
                    "log_observed_history": math.log1p(n), "material=" + o["material"]: 1.0,
                    "month_sin": math.sin(2 * math.pi * placed.month / 12),
                    "month_cos": math.cos(2 * math.pi * placed.month / 12)}
        label, known_on = outcome(o)
        result.append({"order": o, "x": features, "y": label, "known_on": known_on})
        heapq.heappush(pending, (known_on, o["id"], key, label))
    return result


def evaluate_delay_model(data):
    def abstain(reason, **extra):
        return {"status": "abstained", "reason": reason, "predictions": [], **extra}
    try:
        from sklearn.feature_extraction import DictVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.metrics import brier_score_loss, roc_auc_score
        from sklearn.pipeline import make_pipeline
        from sklearn.preprocessing import StandardScaler
    except ImportError:
        return abstain("Instale a dependência opcional de ML; análises determinísticas continuam disponíveis.")
    as_of = day(data["as_of"])
    all_rows = feature_rows(data["orders"])
    known = [r for r in all_rows if r["known_on"] <= as_of]
    if len(known) < 160:
        return abstain("Histórico insuficiente: mínimo de 160 desfechos observáveis.", observable_orders=len(known))
    cutoff = sorted(r["order"]["ordered_on"] for r in known)[int(len(known) * 0.75)]
    train = [r for r in known if r["order"]["ordered_on"] < cutoff and r["known_on"].isoformat() < cutoff]
    test = [r for r in known if r["order"]["ordered_on"] >= cutoff]
    if len(train) < 100 or len(test) < 40 or min(sum(r["y"] == v for r in train) for v in (0, 1)) < 10 or min(sum(r["y"] == v for r in test) for v in (0, 1)) < 10:
        return abstain("Holdout temporal sem volume ou diversidade suficientes.", train_orders=len(train), test_orders=len(test))
    pipeline = make_pipeline(DictVectorizer(sparse=False), StandardScaler(),
                             LogisticRegression(C=0.3, max_iter=1000, random_state=17))
    pipeline.fit([r["x"] for r in train], [r["y"] for r in train])
    probabilities = pipeline.predict_proba([r["x"] for r in test])[:, 1]
    baseline = sum(r["y"] for r in train) / len(train)
    labels = [r["y"] for r in test]
    brier = float(brier_score_loss(labels, probabilities))
    baseline_brier = float(brier_score_loss(labels, [baseline] * len(test)))
    bins = []
    for low, high in ((0, .2), (.2, .4), (.4, .6), (.6, .8), (.8, 1.000001)):
        selected = [(float(p), y) for p, y in zip(probabilities, labels) if low <= p < high]
        if selected:
            bins.append({"n": len(selected), "mean_estimate": round(sum(p for p, _ in selected) / len(selected), 4),
                         "observed_late_rate": round(sum(y for _, y in selected) / len(selected), 4)})
    evaluation = {"cutoff": cutoff, "train_orders": len(train), "test_orders": len(test),
                  "latest_train_label_on": max(r["known_on"] for r in train).isoformat(),
                  "right_censored_orders": len(all_rows) - len(known), "brier": round(brier, 5),
                  "baseline_brier": round(baseline_brier, 5), "roc_auc": round(float(roc_auc_score(labels, probabilities)), 5),
                  "reliability_bins": bins, "baseline": "Frequência de atraso no treinamento.",
                  "protocol": "Holdout cronológico único de 25%; rótulos de treino observáveis antes do corte; atributos de histórico atualizados sequencialmente.",
                  "calibration": "Não calibrado para uso operacional; bins descritivos. Um único holdout não valida estabilidade."}
    if brier >= baseline_brier:
        return abstain("Modelo não superou a referência no holdout; estimativas suprimidas.", evaluation=evaluation)
    # Refit after evaluation for the as-of snapshot. No pickle or external model files.
    pipeline.fit([r["x"] for r in known], [r["y"] for r in known])
    predictions = []
    for p in data["positions"]:
        own = [r for r in known if r["order"]["supplier"] == p["supplier"] and r["order"]["material"] == p["material"] and r["known_on"] < as_of]
        if len(own) < 20:
            predictions.append({"supplier": p["supplier"], "material": p["material"], "estimated_delay_probability": None,
                                "reason": "Menos de 20 desfechos anteriores para esta posição."})
            continue
        quantity = p["monthly_demand_kg"] * p["allocation_share"]
        quantities = [r["order"]["quantity_kg"] for r in own]
        leads = [r["x"]["quoted_lead_days"] for r in own]
        if not min(quantities) <= quantity <= max(quantities) or not min(leads) <= p["nominal_lead_days"] <= max(leads):
            predictions.append({"supplier": p["supplier"], "material": p["material"], "estimated_delay_probability": None,
                                "reason": "Quantidade ou prazo fora do intervalo histórico da posição."})
            continue
        features = {"log_quantity": math.log1p(quantity), "quoted_lead_days": p["nominal_lead_days"],
                    "historical_late_rate": (sum(r["y"] for r in own) + 2) / (len(own) + 4),
                    "log_observed_history": math.log1p(len(own)), "material=" + p["material"]: 1.0,
                    "month_sin": math.sin(2 * math.pi * as_of.month / 12),
                    "month_cos": math.cos(2 * math.pi * as_of.month / 12)}
        predictions.append({"supplier": p["supplier"], "material": p["material"],
                            "estimated_delay_probability": round(float(pipeline.predict_proba([features])[0, 1]), 4),
                            "scenario_quantity_kg": round(quantity, 2), "scenario_quoted_lead_days": p["nominal_lead_days"]})
    return {"status": "synthetic_demo" if data["dataset_kind"] == "synthetic" else "experimental",
            "reason": "Estima atraso em um novo pedido com quantidade igual à alocação mensal e prazo nominal informado.",
            "algorithm": "Regressão logística regularizada; sem ajuste de hiperparâmetros no holdout.",
            "evaluation": evaluation, "predictions": predictions,
            "use": "Demonstração técnica; validar com dados reais, revisão de calibração e testes prospectivos antes de orientar compras."}
