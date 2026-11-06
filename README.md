# StrataSignal — Critical Mineral Supply Assurance

**A working local MVP with a web workbench for a managed procurement-intelligence service.** Assess sourcing concentration, inventory exposure, documentary metadata and experimental delivery-delay estimates. Start with industrial graphite; extend to other materials only with a technically reviewed specification and suitable data.

**Status:** research-backed product hypothesis; functioning prototype; no paying customers, field validation, security certification or production SaaS claimed. The name is provisional.

[Market research and business model, in Portuguese](docs/MARKET_RESEARCH_PT.md) · [Sample report](demo/report.html) · [Monthly comparison](demo/monthly/report.html) (download HTML and open locally) · [Methodology](docs/METHODOLOGY.md) · [Security](SECURITY.md) · [Verification](docs/VERIFICATION.md) · [Migration record](docs/MIGRATION.md)

## The service a customer receives

An analyst reviews a bounded procurement dataset and delivers a private HTML decision brief, JSON results, an integrity manifest and a prioritized verification queue. A monthly service can repeat that process with updated customer data. The software already performs the calculations; onboarding, technical review and interpretation are human services.

| Capability | Implemented behavior |
|---|---|
| Exposure analysis | Country and supplier HHI, declared allocations, stock coverage and nominal lead-time comparison, separately for each specification |
| Metadata triage | Missing evidence, origin disagreement, inconsistent dates, expiration and identical fingerprints across suppliers |
| Conditional scenarios | Change affected country, supply reduction and duration; calculate uncovered demand and stock depletion |
| Period comparison | Same-portfolio snapshots: concentration, stock coverage, supplier allocations and new/disappearing documentary signals; specification changes suspend deltas |
| Machine learning | Regularized logistic regression for order lateness; chronological holdout, matured labels, baseline comparison and abstention |
| Public-data preparation | Streaming importer for the MDIC's documented local CSV layout, with explicit NCM, flow and period |
| Local workbench | Import JSON or map operational CSV columns; review inputs, run analysis, simulate, compare periods and download reports |
| Private delivery | Local analysis; loopback-only UI connection; no remote customer-data service, telemetry, external fonts or third-party AI calls |

The demo has **3 fictional material specifications, 6 fictional supplier positions and 780 synthetic orders**. Every report records whether its input is synthetic or customer-declared. Synthetic model metrics demonstrate software behavior only.

## Painel local

After installation, open the browser workbench:

```bash
python -m stratasignal serve
```

The command opens an address on `127.0.0.1`, with a temporary access credential in its fragment. Keep that complete address private. Use `--no-open` to open the printed address manually or `--port 8766` to choose another local port. The server binds only to IPv4 loopback and is intended for one operator on a trusted machine.

1. Choose the built-in fictional portfolio, import a raw procurement JSON bundle, or select **Planilhas CSV** and map your columns.
2. For CSV, explicitly choose the separator, numeric format, date format and whether supplier participation is a fraction or percentage. Supply positions; order and evidence manifests are optional. See [the CSV guide and fictional samples](docs/CSV_IMPORT_PT.md).
3. Review the portfolio and run the analysis. Explore country exposure, the documentary queue and experimental delivery estimates when the optional ML dependency is installed.
4. Calculate a supply-reduction scenario. Downloads include the **last calculated** scenario, rather than unsent slider changes.
5. Export HTML, JSON results and the normalized current input. For the next period, import that normalized input as the previous baseline under **Comparar períodos**.

Uploaded content stays in the local Python process memory. Closing the process clears its state; it does not automatically save your inputs or results. Downloads use your browser's normal download handling. Use approved local storage and sharing practices. The interface has no browser storage or telemetry.

The separately built online demonstration contains only repository-owned fictional data. Private-file import is disabled there; model results are precomputed on the synthetic fixture. It is a product demonstration, not a hosted customer-data service. The local workbench does not yet expose the Comex context or document-digest commands; those remain available through the CLI.

## Run the demo

Python 3.11+ is required. Deterministic analytics use the standard library; ML is optional.

```bash
git clone https://github.com/WellingtonMax/stratasignal.git
cd stratasignal
python -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[ml]'
mkdir -p reports
python -m stratasignal demo --out reports/demo-001
```

Open `reports/demo-001/report.html`. It works offline. Navigate between overview, scenarios, evidence and model/provenance. Export JSON from the report. Existing output directories are deliberately refused; use a new run identifier.

To demonstrate the monthly comparison with two explicitly synthetic snapshots:

```bash
python -m stratasignal demo --with-comparison --out reports/monthly-demo-001
```

