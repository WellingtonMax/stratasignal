"use strict";
const {test} = require("node:test");
const a = require("node:assert/strict");
const fs = require("node:fs");
const {JSDOM} = require("jsdom");
const js = fs.readFileSync("stratasignal/ui/market-globe.js","utf8");
const html = fs.readFileSync("stratasignal/ui/market.html","utf8");
const flush = () => new Promise(resolve => setImmediate(resolve));

function setup(t, token, supported = true, modal = false) {
  let globe;
  const dom = new JSDOM(html, {runScripts:"outside-only", pretendToBeVisual:true, url:"https://example.invalid/mapa/"});
  const w = dom.window; const doc = w.document;
  if (modal) {
    w.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open",""); };
    w.HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  }
  class MockMap {
    constructor(opts) {
      globe=this; this.opts=opts; this.handlers={}; this.sources={}; this.layers={}; this.images={};
      this.canvas=doc.createElement("canvas");
      this.mount=opts.container;
      this.extent={width:0,height:0};
      this.mount.getBoundingClientRect=()=>({width:720,height:400});
      this.canvas.getBoundingClientRect=()=>this.extent;
      this.canvas.width=720;
      this.canvas.height=400;
      this.mount.append(this.canvas);
    }
    addControl() {}
    on(type,...v) { this.handlers[type+(v.length === 2 ? ":" + v[0] : "")]=v.at(-1); }
    fire(type,event={}) { (this.handlers[type] || this.handlers[type+":trade-partners"])?.(event); }
    setProjection(value) { this.projection=value; }
    setFog() {}
    addSource(id,details) { this.sources[id]={data:details.data,setData(data){this.data=data;}}; }
    getSource(id) { return this.sources[id]; }
    addLayer(layer) { this.layer=layer; this.layers[layer.id]=layer; }
    hasImage(id) { return id in this.images; }
    addImage(id,image,opts) { this.images[id]={image,opts}; }
    getCanvas() { return this.canvas; }
    jumpTo(view) { this.view=view; }
    fitBounds(bounds,opts) { this.lastBounds={bounds,opts}; }
    setStyle(style) { this.style=style; this.sources={}; }
    getZoom() { return 1; }
    setMaxZoom(value) { this.maxZoom=value; }
    resize() { this.resizeCount = (this.resizeCount ?? 0) + 1; }
    remove() { this.removed=true; }
  }
  class Popup {
    isOpen(){return false;}
    remove(){}
    setLngLat(){return this;}
    setDOMContent(card){this.card=card;return this;}
    addTo(g){g.card=this.card;return this;}
  }
  w.fetch=async url => ({ok:true,json:async()=>url.endsWith("world-outline.json")
    ? {type:"FeatureCollection",features:[]} : {publicToken:token}});
  w.mapboxgl={supported:()=>supported,Map:MockMap,Popup,NavigationControl:class {}};
  w.eval(js); t.after(()=>w.close());
  return {w,doc,map:()=>globe};
}
const demo = [{label:"<img onerror=1>", anchor:[12,34], totals:"US$ 19 FOB", unit:"Indisponível"}];

