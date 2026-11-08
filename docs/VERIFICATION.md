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

## Panorama público Comex Stat em 7 de novembro de 2026

- O endpoint oficial de atualização informou 06/11/2026 e outubro de 2026 como último mês. O build consultou as importações e exportações de agosto a outubro para os NCM 25041000 e 28369100, com 79 registros agregados sem duplicatas. Consultas de janela maior receberam HTTP 429. A carga de três meses foi repetida com os mesmos registros. O hash do JSON publicado é registrado no manifesto.
- A suíte Python aprovou 107 testes. Com `python -S`, 99 passaram e 8 dependentes de ML foram ignorados. Após `npm ci --ignore-scripts`, passaram os 39 testes de interface. Os novos casos cobrem validação de período e valores, duplicatas, rótulos inertes, estados de carregamento, falha, vazio e dados antigos, e a separação da carteira fictícia.
- No Chromium, as importações de grafita somaram US$ 238.029 FOB e 145.802 kg. As exportações somaram US$ 7.923.071 FOB e 3.482.994 kg. Na tabela de exportação de carbonatos de lítio, setembro apareceu como sem registros.
- A 337 pixels CSS via zoom no Chromium, as setas selecionaram o fluxo, Enter abriu a tabela e a página ficou sem rolagem horizontal. O gráfico mediu 279 pixels CSS. A carteira em `/carteira/` manteve a identificação fictícia, o mapa e os campos de arquivo desabilitados. O link de volta abriu o panorama público.

## Atlas em globo e mapa plano em 7 de novembro de 2026

- O WMS oficial da NASA GIBS retornou HTTP 200 e JPEG de 1536 × 768 com CORS liberado para Blue Marble de 01/01/2004 e Terra/MODIS de 06 e 07/06/2025. As duas respostas Terra/MODIS têm hashes diferentes.
- A abertura por **Globo e satélite** levou o foco ao atlas em `/carteira/#atlas`, no globo com cartografia local e com o rótulo **Origens fictícias**. Após ativação, o Blue Marble foi renderizado e as duas datas Terra/MODIS carregaram em globos simultâneos. O mapa plano recebeu seis mosaicos por data no recorte testado. O retorno ao globo manteve as datas e reutilizou as imagens carregadas.
- **Centralizar país** levou a China ao centro. As setas giraram o globo e o arraste na vista B moveu o marcador selecionado de 309,64 × 168,05 para 260,39 × 203,74 pixels nas duas vistas. A 337 pixels CSS via zoom em Chromium, o globo coube em 267 pixels sem rolagem horizontal. Os seletores mediram 44 pixels CSS e Enter abriu a tabela de alocação.
- Passaram 107 testes Python e 40 testes DOM após `npm ci --ignore-scripts`. Com `python -S`, 99 passaram e 8 dependentes de ML foram ignorados. O novo caso cobre consentimento, fonte, duas datas, falha isolada, reutilização da imagem e preservação da seleção. A inspeção estreita foi feita em Chromium de desktop com zoom.

## Relatório do recorte do Comex Stat em 7 de novembro de 2026

- A consulta oficial às 16h15 UTC retornou 79 registros de agosto a outubro de 2026, com atualização da fonte em 06/11/2026. O SHA-256 da carga usada na verificação foi `68698a01946a672149e8a6e0efed10baf1073cba008eae164f1afa3256ae0d29`.
- No Chromium, a tabela e o JSON de exportações de carbonatos de lítio mostraram quatro registros, US$ 310.733 FOB e 15.303 kg no período. Setembro apareceu como **Sem registros** na tabela e teve valores nulos no arquivo. Os dois arquivos baixados foram comparados com a carga original por filtro, linhas, totais, datas e hash.
- A 337 pixels CSS via zoom em desktop, a página manteve a largura útil sem rolagem horizontal. O botão de 44 pixels recebeu foco visível por Tab e gerou o arquivo de setembro por Enter. A prévia também abriu o atlas da carteira fictícia e alternou as duas projeções.
- Passaram 107 testes Python e 41 testes DOM após `npm ci --ignore-scripts`. Com `python -S`, 99 passaram e 8 dependentes de ML foram ignorados. O caso de exportação cobre filtros, campos permitidos, integridade da carga, lacunas e zeros. O teste de recarga cobre a indisponibilidade do relatório enquanto a carga falha.

## Notícias oficiais no recorte em 7 de novembro de 2026

