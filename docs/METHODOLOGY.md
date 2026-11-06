# Methodology and data contract

Version 0.1.0 — 6 November 2026. Results describe the operator's declared snapshot. The software does not establish physical provenance.

## 1. Operational inputs and units

One `material` is one homogeneous technical specification, product form and purchase unit converted to kg. Different purity, grade, application, processing stage or origin definition must remain separate. `material_name` explains that scope. Grouping is reviewed by a human; NCM codes cannot substitute for it.

For each material/supplier position: monthly demand in kg, stock in kg, allocation share, nominal lead days, USD/kg and declared origin. Demand, stock and specification name repeat consistently across positions for the material. Shares total 1. Stock is shared at material level, not separately assigned to each supplier.

Orders record an ID, material, supplier, declared origin, ordered date, promised date, received date or null, and kg. Dates represent original order-time records. The model assumes the promised date was known at ordering; retroactively edited dates would invalidate the evaluation unless reconstructed as-of. Orders have no partial fulfillment or split-shipment support.

Evidence manifests record an ID, material/supplier link, declared origin, observed date, issue/expiration dates or null, and a supplied SHA-256. The standalone `digest` command calculates hash, size and filesystem mtime from a local file without parsing its content. These are different from verified issuer metadata.

Inputs: UTF-8 JSON, strict duplicate-key/field checks, 4 MiB limit, at most 20 materials, 64 positions, 3,000 orders and 500 evidence records. Numeric and date limits are in `schema.py`. Unknown two-letter country codes are accepted as operator declarations; `ZZ` means unknown. No ISO-membership validation is claimed.

## 2. Concentration and priority rule

- Country share: sum the allocated shares of positions with the same declared country, within one material.
- Country HHI: `10,000 × sum(country_share²)`. Supplier HHI applies the same formula to supplier shares. These describe the customer's allocation, not global production/refining.
- Stock coverage: `stock_kg / (monthly_demand_kg / 30)`.
- Comparison lead: maximum nominal supplier lead time for that material. This simple rule is not a full inventory optimization.
- Metadata fraction: positions with at least one flag, divided by the material's number of positions. Multiple flags on one position do not inflate this fraction.
- Priority: `round(100 × (0.40 × country_HHI/10,000 + 0.35 × max(0,1-coverage/max_lead) + 0.25 × metadata_fraction))`.
- Labels: high at 60+, moderate at 35–59, routine below 35. Weights and boundaries are **heuristics chosen for triage**, with no empirically estimated crisis probability.

Unknown origin is grouped as `ZZ` and flagged. Distributing unknown positions across made-up countries would give false diversification; data quality review is required. Current supplier ownership links, shared refiners, ports, routes and upstream dependencies are not modeled.

## 3. Metadata checks

Flags cover missing evidence, unknown origin, origin disagreement, missing issue date, issue after observation, expired validity, validity ending before issue, and equal hashes across distinct suppliers. A shared certificate/template may legitimately be reused. One expired document does not establish that all current certification is absent. The queue is for human verification and never outputs a fraud probability or certification verdict.

## 4. Conditional stock scenario

For country share `s`, supply reduction `r` and duration `t`, daily deficit is `monthly_demand_kg/30 × s × r`. Uncovered demand at the end is `max(0, daily_deficit × t - stock_kg)`. If the deficit is positive, hypothetical stock depletion time is `stock_kg/daily_deficit`.

Assumptions: baseline inflow exactly covers constant demand; reduction begins immediately; all reported stock is usable; other suppliers continue baseline flow; no extra purchases, substitution, production changes, seasonality or extraordinary replenishment. This is a steady-state stress test, not an ETA model based on scheduled shipments. Nominal lead time is used in the separate priority rule, not in this scenario formula.

Reference replacement value uses weighted declared USD/kg. It is the value of uncovered input at stated costs, not revenue at risk, business loss, a sourcing quote or projected savings. Costs do not include freight, tax or exchange-rate scenarios.

## 5. Experimental order-delay model

Target: any receipt after the original promised date. An on-time outcome is known on receipt. A late outcome is known the day after the promised date, even if the order remains open. Outcomes not yet observable at the report cut are right-censored and excluded from fitting/evaluation. They are counted explicitly.

Features available when placing an order: log kg, quoted lead days, month sine/cosine, material indicator, log prior observed outcomes and a smoothed supplier/material prior delay rate `(late+2)/(observed+4)`. Historical features use only outcomes known **strictly before** that order date. Labels from later orders cannot change earlier features. The implementation uses a time-ordered heap rather than full-history aggregation.

Protocol: one chronological cutoff near the 75th percentile of observable order dates; train orders and their known outcomes must precede the cutoff; holdout orders start at the cutoff. Outcomes maturing after the training cutoff are purged from training. Holdout history features update sequentially as earlier outcomes become known, like an online operational history. The fitted holdout model remains fixed.

Minimums: 160 observable outcomes overall, 100 training orders, 40 holdout orders, and at least 10 examples of each class in each set. Algorithm: standard-scaled, L2-regularized logistic regression, C=0.3, without hyperparameter selection on this holdout. Report Brier, constant-training-prevalence Brier, ROC AUC and descriptive reliability bins. A Brier improvement alone does **not** establish calibration; bins and prospective performance need review.

If Brier is not better than the constant baseline, estimates are suppressed. After passing that gate, the model is refit on all observable outcomes for the report snapshot. An estimate describes a hypothetical new order equal to the current monthly allocation and nominal quoted lead. Each position needs 20 previous observable outcomes and the hypothetical quantity/lead must lie inside that position's observed ranges, otherwise the position abstains. This range check is deliberately simple and is not a full drift detector.

The demo's process is deliberately learnable and entirely artificial. Its AUC/Brier values are not evidence about actual critical-mineral logistics. Real-data output is labeled experimental. A single temporal holdout is a development gate, not permission to automate purchases. Required next evaluation: multiple temporal windows, missingness and regime review, calibration, business utility and a prospective pilot.

Primary methodological references: [scikit-learn common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html), [temporal evaluation](https://scikit-learn.org/stable/modules/cross_validation.html#cross-validation-of-time-series-data), [probability calibration](https://scikit-learn.org/stable/modules/calibration.html). The local verified implementation uses scikit-learn 1.8.0.

## 6. Public trade data

The MDIC CSV importer follows the [documented raw NCM layout](https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/estatisticas/base-de-dados-bruta). It streams a local semicolon-delimited annual file, filters an explicit eight-digit NCM and period, and aggregates kg/FOB by month and numeric MDIC country code. Import layout also requires freight/insurance columns. A source hash covers the complete original file. Limits: 512 MiB, 5 million rows, 8 KiB physical lines and a 60-month requested window.

Snapshots contain only selected aggregates and provenance declarations, not raw customer records. The operator supplies the file and its claimed source; a hash is not an authenticated government signature. A context added to a report must have an import date no later than the report cut and a selected end month earlier than the report month. Revisions and historical availability cannot be reconstructed from a newly downloaded current file, so the importer is not a historical backtest source without archived as-of versions.

No trade-volume snapshot or live synchronization is included. The initial API research request was rate limited (HTTP 429); it was not bypassed. NCM classification changes, source revisions, low/zero volumes, imports versus exports and product mixtures require review. FOB/kg is not a grade-specific market price. Customs flows cannot identify a firm or prove global supply shares.
