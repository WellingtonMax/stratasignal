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


## UX-01 exploration foundation — 6 November 2026

This increment changes the workbench presentation and visual selection, without changing analytical formulas, customer input schema or standalone report artifacts. Architecture, journeys, visual tokens and the next acceptance criteria are recorded in [the UX backlog](UX_DESIGN_PT.md).

| Check | Observed result |
| --- | --- |
| Python suite | 104 tests passed; optional ML available. |
| Standard-library path | 104 tests ran; 96 passed and 8 ML-dependent tests skipped. |
| Dependency installation and DOM suite | `npm ci --ignore-scripts`; all 32 DOM tests passed. Three additional cases cover shared map/chart/table selection, navigation/reanalysis/export scope and reset of stale material/country context. |
| Synthetic static build | Built successfully with the existing synthetic-only builder and optional ML; private-file inputs remain disabled. Final publication is built again from the committed canonical source with its source SHA. |
| Desktop browser inspection | Blue/white shell, green action, yellow selected map marker, readable type, linked lithium selection and the expanded origin table inspected in Chromium. |
| Narrow-layout inspection | 674 and 337 CSS px via 200% and 400% browser zoom. At 337 px each of the six workbench areas had document `scrollWidth === clientWidth`; navigation and tables scroll within their own regions. Shared selection and visible keyboard focus inspected. |
| Keyboard | Native specification select and Tab to the restore action exercised; focus is visibly blue. Native expandable origin table exercised. |
| Visual evidence | [Workbench map after selecting synthetic lithium](images/workbench-ux01.png). |

Limitations: this is focused visual and DOM verification, not a complete accessibility audit, assistive-technology test or physical-mobile-device test. Device emulation through DevTools was unavailable under browser policy; no policy was changed. Responsive reflow was inspected using browser zoom instead. No new live satellite source, acquisition-date control, news feed or cross-source report was implemented in this increment. The existing opt-in NASA imagery behavior is covered by unchanged regression tests; imagery availability was not revalidated against NASA during this UX-only change. News and satellite source contracts must be checked when those backlog items are implemented.

Existing report integrity manifests remain valid because their generated report assets were not changed. The public workbench receives a fresh `source-manifest.json` recording the exact canonical source commit; its dataset stays synthetic.

## Filtro de origem declarada em 7 de novembro de 2026

- A suíte Python aprovou 104 testes. O caminho com `python -S` aprovou 96 e ignorou 8 dependentes de ML.
- `npm ci --ignore-scripts` e `npm test` concluíram com 33 testes DOM aprovados. O novo caso cobre participação preservada, passagem ao simulador, reanálise, interseção vazia e restauração do foco.
- Na prévia do Chromium, carbonato de lítio e Chile mostraram 55% na tabela. A troca para grafita com Chile selecionado exibiu o estado vazio. Enter na ação de restaurar levou o foco à especificação.
- A 337 pixels CSS via zoom, a seleção de origem respondeu ao teclado. A página mediu 337 pixels de largura útil e de rolagem, com os controles empilhados. Esta inspeção usou Chromium em desktop.
- O build estático usa a carteira fictícia e registra o commit de origem em seu manifesto. Os relatórios de carteira completa usam os mesmos dados e cálculos.

## Filtro de fornecedor declarado em 7 de novembro de 2026

- A suíte Python aprovou 104 testes. O caminho com `python -S` aprovou 96 e ignorou 8 dependentes de ML.
- Os 34 testes DOM passaram. O novo caso divide uma origem entre dois fornecedores fictícios e verifica que a seleção de um deles mantém sua participação original de 35% no mapa, no gráfico e na tabela. O caso cobre reanálise, combinação vazia e restauração.
- No Chromium a 337 pixels CSS via zoom, o seletor respondeu ao teclado, a combinação vazia anunciou zero posições e Enter na restauração devolveu o foco à especificação. A página mediu 337 pixels de largura útil e de rolagem.

## Histórico mensal de pedidos em 7 de novembro de 2026

- Passaram 104 testes Python e 35 testes DOM. Com `python -S`, passaram 96 testes e 8 dependentes de ML foram ignorados.
- Os exemplos estáticos foram regenerados. As contagens mensais somam 780 pedidos em 30 meses com registros. Os hashes dos arquivos coincidem com os manifestos e as métricas anteriores coincidem com as da versão precedente.
- No Chromium, junho de 2026 exibiu 24 pedidos, com 16 recebidos no prazo e 8 em atraso. A tabela abriu por Enter. A 337 pixels CSS via zoom, o seletor respondeu às setas e gráfico e página couberam na largura disponível.

## Data da imagem Terra/MODIS em 7 de novembro de 2026

- O catálogo oficial `DescribeDomains` da NASA GIBS retornou 11 intervalos diários, com lacunas. As requisições diretas ao serviço WMTS para o mosaico de nível 2, linha 1 e coluna 2 em 06 e 07/06/2025 retornaram HTTP 200 e imagens JPEG.
- Passaram 104 testes Python e 36 testes DOM após `npm ci --ignore-scripts`. Com `python -S`, passaram 96 testes e 8 dependentes de ML foram ignorados. O novo caso cobre consentimento, lacuna no catálogo, falha total, carregamento parcial, preservação da data aplicada e descarte de eventos de mosaicos anteriores.
- No Chromium, Enter em **Aplicar data** solicitou a imagem de 06/06/2025 e recebeu 12 mosaicos no enquadramento inicial. O campo marcou 09/08/2025 como inválida e o mapa conservou a imagem aplicada. A 337 pixels CSS via zoom, Enter aplicou 07/06/2025, os controles couberam na tela e a página permaneceu com 337 pixels de largura útil e de rolagem.
- O catálogo local foi consultado em 07/11/2026. Datas futuras dependem de atualização desse recorte. Contagens de mosaicos indicam o resultado do carregamento. A observação pode conter nuvens ou lacunas.

## Comparação de imagens Terra/MODIS em 7 de novembro de 2026

- Conferidas a documentação WMTS e as orientações de uso e crédito da NASA GIBS. A consulta oficial confirmou os 11 intervalos do catálogo local. Para o mesmo mosaico no nível 3, linha 4 e coluna 2, as datas 06 e 07/06/2025 retornaram HTTP 200, JPEG de 256 × 256 pixels e hashes distintos.
- Passaram 104 testes Python e 37 testes DOM após `npm ci --ignore-scripts`. Com `python -S`, passaram 96 testes e 8 dependentes de ML foram ignorados. O novo caso verifica datas iguais e lacunas, mesmas coordenadas e posições dos mosaicos, erro isolado na segunda vista, navegação conjunta e retirada da camada quando desativada.
- No Chromium, as duas vistas de 480 × 360 pixels CSS receberam quatro mosaicos cada em 06 e 07/06/2025. Arrastar ou usar as setas na vista B moveu ambas. Ampliar manteve o mesmo conjunto de coordenadas para as duas datas. Os títulos mostram o mês por extenso para reduzir ambiguidade quando o campo nativo segue outra localidade.
- A 337 pixels CSS via zoom no Chromium, as duas vistas empilharam com 267 pixels de largura e sem rolagem horizontal na página. As setas mantiveram o foco no mapa B, a tabela de alocação abriu por Enter e encerrar a comparação manteve 06/06/2025 na vista de referência. A inspeção foi em desktop com zoom.