The **Evolução** section shows changes between the two dates. Both synthetic input files are saved in the output directory for inspection.

Without third-party dependencies:

```bash
python -m stratasignal demo --out reports/rules-001 --without-ml
```

## Analyze customer data

Keep customer inputs in the ignored `client-data/` directory. Never commit them. [examples/minimal-client.json](examples/minimal-client.json) is a placeholder schema illustration, **not actual customer data**. Replace all values and keep `dataset_kind` set to `client` for real records. An empty order history is supported; the model abstains.

```bash
python -m stratasignal analyze \
  --input client-data/procurement.private.json \
  --out reports/customer-001 \
  --shock-country CN --shock-days 45 --reduction 0.5
```

Generate the full synthetic input for schema exploration with `python -m stratasignal sample --out sample.synthetic.json`. For each material, demand, stock and name must match across supplier rows and allocation shares must sum to one. Quantities are kilograms and cost is USD/kg. Technical grades, product forms and origin definitions must be reviewed before grouping records. `ZZ` explicitly denotes an unknown origin; two-letter country codes are operator-supplied and not independently verified against an ISO registry.

The schema rejects unknown fields, duplicate IDs, orphan records, unsupported dates, non-finite values and inconsistent allocations. Limit: 4 MiB per JSON input, 20 materials, 64 positions, 3,000 orders and 500 documentary records.

## Compare reporting periods

Use two raw procurement input bundles, not generated report files. Give both a stable, pseudonymous `portfolio_id` for the same customer/portfolio and preserve material/supplier/evidence identifiers across periods. The earlier `as_of` must precede the current one; data kinds must match. Inputs without a portfolio identifier remain supported for a single analysis.

```bash
python -m stratasignal compare \
  --previous client-data/previous.private.json \
  --current client-data/current.private.json \
  --out reports/monthly-001 --without-ml
```

Both snapshots are recalculated with the same deterministic rule version. The current report gains a comparison section and its manifest records both input hashes. Renamed specifications, additions and removals are shown separately without fabricated deltas. A disappearing metadata signal is not evidence of verified remediation. `portfolio_id` is an operator declaration, not customer authentication. The comparison does not claim causal effects, model improvement or financial savings.

## Public data and file metadata

Download the documented NCM-level CSV from the [official MDIC page](https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/estatisticas/base-de-dados-bruta). Choose and verify an NCM for the product form and classification year; the software does not infer chemistry or purity from it. Example command syntax:

```bash
python -m stratasignal import-comex \
  --input client-data/IMP_2026.csv --flow import \
  --ncm 25041000 --from 2026-01 --to 2026-09 \
  --out client-data/comex.private.json
python -m stratasignal analyze \
  --input client-data/procurement.private.json \
  --market client-data/comex.private.json \
  --out reports/customer-context-001
python -m stratasignal digest \
  --input client-data/document.pdf \
  --out client-data/document-metadata.private.json
```

The importer expects an annual raw NCM CSV with semicolon delimiters, not an arbitrary spreadsheet export. It aggregates repeated state/route/customs-office rows by month and MDIC country code. Its fixture tests contain synthetic numbers. The initial direct API research request returned HTTP 429; **no live trade-volume snapshot is bundled and no automatic synchronization is implemented**. The CLI importer makes no network requests; the workbench communicates only with its local loopback service.

`digest` hashes the original bytes and records size and filesystem modification time. It does not extract PDF content/XMP, execute documents, perform OCR, validate signatures, verify certificates or authenticate a physical shipment. Documentary dates and origins in the input manifest are declarations.

## Verification

```bash
python -m unittest discover -s tests -v
python -S -m unittest discover -s tests -v
```

The second command exercises the standard-library path and skips ML-dependent tests. `npm ci --ignore-scripts && npm test` runs 22 test-only report/workbench DOM interaction and security checks. See [the verification record](docs/VERIFICATION.md) for exact observed results and environment limitations. Dedicated workflows run rule, ML, UI interaction, installed-package and CodeQL checks for this repository.

## Commercial boundary

Sell a narrow diagnostic plus reviewed periodic reporting before building a shared cloud service. Customer interviews, access to a real historical dataset, domain review, prospective evaluation and a paid pilot remain necessary. SaaS authentication, tenant isolation, document storage, regulatory certification, real-time event feeds, calibrated operational forecasts and automatic supplier qualification are not implemented.

AI-assisted original development. No client project, testimonial, savings estimate or predictive result is fabricated. No license for the product code is granted by this README; obtain a commercialization/license decision before distributing to third parties. Third-party package and data rights remain with their respective licensors.
