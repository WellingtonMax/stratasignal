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

function open(fetcher, newsFetcher, query = "") {
  const dom = new JSDOM(html, {runScripts: "outside-only", url: `https://example.invalid/${query}`});
  const {window} = dom;
  const get = id => window.document.getElementById(id);
  const calls = [];
  window.TextDecoder = TextDecoder;
  Object.defineProperty(window.crypto, "subtle", {value: webcrypto.subtle});
  window.fetch = async (url, options) => {
    calls.push({url, options});
    const attempts = calls.filter(call => call.url === url).length;
    if (url === "news.json") return newsFetcher ? newsFetcher(attempts) : response(newsSample);
    assert.equal(url, "comex.json");
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
    ["comex.json", "omit", "error"],
    ["news.json", "omit", "error"],
  ]);
  assert.equal(get("market-controls").disabled, false);
  assert.equal(get("market-edition").hidden, false);
  assert.match(get("market-edition-id").textContent, /^SHA-256 [0-9a-f]{12}…$/);
  assert.match(get("market-edition-download").href, /\/edicoes\/comex-[0-9a-f]{64}\.json$/);
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
  assert.equal(calls.length, 2);
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
  assert.equal(calls.length, 4);
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
  assert.equal(get("market-baci-link").href, "https://example.invalid/mercados/?pais=BR&produto=250410&fluxo=export");
  change("market-flow", "import");
  assert.equal(window.location.search, "?ncm=25041000&fluxo=import");
  assert.equal(window.location.hash, "#explorar");
  assert.equal(new URL(get("market-baci-link").href).searchParams.get("fluxo"), "import");
  change("market-product", "28369100");
  assert.equal(get("market-baci-link").hidden, true);
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
  const china = await download();
  assert.deepEqual(china.partner_geography.points, [{country: "China", longitude: 106.3, latitude: 32.5}]);
  assert.deepEqual(china.partner_geography.partners_without_anchor, []);
  button(foreignLabel).click();
  assert.deepEqual((await download()).partner_geography.partners_without_anchor, [foreignLabel]);
  assert.equal(get("market-geo-pins").querySelector(".selected"), null);
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
  dom.window.close();
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
  assert.deepEqual(report.records, [sample.records[0], sample.records[2]]);
  assert.deepEqual(report.monthly, [
    {month: "2025-01", record_count: 1, fob_usd: 1200, kg: 700},
    {month: "2025-02", record_count: 0, fob_usd: null, kg: null},
    {month: "2025-03", record_count: 1, fob_usd: 500, kg: 300},
  ]);
  assert.match(get("market-fob").textContent, /1\.700/);
  assert.match(get("market-monthly").textContent, /fevereiro de 2025Sem registros/);
  change("market-period", "2025-02");
  assert.equal(get("market-report").hidden, false);
  const empty = await download();
  assert.equal(empty.filters.period, "2025-02");
  assert.deepEqual(empty.totals, {record_count: 0, fob_usd: null, kg: null, partner_count: 0});
  assert.deepEqual(empty.monthly, [{month: "2025-02", record_count: 0, fob_usd: null, kg: null}]);
  assert.deepEqual(empty.records, []);
  change("market-period", "2025-01");
  change("market-country", foreignLabel);
  const zero = await download();
  assert.equal(zero.totals.kg, 0);
  assert.deepEqual(zero.records, [sample.records[1]]);
  assert.equal(calls.length, 2);
  dom.window.close();
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
  assert.equal(calls.length, 2);
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
  assert.equal((await download()).news_context.status, "unavailable");
  get("market-news-retry").click();
  await settle(get, "market-news-status");
  change("market-product", "28369100");
  assert.equal(get("market-news-items").hidden, false);
  assert.equal(get("market-news-retry").hidden, true);
  assert.equal(get("market-news-period").disabled, false);
  assert.deepEqual(calls.map(call => call.url), ["comex.json", "news.json", "news.json"]);
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