test("uses globe projection, waits for a basemap tile, synchronizes partners and recovers an unavailable satellite style", async t => {
  const {w,doc,map}=setup(t,"pk.example.synthetic");
  let picked;
  w.strataMarketGlobe.update(demo, null, label=>{picked=label;});
  await flush();
  const m=map(), root=doc.getElementById("market-globe");
  a.equal(m.opts.projection,"globe");
  a.equal(m.opts.style.sources["public-outline"].type,"geojson");
  m.fire("style.load"); m.fire("render");
  a.equal(root.parentElement.classList.contains("has-market-globe"),false);
  m.fire("sourcedata",{sourceId:"composite",coord:{},sourceDataType:"content"});
  m.fire("render");
  a.equal(root.parentElement.classList.contains("has-market-globe"),false);
  m.extent={width:400,height:300};
  m.fire("render");
  a.equal(root.parentElement.classList.contains("has-market-globe"),false);
  m.extent={width:720,height:400};
  m.fire("render");
  a.equal(root.parentElement.classList.contains("has-market-globe"),true);
  const feature=m.getSource("trade-partners").data.features[0];
  m.fire("mousemove",{features:[feature]}); a.equal(m.card.querySelector("img"),null);
  a.equal(m.card.querySelector("strong").textContent,demo[0].label);
  m.fire("click",{features:[feature]}); a.equal(picked,demo[0].label);
  w.strataMarketGlobe.update(demo,picked,()=>{});
  a.equal(m.getSource("trade-partners").data.features[0].properties.selected,true);
  a.equal(w.strataMarketGlobe.focus([12,34]),true);
  a.equal(m.view.zoom,4.2);
  doc.getElementById("market-globe-style").click();
  a.match(m.style,/satellite-streets/);
  m.fire("error",{error:{status:429}});
  a.equal(m.style.sources["public-outline"].type,"geojson");
  a.match(doc.getElementById("market-globe-status").textContent,/visão global continua/);
  m.fire("webglcontextlost",{});
  a.equal(root.parentElement.classList.contains("has-market-globe"),false);
  a.equal(m.removed,true);
});

test("missing token or WebGL keeps the existing map and avoids constructing Mapbox", async t => {
  for (const [token,supported] of [[null,true],["sk.never.allowed",true],["pk.example.synthetic",false]]) {
    const {w,doc,map}=setup(t,token,supported);
    w.strataMarketGlobe.update(demo, null, ()=>{});
    await flush();
    a.equal(map(),undefined);
    a.equal(doc.querySelector(".has-market-globe"),null);
  }
});

test("operation markers are separate from country trade markers and open documented points", async t => {
  const {w,doc,map}=setup(t,"pk.example.synthetic");
  w.eval(fs.readFileSync("stratasignal/ui/market-operations.js","utf8"));
  const get=id=>doc.getElementById("market-operations-"+id);
  w.strataMarketGlobe.update(demo, null, () => {});
  w.strataMarketOperations.show("25041000");
  await flush();
  const m=map();
  m.fire("style.load");
  const feed=m.getSource("mineral-operations");
  a.equal(feed.data.features.length,13);
  a.equal(m.getSource("trade-partners").data.features.length,1);
  const balama=feed.data.features.find(f=>f.properties.id==="balama");
  m.fire("mousemove:mineral-operations",{features:[balama]});
  a.equal(m.card.querySelector("strong").textContent,"Balama");
  a.match(m.card.textContent,/Mina · Moçambique.*Syrah/);
  a.equal(m.card.querySelectorAll("svg path").length,1);
  m.fire("click:mineral-operations",{features:[balama]});
  a.match(get("fields").textContent,/Moçambique.*Syrah Resources.*Mineração.*Concentrado de grafita.*2026/);
  a.equal(get("links").querySelectorAll("button").length,3);
  [...get("links").querySelectorAll("button")].find(b=>b.textContent.includes("Nacala")).click();
  a.match(get("name").textContent,/Porto de Nacala/);
  a.match(get("fields").textContent,/usuária do porto/);
  a.equal(get("sources").querySelectorAll("a[href^='https://']").length,2);
  get("kind").value="plant";
  get("kind").dispatchEvent(new w.Event("change"));
  a.equal(feed.data.features.length,3);
  get("list").querySelector('[data-operation="mesa"]').click();
  a.match(get("fields").textContent,/Mesa.*Estados Unidos.*Allied Graphite.*operação piloto/);
  a.match(get("links").textContent,/fornecedora.*não confirma embarque para Mesa, rota nem volume/);
  a.equal(get("links").querySelector("a").hostname,"alliedgraphite.com");
  get("links").querySelector("button").click();
  a.match(get("fields").textContent,/Itagimirim.*Bahia.*Brasil.*Graphcoa.*Concentrado de grafita natural em flocos/);
  a.equal(get("kind").value,"");
  a.equal(feed.data.features.length,13);
  get("links").querySelector("button").click();
  a.match(get("name").textContent,/unidade piloto de Mesa/);
  get("kind").value="plant";
  get("kind").dispatchEvent(new w.Event("change"));
  get("toggle").click();
  a.equal(feed.data.features.length,0);
  get("toggle").click();
  m.fire("style.load");
  a.equal(m.getSource("mineral-operations").data.features.length,3);
  w.strataMarketOperations.show("28369100");
  a.equal(doc.getElementById("market-operations").hidden,true);
  a.equal(m.getSource("mineral-operations").data.features.length,0);
});

