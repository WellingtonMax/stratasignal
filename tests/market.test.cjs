"use strict";
const {test} = require("node:test");
const assert = require("node:assert/strict");
const {Blob} = require("node:buffer");
const {createHash, webcrypto} = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {JSDOM} = require("jsdom");

const ui = path.join(__dirname, "../stratasignal/ui");
const html = fs.readFileSync(path.join(ui, "market.html"), "utf8");
const script = fs.readFileSync(path.join(ui, "market.js"), "utf8");
const foreignLabel = "<img src=x onerror=alert(1)>";
const record = (month, country, fob_usd, kg, flow = "import", ncm = "25041000") =>
  ({month, country, fob_usd, kg, flow, ncm});
const sample = {
  schema_version: 1,
  dataset_kind: "public_aggregate",
  updated_on: "2025-04-08",
  fetched_at: "2025-04-09T12:01:00Z",
  months: ["2025-01", "2025-02", "2025-03"],
  records: [
    record("2025-01", "China", 1200, 700),
    record("2025-01", foreignLabel, 300, 0),
    record("2025-03", "China", 500, 300),
    record("2025-02", "Japão", 5000, 1800, "export"),
    record("2025-03", "Chile", 3000, 2000, "import", "28369100"),
  ],
};

const newsItem = {
  url: "https://www.canada.ca/en/natural-resources-canada/news/2025/03/example.html",
  title: "Notícia fictícia sobre lítio",
  summary: foreignLabel,
  possible_impact: "Hipótese fictícia de efeito logístico.",
  topic: "Logística",
  published_on: "2025-03-07",
  event_on: "2025-03-06",
  ncm: "28369100",
  countries: ["Canadá"],
  companies: ["Empresa de exemplo"],
};
const newsSample = {
  schema_version: 1,
  dataset_kind: "public_curated_news",
  source: "Natural Resources Canada",
  feed_updated_at: "2025-04-08T10:00:00Z",
  fetched_at: "2025-04-09T12:00:00Z",
  feed_sha256: "f".repeat(64),
  feed_entries: 2,
  items: [newsItem],
};

function response(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return {ok: true, arrayBuffer: async () => bytes.buffer};
}

function editionManifest(current = sample, previous = {...sample, fetched_at: "2025-04-08T12:01:00Z"}) {
  const edition = data => {
    const sha256 = createHash("sha256").update(JSON.stringify(data)).digest("hex");
    return {path: `edicoes/comex-${sha256}.json`, sha256, updated_on: data.updated_on, fetched_at: data.fetched_at};
  };
  const editions = [edition(current), edition(previous)];
  return {dataset_kind: "public_aggregate", trade_snapshot: {
    sha256: editions[0].sha256, edition_path: editions[0].path, editions,
  }};
}

function open(fetcher, newsFetcher, query = "", manifestFetcher, view = "panorama", yearFetcher) {
  const route = view === "panorama" ? "/" : `/${view}/`;
  const page = html.replace('data-view="panorama"', `data-view="${view}"`);
  const dom = new JSDOM(page, {runScripts: "outside-only", url: `https://example.invalid${route}${query}`});
  const {window} = dom;
  const get = id => window.document.getElementById(id);
  const calls = [];
  window.TextDecoder = TextDecoder;
  Object.defineProperty(window.crypto, "subtle", {value: webcrypto.subtle});
  window.fetch = async (url, options) => {
    calls.push({url, options});
    const attempts = calls.filter(call => call.url === url).length;
    if (url === "/news.json") return newsFetcher ? newsFetcher(attempts) : response(newsSample);
    if (url === "/source-manifest.json") return manifestFetcher ? manifestFetcher(attempts) : response(editionManifest());
    if (yearFetcher && url.startsWith("/edicoes/")) return yearFetcher(url);
    assert.equal(url, "/comex.json");
    return fetcher ? fetcher(attempts) : response(sample);
  };
  window.eval(script);
  const change = (id, value) => {
    const select = get(id);
    select.value = value;
    select.dispatchEvent(new window.Event("change", {bubbles: true}));
  };
  return {dom, window, get, calls, change};
}
async function settle(get, id = "market-status") {
  for (let step = 0; step < 100 && /Carregando/.test(get(id).textContent); step++) {
    await new Promise(resolve => setTimeout(resolve, 1));
  }
}

