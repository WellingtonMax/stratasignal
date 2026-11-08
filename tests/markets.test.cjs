"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {test} = require("node:test");
const {JSDOM} = require("jsdom");

const ui = path.join(__dirname, "../stratasignal/ui");
const html = fs.readFileSync(path.join(ui, "markets.html"), "utf8");
const script = fs.readFileSync(path.join(ui, "markets.js"), "utf8");
const quoteScript = fs.readFileSync(path.join(ui, "markets-quote.js"), "utf8");
const exampleName = "<img src=x onerror=alert(1)>";
const example = {
  published_on: "2025-02-01",
  periods: [{label: "2023", value_millions: 10000, volume_mt: 60}, {label: "2024", value_millions: 12500, volume_mt: 68}],
  assets: [{symbol: "EXEMPLO1", name: exampleName}, {symbol: "EXEMPLO2", name: "Empresa de exemplo"}],
};
const sample = {
  schema_version: 1,
  dataset_kind: "public_markets_snapshot",
  mineral: "iron_ore",
  reviewed_on: "2025-02-03",
  countries: {
    BR: {...example, source: "MDIC (exemplo)", source_url: "https://balanca.economia.gov.br/exemplo",
      trade_currency: "USD", value_basis: "FOB", volume_unit: "toneladas",
      exchange: "B3", exchange_symbol: "BMFBOVESPA", quote_currency: "BRL"},
    AU: {...example, source: "DISR (exemplo)", source_url: "https://www.industry.gov.au/exemplo",
      trade_currency: "AUD", value_basis: "valores correntes", volume_unit: "toneladas secas",
      exchange: "ASX", exchange_symbol: "ASX", quote_currency: "AUD"},
  },
};

function open(fetcher = () => sample) {
  const dom = new JSDOM(html, {runScripts: "outside-only", url: "https://example.invalid/mercados/"});
  const {window} = dom;
  const get = id => window.document.getElementById(`markets-${id}`);
  const calls = [];
  window.TextDecoder = TextDecoder;
  window.Date.now = () => Date.parse("2025-04-01");
  window.fetch = async (url, options) => {
    calls.push([url, options.credentials, options.redirect]);
    const bytes = new TextEncoder().encode(JSON.stringify(fetcher(calls.length)));
    return {ok: true, arrayBuffer: async () => bytes.buffer};
  };
  window.eval(quoteScript + "\n" + script);
  const change = value => {
    get("country").value = value;
    get("country").dispatchEvent(new window.Event("change"));
  };
  return {dom, get, change, calls};
}

test("country selection changes the trade units, source, currency and freshness", async t => {
  const {dom, get, change, calls} = open();
  t.after(() => dom.window.close());
  assert.equal(get("country").disabled, true);
  assert.match(get("status").textContent, /Carregando/);
  await new Promise(setImmediate);
  assert.deepEqual(calls, [["dados.json", "omit", "error"]]);
  assert.equal(get("country").disabled, false);
  assert.equal(get("value").textContent, "US$ 12,5 bi");
  assert.equal(get("change").textContent, "+25%");
  assert.equal(get("stale").hidden, false);
  assert.match(get("symbols").textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(get("symbols").querySelector("img"), null);
  change("AU");
  assert.equal(get("value").textContent, "A$ 12,5 bi");
  assert.match(get("weight-col").textContent, /toneladas secas/);
  assert.equal(get("exchange").textContent, "ASX · AUD");
  assert.match(get("source").href, /^https:\/\/www\.industry\.gov\.au\//);
  assert.equal(get("stale").hidden, true);
  assert.equal(get("rows").children.length, 2);
});

test("provider embed is opt-in, isolated, switched and removed", async t => {
  const {dom, get, change} = open();
  t.after(() => dom.window.close());
  await new Promise(setImmediate);
  const frame = () => get("quote").querySelector("iframe");
  const symbols = () => JSON.parse(decodeURIComponent(new URL(frame().src).hash.slice(1))).symbols;
  assert.equal(frame(), null);
  get("quote-toggle").click();
  assert.equal(new URL(frame().src).origin, "https://www.tradingview-widget.com");
  assert.equal(symbols()[0][1], "BMFBOVESPA:EXEMPLO1|1D");
  assert.equal(frame().getAttribute("sandbox"), "allow-scripts allow-same-origin");
  assert.equal(frame().referrerPolicy, "no-referrer");
  change("AU");
  assert.equal(symbols()[0][1], "ASX:EXEMPLO1|1D");
  get("quote-toggle").click();
  assert.equal(frame(), null);
  assert.equal(get("quote").hidden, true);
});

test("invalid source URLs fail closed and recovery restores the filters", async t => {
  const {dom, get} = open(attempt => {
    if (attempt > 1) return sample;
    const invalid = structuredClone(sample);
    invalid.countries.AU.source_url = "https://www.industry.gov.au.example.invalid/";
    return invalid;
  });
  t.after(() => dom.window.close());
  await new Promise(setImmediate);
  assert.match(get("status").textContent, /indisponíveis/);
  assert.equal(get("content").hidden, true);
  assert.equal(get("country").disabled, true);
  get("retry").click();
  await new Promise(setImmediate);
  assert.equal(get("content").hidden, false);
  assert.equal(get("retry").hidden, true);
});