test("graphite catalogue searches accents, combines filters and separates unbuilt prospects", async t => {
  const {w,doc,map}=setup(t,"pk.example.synthetic");
  w.eval(fs.readFileSync("stratasignal/ui/market-operations.js","utf8"));
  const get=id=>doc.getElementById("market-operations-"+id);
  const type=value=>{get("search").value=value;get("search").dispatchEvent(new w.Event("input"));};
  const choose=value=>{get("kind").value=value;get("kind").dispatchEvent(new w.Event("change"));};
  w.strataMarketGlobe.update(demo, null, () => {});
  w.strataMarketOperations.show("25041000");
  await flush();
  map().fire("style.load");
  const feed=map().getSource("mineral-operations");
  type("graphcoa");
  a.equal(feed.data.features.length,2);
  choose("project");
  a.equal(feed.data.features.length,1);
  a.equal(feed.data.features[0].properties.kind,"project");
  get("list").querySelector("button").click();
  a.match(get("fields").textContent,/Jordânia.*produto previsto.*sem produção confirmada/);
  a.equal(get("links-wrap").hidden,true);
  type("itabela");
  a.equal(feed.data.features.length,0);
  a.equal(get("detail").hidden,true);
  a.match(get("result").textContent,/Nenhum ponto/);
  choose("");
  a.match(get("list").textContent,/Itabela.*South Star/);
  type("jordania minas");
  a.equal(feed.data.features.length,1);
  a.match(get("result").textContent,/^1 ponto$/);
  type("itagimirim");
  get("list").querySelector("button").click();
  get("links").querySelector("button").click();
  a.equal(get("search").value,"");
  a.match(get("fields").textContent,/Mesa.*Allied/);
  a.equal(feed.data.features.length,13);
  a.equal(map().getSource("trade-partners").data.features.length,1);
});

test("a city permalink focuses the intended pin after the globe becomes ready", async t => {
  const {w,doc,map}=setup(t,"pk.example.synthetic");
  w.history.replaceState(null,"","?ncm=25041000&fluxo=export#operacao=itagimirim");
  w.eval(fs.readFileSync("stratasignal/ui/market-operations.js","utf8"));
  const get=id=>doc.getElementById("market-operations-"+id);
  w.strataMarketOperations.show("25041000");
  a.match(get("name").textContent,/Boa Sorte/);
  a.equal(w.location.search,"?ncm=25041000&fluxo=export");
  await flush();
  const m=map();
  m.fire("style.load");
  m.extent={width:720,height:400};
  m.fire("sourcedata",{sourceId:"public-outline",coord:{},sourceDataType:"content"});
  m.fire("render");
  a.equal(JSON.stringify(m.view.center),JSON.stringify([-39.62,-16.09]));
  doc.querySelector('[data-open-operation="balama"]').click();
  a.equal(w.location.hash,"#operacao=balama");
  a.equal(get("links").querySelectorAll("button").length,3);
  const search=get("search");
  search.value="Jordânia";
  search.dispatchEvent(new w.Event("input"));
  a.equal(get("detail").hidden,true);
  a.equal(w.location.hash,"");
  w.history.replaceState(null,"","?ncm=25041000#operacao=unknown");
  w.dispatchEvent(new w.Event("hashchange"));
  a.equal(get("detail").hidden,true);
  w.strataMarketOperations.show("28369100");
  a.equal(w.location.hash,"");
  a.equal(doc.getElementById("market-operations").hidden,true);
});


