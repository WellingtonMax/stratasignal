# Changelog

## 0.4.0 — 2026-11-06

- Index operational aggregation and supplier histories; support 100 specifications, 500 positions, 20,000 orders and 5,000 evidence records within a 16 MiB normalized input.
- Add descriptive delivery rates with Wilson intervals, received-lead P90, overdue/censored-order counts, origin reference-cost dependencies and up to 108 conditional stress cells. Add paginated/searchable intelligence to the workbench and offline report.
- Require additional chronological stability windows before publishing ML estimates; preserve matured-label purges and baseline/OOD abstention.
- Run HTTP analyses in one spawned process with asynchronous status, cancellation, revision-checked publication, JSON result framing, wall deadlines and supported POSIX resource limits.
- Bound HTTP connections, upload slots, body/header sizes, request quotas and token lifetime; reject compressed bodies, foreign Fetch Metadata and invisible/bidirectional label controls. Add isolation headers.
- Pin GitHub Actions by commit, disable retained checkout credentials and add dependency-advisory CI. Add installed-wheel process checks, adversarial HTTP/process tests and a reproducible synthetic capacity command.
- Preserve the opt-in NASA map integration and private local-data boundary. No production multi-tenant service or real-world model validation is claimed.

## 0.3.0 — 2026-11-06

- Add `serve` with a packaged browser workbench for local JSON/CSV import, column mapping, input review, analysis, scenarios, period comparison and HTML/JSON/normalized-input downloads.
- Support explicit Brazilian decimal/date conventions and percentage allocation; preserve original source-file and normalized-input hashes separately.
- Keep the workspace in memory, invalidate stale results on imports, validate baseline compatibility before mutation, and include the last calculated scenario in exports.
- Bind the local HTTP service only to IPv4 loopback with per-run bearer access, exact Host/Origin checks, bounded JSON requests, fixed static routes and restrictive response headers.
- Add a separately generated synthetic-only static online demo with private imports disabled and precomputed experimental ML results.
- Transport the public HTML report template inside a JSON asset so strict fetch does not depend on static-host HTML path handling; keep the downloaded report self-contained.
- Add 26 Python import/workspace/live-HTTP/build checks and 11 workbench DOM checks. Runtime dependencies are unchanged.

## 0.2.0 — 2026-11-06

- Move the product into `WellingtonMax/stratasignal` with root-level installation, dedicated tests/packaging CI and Python/JavaScript CodeQL scanning.
- Add `compare --previous ... --current ... --out ...` for two raw input snapshots of one declared portfolio.
- Track concentration, coverage, inventory, priority, supplier allocations and new/disappearing metadata signals. Suspend deltas for changed specification names and report additions/removals separately.
- Add the optional `portfolio_id` input field, required and matching for comparisons. Reject mixed synthetic/client data and nonchronological snapshots.
- Add the **Evolução** report section, dual-input hash provenance and `demo --with-comparison`.
- Preserve single-snapshot compatibility and existing offline/security boundaries. No runtime dependencies were added.

## 0.1.0 — 2026-11-06

Initial local MVP in the freelance portfolio: sourcing concentration, inventory scenarios, metadata triage, experimental order-delay model, Comex CSV preparation, synthetic reporting and market research. The original implementation's commit history remains in its source repository; see `docs/MIGRATION.md`.
