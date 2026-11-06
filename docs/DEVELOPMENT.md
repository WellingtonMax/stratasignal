# Product development status

## Implemented in 0.3

Independent repository and CI; strict local procurement analysis; experimental delivery-delay estimates; bounded Comex CSV preparation; metadata review queue; conditional stock scenarios; same-portfolio comparisons with version-consistent recalculation; synthetic single-period and monthly reports; loopback browser workbench with explicit operational CSV mapping, ephemeral workspace and exports; static synthetic-only online demonstration.

## Next milestones and acceptance criteria

| Milestone | Evidence needed before calling it complete |
|---|---|
| Broader visual acceptance | The published desktop overview was visually inspected and captured. Complete the remaining desktop/mobile and assistive-technology review; navigation, scenario calculation and comparison have been exercised in Chrome |
| First real-data pilot | Authorized, minimized procurement files; reviewed field/specification mapping; documented customer question and useful output; no private data committed |
| Operational model evaluation | Multiple temporal windows, calibration and regime/missingness review, baseline/business-utility comparison and prospective observations |
| Sustainable service | A bounded paid pilot, measured analyst hours and a recurring customer need; documentary market research does not establish demand |
| Hosted offering, if justified | Design and independently verify authentication, authorization, tenant isolation, upload handling, encryption, retention and recovery before receiving customer files online |

Version 0.3 remains a local MVP for customer data. The online build accepts no customer files. Comparative signals describe declared snapshots; the product does not certify physical provenance, issue regulatory opinions or demonstrate real-world predictive accuracy.

## Build the static demonstration

```bash
python -m stratasignal.build_demo --out /tmp/stratasignal-demo-001 --source-commit <40-character-source-commit>
```

Use a new output directory. Only hardcoded synthetic fixtures are accepted by this builder; there is no arbitrary input-file argument. It copies the four packaged UI assets, switches the UI to demo mode and writes synthetic input/report assets plus a source manifest. ML is precomputed during the build; use `--without-ml` when the optional dependency is absent. Deploy the generated directory through the chosen static host. The canonical implementation remains in this repository; hosting receives generated assets.