test("legend, docket and operation markers use the same four pictograms and keep peers separate", async t => {
  const {w,doc,map}=setup(t,"pk.example.synthetic");
  w.eval(fs.readFileSync("stratasignal/ui/market-operations.js","utf8"));
  const get=id=>doc.getElementById("market-operations-"+id);
  w.strataMarketOperations.show("25041000");
  w.strataMarketGlobe.update(demo,null,()=>{});
  await flush();
  const m=map();
  const strokes=[];
  w.Path2D=class { constructor(path) { this.path=path; } };
  w.HTMLCanvasElement.prototype.getContext=()=>({
    setTransform(){},clearRect(){},scale(){},
    stroke(value){ strokes.push(value.path); },
    getImageData(){ return {width:40,height:40,data:new Uint8ClampedArray(6400)}; },
  });
  m.fire("style.load");
  a.equal(m.layers["mineral-operation-icons"].type,"symbol");
  a.equal(m.images["strata-op-mine"].opts.pixelRatio,2);
  a.equal(strokes.length,4);
  const legend=get("legend"), paths=[...legend.querySelectorAll("svg path")].map(x=>x.getAttribute("d"));
  a.equal(new Set(paths).size,4);
  legend.querySelector("[data-kind=port]").click();
  a.equal(get("kind").value,"port");
  a.equal(get("list").querySelectorAll("button").length,2);
  a.equal(m.getSource("mineral-operations").data.features.length,2);
  a.equal(legend.querySelector("[data-kind=port]").getAttribute("aria-pressed"),"true");
  legend.querySelector("[data-kind=port]").click();
  get("list").querySelector("[data-operation=itagimirim]").click();
  a.match(get("links").textContent,/Fornecimento divulgado.*Allied/);
  a.match(get("related").textContent,/Jordânia/);
  a.doesNotMatch(get("related").textContent,/Allied/);
  get("related").querySelector("button").click();
  a.equal(w.location.hash,"#operacao=jordania");
  a.match(get("badge").textContent,/Projeto/);
  a.equal(get("links-wrap").hidden,true);
  get("close").click();
  a.equal(w.location.hash,"");
  a.equal(get("detail").hidden,true);
  a.equal(doc.activeElement.dataset.operation,"jordania");
});


test("operation recenter remains usable during and after every basemap switch", async t => {
  const {w,doc,map}=setup(t,"pk.example.synthetic");
  w.eval(fs.readFileSync("stratasignal/ui/market-operations.js","utf8"));
  w.strataMarketOperations.show("25041000");
  const get=id=>doc.getElementById(id);
  const root=get("market-globe"), focus=get("market-operations-focus");
  get("market-operations-list").querySelector("[data-operation=balama]").click();
  focus.click();
  a.match(focus.textContent,/indisponível/);
  await flush();
  const m=map();
  m.extent={width:720,height:400};
  const reveal=()=>{
    m.fire("style.load");
    m.fire("sourcedata",{sourceId:"composite",coord:{},sourceDataType:"content"});
    m.fire("render");
    a.equal(root.dataset.state,"ready");
  };
  reveal();
  focus.click();
  a.equal(focus.textContent,"Centrar no globo");
  for (const control of ["market-globe-style","market-globe-streets","market-globe-streets"]) {
    get(control).click();
    m.view=null;
    focus.click();
    a.equal(focus.textContent,"Centrar no globo");
    a.deepEqual(Array.from(m.view.center),[38.57,-13.35]);
    reveal();
    a.equal(w.location.hash,"#operacao=balama");
  }
});

