# Verification record — 0.3.0, 6 November 2026

Local verification used Python 3.12, scikit-learn 1.8.0, NumPy 2.3.5, SciPy 1.17.0, joblib 1.5.3 and threadpoolctl 3.6.0. Test-only report interactions used jsdom 26.1.0 and the Node test runner. Exact version pins and the npm lockfile are committed.

## Observed results

| Check | Observed result |
|---|---|
| `python -m unittest discover -s tests -q` | 80 tests passed with optional ML installed |
| `python -S -m unittest discover -s tests -q` | 74 tests passed; 6 ML-dependent tests explicitly skipped |
| `npm ci --ignore-scripts` and `npm test` | Fresh installation; 22 report/workbench DOM interaction/security tests passed |
| Prior portfolio regression suites | The 0.1 verification covered 20 Excel Rescue, 12 Sales Intelligence and 13 API Bridge checks; those projects are outside this product repository |
| CLI demo with ML | Report generated; synthetic labels retained; 3 materials, 6 positions, 780 synthetic orders |
| Built distribution | Version 0.3.0 wheel built successfully; installed in a fresh virtual environment; packaged assets generated the rules-only monthly report and static demo, and created a loopback server outside the checkout |
| Actual local HTTP service | Token-protected reads/writes, exact Host/Origin checks, duplicate headers, size/framing/content-type rejection, static path restrictions, scenario export and reset exercised over loopback sockets |
| Browser functional inspection | Managed HTTP preview loaded in Chrome; navigation, zero-reduction scenario and monthly comparison exercised in the actual UI; expected zero deficits and +10 days graphite coverage observed |
| Standalone migration | All 30 unchanged source blobs matched their original Git hashes; README setup adapted. Dedicated tests/packaging and CodeQL workflows passed at migration commit `85ee0ea1f363a0b1ba341efb5ba70ba1a6bc0a26` |
| Static syntax / patch checks | Python compilation, JavaScript syntax and `git diff --check` passed |
| Python dependency advisory audit | pip-audit 2.10.1 queried the five explicitly pinned optional ML packages; no known vulnerabilities reported at execution time |
| JavaScript dependency advisory audit | npm audit reported zero known vulnerabilities across the test-only dependency graph (39 dependencies) |

The current product suite has 102 checks: 80 Python and 22 DOM tests. Version 0.3 adds 26 Python and 11 workbench DOM checks to the 65-check v0.2 baseline. Dependency versions are unchanged. Advisory audit results above are the observations recorded earlier on the same date for those unchanged pins, not a new audit or certification. The Python audit used `--disable-pip --no-deps` against the complete five-package pinned ML requirements, without installing/executing those packages in the audit environment. Build tools and the entire host environment were not audited.

## Behaviors exercised

Known concentration and coverage calculations; a numerically specified stress scenario; zero/irrelevant shocks; separation of material specifications; missing/conflicting/expired/shared documentary metadata; open overdue orders; right-censoring; order-time historical features; training-label maturity before temporal cutoff; minimum data/class gates; worse-than-baseline abstention; out-of-distribution abstention; duplicate keys/IDs/headers; orphan references; non-finite, boolean, huge and negative numbers; input size limits; future dates; NCM/flow filtering; CSV aggregation; script/markup injection; report navigation; reactive scenario controls; preserving a requested shock country absent from the portfolio and fractional supply reductions; metadata/provenance labels; refusal to overwrite; symlink protection; POSIX output permissions; manifest consistency. New comparison checks cover changed coverage and concentration, supplier changes, new/absent signals, specification changes, additions/removals, mismatched/missing IDs, mixed data kinds, chronology, old-input compatibility, dual-input hashes, CLI refusal before output creation and the monthly demonstration.

Workbench checks cover Brazilian decimals/grouping, percentage units, explicit dates and arbitrary headers; nullable documentary fields; optional orders/evidence; bounded previews; failure atomicity; invalid baseline preservation; invalidation after current imports; stale scenario rejection; original versus normalized hashes; actual HTTP controls; package-only static assets; synthetic-only public builds; unavailable credentials; loading/reset/navigation; private imports disabled in the online build; rejecting non-synthetic assets; fractional scenario/download consistency; malicious labels remaining inert; failed CSV replacements clearing stale source buffers; and strict UTF-8 with original BOM preservation. jsdom's fetch responses are mocked for UI orchestration tests; Python HTTP checks separately exercise the real server.

## Synthetic model observation

The deterministic fixture produced 556 eligible training records and 195 holdout records after purging outcomes unavailable at the cutoff, 2025-11-13. Brier: 0.20716; constant-baseline Brier: 0.23568; ROC AUC: 0.73006. These values exercise the pipeline on an intentionally learnable artificial process. **They do not establish real logistics accuracy, calibration, profitability, risk reduction or a customer outcome.**

## Known verification limits

- Actual browser functional inspection is now possible through the managed HTTP preview; earlier local-file/launch failures do not describe this preview. The tab screenshot API repeatedly timed out, so no rendered visual acceptance is claimed. DOM/accessibility observations verify content and interactions, not appearance. Desktop/mobile visual layout, assistive technologies and adversarial browser CSP enforcement remain to be reviewed. **jsdom does not render layout or enforce CSP**. Browser console observations contained extension-origin errors; those are not evidence of application security or a clean CSP attack test.
- The initial public Comex Stat API POST research request returned HTTP 429. No live trade-volume response was used, no market dataset was fabricated and no automatic synchronization is shipped. CSV adapter tests use a clearly labeled synthetic fixture matching the documented layout.
- Dedicated hosted CI and CodeQL passed for earlier standalone checkpoints; check the latest published commit's workflows for subsequent changes. The 3.11 matrix environment was not executed locally.
- No real customer data, paid pilot, multi-customer access boundary, independent penetration test, regulatory certification, physical-origin validation, commodity-price forecast or prospective model study was exercised.

## Reproduce

From the standalone repository root:

```bash
python -m pip install -r requirements-ml.txt
python -m unittest discover -s tests -v
python -S -m unittest discover -s tests -v
npm ci --ignore-scripts
npm test
mkdir -p reports
python -m stratasignal demo --out reports/verification-001
python -m stratasignal demo --with-comparison --out reports/comparison-001
```

The committed `demo/report.html` remains an offline report. The separate `build_demo` command produces a static workbench demonstration containing only fictional input and precomputed synthetic ML results. Local customer data uses `python -m stratasignal serve`. Use a new output directory for each CLI report/build; overwrites are intentionally refused.
