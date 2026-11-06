# StrataSignal — Critical Mineral Supply Assurance

**A working local MVP for a managed procurement-intelligence service.** Assess sourcing concentration, inventory exposure, documentary metadata and experimental delivery-delay estimates. Start with industrial graphite; extend to other materials only with a technically reviewed specification and suitable data.

**Status:** research-backed product hypothesis; functioning prototype; no paying customers, field validation, security certification or production SaaS claimed. The name is provisional.

[Market research and business model, in Portuguese](docs/MARKET_RESEARCH_PT.md) · [Interactive sample report](demo/report.html) (download and open locally) · [Methodology](docs/METHODOLOGY.md) · [Security](SECURITY.md) · [Verification](docs/VERIFICATION.md)

## The service a customer receives

An analyst reviews a bounded procurement dataset and delivers a private HTML decision brief, JSON results, an integrity manifest and a prioritized verification queue. A monthly service can repeat that process with updated customer data. The software already performs the calculations; onboarding, technical review and interpretation are human services.

| Capability | Implemented behavior |
|---|---|
| Exposure analysis | Country and supplier HHI, declared allocations, stock coverage and nominal lead-time comparison, separately for each specification |
| Metadata triage | Missing evidence, origin disagreement, inconsistent dates, expiration and identical fingerprints across suppliers |
| Conditional scenarios | Change affected country, supply reduction and duration; calculate uncovered demand and stock depletion |
| Machine learning | Regularized logistic regression for order lateness; chronological holdout, matured labels, baseline comparison and abstention |
| Public-data preparation | Streaming importer for the MDIC's documented local CSV layout, with explicit NCM, flow and period |
| Private delivery | No network calls, hosted backend, telemetry, external fonts or third-party AI services during analysis or report use |

The demo has **3 fictional material specifications, 6 fictional supplier positions and 780 synthetic orders**. Every report records whether its input is synthetic or customer-declared. Synthetic model metrics demonstrate software behavior only.

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

The importer expects an annual raw NCM CSV with semicolon delimiters, not an arbitrary spreadsheet export. It aggregates repeated state/route/customs-office rows by month and MDIC country code. Its fixture tests contain synthetic numbers. The initial direct API research request returned HTTP 429; **no live trade-volume snapshot is bundled and no automatic synchronization is implemented**. The shipped product uses local CSV imports and makes no network requests.

`digest` hashes the original bytes and records size and filesystem modification time. It does not extract PDF content/XMP, execute documents, perform OCR, validate signatures, verify certificates or authenticate a physical shipment. Documentary dates and origins in the input manifest are declarations.

## Verification

```bash
python -m unittest discover -s tests -v
python -S -m unittest discover -s tests -v
```

The second command exercises the standard-library path and skips ML-dependent tests. `npm ci --ignore-scripts && npm test` runs eight test-only DOM interaction/security checks. See [the verification record](docs/VERIFICATION.md) for exact observed results and environment limitations. The dedicated workflow runs rule, ML and report interaction checks independently of the existing portfolio demos.

## Commercial boundary

Sell a narrow diagnostic plus reviewed periodic reporting before building a shared cloud service. Customer interviews, access to a real historical dataset, domain review, prospective evaluation and a paid pilot remain necessary. SaaS authentication, tenant isolation, document storage, regulatory certification, real-time event feeds, calibrated operational forecasts and automatic supplier qualification are not implemented.

AI-assisted original development. No client project, testimonial, savings estimate or predictive result is fabricated. No license for the product code is granted by this README; obtain a commercialization/license decision before distributing to third parties. Third-party package and data rights remain with their respective licensors.
