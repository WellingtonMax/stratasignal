"use strict";
const assert = require("node:assert/strict");
const {createHash, webcrypto} = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {test} = require("node:test");
const {JSDOM} = require("jsdom");

const ui = path.join(__dirname, "../stratasignal/ui");
const html = fs.readFileSync(path.join(ui, "markets-world.html"), "utf8");
const scripts = ["markets-quote.js", "markets-issuers.js", "markets-world.js"];
const series = {
  "2601": {code: "2601", series: {
    WORLD: [[4000, 12000, 2, 2], [4000, 12000, 2, 2], [7000, 18000, 2, 3], [7000, 18000, 2, 3], [10000, 24000, 2, 3], [10000, 24000, 2, 3]],
    BR: [[1000, 6000, 1, 1], null, [2000, 8000, 1, 2], null, [3000, 10000, 1, 2], null],
  }},
  "2603": {code: "2603", series: {
    WORLD: [[10000, 12000, 2, 2], [10000, 12000, 2, 2], [20000, 18000, 2, 3], [20000, 18000, 2, 3], [24000, 24000, 2, 3], [24000, 24000, 2, 3]],
    CL: [null, null, [5000, null, 0, 1], null, [6000, 0, 1, 1], [0, null, 0, 1]],
  }},
};
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const sample = {
  schema_version: 2,
  dataset_kind: "world_mineral_trade",
  release: "202601",
  years: [2022, 2023, 2024],
  published_on: "2026-01-22",
  checked_on: "2026-11-08",
  countries: ["BR", "CL", "AU", "AQ"],
  products: {"2601": ["Minério de ferro", "26", null], "2603": ["Minério de cobre", "26", null]},
  venues: [["BR", "BR-B3", "B3", ["ações"]], ["CL", "Q42", "<img src=x onerror=alert(1)>", ["ações"]]],
  trade_sha256: Object.fromEntries(Object.entries(series).map(([code, data]) => [code, digest(data)])),
};

function open(fetcher, query = "", catalog = sample, {includeIssuers = true} = {}) {
  const dom = new JSDOM(html, {runScripts: "outside-only", url: `https://example.invalid/mercados/${query}`});
  const {window} = dom;
  const get = id => window.document.getElementById(`world-${id}`);
  window.TextDecoder = TextDecoder;
  const downloads = [];
  window.Blob = class Blob {
    constructor(parts, options) { this.parts = parts; this.type = options.type; }
  };
  window.URL.createObjectURL = blob => { downloads.push({blob}); return "blob:report"; };
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () {
    if (this.download) downloads.at(-1).filename = this.download;
  };
  Object.defineProperty(window.crypto, "subtle", {value: webcrypto.subtle});
  window.fetch = async (url, options) => {
    assert.equal(options.credentials, "omit");
    assert.equal(options.redirect, "error");
    const value = url === "catalogo.json" ? catalog : await fetcher(url, series[url.match(/\d+/)?.[0]]);
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    return {ok: true, arrayBuffer: async () => bytes.buffer};
  };
  window.eval(scripts.filter(name => includeIssuers || name !== "markets-issuers.js")
    .map(name => fs.readFileSync(path.join(ui, name), "utf8")).join("\n"));
  const input = (id, value, type = "change") => {
    get(id).value = value;
    get(id).dispatchEvent(new window.Event(type));
  };
  return {dom, downloads, get, input, window};
}

async function settled(get) {
  for (let i = 0; i < 100 && /Carregando/.test(get("status").textContent); i++) {
    await new Promise(resolve => setTimeout(resolve, 2));
  }
}