test("viewport fullscreen preserves the map node and returns with the selected operation", async t => {
  const {w,doc,map}=setup(t,"pk.example.synthetic",true,true);
  w.eval(fs.readFileSync("stratasignal/ui/market-operations.js","utf8"));
  w.strataMarketOperations.show("25041000");
  await flush();
  const get=id=>doc.getElementById(id);
  const enter=get("market-map-expand"), dialog=get("market-map-fullscreen");
  get("market-geo-content").hidden=false;
  const stage=get("market-map-fullscreen-stage"), figure=get("market-globe").closest("figure");
  const home=figure.parentNode, canvas=map().getCanvas();
  a.equal(enter.hidden,false);
  enter.click();
  a.equal(dialog.open,true);
  a.equal(figure.parentNode,stage);
  a.equal(doc.activeElement.id,"market-map-collapse");
  a.equal(doc.documentElement.classList.contains("market-map-dialog-open"),true);
  const modal=get("market-operation-dialog"), article=get("market-operations-detail");
  const articleHome=article.parentNode, m=map();
  m.fire("style.load");
  const point=m.getSource("mineral-operations").data.features.find(item=>item.properties.id==="balama");
  m.fire("click:mineral-operations",{features:[point]});
  a.equal(dialog.open,true);
  a.equal(modal.open,true);
  a.equal(article.parentNode,modal);
  a.equal(doc.activeElement.id,"market-operations-name");
  a.match(get("market-operations-fields").textContent,/Syrah Resources/);
  const website=get("market-operations-website");
  a.equal(website.href,"https://www.syrahresources.com.au/");
  a.equal(website.target,"_blank");
  a.match(website.rel,/noopener/);
  article.click();
  a.equal(modal.open,true);
  get("market-operations-close").click();
  a.equal(modal.open,false);
  a.equal(dialog.open,true);
  a.equal(article.parentNode,articleHome);
  a.equal(doc.activeElement.id,"market-map-collapse"); // Fake canvas is not displayed in this test.
  a.equal(w.location.hash,"#operacao=balama");
  const reopen=get("market-map-fullscreen-operation");
  a.equal(reopen.textContent,"Ver ficha: Balama");
  reopen.click();
  modal.dispatchEvent(new w.Event("cancel",{bubbles:true,cancelable:true}));
  a.equal(modal.open,false);
  a.equal(dialog.open,true);
  a.equal(doc.activeElement,reopen);
  reopen.click();
  modal.dispatchEvent(new w.MouseEvent("click",{bubbles:true,detail:1}));
  a.equal(modal.open,true); // No pointerdown on the backdrop.
  modal.dispatchEvent(new w.Event("pointerdown",{bubbles:true}));
  modal.dispatchEvent(new w.MouseEvent("click",{bubbles:true,detail:1}));
  a.equal(modal.open,false);
  a.equal(dialog.open,true);
  a.equal(figure.parentNode,stage);
  a.equal(m.getCanvas(),canvas);
  dialog.dispatchEvent(new w.Event("cancel",{cancelable:true}));
  a.equal(figure.parentNode,home);
  a.equal(doc.activeElement,enter);
  a.equal(doc.documentElement.classList.contains("market-map-dialog-open"),false);
  await new Promise(resolve=>w.requestAnimationFrame(resolve));
  a.ok(map().resizeCount>=2);
});

test("fullscreen can use the 2D map when WebGL is unavailable", async t => {
  const {w,doc,map}=setup(t,"pk.example.synthetic",false,true);
  w.strataMarketGlobe.update(demo,null,()=>{});
  await flush();
  a.equal(map(),undefined);
  doc.getElementById("market-map-expand").click();
  a.ok(doc.querySelector("#market-map-fullscreen[open] #market-geo-world"));
  doc.getElementById("market-map-collapse").click();
  a.equal(doc.getElementById("market-map-fullscreen").open,false);
});

