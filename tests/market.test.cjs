"use strict";
const {test} = require("node:test");
const assert = require("node:assert/strict");
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

function open(fetcher) {
  const dom = new JSDOM(html, {runScripts: "outside-only", url: "https://example.invalid/"});
  const {window} = dom;
  const get = id => window.document.getElementById(id);
  const calls = [];
  window.fetch = async (url, options) => {
    calls.push({url, options});
    return fetcher ? fetcher(calls.length) : {ok: true, json: async () => sample};
  };
  window.eval(script);
  const change = (id, value) => {
    const select = get(id);
    select.value = value;
    select.dispatchEvent(new window.Event("change", {bubbles: true}));
  };
  return {dom, window, get, calls, change};
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test("the panorama groups verified amounts and preserves missing months and inert source labels", async () => {
  const {dom, window, get, calls, change} = open();
  await settle();
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
    if (count === 2) return {ok: true, json: async () => ({...sample, records: [...sample.records, sample.records[0]]})};
    return {ok: true, json: async () => sample};
  });
  assert.match(get("market-status").textContent, /Carregando/);
  await settle();
  assert.equal(get("market-retry").hidden, false);
  assert.equal(get("market-controls").disabled, true);
  get("market-retry").click();
  await settle();
  assert.equal(get("market-results").hidden, true);
  get("market-retry").click();
  await settle();
  assert.equal(get("market-retry").hidden, true);
  assert.equal(get("market-results").hidden, false);
  assert.equal(calls.length, 3);
  dom.window.close();
});
