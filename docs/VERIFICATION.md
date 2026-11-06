# Verification record — 6 November 2026

Local verification used Python 3.12, scikit-learn 1.8.0, NumPy 2.3.5, SciPy 1.17.0, joblib 1.5.3 and threadpoolctl 3.6.0. Test-only report interactions used jsdom 26.1.0 and the Node test runner. Exact version pins and the npm lockfile are committed.

## Observed results

| Check | Observed result |
|---|---|
| `python -m unittest discover -s tests -v` | 41 tests passed with optional ML installed |
| `python -S -m unittest discover -s tests -v` | 35 tests passed; 6 ML-dependent tests explicitly skipped |
| `npm test` | 8 report DOM interaction/security tests passed |
| Existing portfolio regression suites | 20 Excel Rescue, 12 Sales Intelligence and 13 API Bridge tests passed; 45 total |
| CLI demo with ML | Report generated; synthetic labels retained; 3 materials, 6 positions, 780 synthetic orders |
| Built distribution | Wheel built successfully; installed in a fresh virtual environment; packaged HTML/CSS/JS assets produced a working rules-only report outside the source directory |
| Static syntax / patch checks | Python compilation, JavaScript syntax and `git diff --check` passed |
| Python dependency advisory audit | pip-audit 2.10.1 queried the five explicitly pinned optional ML packages; no known vulnerabilities reported at execution time |
| JavaScript dependency advisory audit | npm audit reported zero known vulnerabilities across the test-only dependency graph (39 dependencies) |

The 49 new checks comprise 41 Python tests and 8 DOM tests. The 45 legacy checks are additional. Audit results are time-sensitive observations, not a certification or guarantee. The Python audit used `--disable-pip --no-deps` against the complete five-package pinned ML requirements, without installing/executing those packages in the audit environment. Build tools and the entire host environment were not audited.

## Behaviors exercised

Known concentration and coverage calculations; a numerically specified stress scenario; zero/irrelevant shocks; separation of material specifications; missing/conflicting/expired/shared documentary metadata; open overdue orders; right-censoring; order-time historical features; training-label maturity before temporal cutoff; minimum data/class gates; worse-than-baseline abstention; out-of-distribution abstention; duplicate keys/IDs/headers; orphan references; non-finite, boolean, huge and negative numbers; input size limits; future dates; NCM/flow filtering; CSV aggregation; script/markup injection; report navigation; reactive scenario controls; preserving a requested shock country absent from the portfolio and fractional supply reductions; metadata/provenance labels; refusal to overwrite; symlink protection; POSIX output permissions; manifest consistency.

## Synthetic model observation

The deterministic fixture produced 556 eligible training records and 195 holdout records after purging outcomes unavailable at the cutoff, 2025-11-13. Brier: 0.20716; constant-baseline Brier: 0.23568; ROC AUC: 0.73006. These values exercise the pipeline on an intentionally learnable artificial process. **They do not establish real logistics accuracy, calibration, profitability, risk reduction or a customer outcome.**

## Known verification limits

- Visual/browser inspection was not completed. A local Chromium launch failed because the environment denied a required socket; the cloud browser refused the local-file URL under its protocol policy. No workaround of that policy was attempted. The eight DOM tests validate initialization, navigation, scenario updates, selector behavior and script-injection handling; **jsdom does not render layout or enforce browser CSP**. Desktop/mobile appearance and actual browser CSP enforcement remain to be verified in an appropriate environment.
- The initial public Comex Stat API POST research request returned HTTP 429. No live trade-volume response was used, no market dataset was fabricated and no automatic synchronization is shipped. CSV adapter tests use a clearly labeled synthetic fixture matching the documented layout.
- Hosted CI configuration is included; local success does not imply GitHub-hosted execution has completed. Check the workflow run for the published commit. The 3.11 matrix environment was not executed locally.
- No real customer data, paid pilot, multi-customer access boundary, independent penetration test, regulatory certification, physical-origin validation, commodity-price forecast or prospective model study was exercised.

## Reproduce

From `products/stratasignal`:

```bash
python -m pip install -r requirements-ml.txt
python -m unittest discover -s tests -v
python -S -m unittest discover -s tests -v
npm ci --ignore-scripts
npm test
mkdir -p reports
python -m stratasignal demo --out reports/verification-001
```

The committed demonstration report is a generated sample, not an active hosted application. Open its HTML locally. Use a new output directory for each run; the command intentionally refuses overwrite.