test("fullscreen picker uses the original article and respects filter and website availability", async t => {
  const {w,doc}=setup(t,"pk.example.synthetic",false,true);
  w.eval(fs.readFileSync("stratasignal/ui/market-operations.js","utf8"));
  const get=id=>doc.getElementById(id);
  w.strataMarketOperations.show("25041000");
  await flush();
  get("market-map-expand").click();
  const picker=get("market-map-fullscreen-picker"), modal=get("market-operation-dialog");
  get("market-geo-content").hidden=false;
  const website=get("market-operations-website");
  const choose=id=>{picker.value=id; picker.dispatchEvent(new w.Event("change"));};
  choose("itagimirim");
  a.equal(modal.open,true);
  a.equal(website.href,"https://graphcoa.com/");
  modal.querySelector("#market-operations-links button").click();
  a.match(get("market-operations-name").textContent,/Mesa/);
  a.equal(modal.open,true);
  get("market-operations-close").click();
  a.equal(doc.activeElement,picker);
  choose("maiquinique");
  a.equal(modal.open,true);
  a.equal(website.hidden,true);
  a.equal(website.getAttribute("href"),null);
  get("market-operations-legend").querySelector("[data-kind=port]").click();
  a.equal(modal.open,false);
  a.equal(picker.querySelector('[value=maiquinique]'),null);
  choose("pemba");
  a.match(get("market-operations-fields").textContent,/usuária do porto/);
  w.strataMarketOperations.show("99999999");
  a.equal(modal.open,false);
  a.equal(picker.parentElement.hidden,true);
  a.equal(get("market-map-fullscreen").open,true);
});

test("only documented port routes draw as schematic lines on Mapbox and survive a style reload", async t => {
  const {w,doc,map}=setup(t,"pk.example.synthetic");
  w.eval(fs.readFileSync("stratasignal/ui/market-operations.js","utf8"));
  w.strataMarketOperations.show("25041000");
  await flush();
  const m=map();
  m.fire("style.load");
  const panel=doc.getElementById("market-logistics");
  const features=()=>m.getSource("mineral-logistics").data.features;
  a.equal(panel.hidden,false);
  a.equal(features().length,0);
  panel.open=true;
  panel.dispatchEvent(new w.Event("toggle"));
  a.equal(features().length,2);
  const [nacala,pemba]=features().map(f=>f.geometry);
  const near=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]))<0.01;
  for (const line of [nacala,pemba]) {
    a.equal(line.type,"LineString");
    a.ok(line.coordinates.length>100);
    a.ok(near(line.coordinates[0],[38.57,-13.35]));
    a.ok(line.coordinates.some(p=>near(p,[39.87249,-13.10590])));
  }
  a.ok(near(nacala.coordinates.at(-1),[40.66672,-14.54386]));
  a.ok(near(pemba.coordinates.at(-1),[40.48596,-12.96671]));
  m.extent={width:720,height:400};
  m.fire("sourcedata",{sourceId:"public-outline",coord:{},sourceDataType:"content"});
  m.fire("render");
  a.equal(m.layers["mineral-logistics"].type,"line");
  a.ok(m.layers["mineral-logistics"].paint["line-dasharray"]);
  const choices=[...panel.querySelectorAll("button")];
  a.equal(choices[1].textContent,"Balama → Pemba");
  choices[1].click();
  a.equal(features()[1].properties.selected,true);
  a.match(doc.getElementById("market-logistics-context").textContent,/carga geral/);
  a.ok(m.lastBounds.bounds[0][1]<-13.33);
  a.match(doc.getElementById("market-logistics-carrier").textContent,/Grindrod.*2022/);
  a.match(doc.getElementById("market-logistics-carrier-source").href,/grindrod\.com/);
  choices[0].click();
  a.match(doc.getElementById("market-logistics-carrier").textContent,/rodoviário.*2024/);
  a.match(doc.getElementById("market-logistics-carrier-source").href,/eiti\.org.*page=147/);
  choices[1].click();
  a.match(doc.getElementById("market-logistics-source").href,/syrahresources\.com\.au/);
  m.setStyle({});
  m.fire("style.load");
  a.equal(features()[1].properties.selected,true);
  panel.open=false;
  panel.dispatchEvent(new w.Event("toggle"));
  a.equal(features().length,0);
  w.strataMarketOperations.show("28369100");
  a.equal(panel.hidden,true);
});
