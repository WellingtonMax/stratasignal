"use strict";
const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {execFileSync} = require("node:child_process");
const {JSDOM, VirtualConsole} = require("jsdom");

const root = path.join(__dirname,"..");
const html = fs.readFileSync(path.join(root,"stratasignal/ui/index.html"),"utf8");
const script = fs.readFileSync(path.join(root,"stratasignal/ui/app.js"),"utf8");
const geoScript = fs.readFileSync(path.join(root,"stratasignal/ui/geo-map.js"),"utf8");
const insightsScript = fs.readFileSync(path.join(root,"stratasignal/ui/insights.js"),"utf8");
const input = JSON.parse(execFileSync(process.env.PYTHON || "python",["-c",
  "import json; from stratasignal.demo import demo_bundle; print(json.dumps(demo_bundle()))"],{cwd:root,encoding:"utf8"}));
const current = JSON.parse(fs.readFileSync(path.join(root,"demo/report.json"),"utf8"));
const monthly = JSON.parse(fs.readFileSync(path.join(root,"demo/monthly/report.json"),"utf8"));
const reportTemplate = fs.readFileSync(path.join(root,"demo/report.html"),"utf8");
const copy = value => JSON.parse(JSON.stringify(value));
const summary = {as_of:input.as_of,portfolio_id:input.portfolio_id,dataset_kind:"synthetic",materials:3,positions:6,orders:780,evidence:5};
const review = {summary,positions:input.positions.slice(0,5),metadata_flags:current.metadata_flags,notes:["Dados fictícios."]};
const makeStatus = (loaded=false,ready=false) => ({version:"0.3.0",current:loaded?summary:null,
  previous:loaded?{...summary,as_of:monthly.comparison.previous_as_of}:null,report_ready:ready,ml_available:false});
const response = (value,ok=true) => ({ok,json:async()=>copy(value),text:async()=>typeof value==="string"?value:JSON.stringify(value),blob:async()=>new Blob([JSON.stringify(value)])});