- Às 18h24 UTC, o endpoint Atom do Natural Resources Canada retornou HTTP 200 e 50 itens. A atualização declarada no feed foi 06/11/2026 às 20h41 UTC. Dois links conferidos entraram na curadoria, de 28/08 e 28/10. A consulta separada ao Comex Stat retornou os 79 registros de agosto a outubro.
- No Chromium, o lítio exibiu dois comunicados. Em **Canadá** e **outubro de 2026**, o painel mostrou uma notícia e nenhum registro de comércio. Setembro mostrou o estado vazio. O relatório baixado preservou o recorte, o comunicado exato e os hashes da carga publicada e da resposta Atom.
- A 337 pixels CSS via zoom em desktop, a página manteve largura útil e de rolagem iguais e o cartão coube em 305 pixels. Tab alcançou o link original com foco visível. Enter acionou a exportação a partir do botão de download.
- Passaram 109 testes Python e 43 testes DOM após `npm ci --ignore-scripts`. Com `python -S`, 101 passaram e 8 dependentes de ML foram ignorados. Os testes incluem deduplicação, rejeição de XML inseguro e destinos inválidos, recarga independente, campos externos inertes, seleção compartilhada e verificação dos manifestos.

## Contexto regulatório da grafita em 7 de novembro de 2026

- O RSS mensal do MDIC retornou 15 entradas. A publicação revisada apareceu com data de 16/09/2026. O canal não forneceu data de atualização. O feed canadense foi consultado separadamente e forneceu os dois comunicados anteriores. O Comex Stat respondeu HTTP 429. O pacote reutilizou o JSON da versão 12 após conferir o SHA-256 no manifesto e preservou a data original da consulta.
- No Chromium, grafita, Brasil e setembro de 2026 exibiram uma notícia e nenhum registro de comércio. A 337 pixels CSS via zoom, Tab alcançou o link original e Enter acionou a exportação sem rolagem horizontal. O arquivo baixado correspondeu à matéria, ao hash do feed do MDIC e ao hash da carga de notícias.
- Passaram 110 testes Python e 44 testes DOM após `npm ci --ignore-scripts`. Com `python -S`, 102 passaram e 8 dependentes de ML foram ignorados.

## Período próprio para notícias em 7 de novembro de 2026

- A carga preparada a partir da API oficial do Comex Stat incluiu 79 registros de agosto a outubro de 2026, com atualização da fonte em 6 de novembro. O arquivo RSS de novembro do MDIC foi consultado às 22h19 UTC e trouxe 10 entradas. A curadoria confirmou o comunicado de 5 de novembro para grafita e lítio. [RSS do MDIC](https://www.gov.br/mdic/pt-br/assuntos/noticias/2026/novembro/RSS)
- No Chromium, Tab alcançou o seletor de notícias com foco visível. A 337 pixels CSS via zoom, o seletor manteve altura de 44 pixels e a página ficou sem rolagem horizontal. Trocar para novembro preservou os valores do comércio. Voltar ao período do comércio restaurou as notícias de outubro.
- O JSON baixado por Enter registrou dois agregados de importação de carbonatos de lítio em outubro, com US$ 395 FOB e 2 kg, e um comunicado do MDIC em novembro. Registros, totais, filtros, item e hashes foram comparados às cargas.
- Passaram 111 testes Python e 45 testes DOM após `npm ci --ignore-scripts`. A execução com `python -S` passou 103 testes e ignorou 8 dependentes de ML.

## Mapa público de parceiros em 7 de novembro de 2026

- A API do Comex Stat respondeu HTTP 429. A prévia reutilizou as cargas de comércio e notícias da versão 14 com igualdade de bytes e SHA-256 conferido nos manifestos. A consulta ao Comex Stat permanece datada de 7 de novembro às 19h18 de Brasília.
- As 33 referências usadas foram comparadas aos campos `LABEL_X` e `LABEL_Y` da coleção Natural Earth Admin 0 – Countries 5.1.1. Os 31 nomes de parceiros da carga têm correspondência. O teste DOM mantém um nome sem posição na tabela e no relatório, como texto. [Coleção e termos](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/)
- No Chromium, a tabela abriu com Enter, Tab alcançou a China com foco visível e Enter aplicou o filtro sem perder o foco. O mapa destacou a China e a seção de notícias exibiu a ausência de matérias para o recorte. A 337 pixels CSS via zoom, a largura de rolagem da página também foi 337 pixels. O mapa ocupou 279 pixels e o botão mediu 44 pixels de altura.
- O JSON baixado por Enter registrou dois agregados de importação de grafita da China, somando US$ 145.658 FOB e 124.120 kg. Foram comparados registros, totais, coordenadas, escopo das notícias e hashes das cargas.
- Passaram 111 testes Python e 46 testes DOM após `npm ci --ignore-scripts`. A execução com `python -S` passou 103 testes e ignorou 8 dependentes de ML.
