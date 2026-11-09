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

[UX architecture, current journeys, visual tokens and acceptance backlog](UX_DESIGN_PT.md) consolidate the product and business plans with the updated blue/white/green/yellow direction. The workbench links the map, allocation chart and accessible data table to the same exploration filters. The optional NASA layer supports two dated Terra/MODIS views with shared navigation. The first public report combines trade aggregates and curated news in separate sections.

## Build the public trade panorama

```bash
python -m stratasignal.build_public_site --out /tmp/stratasignal-public-001 --source-commit <40-character-source-commit>
```

This builder fetches the latest publication date and month from `GET /general/dates/updated`, then reads one `POST /general` per flow. Each query covers the last three published months and the NCM codes `25041000` (natural graphite powder/flakes) and `28369100` (lithium carbonates). It requests monthly rows by country and NCM, with FOB USD and net kilograms. The snapshot records source date, query time and response SHA-256 hashes. The root manifest records the published JSON hash and the separately generated synthetic workbench at `carteira/`.

The queries use the documented public API and attribute the resulting aggregates to SECEX/MDIC. The provider publishes the same underlying statistics as open data. [API documentation](https://api-comexstat.mdic.gov.br/docs) · [Official open data](https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/estatisticas/base-de-dados-bruta) · [Query methodology](https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/estatisticas/perguntas-frequentes-faq/4-como-realizar-consultas)

Use a new output directory. A failed query or invalid row prevents a new build. HTTP 429 permits one bounded retry after a wait. Publication retains the last successful version until a new package is validated. The browser reads a same-origin snapshot, with a warning when the source update date is more than 45 days old. There is no background refresh. These aggregates describe Brazilian trade under the selected customs codes. They do not establish mine origin, specifications, company-level movements, market price or worldwide production.

Each successful build writes the current snapshot both as `comex.json` and as a content-addressed edition under `edicoes/`. The interface exposes that frozen path and its abbreviated SHA-256. Use `--retain-trade-snapshot <verified-comex.json>` while preparing the next publication to carry a prior approved edition into the new package. The builder validates the retained public contract, bounds and records, preserves its exact bytes, and lists every retained edition in the root manifest. A later source revision therefore does not overwrite the earlier file. This is package retention, not an assertion that the provider never revises its statistics.

**Baixar relatório JSON** exports the current public trade selection in the browser. The report records NCM, flow, month and country filters, the direction of the country field, generation time, source update and retrieval dates, units, matching rows, totals and monthly aggregates. Amounts are null where the selection has no rows. Reported zero amounts are retained. The ranking on the page covers all partners for the selected product, flow and period, while the report follows the country filter.

On HTTPS, compare the report's `source.snapshot_sha256` with the digest of the loaded `comex.json` or with `trade_snapshot.sha256` in that publication's `source-manifest.json`. A later publication can replace those files. The digest identifies the input bytes and is null if the browser lacks Web Crypto. The report is generated locally from the public snapshots and requires no further requests.

**Mapa** reuses `carteira/world-land.svg` from the packaged public Site. The source manifest records its SHA-256 under `partner_map`. The report's `partner_geography` field carries approximate country anchors, the reference dataset version and partner names without an anchor. It follows the trade filters. See the [geospatial scope](GEO_SPATIAL_PT.md#mapa-público-de-parceiros-comerciais).

### Atualização de Mercados globais

O build publica `mercados/catalogo.json` e um arquivo por código em `mercados/comercio/`. Ele usa a carga pública reduzida versionada em `stratasignal/data/mercados-globais.json.gz`. O navegador verifica o SHA-256 de cada série antes de exibi-la. O manifesto da publicação registra o hash do catálogo, que também registra os hashes das três entradas. O build da carteira fictícia usa seu próprio manifesto.

Para preparar uma revisão, baixe o arquivo HS22 da edição BACI selecionada, a página M49 e o resultado JSON da consulta Wikidata. Use as classes `Q11691`, `Q695817` e `Q2298435` em `P31`, com `P17` ligado ao país e `P297` ao código alfabético. Selecione `venue`, `label` em inglês, `type`, `iso` e `closed` opcional em `P576`. Para consultas grandes, obtenha os identificadores antes e use lotes com `VALUES ?venue`. Confira cobertura, URLs, datas e direitos de uso antes de substituir o arquivo versionado. [BACI HS22](https://www.cepii.fr/DATA_DOWNLOAD/baci/data/BACI_HS22_V202601.zip) · [ONU M49](https://unstats.un.org/unsd/methodology/m49/overview/) · [Wikidata Query Service](https://query.wikidata.org/)

```bash
python -m stratasignal.public_markets_world \
  --baci BACI_HS22_V202601.zip --m49 m49.html --venues venues.json \
  --checked-on 2026-11-08 --out /tmp/mercados-globais.json.gz
```

### Curadoria de notícias oficiais

O build gera as páginas do Panorama, Mapa e Notícias a partir do mesmo layout. Panorama e Mapa compartilham `ncm`, `fluxo`, `mes`, `pais` e `noticias_mes` no endereço. A edição geral em `/noticias/` consulta somente `/news.json`. O atalho de contexto envia `mineral`, `pais_citado` e os meses `publicado`. Essa seleção afeta a leitura, enquanto os parâmetros de comércio permitem voltar ao recorte original.

Em 9 de novembro de 2026, a prévia foi conferida em desktop e a 320 e 768 px. A navegação por teclado abriu Mapa, Panorama e Notícias no topo, preservou a China no recorte comercial e mostrou cinco comunicados na edição geral. O filtro Brasil e novembro retornou dois itens. A aproximação, a tabela de parceiros, o endereço antigo `/#mapa` e o download do JSON também foram exercitados.

O mesmo build consulta o feed Atom do Natural Resources Canada. A seleção editorial em `stratasignal/public_news.py` mantém títulos e resumos próprios e exige que a URL original apareça no feed oficial. O build registra o hash da resposta Atom, a atualização informada pela fonte e a data da consulta. Uma falha do feed impede a geração de um novo pacote. A publicação existente fica disponível. [Catálogo oficial de feeds](https://natural-resources.canada.ca/corporate/rss-feeds)

A primeira cobertura foi conferida em 7 de novembro de 2026. Inclui dois comunicados sobre lítio entre 50 entradas do feed. Datas de publicação e de evento vêm dos comunicados conferidos. O conteúdo original, as imagens e as marcas do emissor ficam na fonte. Os termos do governo canadense distinguem reprodução não comercial de redistribuição comercial. A curadoria publica texto próprio, metadados factuais e links. [Termos do Canada.ca](https://www.canada.ca/en/transparency/terms.html)

O relatório acrescenta `news_context` com fonte, hashes, critérios de seleção, cobertura e itens. `news_context.filters.months` registra os meses de publicação selecionados e `period_mode` distingue `trade_period` de `independent`. Os meses, totais e registros na raiz do relatório continuam associados ao comércio. Compare `news_context.source.snapshot_sha256` com `news_snapshot.sha256` no manifesto. A interface e o JSON distinguem a ausência de correspondências da indisponibilidade da carga. Uma consulta feita há mais de 30 dias recebe aviso de atualização na interface. A preparação da publicação atualiza os arquivos. A navegação no panorama consulta apenas o próprio Site.

O segundo conector lê os arquivos RSS 1.0 do MDIC de setembro e novembro de 2026. Confere o endereço de cada canal, o endereço original do comunicado e a data da publicação. O feed informa datas por item e omite a atualização do canal. A interface registra essa lacuna e mostra a consulta e a cobertura por arquivo. O relatório mantém setembro em `news_context.mdic_source` e registra os arquivos adicionais em `news_context.mdic_archives`. Os itens do MDIC incluem `source_id` e `feed_url`. Um item pode ter códigos temáticos adicionais em `related_ncms` sem duplicar o comunicado. Os títulos e resumos são próprios e as matérias originais permanecem nos respectivos emissores. [RSS de setembro](https://www.gov.br/mdic/pt-br/assuntos/noticias/2026/setembro/RSS) · [RSS de novembro](https://www.gov.br/mdic/pt-br/assuntos/noticias/2026/novembro/RSS)