async function settle(doc) {
  for(let i=0;i<30&&!doc.getElementById("busy").hidden;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(doc.getElementById("busy").hidden,true,"UI task should finish");
}
async function open({demo=false,fetcher,token="a".repeat(32)}={}) {
  const calls=[],blobs=[],downloads=[],errors=[];
  let loaded=false;
  const virtualConsole=new VirtualConsole();virtualConsole.on("jsdomError",e=>errors.push(e.message));
  const dom=new JSDOM(demo?html.replace('data-mode="local"','data-mode="demo"'):html,{runScripts:"outside-only",virtualConsole,
    url:demo?"https://demo.invalid/":"http://127.0.0.1:8765/#access="+token});
  const {window}=dom,doc=window.document;
  window.TextDecoder=TextDecoder;window.Blob=Blob;
  window.URL.createObjectURL=blob=>{blobs.push(blob);return "blob:https://demo.invalid/"+blobs.length;};
  window.URL.revokeObjectURL=()=>{};
  window.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);};
  window.fetch=async(url,options={})=>{
    calls.push({url,options});
    if(fetcher)return fetcher(url,options);
    if(demo){const assets={"demo/current-report.json":current,"demo/monthly-report.json":monthly,"demo/current-input.json":input,"demo/report-template.json":{html:reportTemplate}};assert.ok(url in assets);return response(assets[url]);}
    if(url==="/api/status")return response({status:makeStatus()});
    if(url==="/api/demo"){loaded=true;return response({status:makeStatus(true),review});}
    if(url==="/api/analyze")return response({job:{id:"b".repeat(32),state:"running"}});
    if(url==="/api/jobs/"+"b".repeat(32))return response({job:{id:"b".repeat(32),state:"succeeded"},status:makeStatus(loaded,true),report:monthly});
    if(url==="/api/reset"){loaded=false;return response({status:makeStatus()});}
    throw new Error("Unexpected request "+url);
  };
  window.eval(geoScript);window.eval(insightsScript);window.eval(script);await settle(doc);
  return {dom,window,doc,calls,blobs,downloads,errors};
}
function chooseFile(ctx,id,text,name="data.csv") {
  const bytes=typeof text==="string"?new TextEncoder().encode(text):text;
  const file={name,size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
  Object.defineProperty(ctx.doc.getElementById(id),"files",{value:[file],configurable:true});
  ctx.doc.getElementById(id).dispatchEvent(new ctx.window.Event("change",{bubbles:true}));
}
async function click(ctx,id){ctx.doc.getElementById(id).click();await settle(ctx.doc);}

test("local workbench starts empty, authenticates only loopback API requests and uses no browser storage",async()=>{
  const ctx=await open();
  assert.equal(ctx.doc.getElementById("analyze").disabled,true);
  assert.equal(ctx.doc.getElementById("simulate").disabled,true);
  assert.equal(ctx.doc.querySelector('.export-action[data-kind="json"]').disabled,true);
  assert.equal(ctx.calls[0].url,"/api/status");
  assert.equal(ctx.calls[0].options.headers.Authorization,"Bearer "+"a".repeat(32));
  assert.equal(ctx.calls[0].options.credentials,"omit");
  assert.equal(ctx.calls[0].options.redirect,"error");
  assert.equal(ctx.window.localStorage.length,0);assert.equal(ctx.window.sessionStorage.length,0);
  assert.deepEqual(ctx.errors,[]);ctx.dom.window.close();
});

test("missing access fragment fails visibly without sending an API request",async()=>{
  const ctx=await open({token:""});
  assert.equal(ctx.calls.length,0);assert.equal(ctx.doc.getElementById("error").hidden,false);
  assert.match(ctx.doc.getElementById("error").textContent,/endereço completo/);ctx.dom.window.close();
});

test("loading demo enables analysis, navigation and comparison; reset removes the working result",async()=>{
  const ctx=await open();ctx.doc.querySelector(".demo-load").click();await settle(ctx.doc);
  assert.equal(ctx.doc.getElementById("view-overview").hidden,false);
  assert.equal(ctx.doc.querySelectorAll("#portfolio-table tr").length,3);
  for(const view of ["import","overview","scenario","comparison","exports"]){
    ctx.doc.querySelector(`nav [data-view="${view}"]`).click();
    assert.equal(ctx.doc.getElementById("view-"+view).hidden,false);
    assert.equal([...ctx.doc.querySelectorAll(".view")].filter(e=>!e.hidden).length,1);
  }
  await click(ctx,"analyze-comparison");assert.match(ctx.doc.getElementById("comparison-period").textContent,/→/);
  await click(ctx,"reset");assert.equal(ctx.doc.getElementById("analyze").disabled,true);
  assert.equal(ctx.doc.getElementById("view-import").hidden,false);ctx.dom.window.close();
});

test("public demo uses only static synthetic assets, disables every file input and labels the precomputed model",async()=>{
  const ctx=await open({demo:true});
  assert.equal(ctx.doc.getElementById("view-overview").hidden,false);
  assert.equal(ctx.doc.getElementById("demo-banner").hidden,false);
  assert.ok([...ctx.doc.querySelectorAll('input[type="file"]')].every(e=>e.disabled));
  assert.equal(ctx.doc.getElementById("import-json").disabled,true);
  assert.match(ctx.doc.getElementById("model-state").textContent,/previamente no conjunto fictício/);
  assert.ok(ctx.calls.every(c=>!c.options.method||c.options.method==="GET"));
  assert.deepEqual(ctx.errors,[]);ctx.dom.window.close();
});

test("public build refuses a non-synthetic asset",async()=>{
  const ctx=await open({demo:true,fetcher:async url=>response(url==="demo/current-input.json"?{...input,dataset_kind:"client"}:url==="demo/current-report.json"?current:monthly)});
  assert.match(ctx.doc.getElementById("error").textContent,/inteiramente fictícios/);
  assert.equal(ctx.doc.querySelectorAll("#portfolio-table tr").length,0);ctx.dom.window.close();
});

test("material choice shows the corresponding allocation rather than another specification",async()=>{
  const ctx=await open({demo:true});const select=ctx.doc.getElementById("material-choice");
  select.value="lithium-carbonate";select.dispatchEvent(new ctx.window.Event("change"));
  assert.deepEqual([...ctx.doc.querySelectorAll("#country-bars progress")].map(e=>e.value),[.55,.45]);
  assert.match(ctx.doc.getElementById("country-bars").textContent,/Chile/);ctx.dom.window.close();
});

test("simulator preserves fractional reductions and JSON and HTML downloads contain the selected scenario",async()=>{
  const ctx=await open({demo:true});
  ctx.doc.getElementById("scenario-reduction").value="33.3";
  ctx.doc.getElementById("scenario-days").value="180";
  ctx.doc.getElementById("scenario-reduction").dispatchEvent(new ctx.window.Event("input"));
  await click(ctx,"simulate");
  assert.match(ctx.doc.getElementById("scenario-results").textContent,/15.894,1 kg/);
  ctx.doc.querySelector('.export-action[data-kind="json"]').click();await settle(ctx.doc);
  const exported=JSON.parse(await ctx.blobs[0].text());assert.ok(Math.abs(exported.scenario.reduction-.333)<1e-12);assert.equal(exported.scenario.duration_days,180);
  ctx.doc.querySelector('.export-action[data-kind="html"]').click();await settle(ctx.doc);
  const exportedHtml=await ctx.blobs[1].text();
  const inert=exportedHtml.match(/<script id="report-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.ok(Math.abs(JSON.parse(inert).scenario.reduction-.333)<1e-12);
  assert.deepEqual(ctx.downloads,["stratasignal-report.json","stratasignal-report.html"]);
  ctx.doc.getElementById("scenario-reduction").value="0";await click(ctx,"simulate");
  assert.deepEqual([...ctx.doc.querySelectorAll(".scenario-amount")].map(e=>e.textContent),["0 kg","0 kg","0 kg"]);ctx.dom.window.close();
});

test("malicious material names remain inert text in UI and HTML export",async()=>{
  const malicious=copy(current);malicious.materials[0].name='</script><script>window.pwned=1</script><img src=x onerror=alert(1)>';
  const ctx=await open({demo:true,fetcher:async url=>response(url==="demo/current-report.json"?malicious:url==="demo/monthly-report.json"?{...malicious,comparison:monthly.comparison}:url==="demo/current-input.json"?input:{html:reportTemplate})});
  assert.equal(ctx.window.pwned,undefined);assert.equal(ctx.doc.querySelectorAll('img[src="x"]').length,0);
  assert.match(ctx.doc.getElementById("portfolio-table").textContent,/<script>/);
  ctx.doc.querySelector('.export-action[data-kind="html"]').click();await settle(ctx.doc);
  const exported=await ctx.blobs[0].text(),data=exported.match(/<script id="report-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.ok(!data.includes("<"));assert.equal(JSON.parse(data).materials[0].name,malicious.materials[0].name);ctx.dom.window.close();
});

test("CSV mapping uses chosen source headers and explicit Brazilian formats",async()=>{
  const fields=Object.keys(input.positions[0]);let imported=null;
  const ctx=await open({fetcher:async(url,options)=>{
    if(url==="/api/status")return response({status:makeStatus()});
    if(url==="/api/preview-csv")return response({columns:fields,fields,nullable_fields:[],row_count:6,rows:[]});
    if(url==="/api/import"){imported=JSON.parse(options.body);return response({status:makeStatus(true),review});}
    throw new Error(url);
  }});
  chooseFile(ctx,"csv-positions","source bytes");await settle(ctx.doc);
  ctx.doc.getElementById("portfolio-id").value="pilot-001";ctx.doc.getElementById("as-of").value="2026-11-06";
  ctx.doc.getElementById("number-format").value="decimal_comma";ctx.doc.getElementById("date-format").value="br";
  ctx.doc.getElementById("allocation-unit").value="percent";await click(ctx,"import-csv");
  assert.equal(imported.data.dataset_kind,"client");assert.equal(imported.data.portfolio_id,"pilot-001");
  const spec=imported.data.tables.positions;assert.equal(spec.text,"source bytes");
  assert.equal(spec.number_format,"decimal_comma");assert.equal(spec.date_format,"br");assert.equal(spec.allocation_unit,"percent");
  assert.deepEqual(spec.mapping,Object.fromEntries(fields.map(f=>[f,f])));ctx.dom.window.close();
});

test("a failed replacement CSV clears its stale source and cannot silently import the old file",async()=>{
  const fields=Object.keys(input.positions[0]);let previews=0,imports=0;
  const ctx=await open({fetcher:async url=>{
    if(url==="/api/status")return response({status:makeStatus()});
    if(url==="/api/preview-csv"){previews++;return previews===1?response({columns:fields,fields,nullable_fields:[],row_count:6,rows:[]}):response({error:"CSV malformado"},false);}
    if(url==="/api/import"){imports++;throw new Error("Should not import stale CSV");}
    throw new Error(url);
  }});
  chooseFile(ctx,"csv-positions","valid source");await settle(ctx.doc);
  chooseFile(ctx,"csv-positions","invalid source");await settle(ctx.doc);
  assert.match(ctx.doc.getElementById("error").textContent,/CSV malformado/);
  await click(ctx,"import-csv");assert.equal(imports,0);
  assert.match(ctx.doc.getElementById("error").textContent,/Selecione o arquivo de posições/);ctx.dom.window.close();
});

test("invalid UTF-8 fails before upload and JSON input preserves its original BOM bytes",async()=>{
  let imported=null;
  const ctx=await open({fetcher:async(url,options)=>{
    if(url==="/api/status")return response({status:makeStatus()});
    if(url==="/api/import"){imported=JSON.parse(options.body);return response({status:makeStatus(true),review});}
    throw new Error(url);
  }});
  chooseFile(ctx,"current-file",new Uint8Array([255,254]));await click(ctx,"import-json");
  assert.equal(imported,null);assert.match(ctx.doc.getElementById("error").textContent,/UTF-8/);
  chooseFile(ctx,"current-file","\ufeff"+JSON.stringify(input));await click(ctx,"import-json");
  assert.equal(imported.data[0],"\ufeff");ctx.dom.window.close();
});

test("operational intelligence shows bounded stress rows and filters supplier history",async()=>{
  const ctx=await open({demo:true});
  ctx.doc.querySelector('nav [data-view="intelligence"]').click();
  assert.equal(ctx.doc.getElementById("view-intelligence").hidden,false);
  assert.match(ctx.doc.getElementById("insights-content").textContent,/Cenários condicionais/);
  const stress=ctx.doc.querySelectorAll("#insights-content article")[1];
  assert.equal(stress.querySelectorAll("tbody tr").length,9);
  const search=ctx.doc.getElementById("insights-search");search.value="CN-01";search.dispatchEvent(new ctx.window.Event("input"));
  const history=ctx.doc.querySelectorAll("#insights-content article")[2];
  assert.equal(history.querySelectorAll("tbody tr").length,1);
  assert.match(history.querySelector("tbody").textContent,/CN-01/);
  assert.match(history.textContent,/Intervalo descritivo 95%/);ctx.dom.window.close();
});

test("using stress premises changes controls and requires calculation before exports change",async()=>{
  const ctx=await open({demo:true});
  const original=current.scenario;
  ctx.doc.querySelector("#insights-content article:nth-of-type(2) tbody button").click();
  assert.equal(ctx.doc.getElementById("view-scenario").hidden,false);
  assert.equal(ctx.doc.getElementById("scenario-days").value,"30");
  assert.equal(ctx.doc.getElementById("scenario-reduction").value,"25");
  assert.equal(ctx.doc.getElementById("scenario-state").dataset.current,"false");
  assert.match(ctx.doc.getElementById("scenario-state").textContent,/ainda usam/);
  ctx.doc.querySelector('.export-action[data-kind="json"]').click();await settle(ctx.doc);
  assert.equal(JSON.parse(await ctx.blobs[0].text()).scenario.duration_days,original.duration_days);
  await click(ctx,"simulate");ctx.doc.querySelector('.export-action[data-kind="json"]').click();await settle(ctx.doc);
  assert.equal(JSON.parse(await ctx.blobs[1].text()).scenario.duration_days,30);
  assert.equal(ctx.doc.getElementById("scenario-state").dataset.current,"true");ctx.dom.window.close();
});

test("history pagination bounds the rendered rows and preserves hostile labels as text",async()=>{
  const large=copy(current);large.intelligence.supplier_performance=Array.from({length:45},(_,i)=>({...large.intelligence.supplier_performance[0],supplier:"F"+String(i).padStart(2,"0"),name:'<img src=x onerror="window.pwned=1">'}));
  const ctx=await open({demo:true,fetcher:async url=>response(url==="demo/current-report.json"?large:url==="demo/monthly-report.json"?{...large,comparison:monthly.comparison}:url==="demo/current-input.json"?input:{html:reportTemplate})});
  const history=ctx.doc.querySelectorAll("#insights-content article")[2];
  assert.equal(history.querySelectorAll("tbody tr").length,20);
  history.querySelectorAll(".insight-toolbar button")[1].click();history.querySelectorAll(".insight-toolbar button")[1].click();
  assert.equal(history.querySelectorAll("tbody tr").length,5);
  assert.equal(history.querySelectorAll(".insight-toolbar button")[1].disabled,true);
  assert.equal(ctx.window.pwned,undefined);assert.match(history.querySelector("tbody").textContent,/<img/);ctx.dom.window.close();
});

test("pending isolated analysis can be cancelled from the UI",async()=>{
  let cancelled=false;
  const jobId="c".repeat(32);
  const ctx=await open({fetcher:async(url,options)=>{
    if(url==="/api/status")return response({status:makeStatus()});
    if(url==="/api/demo")return response({status:makeStatus(true),review});
    if(url==="/api/analyze")return response({job:{id:jobId,state:"running"}});
    if(url==="/api/jobs/"+jobId)return response({job:{id:jobId,state:cancelled?"cancelled":"running"}});
    if(url==="/api/cancel"){assert.equal(JSON.parse(options.body).job_id,jobId);cancelled=true;return response({job:{id:jobId,state:"cancelled"}});}
    throw new Error(url);
  }});
  ctx.doc.querySelector(".demo-load").click();
  for(let i=0;i<15&&ctx.doc.getElementById("cancel-analysis").hidden;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(ctx.doc.getElementById("cancel-analysis").hidden,false);
  ctx.doc.getElementById("cancel-analysis").click();
  await new Promise(resolve=>setTimeout(resolve,300));await settle(ctx.doc);
  assert.equal(cancelled,true);assert.equal(ctx.doc.getElementById("cancel-analysis").hidden,true);
  assert.match(ctx.doc.getElementById("feedback").textContent,/cancelada/);ctx.dom.window.close();
});

test("geo explorer renders country origin shares without making external satellite requests",async()=>{
  const ctx=await open({demo:true});
  const list=ctx.doc.getElementById("geo-origin-list");
  assert.ok(list.querySelectorAll("button[data-country]").length>=2);
  assert.match(list.textContent,/China|Brasil|Chile/);
  assert.equal(ctx.doc.querySelectorAll("#geo-tiles img").length,0);
  assert.equal(ctx.doc.getElementById("geo-enable").getAttribute("aria-pressed"),"false");
  assert.ok(ctx.calls.every(c=>c.url.startsWith("demo/")));
  assert.ok(ctx.doc.querySelectorAll('.geo-marker[aria-label*="alocação declarada"]').length>=1);
  assert.deepEqual(ctx.errors,[]);
  ctx.dom.window.close();
});

test("satellite opt-in requests only fixed NASA tiles and never includes portfolio data",async()=>{
  const ctx=await open({demo:true});
  ctx.doc.getElementById("geo-enable").click();
  const tiles=[...ctx.doc.querySelectorAll("#geo-tiles img")];
  assert.ok(tiles.length>0);
  assert.ok(tiles.length<=35);
  assert.ok(tiles.every(img=>img.src.startsWith("https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/2004-01-01/")));
  assert.ok(tiles.every(img=>img.referrerPolicy==="no-referrer"));
  assert.ok(tiles.every(img=>!img.src.includes(input.portfolio_id)));
  assert.ok(ctx.calls.every(c=>c.url.startsWith("demo/")));
  const select=ctx.doc.getElementById("geo-imagery");
  select.value="daily";select.dispatchEvent(new ctx.window.Event("change"));
  assert.ok([...ctx.doc.querySelectorAll("#geo-tiles img")].every(img=>img.src.includes("MODIS_Terra_CorrectedReflectance_TrueColor")));
  ctx.doc.getElementById("geo-enable").click();
  assert.equal(ctx.doc.querySelectorAll("#geo-tiles img").length,0);
  assert.deepEqual(ctx.errors,[]);ctx.dom.window.close();
});

test("map country selection links to simulation without inventing coordinates or routes",async()=>{
  const ctx=await open({demo:true});
  const marker=ctx.doc.querySelector(".geo-marker[data-country]");
  assert.ok(marker);const code=marker.dataset.country;
  marker.click();ctx.doc.getElementById("geo-to-scenario").click();
  assert.equal(ctx.doc.getElementById("scenario-country").value,code);
  assert.equal(ctx.doc.getElementById("view-scenario").hidden,false);
  assert.match(ctx.doc.getElementById("geo-selection").textContent,/não localização de mina/);
  assert.deepEqual(ctx.errors,[]);ctx.dom.window.close();
});
