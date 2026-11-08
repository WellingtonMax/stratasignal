# Methodology and data contract

Version 0.4.0 — 6 November 2026. Results describe the operator's declared snapshot. The software does not establish physical provenance.

## 1. Operational inputs and units

One `material` is one homogeneous technical specification, product form and purchase unit converted to kg. Different purity, grade, application, processing stage or origin definition must remain separate. `material_name` explains that scope. Grouping is reviewed by a human; NCM codes cannot substitute for it.

For each material/supplier position: monthly demand in kg, stock in kg, allocation share, nominal lead days, USD/kg and declared origin. Demand, stock and specification name repeat consistently across positions for the material. Shares total 1. Stock is shared at material level, not separately assigned to each supplier.

Orders record an ID, material, supplier, declared origin, ordered date, promised date, received date or null, and kg. Dates represent original order-time records. The model assumes the promised date was known at ordering; retroactively edited dates would invalidate the evaluation unless reconstructed as-of. Orders have no partial fulfillment or split-shipment support.

Evidence manifests record an ID, material/supplier link, declared origin, observed date, issue/expiration dates or null, and a supplied SHA-256. The standalone `digest` command calculates hash, size and filesystem mtime from a local file without parsing its content. These are different from verified issuer metadata.

Inputs: UTF-8 JSON or explicitly mapped operational CSV in the local workbench, strict duplicate-key/field checks, 16 MiB per file, at most 100 materials, 500 positions, 20,000 orders and 5,000 evidence records. The combined normalized bundle must also fit 16 MiB. Numeric and date limits are in `schema.py`. Unknown two-letter country codes are accepted as operator declarations; `ZZ` means unknown. No ISO-membership validation is claimed.

The workbench CSV importer is separate from the official MDIC raw-file adapter. It maps the operator's column names to the procurement schema, with explicit decimal, date and fraction/percentage selections; it does not infer units, exchange rates, specifications or physical origin. Orders and evidence are optional, with missing-evidence signals and model abstention where applicable. The review precedes analysis. See [the operational CSV contract](CSV_IMPORT_PT.md).

Workbench report `input_sha256` identifies the pretty-printed normalized UTF-8 bundle (including a final newline); `source_files_sha256` separately identifies the original submitted file bytes, including a UTF-8 BOM if present. CLI reports retain their original raw-file hash behavior. Workbench comparisons use normalized hashes for both periods and retain uploaded-source hashes separately. Hashes identify consistency, not authenticity. The static demo uses the same normalized fixture hashes.

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

After the main holdout gate passes, version 0.4 evaluates three additional chronological windows starting near the 60th, 75th and 90th percentiles of observable order dates. Each test interval ends at the next cutoff or the report cut. Training includes only orders and labels strictly observable before that window's cutoff; window test features still use only outcomes observable before each order. Each window needs 100 train and 40 test orders, with at least 10 examples of each class in both groups. Duplicate date cutoffs are collapsed.

Publication additionally requires at least two valid windows and strictly better Brier than the corresponding constant training-prevalence baseline in at least two thirds of valid windows (rounded up). Otherwise all position estimates abstain. No hyperparameter selection or probability calibration is performed using these windows. The main holdout overlaps later diagnostic windows and training sets overlap; this is a stability gate, not independent replication or a fresh external test. Refit on all observable outcomes happens only after both gates pass.

The demo's process is deliberately learnable and entirely artificial. Its AUC/Brier values are not evidence about actual critical-mineral logistics. Real-data output is labeled experimental. Temporal diagnostics do not authorize automated purchases. Required next evaluation: missingness and regime review, calibration, business utility and a prospective pilot.