test("world filters distinguish zero, missing flow, and partial weight and keep venues in the country scope", async t => {
  const {dom, get, input, window} = open((_, value) => value);
  t.after(() => dom.window.close());
  await settled(get);
  assert.match(get("coverage").textContent, /4 países e territórios · 2 recortes/);
  assert.match(get("volume-coverage").textContent, /1\/2 fluxos com peso/);
  assert.match(get("venue-source").href, /^https:\/\/ri\.b3\.com\.br\//);
  input("country-search", "chile", "input");
  assert.equal(get("country").options.length, 2);
  input("country", "CL");
  input("product-search", "cobre", "input");
  input("product", "2603");
  input("flow", "import");
  await settled(get);
  assert.equal(get("value").textContent, "US$ 0");
  assert.equal(get("empty").hidden, true);
  assert.equal(get("volume").textContent, "Indisponível");
  assert.equal(get("share").textContent, "0%");
  assert.equal(get("position").textContent, "1º");
  assert.deepEqual([...get("share-rows").querySelectorAll("tr")].map(row => row.lastElementChild.textContent), ["Indisponível", "Indisponível", "0%"]);
  assert.match(get("venue-source").textContent, /<img src=x/);
  assert.equal(get("venue-source").querySelector("img"), null);
  assert.match(window.location.search, /pais=CL&produto=2603&fluxo=import/);
  input("country-search", "", "input");
  input("country", "AQ");
  await settled(get);
  assert.equal(get("value").textContent, "Sem registro");
  assert.equal(get("empty").hidden, false);
  assert.equal(get("venue-controls").hidden, true);
});

test("only the Brazilian graphite slice links to the official snapshot with the same flow", async t => {
  const graphite = {code: "250410", series: {}};
  const catalog = {
    ...sample,
    products: {...sample.products, "250410": ["Grafita natural em pó ou escamas", "hs6", null]},
    trade_sha256: {...sample.trade_sha256, "250410": digest(graphite)},
  };
  const {dom, get, input} = open((url, data) => url === "comercio/250410.json" ? graphite : data,
    "?pais=BR&produto=250410&fluxo=export", catalog);
  t.after(() => dom.window.close());
  await settled(get);
  assert.equal(get("empty").hidden, false);
  assert.equal(get("comex").hidden, false);
  assert.equal(get("comex-link").href, "https://example.invalid/?ncm=25041000&fluxo=export");
  input("flow", "import");
  assert.equal(get("comex-link").href, "https://example.invalid/?ncm=25041000&fluxo=import");
  input("country", "CL");
  assert.equal(get("comex").hidden, true);
  input("country", "BR");
  input("product", "2601");
  await settled(get);
  assert.equal(get("comex").hidden, true);
});

test("searching the global exchange directory preserves the trade slice and its report", async t => {
  const catalog = {
    ...sample,
    venues: [...sample.venues, ["CL", "Q13677", "Bolsa de Santiago", ["ações"]]],
  };
  const {dom, downloads, get, input, window} = open((_, value) => value,
    "?pais=BR&produto=2601&fluxo=export#world-venue-search", catalog);
  t.after(() => dom.window.close());
  await settled(get);
  assert.match(get("status").textContent, /Brasil · 3 de 3 anos/);
  assert.match(get("coverage-venues").textContent, /Brasil · 1 registro/);
  assert.match(get("coverage-venue-source").textContent, /2 de 4 países e territórios/);
  assert.equal(get("coverage-quote-card").hidden, false);

  input("venue-search", "santiago acoes", "input");
  assert.equal(get("venue-controls").hidden, true);
  assert.match(get("venue-count").textContent, /Brasil · Nenhum resultado/);
  get("venue-worldwide").click();
  assert.equal(get("venue-controls").hidden, false);
  assert.match(get("venue-count").textContent, /Todos os países e territórios · 1 registro de 3/);
  assert.equal(get("venue").selectedOptions[0].textContent, "Chile · Bolsa de Santiago");
  assert.equal(get("venue-source").href, "https://www.wikidata.org/wiki/Q13677");
  assert.match(get("coverage-venues").textContent, /Brasil · 1 registro/);
  assert.match(window.location.search, /pais=BR&produto=2601&fluxo=export/);
  assert.equal(get("quote").querySelector("iframe"), null);

  get("download").click();
  const report = JSON.parse(downloads[0].blob.parts.join(""));
  assert.equal(report.filters.country_code, "BR");
  assert.deepEqual(report.exchange_registry.records.map(record => record.id), ["BR-B3"]);
  input("venue-search", "q13677", "input");
  assert.equal(get("venue").options.length, 1);
  get("venue-clear").click();
  assert.equal(get("venue").options.length, 3);
  assert.equal(get("venue").selectedOptions[0].textContent, "Chile · Bolsa de Santiago");
  assert.equal(window.document.activeElement, get("venue-search"));

  get("venue-worldwide").click();
  input("country", "AQ");
  await settled(get);
  assert.match(get("status").textContent, /Antártida · 0 de 3 anos/);
  assert.match(get("coverage-venues").textContent, /Antártida · Sem registro no catálogo/);
  assert.match(get("venue-count").textContent, /Antártida · Sem registro de bolsa/);
  assert.equal(window.location.hash, "#world-venue-search");
  input("country", "WORLD");
  await settled(get);
  assert.equal(get("venue-scope").hidden, true);
  assert.equal(get("venue").options.length, 3);
});

test("a changed trade shard is rejected and recovered without blocking venue and quote access", async t => {
  let reads = 0;
  const {dom, get} = open((_, data) => ++reads === 1 ? {...data, series: {}} : data, "?pais=CL&produto=2603");
  t.after(() => dom.window.close());
  await settled(get);
  assert.equal(get("trade").hidden, true);
  assert.match(get("status").textContent, /indisponível/);
  assert.equal(get("venue-controls").hidden, false);
  get("retry").click();
  await settled(get);
  assert.equal(get("trade").hidden, false);
  assert.match(get("selection").textContent, /Chile.*2603/);
  get("ticker").value = "https://evil.invalid/";
  get("show-quote").click();
  assert.equal(get("quote").querySelector("iframe"), null);
  get("ticker").value = "NYSE:FCX";
  get("show-quote").click();
  const frame = get("quote").querySelector("iframe");
  assert.equal(new URL(frame.src).origin, "https://www.tradingview-widget.com");
  assert.equal(frame.getAttribute("sandbox"), "allow-scripts allow-same-origin");
  get("hide-quote").click();
  assert.equal(get("quote").querySelector("iframe"), null);
});

test("issuer evidence follows the covered product and country and prefills quotes only", async t => {
  const {dom, downloads, get, input, window} = open((_, value) => value, "#world-issuer-title");
  t.after(() => dom.window.close());
  await settled(get);
  const names = () => [...get("issuer-records").querySelectorAll("h4")].map(item => item.textContent);
  assert.deepEqual(names(), ["Vale S.A.", "CSN Mineração S.A."]);
  assert.equal(window.document.activeElement, get("issuer-title"));
  assert.match(get("issuer-count").textContent, /2 empresas documentadas/);
  assert.match(get("issuer-scope").textContent, /Brasil.*HS 2601.*08\/11\/2026/);
  const links = [...get("issuer-records").querySelectorAll("a")];
  assert.deepEqual(links.map(link => new URL(link.href).hostname), [
    "www.vale.com", "ri.csnmineracao.com.br", "www.rad.cvm.gov.br",
  ]);
  assert.match(links[2].textContent, /12\/08\/2026/);

  const [valeButton, csnButton] = get("issuer-records").querySelectorAll("button");
  valeButton.click();
  assert.equal(get("ticker").value, "BMFBOVESPA:VALE3");
  assert.equal(window.document.activeElement, get("ticker"));
  assert.equal(get("quote").querySelector("iframe"), null);
  get("show-quote").click();
  assert.match(get("quote").querySelector("iframe").title, /VALE3/);
  csnButton.click();
  assert.equal(get("ticker").value, "BMFBOVESPA:CMIN3");
  assert.equal(get("quote").querySelector("iframe"), null);

  input("flow", "import");
  await settled(get);
  assert.equal(names().length, 2);
  get("download").click();
  const report = JSON.parse(downloads[0].blob.parts.join(""));
  assert.equal(report.filters.flow, "import");
  assert.equal(report.observations[2].status, "no_record");
  assert.equal(report.issuer_evidence.status, "documented");
  assert.equal(report.issuer_evidence.quality, "reviewed_issuer_disclosure");
  assert.deepEqual(report.issuer_evidence.records.map(item => item.listing.ticker), ["VALE3", "CMIN3"]);
  assert.equal(report.issuer_evidence.records[1].sources[1].published_on, "2026-08-12");

  input("country", "WORLD");
  assert.equal(names().length, 2);
  input("country", "CL");
  assert.equal(get("issuer-records").hidden, true);
  assert.match(get("issuer-count").textContent, /Chile.*sem fichas/);
  input("country", "BR");
  input("product", "2603");
  await settled(get);
  assert.deepEqual(names(), []);
  get("download").click();
  const outside = JSON.parse(downloads[1].blob.parts.join("")).issuer_evidence;
  assert.equal(outside.status, "outside_coverage");
  assert.equal(outside.coverage.hs_code, "2601");
  assert.deepEqual(outside.records, []);
});

test("missing issuer evidence keeps the trade series and report available", async t => {
  const {dom, downloads, get} = open((_, value) => value, "", sample, {includeIssuers: false});
  t.after(() => dom.window.close());
  await settled(get);
  assert.match(get("issuer-count").textContent, /indisponível/);
  assert.equal(get("issuer-records").hidden, true);
  assert.match(get("status").textContent, /Brasil · 3 de 3 anos/);
  get("download").click();
  assert.deepEqual(JSON.parse(downloads[0].blob.parts.join("")).issuer_evidence,
    {status: "unavailable", records: []});
});

test("world report freezes filters, observations, coverage, registry, source hash, and explicit limits", async t => {
  const {dom, downloads, get, input} = open((_, value) => value, "?pais=CL&produto=2603&fluxo=export");
  t.after(() => dom.window.close());
  await settled(get);
  assert.equal(get("download").disabled, false);
  get("download").click();
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].filename, "stratasignal-mercado-cl-2603-export.json");
  const report = JSON.parse(downloads[0].blob.parts.join(""));
  assert.equal(report.report_type, "stratasignal_world_mineral_trade_slice");
  assert.deepEqual(report.filters, {
    country_code: "CL", country: "Chile", country_role: "reporter_exporter",
    hs_code: "2603", product: "Minério de cobre", flow: "export",
  });
  assert.equal(report.source.trade_shard_sha256, sample.trade_sha256["2603"]);
  assert.equal(report.observations[0].status, "no_record");
  assert.equal(report.observations[1].weight_coverage.status, "partial");
  assert.equal(report.observations[2].fob_usd, 6000);
  assert.deepEqual(report.world_benchmark, {
    year: 2024, world_fob_usd: 24000, country_share: 0.25, country_rank: 1, countries_with_record: 1,
    history: [
      {year: 2022, country_fob_usd: null, world_fob_usd: 10000, country_share: null, status: "unavailable"},
      {year: 2023, country_fob_usd: 5000, world_fob_usd: 20000, country_share: 0.25, status: "observed"},
      {year: 2024, country_fob_usd: 6000, world_fob_usd: 24000, country_share: 0.25, status: "observed"},
    ],
  });
  assert.equal(report.exchange_registry.records[0].name, "<img src=x onerror=alert(1)>");
  assert.deepEqual(report.interpretation.predictions, []);
  assert.match(report.limits.join(" "), /não comprova espécie/);
  input("country", "AQ");
  await settled(get);
  get("download").click();
  const empty = JSON.parse(downloads[1].blob.parts.join(""));
  assert.equal(empty.exchange_registry.status, "no_matches");
  assert.equal(empty.observations[2].status, "no_record");
});
