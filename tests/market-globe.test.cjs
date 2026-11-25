"use strict";
const {test} = require("node:test");
const a = require("node:assert/strict");
const fs = require("node:fs");
const {JSDOM} = require("jsdom");
const js = fs.readFileSync("stratasignal/ui/market-globe.js","utf8");
const html = fs.readFileSync("stratasignal/ui/market.html","utf8");
const flush = () => new Promise(resolve => setImmediate(resolve));

function setup(t, token, supported = true) {
  let globe;
  const dom = new JSDOM(html, {runScripts:"outside-only", url:"https://example.invalid/mapa/"});
  const w = dom.window; const doc = w.document;
  class MockMap {
    constructor(opts) {
      globe=this; this.opts=opts; this.handlers={}; this.sources={};
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
    addLayer(layer) { this.layer=layer; }
    getCanvas() { return this.canvas; }
    jumpTo(view) { this.view=view; }
    setStyle(style) { this.style=style; this.sources={}; }
    getZoom() { return 1; }
    setMaxZoom(value) { this.maxZoom=value; }
    resize() {}
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
  a.equal(feed.data.features.length,8);
  a.equal(m.getSource("trade-partners").data.features.length,1);
  const balama=feed.data.features.find(f=>f.properties.id==="balama");
  m.fire("mousemove:mineral-operations",{features:[balama]});
  a.match(m.card.textContent,/Balama · Syrah/);
  m.fire("click:mineral-operations",{features:[balama]});
  a.match(get("fields").textContent,/Moçambique.*Syrah Resources.*Mineração.*Concentrado de grafita.*2026/);
  a.equal(get("links").querySelectorAll("button").length,3);
  [...get("links").querySelectorAll("button")].find(b=>b.textContent.includes("Nacala")).click();
  a.match(get("name").textContent,/Porto de Nacala/);
  a.match(get("fields").textContent,/usuária do porto/);
  a.equal(get("sources").querySelectorAll("a[href^='https://']").length,2);
  get("kind").value="plant";
  get("kind").dispatchEvent(new w.Event("change"));
  a.equal(feed.data.features.length,2);
  get("toggle").click();
  a.equal(feed.data.features.length,0);
  get("toggle").click();
  m.fire("style.load");
  a.equal(m.getSource("mineral-operations").data.features.length,2);
  w.strataMarketOperations.show("28369100");
  a.equal(doc.getElementById("market-operations").hidden,true);
  a.equal(m.getSource("mineral-operations").data.features.length,0);
});