Primary methodological references: [scikit-learn common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html), [temporal evaluation](https://scikit-learn.org/stable/modules/cross_validation.html#cross-validation-of-time-series-data), [probability calibration](https://scikit-learn.org/stable/modules/calibration.html). The local verified implementation uses scikit-learn 1.8.0.

## 6. Public trade data

The MDIC CSV importer follows the [documented raw NCM layout](https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/estatisticas/base-de-dados-bruta). It streams a local semicolon-delimited annual file, filters an explicit eight-digit NCM and period, and aggregates kg/FOB by month and numeric MDIC country code. Import layout also requires freight/insurance columns. A source hash covers the complete original file. Limits: 512 MiB, 5 million rows, 8 KiB physical lines and a 60-month requested window.

Snapshots contain only selected aggregates and provenance declarations, not raw customer records. The operator supplies the file and its claimed source; a hash is not an authenticated government signature. A context added to a report must have an import date no later than the report cut and a selected end month earlier than the report month. Revisions and historical availability cannot be reconstructed from a newly downloaded current file, so the importer is not a historical backtest source without archived as-of versions.

The local importer uses operator-supplied files. The separate public panorama prepares a three-month API snapshot at publication time. NCM classification changes, source revisions, low/zero volumes, imports versus exports and product mixtures require review. FOB/kg is not a grade-specific market price. Customs flows cannot identify a firm or prove global supply shares.

The partner map and its table group the same trade rows by product, flow, month selection and partner name. The map retains other partners for geographic context when a country is selected. The report exports geographic references only for partners in its filtered trade rows. Coordinates are Natural Earth label points rounded to tenths of a degree. They support country-scale orientation. Physical routes, facility locations and satellite observations require separate evidence. An unmatched name retains its trade totals and appears as a mapping gap in the table and report.

Public news uses reviewed associations to minerals and countries mentioned in the source. The news filter uses publication dates and defaults to the selected trade period. A separate publication month can extend beyond the customs snapshot. Event dates and feed update times are recorded separately. The country in a news item is thematic context, while the trade country is the declared origin or destination. Keep announcement facts and possible effects distinct. A news item does not identify the NCM or cause of a trade movement.

A sanção da política brasileira em setembro entra como contexto setorial para grafita. A lista federal divulgada em 5 de novembro cita grafita e lítio e aparece no mês independente de novembro. O recorte aduaneiro desta edição vai de agosto a outubro. [Comunicado sobre a política](https://www.gov.br/mdic/pt-br/assuntos/noticias/2026/setembro/presidente-sanciona-politica-nacional-de-minerais-criticos-e-estrategicos) · [Lista federal](https://www.gov.br/mdic/pt-br/assuntos/noticias/2026/novembro/governo-federal-aprova-lista-brasileira-de-minerais-criticos-e-estrategicos)

## 7. Comparing reporting periods

The comparison consumes two raw input bundles and validates both with the same schema. A stable matching `portfolio_id`, identical `dataset_kind` and strictly increasing `as_of` are required. The ID is a pseudonymous operator declaration; it does not authenticate a customer or verify that two files truly belong together. Ordinary analysis accepts legacy inputs without it.

Both dates are recalculated with the current deterministic rules. ML estimates and market snapshots are not compared. This avoids treating a changed software version, model fit or unavailable baseline prediction as an observed operational improvement. Metrics include country/supplier HHI, days of stock coverage, maximum nominal lead, priority, stock and monthly demand. Differences are arithmetic current-minus-previous; country-share differences are percentage points.

Material IDs and exact specification names must agree for quantitative deltas. A name change suspends deltas and asks for technical review, including when the change might be cosmetic. Additions/removals are recorded without inferring a cause or a baseline value. The operator must also preserve units, origin definitions and the meaning of each ID; the software cannot detect a specification change hidden behind an unchanged name.

Documentary signal identity is `(code, material, supplier, evidence_id)`. New/absent signal counts cover comparable materials only. Disappearance can result from data correction, replacement, omission or a real operational change; it never proves remediation or authenticity. Supplier positions added, removed or changed, and declared country allocations, are reported separately. The report manifest records the hashes of both raw input files.

## 8. Descriptive delivery intelligence

For each material/supplier pair, observable outcomes include completed receipts and open orders whose promised date is before the cut. Open orders not yet due are censored. The observed late rate is late outcomes divided by observable outcomes. A 95% Wilson score interval uses `z=1.959963984540054`; zero observations produces no rate or interval. Fewer than 20 outcomes receives a small-sample label. The interval assumes independent binomial observations; correlated shipments, selection bias and changing regimes can invalidate nominal coverage. It is descriptive, not a calibrated probability for a future order.

Completed-delivery lead time is receipt date minus order date. P50/P90 use the nearest-rank definition. P90 is withheld below ten completed deliveries. Open orders do not enter received-time percentiles, including overdue open orders; this can systematically understate the long tail. Their count and maximum overdue days are reported separately. Technical grades remain separate throughout.

Country dependence uses `sum(material monthly kg × supplier allocation × supplier USD/kg)` as a declared monthly reference cost, plus the affected material IDs. It is neither world production share nor loss exposure. Different minerals' kilograms are never added into one portfolio quantity.

## 9. Bounded stress grid and capacity

The stress grid takes the 12 largest origins by declared monthly reference cost (country code breaks ties), durations of 30/60/90 days and reductions of 25/50/100%. All origin dependencies remain in the output; the grid discloses how many were outside its cap. Each cell applies the same steady-state formula as the interactive simulator, lists materials with uncovered demand and sums their reference replacement values in USD. Each cell affects one country independently; results are neither additive nor assigned occurrence probabilities. The UI's **Usar premissas** transfers parameters to the simulator; workbench exports change only after explicit calculation.

Version 0.4 aggregates positions, orders and flags by material once; model prediction histories are also indexed by material/supplier. Comparisons skip the extra intelligence grid when recalculating their two rule snapshots. Limits remain explicit: 100 materials, 500 positions, 20,000 orders, 5,000 evidence records and 16 MiB normalized input. [The measured synthetic workload](benchmarks/v0.4-linux.json) exercises those bounds without ML; it does not validate multi-user operation, a latency SLA or a real procurement workflow.


## Workbench exploration scope

The workbench uses one specification selector for the country allocation map, chart and equivalent accessible table. This visual selection is preserved during navigation and reanalysis where the specification remains available. It does not subset portfolio KPIs, scenario calculations, comparisons or exported reports. The interface discloses that full-portfolio scope beside the selector and the downloads. A reset clears the visual selection and its derived country state. The imagery layer remains separately opt-in and dated; choosing a specification does not authorize external requests. Analytical formulas, input hashes and standalone report data are unchanged by this UX increment.


### Origin and supplier filters in the workbench

The workbench groups matching positions by declared country within one specification. The origin and supplier filters intersect before aggregation, and the resulting allocation values drive the map, chart and table. Each displayed share uses the total declared allocation of that specification as its denominator. An empty intersection means the portfolio has no position matching that specification, origin and supplier selection. Position counts describe material–supplier records. Portfolio indicators, scenario calculations and exported reports cover the full portfolio.


### Monthly order history in the workbench

The delivery-month series groups each order once by the month of `ordered_on`. At the report cutoff, received orders are on time when receipt is on or before the promised date. Open orders are overdue only after their promised date. Counts use orders as their unit, with one of four mutually exclusive states per order. Empty months are absent from the available coverage. The selector filters the chart and equivalent table in this section. The allocation map and existing supplier performance metrics retain their respective scopes.
