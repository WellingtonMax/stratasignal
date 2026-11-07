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

function response(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return {ok: true, arrayBuffer: async () => bytes.buffer};
}

function open(fetcher) {
  const dom = new JSDOM(html, {runScripts: "outside-only", url: "https://example.invalid/"});
  const {window} = dom;
  const get = id => window.document.getElementById(id);
  const calls = [];
  window.TextDecoder = TextDecoder;
  Object.defineProperty(window.crypto, "subtle", {value: webcrypto.subtle});
  window.fetch = async (url, options) => {
    calls.push({url, options});
    return fetcher ? fetcher(calls.length) : response(sample);
  };
  window.eval(script);
  const change = (id, value) => {
    const select = get(id);
    select.value = value;
    select.dispatchEvent(new window.Event("change", {bubbles: true}));
  };
  return {dom, window, get, calls, change};
}
async function settle(get) {
  for (let step = 0; step < 100 && /Carregando/.test(get("market-status").textContent); step++) {
    await new Promise(resolve => setTimeout(resolve, 1));
  }
}

test("the panorama groups verified amounts and preserves missing months and inert source labels", async () => {
  const {dom, window, get, calls, change} = open();
  await settle(get);
  assert.deepEqual(calls.map(call => [call.url, call.options.credentials, call.options.redirect]), [
    ["comex.json", "omit", "error"],
  ]);
  assert.equal(get("market-controls").disabled, false);
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
  assert.equal(calls.length, 1);
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
  await settle(get);
  assert.equal(get("market-retry").hidden, false);
  assert.equal(get("market-controls").disabled, true);
  assert.equal(get("market-report").hidden, true);
  get("market-retry").click();
  await settle(get);
  assert.equal(get("market-results").hidden, true);
  assert.equal(get("market-report").hidden, true);
  get("market-retry").click();
  await settle(get);
  assert.equal(get("market-retry").hidden, true);
  assert.equal(get("market-results").hidden, false);
  assert.equal(get("market-report").hidden, false);
  assert.equal(calls.length, 3);
  dom.window.close();
});

test("the trade report captures active filters, source bytes, units and monthly gaps", async () => {
  const data = {...sample, records: sample.records.map(row => ({...row, ignored: "extra field"}))};
  const {dom, window, get, calls, change} = open(() => response(data));
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
  await settle(get);
  change("market-country", "China");
  const report = await download();
  assert.equal(files.at(-1).name, "stratasignal-comex-25041000-import.json");
  assert.equal(report.dataset_kind, "public_aggregate");
  assert.equal(report.schema_version, 1);
  assert.equal(report.source.snapshot_url, "https://example.invalid/comex.json");
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
  assert.equal(calls.length, 1);
  dom.window.close();
});
