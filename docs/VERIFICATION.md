# Verification record — 0.4.0, 6 November 2026

Local verification used Python 3.12.14, scikit-learn 1.8.0, NumPy 2.3.5, SciPy 1.17.0, joblib 1.5.3 and threadpoolctl 3.6.0. Test-only browser orchestration uses jsdom 26.1.0 and the Node test runner. Runtime dependencies are unchanged; exact pins and lockfiles are committed.

## Observed results

| Check | Observed result |
|---|---|
| Python suite | 104 tests passed with optional ML installed |
| Standard-library path (`python -S`) | 96 passed; 8 ML-dependent checks explicitly skipped |
| Report/workbench DOM suite | 29 tests passed, including country map behavior, stress-to-simulator handoff, filtering/pagination and cancellation |
| Real spawned analysis | Rules, comparison and optional ML completed in a spawned, resource-limited child; malformed results, wall timeout, incomplete pipe frames, cancellation and reset races exercised |
| Actual loopback HTTP service | Authentication, Host/Origin/Fetch Metadata, duplicate headers, expiry, quotas, compressed/oversized payload rejection, connection/upload pressure and responsive status during a running job exercised |
| Wheel installation | 0.4.0 wheel built and installed in a fresh virtual environment; packaged map/insight assets, static build, monthly report and real isolated analysis verified outside the checkout |
| Maximum-capacity fixture | 100 materials, 500 positions, 20,000 orders and 5,000 evidences validated and analyzed without mixing specifications; oversized records rejected |
| Measured capacity run | 1.6256 seconds for deterministic rules and descriptive intelligence without ML; 6,728,681 input bytes and 39,040,538 peak traced Python allocation bytes; [raw measurement](benchmarks/v0.4-linux.json) |
| Browser HTTP preview | New intelligence view, 45 synthetic stress cases, supplier filtering and premise handoff exercised in Chrome; desktop presentation inspected and [captured](images/workbench-v04.png) |
| Python advisory audit | pip-audit 2.10.1, `--disable-pip --no-deps --strict`, queried all five pinned optional ML packages; no known vulnerabilities reported |
| JavaScript advisory audit | `npm audit --audit-level=high` reported zero known vulnerabilities in the 39-package test-only graph |
| CI configuration | Actions pinned to upstream commit SHAs, checkout credentials disabled; dedicated dependency-advisory, installed-package and CodeQL checks configured |

The current suite contains 133 checks: 104 Python and 29 DOM. This adds 24 Python and four DOM checks to the map-enabled 0.3 baseline (80 Python / 25 DOM). Advisory checks are time-sensitive observations, not a security certification; the scanner's environment and all build tools were not audited. The recorded capacity run is one local synthetic workload with tracemalloc overhead, not total RSS, concurrent throughput, a percentile latency or a promised SLA.

## Analytical behavior verified

Existing concentration, inventory, metadata, scenario, comparison, temporal maturity/OOD and exclusive-output safeguards remain covered. New checks exercise full declared capacity, per-position delivery outcomes, right-censoring, received-only P90, Wilson interval values, no-history behavior, stress-grid consistency with the existing simulator, independent-specification costs, bounded origin selection, invisible/directional control rejection, failed-worker sanitization and non-resurrection after reset.

The UI tests exercise cancelled jobs, safe labels, bounded history pages, filters and preservation of the last calculated scenario in downloads. They mock fetch for orchestration; actual HTTP/process checks separately exercise the real backend. jsdom does not render layout or enforce CSP. Actual Chrome inspection uses only the hardcoded fictitious demo; no private file was sent to the public Site or NASA.

## Synthetic ML observations

The main chronological holdout retains 556 eligible train / 195 test records, cutoff 2025-11-13, Brier 0.20716 against baseline 0.23568 and AUC 0.73006. Additional windows:

| Cutoff | Train / test | Model Brier | Baseline Brier |
|---|---:|---:|---:|
| 2025-06-30 | 441 / 117 | 0.22639 | 0.24227 |
| 2025-11-13 | 556 / 117 | 0.19708 | 0.23496 |
| 2026-03-30 | 676 / 78 | 0.22101 | 0.23672 |

Training labels precede each cutoff. All three artificial windows improve on their respective references. The instability regression forces later failures after a passing main holdout and verifies that predictions are suppressed. Windows/training sets overlap; these are development diagnostics, not independent external validation, calibration or evidence of real logistics accuracy, profitability or customer savings.

## Verification limits

- Broader mobile layouts, assistive technologies and adversarial browser CSP enforcement remain to be reviewed. Current desktop inspection does not establish complete accessibility or visual acceptance across devices.
- Windows and local Python 3.11 execution were not exercised here. CI covers Python 3.11/3.12; inspect the latest commit's workflow results. POSIX CPU/address-space limits are not claimed on Windows.
- Loopback request budgets and process limits do not provide a production multi-tenant boundary, OS sandbox, complete slow-client defense or independent penetration-test result.
- No real customer dataset, paid pilot, prospectively validated model, physical-origin verification, regulatory certification, commodity-price forecast or live trade-volume snapshot was used. Existing NASA imagery remains explicit opt-in visual context; no satellite-derived operational prediction is implemented.

## Reproduce

```bash
python -m pip install -r requirements-ml.txt
python -m unittest discover -s tests -v
python -S -m unittest discover -s tests -v
npm ci --ignore-scripts
npm test
mkdir -p reports
python -m stratasignal benchmark --out reports/capacity-001.json
python -m stratasignal demo --with-comparison --out reports/comparison-001
```

Use new output paths. Customer processing stays in `python -m stratasignal serve`; the separately built public demo contains only synthetic inputs and precomputed model results. See SECURITY.md and ARCHITECTURE.md for the exact implementation boundary.
