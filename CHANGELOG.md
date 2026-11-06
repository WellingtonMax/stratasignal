# Changelog

## 0.2.0 — 2026-11-06

- Move the product into `WellingtonMax/stratasignal` with root-level installation, dedicated tests/packaging CI and Python/JavaScript CodeQL scanning.
- Add `compare --previous ... --current ... --out ...` for two raw input snapshots of one declared portfolio.
- Track concentration, coverage, inventory, priority, supplier allocations and new/disappearing metadata signals. Suspend deltas for changed specification names and report additions/removals separately.
- Add the optional `portfolio_id` input field, required and matching for comparisons. Reject mixed synthetic/client data and nonchronological snapshots.
- Add the **Evolução** report section, dual-input hash provenance and `demo --with-comparison`.
- Preserve single-snapshot compatibility and existing offline/security boundaries. No runtime dependencies were added.

## 0.1.0 — 2026-11-06

Initial local MVP in the freelance portfolio: sourcing concentration, inventory scenarios, metadata triage, experimental order-delay model, Comex CSV preparation, synthetic reporting and market research. The original implementation's commit history remains in its source repository; see `docs/MIGRATION.md`.
