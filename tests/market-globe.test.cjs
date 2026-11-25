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
    constructor(opts) { globe=this; this.opts=opts; this.handlers={}; this.sources={}; }
    addControl() {}
    on(type,...v) { this.handlers[type]=v.at(-1); }
    fire(type,event={}) { this.handlers[type]?.(event); }
    setProjection(value) { this.projection=value; }
    setFog() {}
    addSource(id,details) { this.sources[id]={data:details.data,setData(data){this.data=data;}}; }
    getSource(id) { return this.sources[id]; }
    addLayer(layer) { this.layer=layer; }
    getCanvas() { return doc.getElementById("market-globe-canvas"); }
    jumpTo(view) { this.view=view; }
    setStyle(style) { this.style=style; this.sources={}; }
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
  w.fetch=async () => ({ok:true,json:async()=>({publicToken:token})});
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
  m.fire("style.load"); m.fire("render");
  a.equal(root.parentElement.classList.contains("has-market-globe"),false);
  m.fire("sourcedata",{sourceId:"composite",coord:{},sourceDataType:"content"});
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
  a.match(m.style,/dark-v11/);
  a.match(doc.getElementById("market-globe-status").textContent,/Satélite indisponível/);
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
