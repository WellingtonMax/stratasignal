"use strict";
const assert = require("node:assert/strict");
const {createHash, webcrypto} = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {test} = require("node:test");
const {JSDOM} = require("jsdom");

const ui = path.join(__dirname, "../stratasignal/ui");
const html = fs.readFileSync(path.join(ui, "markets-world.html"), "utf8");
const script = ["markets-quote.js", "markets-world.js"].map(name => fs.readFileSync(path.join(ui, name), "utf8")).join("\n");
const series = {
  "2601": {code: "2601", series: {BR: [[1000, 6000, 1, 1], null, [2000, 8000, 1, 2], null, [3000, 10000, 1, 2], null]}},
  "2603": {code: "2603", series: {CL: [null, null, [5000, null, 0, 1], null, [6000, 0, 1, 1], [0, null, 0, 1]]}},
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

function open(fetcher, query = "") {
  const dom = new JSDOM(html, {runScripts: "outside-only", url: `https://example.invalid/mercados/${query}`});
  const {window} = dom;
  const get = id => window.document.getElementById(`world-${id}`);
  window.TextDecoder = TextDecoder;
  Object.defineProperty(window.crypto, "subtle", {value: webcrypto.subtle});
  window.fetch = async (url, options) => {
    assert.equal(options.credentials, "omit");
    assert.equal(options.redirect, "error");
    const value = url === "catalogo.json" ? sample : await fetcher(url, series[url.match(/\d+/)?.[0]]);
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    return {ok: true, arrayBuffer: async () => bytes.buffer};
  };
  window.eval(script);
  const input = (id, value, type = "change") => {
    get(id).value = value;
    get(id).dispatchEvent(new window.Event(type));
  };
  return {dom, get, input, window};
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
