"use strict";
const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {execFileSync} = require("node:child_process");
const {JSDOM, VirtualConsole, ResourceLoader} = require("jsdom");

const demo = fs.readFileSync(path.join(__dirname,"../demo/report.html"),"utf8");
function open(html=demo) {
  const errors = [], requests = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", e => errors.push(e.message));
  class DenyNetwork extends ResourceLoader {
    fetch(url) { requests.push(url); return null; }
  }
  // Only generated, repository-owned report scripts run in this test process.
  // jsdom does not implement browser layout or enforce Content Security Policy.
  const dom = new JSDOM(html,{runScripts:"dangerously",resources:new DenyNetwork(),virtualConsole,url:"https://local-report.invalid/"});
  return {dom,window:dom.window,doc:dom.window.document,errors,requests};
}

test("report initializes with explicit synthetic data and no external resource requests", () => {
  const {dom,doc,errors,requests} = open();
  assert.match(doc.querySelector("#notice").textContent,/DEMONSTRAÇÃO/);
  assert.equal(doc.querySelectorAll("#materials-table tr").length,3);
  assert.equal(doc.querySelectorAll("#kpis .kpi").length,4);
  assert.deepEqual(errors,[]);
  assert.deepEqual(requests,[]);
  dom.window.close();
});

test("all navigation controls reveal the correct report section", () => {
  const {dom,doc} = open();
  for (const id of ["scenarios","evidence","model","overview"]) {
    doc.querySelector(`button[data-view="${id}"]`).click();
    assert.equal(doc.getElementById(id).hidden,false);
    assert.equal([...doc.querySelectorAll(".view")].filter(e=>!e.hidden).length,1);
    assert.equal(doc.querySelector('nav [aria-current="page"]').dataset.view,id);
  }
  dom.window.close();
});

test("scenario shows known deficits and zero reduction removes them", () => {
  const {dom,doc,window} = open();
  const amounts = () => [...doc.querySelectorAll("#scenario-results strong")].map(e=>e.textContent);
  assert.deepEqual(amounts(),["880 kg","9.440 kg","0 kg"]);
  const reduction = doc.getElementById("shock-reduction");
  reduction.value = "0";
  reduction.dispatchEvent(new window.Event("input",{bubbles:true}));
  assert.deepEqual(amounts(),["0 kg","0 kg","0 kg"]);
  assert.equal(doc.querySelector("#reduction-value").textContent,"0%");
  dom.window.close();
});

test("material selector changes the country allocation bars", () => {
  const {dom,doc,window} = open();
  const select = doc.getElementById("material-select");
  select.value = "lithium-carbonate";
  select.dispatchEvent(new window.Event("change",{bubbles:true}));
  assert.match(doc.getElementById("origin-bars").textContent,/Chile/);
  assert.deepEqual([...doc.querySelectorAll("#origin-bars progress")].map(e=>e.value),[.55,.45]);
  dom.window.close();
});

function scenarioReport(options) {
  const code = [
    "from stratasignal.demo import demo_bundle",
    "from stratasignal.analytics import analyze",
    "from stratasignal.report import render_html",
    "print(render_html(analyze(demo_bundle(),'a'*64,enable_ml=False," + options + ")))"
  ].join("\n");
  return execFileSync(process.env.PYTHON || "python",["-c",code],{encoding:"utf8"});
}

test("requested shock country outside the portfolio remains selected with zero exposure", () => {
  const {dom,doc} = open(scenarioReport("shock_country='US'"));
  assert.equal(doc.getElementById("shock-country").value,"US");
  assert.deepEqual([...doc.querySelectorAll("#scenario-results strong")].map(e=>e.textContent),["0 kg","0 kg","0 kg"]);
  dom.window.close();
});

test("fractional CLI reduction is preserved when the report initializes", () => {
  const {dom,doc} = open(scenarioReport("reduction=0.333,duration_days=180"));
  assert.ok(Math.abs(Number(doc.getElementById("shock-reduction").value)/100 - .333) < 1e-12);
  assert.equal(doc.getElementById("reduction-value").textContent,"33,3%");
  assert.equal(doc.querySelectorAll("#scenario-results strong")[1].textContent,"15.894,1 kg");
  dom.window.close();
});

test("malicious material label stays text and creates no executable elements", () => {
  const code = [
    "from stratasignal.demo import demo_bundle",
    "from stratasignal.analytics import analyze",
    "from stratasignal.report import render_html",
    "d=demo_bundle()",
    "for p in d['positions']:",
    " if p['material']=='graphite-flake': p['material_name']='</script><script>window.pwned=1</script><img src=x onerror=alert(1)>'",
    "print(render_html(analyze(d,'a'*64,enable_ml=False)))"
  ].join("\n");
  const html = execFileSync(process.env.PYTHON || "python",["-c",code],{encoding:"utf8"});
  const {dom,doc,window,errors,requests} = open(html);
  assert.equal(window.pwned,undefined);
  assert.equal(doc.querySelectorAll("img").length,0);
  assert.equal(doc.querySelectorAll("script").length,2);
  assert.match(doc.querySelector("#materials-table").textContent,/<script>/);
  assert.deepEqual(errors,[]);
  assert.deepEqual(requests,[]);
  dom.window.close();
});

test("model tab labels estimates as synthetic and retains evaluation evidence", () => {
  const {dom,doc} = open();
  assert.match(doc.getElementById("model-summary").textContent,/SINTÉTICOS/);
  assert.match(doc.getElementById("model-summary").textContent,/Brier/);
  assert.equal(doc.querySelectorAll("#predictions-table tr").length,6);
  assert.match(doc.getElementById("market-context").textContent,/Nenhum arquivo público/);
  dom.window.close();
});
