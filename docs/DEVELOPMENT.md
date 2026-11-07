# Product development status

## Implemented in 0.4

Independent repository and CI; strict local procurement analysis; experimental delivery-delay estimates; bounded Comex CSV preparation; metadata review queue; conditional stock scenarios; same-portfolio comparisons with version-consistent recalculation; synthetic single-period and monthly reports; loopback browser workbench with explicit operational CSV mapping, ephemeral workspace and exports; static synthetic-only online demonstration.

Version 0.4 adds indexed 100-material/20,000-order processing, a measured maximum-capacity synthetic fixture, asynchronous spawned analysis with cancellation and resource limits, bounded HTTP concurrency/quotas, expiring access, directional-control rejection, descriptive delivery reliability and P90, cost-based origin dependencies, a bounded country stress grid and additional temporal ML stability gates. The existing local world map and optional NASA imagery remain available. New intelligence appears in both the workbench and standalone HTML reports.

## Next milestones and acceptance criteria

| Milestone | Evidence needed before calling it complete |
|---|---|
| Broader visual acceptance | The published desktop overview was visually inspected and captured. Complete the remaining desktop/mobile and assistive-technology review; navigation, scenario calculation and comparison have been exercised in Chrome |
| First real-data pilot | Authorized, minimized procurement files; reviewed field/specification mapping; documented customer question and useful output; no private data committed |
| Operational model evaluation | Temporal diagnostic windows and baseline gates are implemented; real-data calibration, regime/missingness review, business-utility assessment and prospective observations remain |
| Sustainable service | A bounded paid pilot, measured analyst hours and a recurring customer need; documentary market research does not establish demand |
| Hosted offering, if justified | Design and independently verify authentication, authorization, tenant isolation, upload handling, encryption, retention and recovery before receiving customer files online |

Version 0.4 remains a local MVP for customer data. The online build accepts no customer files. Comparative signals describe declared snapshots; the product does not certify physical provenance, issue regulatory opinions or demonstrate real-world predictive accuracy.

## Build the static demonstration

```bash
python -m stratasignal.build_demo --out /tmp/stratasignal-demo-001 --source-commit <40-character-source-commit>
```

Use a new output directory. Only hardcoded synthetic fixtures are accepted by this builder; there is no arbitrary input-file argument. It copies the four packaged UI assets, switches the UI to demo mode and writes synthetic input/report assets plus a source manifest. ML is precomputed during the build; use `--without-ml` when the optional dependency is absent. Deploy the generated directory through the chosen static host. The canonical implementation remains in this repository; hosting receives generated assets.


## UX exploration foundation

[UX architecture, current journeys, visual tokens and acceptance backlog](UX_DESIGN_PT.md) consolidate the product and business plans with the updated blue/white/green/yellow direction. The workbench links the map, allocation chart and accessible data table to the same exploration filters. The optional NASA layer supports two dated Terra/MODIS views with shared navigation. Linked news and consolidated cross-source reports remain backlog items.

## Build the public trade panorama

```bash
python -m stratasignal.build_public_site --out /tmp/stratasignal-public-001 --source-commit <40-character-source-commit>
```

This builder fetches the latest publication date and month from `GET /general/dates/updated`, then reads one `POST /general` per flow. Each query covers the last three published months and the NCM codes `25041000` (natural graphite powder/flakes) and `28369100` (lithium carbonates). It requests monthly rows by country and NCM, with FOB USD and net kilograms. The snapshot records source date, query time and response SHA-256 hashes. The root manifest records the published JSON hash and the separately generated synthetic workbench at `carteira/`.

The queries use the documented public API and attribute the resulting aggregates to SECEX/MDIC. The provider publishes the same underlying statistics as open data. [API documentation](https://api-comexstat.mdic.gov.br/docs) · [Official open data](https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/estatisticas/base-de-dados-bruta) · [Query methodology](https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/estatisticas/perguntas-frequentes-faq/4-como-realizar-consultas)

Use a new output directory. A failed query or invalid row prevents a new build. HTTP 429 permits one bounded retry after a wait. Publication retains the last successful version until a new package is validated. The browser reads a same-origin snapshot, with a warning when the source update date is more than 45 days old. There is no background refresh. These aggregates describe Brazilian trade under the selected customs codes. They do not establish mine origin, specifications, company-level movements, market price or worldwide production.