test("the panorama groups verified amounts and preserves missing months and inert source labels", async () => {
  const {dom, window, get, calls, change} = open();
  await settle(get);
  assert.deepEqual(calls.map(call => [call.url, call.options.credentials, call.options.redirect]), [
    ["/comex.json", "omit", "error"],
    ["/news.json", "omit", "error"],
    ["/source-manifest.json", "omit", "error"],
  ]);
  assert.equal(get("market-controls").disabled, false);
  assert.equal(get("market-edition").hidden, false);
  assert.match(get("market-edition-id").textContent, /^SHA-256 [0-9a-f]{12}…$/);
  assert.match(get("market-edition-download").href, /\/edicoes\/comex-[0-9a-f]{64}\.json$/);
  assert.equal(get("market-edition-history").hidden, false);
  assert.equal(get("market-edition-list").children.length, 2);
  assert.match(get("market-edition-list").textContent, /Edição em uso.*Edição anterior/s);
  assert.match(get("market-edition-list").textContent, /mesma data de atualização informada pela fonte/);
  assert.equal(get("market-edition-list").querySelectorAll("a").length, 2);
  assert.equal(get("market-fob").textContent, "US$ 2.000");
  assert.equal(get("market-kg").textContent, "1.000");
  assert.equal(get("market-partners").textContent, "2");
  assert.equal(get("market-stale").hidden, false);
  assert.match(get("market-monthly").textContent, /fevereiro de 2025Sem registros/);
  assert.match(get("market-ranking").textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(get("market-ranking").querySelector("img"), null);
  get("market-ranking").querySelector("button").click();
  assert.equal(get("market-country").value, "China");
  assert.equal(window.document.activeElement, get("market-country"));
  assert.equal(get("market-fob").textContent, "US$ 1.700");
  change("market-period", "2025-02");
  assert.equal(get("market-results").hidden, true);
  assert.match(get("market-status").textContent, /Nenhum registro neste recorte/);
  change("market-flow", "export");
  assert.equal(get("market-country-label").textContent, "País de destino");
  assert.equal(get("market-fob").textContent, "US$ 5.000");
  change("market-product", "28369100");
  assert.equal(get("market-results").hidden, true);
  get("market-clear").click();
  assert.equal(get("market-fob").textContent, "US$ 2.000");
  assert.equal(window.document.activeElement, get("market-product"));
  assert.equal(calls.length, 3);
  dom.window.close();
});

test("failed and invalid published loads expose a retry without enabling filters", async () => {
  const {dom, get, calls} = open(count => {
    if (count === 1) return {ok: false};
    if (count === 2) return response({...sample, records: [...sample.records, sample.records[0]]});
    return response(sample);
  });
  assert.match(get("market-status").textContent, /Carregando/);
  assert.equal(get("market-report").hidden, true);
  assert.equal(get("market-geo-content").hidden, true);
  await settle(get);
  assert.equal(get("market-retry").hidden, false);
  assert.equal(get("market-controls").disabled, true);
  assert.equal(get("market-report").hidden, true);
  assert.match(get("market-geo-status").textContent, /Mapa indisponível/);
  get("market-retry").click();
  await settle(get);
  assert.equal(get("market-results").hidden, true);
  assert.equal(get("market-report").hidden, true);
  get("market-retry").click();
  await settle(get);
  assert.equal(get("market-retry").hidden, true);
  assert.equal(get("market-results").hidden, false);
  assert.equal(get("market-report").hidden, false);
  assert.equal(get("market-geo-content").hidden, false);
  assert.equal(calls.length, 5);
  dom.window.close();
});

function captureDownloads(window, get) {
  const files = [];
  let blob;
  window.Blob = Blob;
  window.URL.createObjectURL = file => {
    blob = file;
    return "blob:https://example.invalid/report";
  };
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () {
    files.push({blob, name: this.download});
  };
  async function download() {
    get("market-download").click();
    const file = files.at(-1);
    assert.equal(file.blob.type, "application/json");
    return JSON.parse(await file.blob.text());
  }
  return {files, download};
}

test("the graphite deep link drives the official chart, map and report and survives a flow change", async t => {
  const {dom, window, get, change} = open(null, null, "?ncm=25041000&fluxo=export#explorar");
  t.after(() => dom.window.close());
  const {download} = captureDownloads(window, get);
  await settle(get);
  await settle(get, "market-news-status");
  assert.equal(get("market-flow").value, "export");
  assert.equal(get("market-country-label").textContent, "País de destino");
  assert.equal(get("market-fob").textContent, "US$ 5.000");
  assert.equal(get("market-kg").textContent, "1.800");
  assert.match(get("market-monthly").textContent, /fevereiro de 2025/);
  assert.match(get("market-geo-partners").textContent, /Japão/);
  const report = await download();
  assert.equal(report.filters.ncm, "25041000");
  assert.equal(report.filters.flow, "export");
  assert.equal(report.filters.country_role, "destination");
  assert.deepEqual(report.totals, {record_count: 1, fob_usd: 5000, kg: 1800, partner_count: 1});
  assert.equal(get("market-report-trade").textContent, "US$ 5.000 FOB · 1.800 kg");
  assert.equal(get("market-report-trade-coverage").textContent, "1 registro · 1 de 3 meses com registros");
  assert.match(get("market-report-trade-source").textContent, /Comex Stat.*8 de abril de 2025/);
  assert.equal(get("market-report-map").textContent, "1 parceiro com ponto");
  assert.equal(get("market-baci-link").href, "https://example.invalid/mercados/?pais=BR&produto=250410&fluxo=export");
  change("market-flow", "import");
  assert.equal(window.location.search, "?ncm=25041000&fluxo=import");
  assert.equal(window.location.hash, "#explorar");
  assert.equal(new URL(get("market-baci-link").href).searchParams.get("fluxo"), "import");
  change("market-product", "28369100");
  assert.equal(get("market-baci-link").hidden, true);
});

test("ferroniobium has its own trade, news and report scope", async t => {
  const data = {...sample, records: [
    ...sample.records,
    record("2025-02", "Japão", 2500, 100, "export", "72029300"),
  ]};
  const {dom, window, get, change} = open(() => response(data), null, "?ncm=72029300&fluxo=export&pais=Japão", null, "mapa");
  t.after(() => dom.window.close());
  const {download} = captureDownloads(window, get);
  await settle(get);
  await settle(get, "market-news-status");
  const report = await download();
  assert.equal(get("market-geo-selection").textContent, "Japão");
  assert.equal(report.filters.ncm, "72029300");
  assert.equal(report.filters.country_role, "destination");
  assert.equal(report.totals.fob_usd, 2500);
  assert.equal(report.totals.kg, 100);
  assert.equal(report.unit_value.value, 25);
  assert.match(get("market-report-alloy").textContent, /massa da liga/);
  assert.ok(report.limits.includes(get("market-report-alloy").textContent));
  assert.equal(report.news_context.status, "no_matches");
  assert.equal(new URL(get("market-context-news").href).searchParams.get("mineral"), "72029300");
  assert.equal(get("market-baci-link").hidden, true);
  assert.equal(get("market-chain").hidden, false);
  assert.equal(get("market-report-chain").hidden, false);
  const industry = report.industrial_context;
  assert.equal(industry.location, "Araxá (MG)");
  assert.equal(industry.related_ncm, "72029300");
  assert.deepEqual(industry.stages.map(({name, operator}) => [name, operator]), [
    ["Extração", "COMIPA"], ["Beneficiamento", "CBMM"], ["Refino", "CBMM"], ["Metalurgia", "CBMM"],
  ]);
  assert.deepEqual(Array.from(get("market-chain-stages").querySelectorAll("strong"), node => node.textContent),
    industry.stages.map(stage => stage.name));
  assert.equal(get("market-chain-source").href, industry.source.url);
  assert.equal(get("market-chain-production-source").href, industry.production.source.url);
  assert.equal(industry.production.year, 2022);
  assert.equal(industry.production.quantity, 87880);
  assert.equal(industry.production.unit, "t");
  assert.match(get("market-chain-production").textContent, /87\.880 t de ferronióbio.*2022/);
  assert.equal(get("market-report-chain-production").textContent, get("market-chain-production").textContent);
  assert.equal(industry.limits, get("market-chain-limits").textContent);
  const regional = report.production_by_state;
  assert.equal(get("market-regional-production").hidden, false);
  assert.equal(get("market-report-regional").hidden, false);
  assert.equal(regional.year, 2024);
  assert.equal(regional.source.revised_month, "2026-05");
  assert.equal(get("market-regional-source").href, regional.source.url);
  assert.deepEqual(regional.states.map(row => [row.uf, row.rom_t, row.beneficiated_t]),
    [["GO", 9249168, 42475], ["MG", 6580700, 182199]]);
  assert.equal(regional.brazil.beneficiated_t, 213668);
  assert.equal(regional.beneficiated_reconciliation.sum_listed_states_t, 224674);
  assert.equal(regional.beneficiated_reconciliation.difference_listed_minus_published_t, 11006);
  assert.match(get("market-regional-rows").textContent, /Minas Gerais6\.580\.700182\.199/);
  assert.match(get("market-regional-difference").textContent, /224\.674.*213\.668.*11\.006/);
  assert.equal(get("market-report-regional-difference").textContent, get("market-regional-difference").textContent);
  change("market-period", "2025-03");
  assert.equal(get("market-results").hidden, true);
  assert.equal(get("market-chain").hidden, false);
  assert.deepEqual((await download()).industrial_context, industry);
  change("market-flow", "import");
  const empty = await download();
  assert.equal(empty.filters.country_role, "origin");
  assert.equal(empty.totals.fob_usd, null);
  assert.deepEqual(empty.industrial_context, industry);
  assert.deepEqual(empty.production_by_state, regional);
  change("market-product", "25041000");
  assert.equal(get("market-report-alloy").hidden, true);
  assert.equal(get("market-chain").hidden, true);
  assert.equal(get("market-report-chain").hidden, true);
  assert.equal(get("market-regional-production").hidden, true);
  assert.equal(get("market-report-regional").hidden, true);
  const other = await download();
  assert.equal(other.industrial_context, null);
  assert.equal(other.production_by_state, null);
});

test("a ferroniobium link keeps the documented case available when trade loading fails", async t => {
  const {dom, get, calls} = open(() => ({ok: false}), null, "?ncm=72029300");
  t.after(() => dom.window.close());
  assert.match(get("market-status").textContent, /Carregando/);
  assert.equal(get("market-chain").hidden, false);
  await settle(get);
  await settle(get, "market-news-status");
  assert.equal(get("market-retry").hidden, false);
  assert.equal(get("market-report").hidden, true);
  assert.equal(get("market-chain").hidden, false);
  assert.equal(get("market-chain-stages").children.length, 4);
  assert.equal(get("market-regional-production").hidden, false);
  assert.equal(get("market-regional-rows").children.length, 3);
  assert.deepEqual(calls.map(call => call.url), ["/comex.json", "/news.json"]);
});

test("the panorama falls back to its default controls for unsupported URL filters", async t => {
  const {dom, get} = open(null, null, "?ncm=2504&fluxo=outro");
  t.after(() => dom.window.close());
  await settle(get);
  await settle(get, "market-news-status");
  assert.equal(get("market-product").value, "25041000");
  assert.equal(get("market-flow").value, "import");
  assert.equal(get("market-controls").disabled, false);
});

test("the public map and accessible partner table share the trade and news filters", async () => {
  const news = {...newsSample, items: [{...newsItem, countries: ["Chile"]}]};
  const {dom, window, get, change} = open(null, () => response(news));
  const {download} = captureDownloads(window, get);
  await settle(get);
  await settle(get, "market-news-status");
  const table = get("market-geo-partners");
  const button = label => [...table.querySelectorAll("button")].find(choice => choice.value === label);
  assert.match(get("market-geo-status").textContent, /1 de 2 parceiros no mapa/);
  assert.equal(get("market-geo-pins").children.length, 1);
  assert.match(button(foreignLabel).closest("th").textContent, /Sem ponto no mapa/);
  assert.equal(table.querySelector("img"), null);
  button("China").focus();
  button("China").click();
  assert.equal(window.document.activeElement, button("China"));
  assert.equal(button("China").getAttribute("aria-pressed"), "true");
  assert.equal(get("market-country").value, "China");
  assert.equal(get("market-geo-pins").querySelector(".selected title").textContent, "China");
  assert.equal(get("market-fob").textContent, "US$ 1.700");
  assert.equal(get("market-geo-context").hidden, false);
  assert.equal(get("market-geo-rank").textContent, "1º de 2 parceiros em valor FOB");
  assert.match(get("market-geo-shares").textContent, /85%.*US\$ 1\.700 de US\$ 2\.000/);
  assert.match(get("market-geo-shares").textContent, /Peso incompleto/);
  assert.equal(get("market-report-shares").textContent, get("market-geo-shares").textContent);
  const history = get("market-geo-history");
  assert.equal(history.children.length, 3);
  assert.deepEqual([...history.children].map(item => item.getAttribute("aria-label")), [
    "janeiro de 2025: US$ 1.200",
    "fevereiro de 2025: Sem registros",
    "março de 2025: US$ 500",
  ]);
  assert.match(history.children[0].querySelector(".market-geo-history-track span").style.getPropertyValue("--market-month-share"), /^100%$/);
  change("market-geo-metric", "kg");
  assert.deepEqual([...history.children].map(item => item.querySelector("strong").textContent), [
    "700 kg", "Sem registros", "300 kg",
  ]);
  change("market-geo-metric", "unit_value");
  assert.deepEqual([...history.children].map(item => item.querySelector("strong").textContent), [
    "US$ 1,71429 FOB/kg", "Sem registros", "US$ 1,66667 FOB/kg",
  ]);
  assert.equal(get("market-geo-clear").hidden, false);
  const china = await download();
  assert.deepEqual(china.partner_share, {
    basis: "all_partners_same_ncm_flow_months",
    fob_usd: {status: "available", numerator: 1700, denominator: 2000, fraction: 0.85},
    kg: {status: "incomplete_weight", numerator: 1000, denominator: 1000, fraction: null},
  });
  assert.deepEqual(china.partner_geography.points, [{country: "China", longitude: 106.3, latitude: 32.5}]);
  assert.deepEqual(china.partner_geography.partners_without_anchor, []);
  button(foreignLabel).click();
  assert.deepEqual((await download()).partner_geography.partners_without_anchor, [foreignLabel]);
  assert.equal(get("market-geo-pins").querySelector(".selected"), null);
  assert.match(history.children[0].querySelector("strong").textContent, /peso líquido insuficiente/);
  change("market-period", "2025-02");
  assert.equal(get("market-geo-content").hidden, true);
  assert.match(get("market-geo-status").textContent, /Nenhum parceiro com registros/);
  change("market-product", "28369100");
  change("market-period", "2025-03");
  button("Chile").click();
  const chile = await download();
  assert.equal(chile.filters.country, "Chile");
  assert.equal(chile.news_context.items[0].countries[0], "Chile");
  assert.deepEqual(chile.partner_geography.points.map(point => point.country), ["Chile"]);
  button("Chile").click();
  assert.equal(get("market-country").value, "");
  assert.equal(get("market-geo-context").hidden, true);
  assert.equal(get("market-geo-clear").hidden, true);
  button("Chile").click();
  get("market-geo-clear").click();
  assert.equal(get("market-country").value, "");
  assert.equal(window.document.activeElement, get("market-country"));
  dom.window.close();
});

test("partner shares use independent totals for the same product, flow and months", async t => {
  const records = [
    ...sample.records.filter(row => row.country !== foreignLabel),
    record("2025-01", "Alemanha", 800, 300),
    record("2025-03", "Alemanha", 0, 0),
    record("2025-03", "Japão", 0, 100, "export"),
    record("2025-03", "Chile", 0, 100, "export"),
  ];
  const {dom, window, get, change} = open(() => response({...sample, records}));
  t.after(() => dom.window.close());
  const {download} = captureDownloads(window, get);
  await settle(get);
  assert.equal(get("market-report-partner-share").hidden, true);
  assert.equal((await download()).partner_share, null);
  change("market-country", "China");
  change("market-period", "2025-01");
  const {partner_share: comparison} = await download();
  assert.deepEqual(comparison.fob_usd, {status: "available", numerator: 1200, denominator: 2000, fraction: 0.6});
  assert.deepEqual(comparison.kg, {status: "available", numerator: 700, denominator: 1000, fraction: 0.7});
  assert.match(get("market-geo-shares").textContent, /60%.*70%.*700 kg de 1\.000 kg/);
  change("market-period", "2025-03");
  change("market-country", "Alemanha");
  assert.equal((await download()).partner_share.kg.fraction, 0);
  change("market-flow", "export");
  change("market-country", "Japão");
  const {partner_share: zeroTotal} = await download();
  assert.deepEqual(zeroTotal.fob_usd, {status: "zero_total", numerator: 0, denominator: 0, fraction: null});
  assert.equal(zeroTotal.kg.fraction, 0.5);
  assert.match(get("market-geo-shares").textContent, /Total declarado igual a zero/);
});

test("the trade report captures active filters, source bytes, units and monthly gaps", async () => {
  const data = {...sample, records: sample.records.map(row => ({...row, ignored: "extra field"}))};
  const {dom, window, get, calls, change} = open(() => response(data));
  const {files, download} = captureDownloads(window, get);
  await settle(get);
  change("market-country", "China");
  const report = await download();
  assert.equal(files.at(-1).name, "stratasignal-comex-25041000-import.json");
  assert.equal(report.dataset_kind, "public_aggregate");
  assert.equal(report.schema_version, 1);
  const sourceHash = createHash("sha256").update(JSON.stringify(data)).digest("hex");
  assert.equal(report.source.snapshot_url, `https://example.invalid/edicoes/comex-${sourceHash}.json`);
  assert.equal(report.source.mutable_snapshot_url, "https://example.invalid/comex.json");
  assert.equal(report.source.snapshot_sha256, createHash("sha256").update(JSON.stringify(data)).digest("hex"));
  assert.equal(report.source.updated_on, sample.updated_on);
  assert.equal(report.source.fetched_at, sample.fetched_at);
  assert.ok(Number.isFinite(Date.parse(report.generated_at)));
  assert.equal(report.units.fob_usd, "USD FOB correntes");
  assert.equal(report.filters.ncm, "25041000");
  assert.equal(report.filters.flow, "import");
  assert.equal(report.filters.country_role, "origin");
  assert.equal(report.filters.period, null);
  assert.equal(report.filters.country, "China");
  assert.deepEqual(report.totals, {record_count: 2, fob_usd: 1700, kg: 1000, partner_count: 1});
  assert.deepEqual(report.unit_value, {
    status: "available", value: 1.7, unit: "USD FOB por kg de peso líquido",
    method: "Soma do valor FOB ÷ soma do peso líquido dos registros do recorte.",
  });
  assert.equal(get("market-geo-unit-value").textContent, "US$ 1,7 FOB/kg");
  assert.equal(get("market-report-unit-value").textContent, "US$ 1,7 FOB/kg");
  assert.deepEqual(report.records, [sample.records[0], sample.records[2]]);
  assert.deepEqual(report.monthly.map(({unit_value, ...row}) => row), [
    {month: "2025-01", record_count: 1, fob_usd: 1200, kg: 700},
    {month: "2025-02", record_count: 0, fob_usd: null, kg: null},
    {month: "2025-03", record_count: 1, fob_usd: 500, kg: 300},
  ]);
  assert.deepEqual(report.monthly.map(({unit_value}) => [unit_value.status, unit_value.value]), [
    ["available", 1200 / 700], ["no_records", null], ["available", 500 / 300],
  ]);
  assert.match(get("market-monthly").textContent, /US\$ 1,71429 FOB\/kg/);
  assert.match(get("market-fob").textContent, /1\.700/);
  assert.match(get("market-monthly").textContent, /fevereiro de 2025Sem registros/);
  change("market-period", "2025-02");
  assert.equal(get("market-report").hidden, false);
  const empty = await download();
  assert.equal(empty.filters.period, "2025-02");
  assert.equal(get("market-report-trade").textContent, "Sem registros de comércio");
  assert.deepEqual(empty.totals, {record_count: 0, fob_usd: null, kg: null, partner_count: 0});
  assert.deepEqual(empty.monthly.map(({unit_value, ...row}) => row), [{month: "2025-02", record_count: 0, fob_usd: null, kg: null}]);
  assert.deepEqual(empty.records, []);
  assert.equal(empty.unit_value.status, "no_records");
  assert.equal(empty.partner_share.kg.status, "no_records");
  assert.equal(empty.unit_value.value, null);
  assert.match(get("market-report-unit-value").textContent, /sem registros/);
  change("market-country", "");
  change("market-period", "");
  const mixed = await download();
  assert.equal(mixed.totals.kg, 1000);
  assert.equal(mixed.unit_value.status, "insufficient_weight");
  assert.equal(mixed.unit_value.value, null);
  change("market-period", "2025-01");
  change("market-country", foreignLabel);
  const zero = await download();
  assert.equal(zero.totals.kg, 0);
  assert.equal(zero.unit_value.status, "insufficient_weight");
  assert.equal(zero.monthly[0].unit_value.status, "insufficient_weight");
  assert.match(get("market-report-unit-value").textContent, /peso líquido insuficiente/);
  assert.deepEqual(zero.records, [sample.records[1]]);
  assert.equal(get("market-report-trade").textContent, "US$ 300 FOB · 0 kg");
  assert.equal(get("market-report-map-coverage").textContent, "1 parceiro sem ponto");
  assert.match(get("market-report-scope").textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(get("market-report-scope").querySelector("img"), null);
  assert.equal(calls.length, 3);
  await settle(get, "market-news-status");
  dom.window.close();
});

test("the map report preview and download distinguish the news and trade periods", async t => {
  const params = new URLSearchParams({ncm: "28369100", fluxo: "export", mes: "2025-02", pais: "Canadá", noticias_mes: "2025-03"});
  const {dom, window, get, change} = open(null, null, "?" + params, null, "mapa");
  t.after(() => dom.window.close());
  const {download} = captureDownloads(window, get);
  await settle(get);
  await settle(get, "market-news-status");
  const preview = get("market-report").querySelector("details");
  assert.equal(preview.open, false);
  preview.querySelector("summary").click();
  assert.equal(preview.open, true);
  const report = await download();
  assert.equal(report.filters.country, "Canadá");
  assert.deepEqual(report.months, ["2025-02"]);
  assert.match(get("market-report-scope").textContent, /Carbonatos de lítio .* Exportações · Canadá \(destino comercial\) · fevereiro de 2025/);
  assert.equal(get("market-report-trade").textContent, "Sem registros de comércio");
  assert.deepEqual(report.partner_geography.points, []);
  assert.equal(get("market-report-map").textContent, "0 parceiros com ponto");
  assert.deepEqual(report.news_context.filters.months, ["2025-03"]);
  assert.deepEqual(report.news_context.items, [newsItem]);
  assert.equal(get("market-report-news").textContent, "1 publicação");
  assert.match(get("market-report-news-period").textContent, /março de 2025/);
  assert.match(get("market-report-news-source").textContent, /Natural Resources Canada.*9 de abril de 2025/);
  change("market-news-period", "");
  assert.equal(preview.open, true);
  assert.equal(get("market-report-news").textContent, "Sem cobertura da curadoria neste período");
  assert.match(get("market-report-news-period").textContent, /fevereiro de 2025/);
  assert.equal((await download()).news_context.status, "no_matches");
});

test("curated news and the report share mineral, month and country without applying trade direction", async () => {
  const news = {...newsSample, items: [{...newsItem, ignored: "extra field"}]};
  const {dom, window, get, calls, change} = open(null, () => response(news));
  const {download} = captureDownloads(window, get);
  await settle(get);
  await settle(get, "market-news-status");
  assert.match(get("market-news-status").textContent, /Nenhuma notícia.*grafita/);
  assert.equal(get("market-news-stale").hidden, false);
  assert.match(get("market-news-coverage").textContent, /Curadoria de 1 entre 2.*Atualizado pela fonte.*Consultado/);
  change("market-product", "28369100");
  assert.match(get("market-news-status").textContent, /1 publicação.*lítio/);
  assert.equal(get("market-country").querySelector('optgroup[label="Países citados nas notícias"] option').value, "Canadá");
  change("market-country", "Canadá");
  assert.equal(get("market-results").hidden, true);
  assert.equal(get("market-news-items").hidden, false);
  assert.equal(get("market-news-items").querySelector("a").href, newsItem.url);
  assert.equal(get("market-news-items").querySelectorAll("time").length, 2);
  assert.equal(get("market-news-items").querySelector("img"), null);
  assert.match(get("market-news-items").textContent, /<img src=x onerror=alert\(1\)>/);
  change("market-flow", "export");
  assert.equal(get("market-country").value, "Canadá");
  const report = await download();
  assert.equal(report.records.length, 0);
  assert.equal(report.news_context.status, "available");
  assert.deepEqual(report.news_context.items, [newsItem]);
  assert.equal(report.news_context.source.snapshot_sha256, createHash("sha256").update(JSON.stringify(news)).digest("hex"));
  assert.equal(report.news_context.source.feed_updated_at, news.feed_updated_at);
  assert.deepEqual(report.news_context.filters, {
    ncm: "28369100", months: sample.months, country: "Canadá",
    period_mode: "trade_period", country_role: "mentioned", month_basis: "published_on", flow_applies: false,
  });
  change("market-period", "2025-02");
  assert.equal(get("market-news-items").hidden, true);
  assert.equal((await download()).news_context.status, "no_matches");
  assert.equal(calls.length, 3);
  dom.window.close();
});

test("a rejected news link leaves commerce available and a valid retry restores news", async () => {
  const invalid = {...newsSample, items: [{...newsItem, url: "https://www.canada.ca.evil.invalid/example.html"}]};
  const {dom, window, get, calls, change} = open(null, count => response(count === 1 ? invalid : newsSample));
  const {download} = captureDownloads(window, get);
  await settle(get);
  await settle(get, "market-news-status");
  assert.equal(get("market-results").hidden, false);
  assert.equal(get("market-news-retry").hidden, false);
  assert.equal(get("market-news-period").disabled, true);
  assert.match(get("market-news-status").textContent, /indisponível/);
  assert.equal(get("market-report-news").textContent, "Edição de notícias indisponível");
  assert.equal((await download()).news_context.status, "unavailable");
  get("market-news-retry").click();
  assert.equal(get("market-report-news").textContent, "Carregando notícias…");
  await settle(get, "market-news-status");
  change("market-product", "28369100");
  assert.equal(get("market-news-items").hidden, false);
  assert.equal(get("market-news-retry").hidden, true);
  assert.equal(get("market-news-period").disabled, false);
  assert.deepEqual(calls.map(call => call.url), ["/comex.json", "/news.json", "/source-manifest.json", "/news.json"]);
  dom.window.close();
});

test("Brazilian policy appears for graphite without changing the Canadian feed provenance", async () => {
  const archive = "https://www.gov.br/mdic/pt-br/assuntos/noticias/2026/setembro";
  const brazil = {...newsItem, source_id: "mdic", url: archive + "/example",
    ncm: "25041000", countries: ["Brasil"]};
  const mdic = {source: "MDIC · Brasil", feed_url: archive + "/RSS", feed_updated_at: null,
    fetched_at: newsSample.fetched_at, feed_sha256: "b".repeat(64), feed_entries: 15};
  const {dom, window, get, change} = open(null, () => response({...newsSample, mdic, items: [newsItem, brazil]}));
  const {download} = captureDownloads(window, get);
  await settle(get);
  await settle(get, "market-news-status");
  assert.match(get("market-news-mdic-coverage").textContent, /1 entre 15.*Atualização do feed não informada/);
  change("market-country", "Brasil");
  assert.match(get("market-news-status").textContent, /1 publicação.*grafita.*Brasil/);
  assert.equal(get("market-news-items").querySelector("a").href, brazil.url);
  const report = await download();
  assert.deepEqual(report.records, []);
  assert.deepEqual(report.news_context.items, [brazil]);
  assert.equal(report.news_context.source.feed_sha256, newsSample.feed_sha256);
  assert.equal(report.news_context.mdic_source.feed_sha256, mdic.feed_sha256);
  change("market-product", "28369100");
  assert.equal(get("market-news-items").querySelector("a").href, newsItem.url);
  dom.window.close();
});

test("the Canadian archive is filterable and keeps its own provenance in the report", async () => {
  const archive = {source: newsSample.source,
    feed_url: "https://api.io.canada.ca/io-server/gc/news/en/v2?dept=naturalresourcescanada&sort=publishedDate&orderBy=desc&publishedDate%3C=2025-03-31&pick=50&format=atom&atomtitle=Natural%20Resources%20Canada",
    feed_updated_at: "2026-04-27T13:25:36Z", fetched_at: "2026-11-10T16:00:00Z",
    feed_sha256: "c".repeat(64), feed_entries: 50};
  const story = {...newsItem, url: "https://www.canada.ca/en/natural-resources-canada/news/2025/03/example.html",
    feed_url: archive.feed_url, published_on: "2025-03-03", event_on: "2025-03-03",
    ncm: "25041000", related_ncms: ["28369100"]};
  const news = {...newsSample, canada_archive: archive, items: [story]};
  const {dom, window, get, change} = open(null, () => response(news));
  const {download} = captureDownloads(window, get);
  await settle(get);
  await settle(get, "market-news-status");
  change("market-news-period", "2025-03");
  change("market-news-publisher", "nrcan");
  change("market-product", "28369100");
  assert.match(get("market-news-status").textContent, /1 publicação.*março de 2025/);
  assert.match(get("market-news-canada-archive-coverage").textContent, /1 entre 50 entradas/);
  const report = await download();
  assert.equal(report.news_context.coverage.curated_entries, 0);
  assert.equal(report.news_context.canada_archive.feed_sha256, archive.feed_sha256);
  assert.deepEqual(report.news_context.items, [story]);
  dom.window.close();

  const unsafe = open(null, () => response({...news, canada_archive: {...archive, feed_url: "https://example.invalid/"}}));
  await settle(unsafe.get, "market-news-status");
  await settle(unsafe.get);
  assert.equal(unsafe.get("market-news-retry").hidden, false);
  unsafe.dom.window.close();
});

test("a separate news month preserves the trade slice and exports each period and feed", async () => {
  const archive = "https://www.gov.br/mdic/pt-br/assuntos/noticias/2026/novembro";
  const feed = {source: "MDIC · Brasil", feed_url: archive + "/RSS", feed_updated_at: null,
    fetched_at: "2026-11-07T18:00:00Z", feed_sha256: "c".repeat(64), feed_entries: 10};
  const story = {...newsItem, source_id: "mdic", feed_url: feed.feed_url, url: archive + "/example",
    ncm: "25041000", related_ncms: ["28369100"], countries: ["Brasil"],
    title: "Comunicado fictício de novembro", published_on: "2026-11-05", event_on: "2026-11-05"};
  const news = {...newsSample, mdic_archives: [feed], items: [story, newsItem]};
  const {dom, window, get, change} = open(null, () => response(news));
  const {download} = captureDownloads(window, get);
  await settle(get);
  await settle(get, "market-news-status");
  assert.equal(get("market-news-items").hidden, true);
  assert.equal(get("market-period").querySelector('option[value="2026-11"]'), null);
  assert.match(get("market-news-mdic-november-coverage").textContent, /1 entre 10.*novembro de 2026/);
  const before = await download();
  change("market-news-period", "2026-11");
  assert.match(get("market-news-status").textContent, /1 publicação.*grafita.*novembro de 2026/);
  assert.equal(get("market-news-items").querySelectorAll("li").length, 1);
  const after = await download();
  for (const key of ["filters", "months", "totals", "records"]) assert.deepEqual(after[key], before[key]);
  assert.deepEqual(after.news_context.filters.months, ["2026-11"]);
  assert.equal(after.news_context.filters.period_mode, "independent");
  assert.deepEqual(after.news_context.items, [story]);
  assert.equal(after.news_context.mdic_archives[0].feed_sha256, feed.feed_sha256);
  change("market-period", "2025-03");
  change("market-product", "28369100");
  assert.match(get("market-news-status").textContent, /1 publicação.*lítio.*novembro de 2026/);
  assert.deepEqual((await download()).months, ["2025-03"]);
  get("market-clear").click();
  assert.equal(get("market-news-period").value, "");
  assert.equal(get("market-news-items").hidden, true);
  dom.window.close();
});

test("the dedicated map preserves the commerce slice, zooms a marker and links to both news views", async t => {
  const {dom, window, get, calls, change} = open(null, null,
    "?ncm=25041000&fluxo=import&mes=2025-03&pais=China", undefined, "mapa");
  t.after(() => dom.window.close());
  const {download} = captureDownloads(window, get);
  await settle(get);
  await settle(get, "market-news-status");
  assert.equal(get("market-country").value, "China");
  assert.match(get("market-geo-amount").textContent, /US\$ 500 FOB · 300 kg/);
  assert.equal(get("market-geo-focus").disabled, false);
  get("market-geo-focus").click();
  assert.equal(get("market-geo-focus").getAttribute("aria-pressed"), "true");
  assert.match(get("market-geo-scene").style.transform, /scale\(1.8\)/);
  const charts = new URL(get("market-chart-link").href);
  assert.equal(charts.pathname, "/");
  assert.equal(charts.hash, "");
  assert.equal(charts.searchParams.get("mes"), "2025-03");
  assert.equal(charts.searchParams.get("pais"), "China");
  const news = new URL(get("market-context-news").href);
  assert.equal(news.pathname, "/noticias/");
  assert.deepEqual([...news.searchParams.entries()].slice(-3), [
    ["mineral", "25041000"], ["pais_citado", "China"], ["publicado", "2025-03"],
  ]);
  const allNews = window.document.querySelector('[data-market-nav="noticias"]').href;
  assert.equal(new URL(allNews).searchParams.get("pais_citado"), null);
  assert.equal((await download()).source.mutable_snapshot_url, "https://example.invalid/comex.json");
  get("market-geo-pins").querySelector(".selected").dispatchEvent(new window.MouseEvent("click", {bubbles: true}));
  assert.equal(get("market-country").value, "");
  assert.equal(get("market-geo-focus").disabled, true);
  assert.equal(get("market-geo-scene").style.transform, "");
  change("market-period", "");
  assert.equal(new URL(window.location.href).searchParams.has("mes"), false);
  assert.deepEqual(calls.map(call => call.url), ["/comex.json", "/news.json", "/source-manifest.json"]);
});

test("the map loads one verified year and carries its month through reports and navigation", async t => {
  const annual = {...sample, months: Array.from({length: 12}, (_, index) => `2000-${String(index + 1).padStart(2, "0")}`),
    records: [record("2000-01", "Canadá", 1000, 700, "export", "28369100"),
      record("2000-04", "Canadá", 2500, 1200, "export", "28369100")]};
  const digest = createHash("sha256").update(JSON.stringify(annual)).digest("hex");
  const archive = `/edicoes/comex-${digest}.json`;
  const manifest = {...editionManifest(), trade_history: {
    start_month: "2000-01", end_month: "2000-12", years: {2000: digest},
  }};
  const {dom, window, get, calls, change} = open(null, null, "?ncm=28369100&fluxo=export&ano=2000&mes=2000-04&pais=Canadá",
    () => response(manifest), "mapa", url => { assert.equal(url, archive); return response(annual); });
  t.after(() => dom.window.close());
  const {download, files} = captureDownloads(window, get);
  await settle(get);
  assert.deepEqual(calls.map(call => call.url), ["/source-manifest.json", "/news.json", archive]);
  assert.deepEqual([...get("market-year").options].map(option => option.value), ["", "2000"]);
  assert.equal(get("market-period").options.length, 13);
  assert.match(get("market-year-coverage").textContent, /janeiro de 2000 a dezembro de 2000/);
  assert.match(get("market-news-date-coverage").textContent, /março de 2025/);
  assert.match(get("market-geo-amount").textContent, /2\.500 FOB/);
  assert.match(get("market-report-news").textContent, /Sem cobertura da curadoria/);
  const monthly = await download();
  assert.equal(monthly.filters.year, "2000");
  assert.deepEqual(monthly.months, ["2000-04"]);
  assert.equal(files.at(-1).name, "stratasignal-comex-28369100-export-2000-04.json");
  assert.equal(monthly.source.snapshot_url, `https://example.invalid${archive}`);
  assert.equal(monthly.source.mutable_snapshot_url, null);
  for (const id of ["market-chart-link", "market-context-news"]) {
    const url = new URL(get(id).href);
    assert.equal(url.searchParams.get("ano"), "2000");
    assert.equal(url.searchParams.get("mes"), "2000-04");
  }
  change("market-period", "");
  change("market-news-period", "todas");
  const fullYear = await download();
  assert.deepEqual(fullYear.months, annual.months);
  assert.equal(fullYear.monthly[1].fob_usd, null);
  assert.equal(fullYear.totals.fob_usd, 3500);
  assert.equal(fullYear.news_context.filters.period_mode, "all_curated_dates");
  assert.deepEqual(fullYear.news_context.publication_months, ["2025-03"]);
  assert.deepEqual(fullYear.news_context.items, [newsItem]);
  assert.equal(get("market-bars").classList.contains("market-bars-long"), true);
  assert.equal(calls.length, 3);
  change("market-year", "");
  await settle(get);
  assert.equal(new URL(window.location.href).searchParams.has("ano"), false);
  assert.deepEqual((await download()).months, sample.months);
  assert.equal(calls.at(-1).url, "/comex.json");
});

test("a damaged annual edition cannot show recent figures under the historical year", async t => {
  const annual = {...sample, months: ["2000-01"], records: [record("2000-01", "China", 50, 2)]};
  const digest = createHash("sha256").update(JSON.stringify(annual)).digest("hex");
  const manifest = {...editionManifest(), trade_history: {
    start_month: "2000-01", end_month: "2000-01", years: {2000: digest},
  }};
  const {dom, window, get, calls, change} = open(null, null, "", () => response(manifest), "mapa",
    () => response({...annual, records: []}));
  t.after(() => dom.window.close());
  await settle(get);
  change("market-year", "2000");
  await settle(get);
  assert.match(get("market-geo-status").textContent, /ano solicitado/);
  assert.equal(get("market-report").hidden, true);
  assert.equal(get("market-geo-content").hidden, true);
  assert.equal(calls.filter(call => call.url === "/comex.json").length, 1);
  get("market-recent").click();
  await settle(get);
  assert.equal(get("market-controls").disabled, false);
  assert.equal(new URL(window.location.href).searchParams.has("ano"), false);
  assert.equal(get("market-report").hidden, false);
});

test("the map labels missing annual coverage and rejects links to unverified years", async t => {
  const manifest = {...editionManifest(), trade_history: {
    start_month: "2000-01", end_month: "2002-03", years: {2000: "a".repeat(64), 2002: "b".repeat(64)},
  }};
  const {dom, get, calls} = open(null, null, "?ano=2001", () => response(manifest), "mapa");
  t.after(() => dom.window.close());
  await settle(get);
  assert.match(get("market-year-coverage").textContent, /Aguardam validação as edições de 2001/);
  assert.deepEqual([...get("market-year").options].map(option => option.value), ["", "2002", "2000"]);
  assert.match(get("market-geo-status").textContent, /sem edição validada/);
  assert.equal(get("market-report").hidden, true);
  assert.equal(get("market-recent").hidden, false);
  assert.deepEqual(calls.map(call => call.url), ["/source-manifest.json", "/news.json"]);
});

test("the dedicated news page lists the latest articles independently and can clear an empty scoped link", async t => {
  const latest = {...newsItem, url: newsItem.url.replace("example.html", "latest.html"), title: "Nova publicação",
    published_on: "2025-04-07", ncm: "25041000", countries: ["Brasil"]};
  const fetchNews = () => response({...newsSample, items: [newsItem, latest]});
  const newsPage = open(null, fetchNews, "?ncm=25041000&fluxo=export&mes=2025-02", undefined, "noticias");
  t.after(() => newsPage.dom.window.close());
  const {get, calls, change} = newsPage;
  await settle(get, "market-news-status");
  assert.deepEqual(calls.map(call => call.url), ["/news.json"]);
  assert.match(get("market-news-status").textContent, /2 publicações.*Mais recentes primeiro/);
  assert.equal(get("market-news-summary").hidden, false);
  assert.equal(get("market-news-count").textContent, "2");
  assert.equal(get("market-news-countries").textContent, "2");
  assert.equal(get("market-news-latest").textContent, "7 de abril de 2025");
  assert.deepEqual([...get("market-news-items").querySelectorAll("h2")].map(item => item.textContent),
    [latest.title, newsItem.title]);
  const latestMap = new URL(get("market-news-items").querySelector(".market-news-map-link").href);
  assert.equal(latestMap.pathname, "/mapa/");
  assert.deepEqual([...latestMap.searchParams.entries()], [
    ["ncm", "25041000"], ["fluxo", "export"], ["mes", "2025-02"],
  ]);
  const lithiumMap = new URL(get("market-news-items").querySelectorAll(".market-news-map-link")[1].href);
  assert.equal(lithiumMap.searchParams.get("ncm"), "28369100");
  assert.equal(lithiumMap.searchParams.get("fluxo"), "export");
  change("market-news-country", "Canadá");
  assert.equal(get("market-news-items").children.length, 1);
  change("market-news-mineral", "25041000");
  assert.match(get("market-news-status").textContent, /Nenhuma notícia/);
  get("market-news-clear").click();
  assert.equal(get("market-news-items").children.length, 2);
  assert.equal(newsPage.window.document.activeElement, get("market-news-mineral"));
  const map = new URL(newsPage.window.document.querySelector('[data-market-nav="mapa"]').href);
  assert.equal(map.pathname, "/mapa/");
  assert.equal(map.searchParams.get("fluxo"), "export");

  const scoped = open(null, fetchNews, "?mineral=25041000&pais_citado=China&publicado=2025-02&publicado=2025-03",
    undefined, "noticias");
  t.after(() => scoped.dom.window.close());
  await settle(scoped.get, "market-news-status");
  assert.match(scoped.get("market-news-status").textContent, /Nenhuma notícia.*fevereiro de 2025 a março de 2025.*China/);
  scoped.get("market-news-clear").click();
  assert.equal(scoped.get("market-news-items").children.length, 2);
  assert.equal(scoped.window.location.search, "");
});

test("the publisher filter travels from News to the map and report without changing trade totals", async t => {
  const archive = "https://www.gov.br/mdic/pt-br/assuntos/noticias/2026/setembro";
  const mdic = {source: "MDIC · Brasil", feed_url: archive + "/RSS", feed_updated_at: null,
    fetched_at: newsSample.fetched_at, feed_sha256: "b".repeat(64), feed_entries: 15};
  const brazil = {...newsItem, source_id: "mdic", url: archive + "/example", countries: ["Brasil"]};
  const fetchNews = () => response({...newsSample, mdic, items: [newsItem, brazil]});
  const listing = open(null, fetchNews, "?ncm=28369100&fluxo=import&mes=2025-03&noticias_fonte=mdic",
    undefined, "noticias");
  t.after(() => listing.dom.window.close());
  await settle(listing.get, "market-news-status");
  assert.match(listing.get("market-news-status").textContent, /1 publicação.*MDIC/);
  assert.equal(listing.get("market-news-items").querySelector("a").href, brazil.url);
  listing.change("market-news-country", "Canadá");
  assert.match(listing.get("market-news-status").textContent, /Nenhuma notícia.*Canadá.*MDIC/);
  listing.change("market-news-country", "");
  const mapUrl = new URL(listing.get("market-news-items").querySelector(".market-news-map-link").href);
  assert.equal(mapUrl.searchParams.get("noticias_fonte"), "mdic");
  const map = open(null, fetchNews, mapUrl.search, undefined, "mapa");
  t.after(() => map.dom.window.close());
  const {download} = captureDownloads(map.window, map.get);
  await settle(map.get);
  await settle(map.get, "market-news-status");
  const filtered = await download();
  assert.equal(filtered.news_context.filters.source_id, "mdic");
  assert.deepEqual(filtered.news_context.items, [brazil]);
  assert.match(map.get("market-report-news-period").textContent, /MDIC/);
  assert.equal(new URL(map.get("market-context-news").href).searchParams.get("noticias_fonte"), "mdic");
  map.change("market-news-publisher", "nrcan");
  const canadian = await download();
  assert.equal(canadian.news_context.filters.source_id, "nrcan");
  assert.deepEqual(canadian.news_context.items, [newsItem]);
  for (const key of ["filters", "totals", "records"]) assert.deepEqual(canadian[key], filtered[key]);
  listing.get("market-news-clear").click();
  assert.equal(listing.get("market-news-items").children.length, 2);
  assert.equal(new URL(listing.window.location.href).searchParams.has("noticias_fonte"), false);
});
