"use strict";
(() => {
  // Geographic anchors are deliberately approximate COUNTRY positions, never sites or transport routes.
  const anchors = Object.freeze({
    AR:[-64,-35],AU:[134,-25],BE:[4.7,50.8],BO:[-64.6,-17],BR:[-52,-12],CA:[-105,57],
    CD:[23,-3],CL:[-70,-32],CN:[104,35],CO:[-74,4],CZ:[15,49.8],DE:[10.5,51],
    EG:[30,27],ES:[-4,40],FI:[25,64],FR:[2.5,47],GB:[-2.5,54],GH:[-1.2,7.9],
    GN:[-10,10],ID:[118,-3],IN:[79,22],IR:[54,32],IT:[12.5,42],JP:[138,37],
    KZ:[67,48],KR:[127.7,36.5],MA:[-7,32],MG:[47,-19],ML:[-4,17],MN:[103,47],
    MX:[-102,24],MY:[102,4],MZ:[36,-18],NA:[18,-22],NG:[8,9],NO:[10,62],
    PE:[-75,-10],PH:[123,12],PK:[69,30],PL:[19,52],PT:[-8,40],RU:[94,61],
    SA:[45,24],SE:[15,62],TH:[101,15],TR:[35,39],TW:[121,24],TZ:[35,-6],
    UA:[32,49],US:[-98,39],UZ:[64,41],VN:[107,16],ZA:[25,-29],ZM:[28,-13],ZW:[30,-19]
  });
  const names = Object.freeze({AR:"Argentina",AU:"Austrália",BE:"Bélgica",BO:"Bolívia",BR:"Brasil",CA:"Canadá",
    CD:"RD Congo",CL:"Chile",CN:"China",CO:"Colômbia",CZ:"Tchéquia",DE:"Alemanha",EG:"Egito",
    ES:"Espanha",FI:"Finlândia",FR:"França",GB:"Reino Unido",GH:"Gana",GN:"Guiné",ID:"Indonésia",
    IN:"Índia",IR:"Irã",IT:"Itália",JP:"Japão",KZ:"Cazaquistão",KR:"Coreia do Sul",MA:"Marrocos",
    MG:"Madagascar",ML:"Mali",MN:"Mongólia",MX:"México",MY:"Malásia",MZ:"Moçambique",NA:"Namíbia",
    NG:"Nigéria",NO:"Noruega",PE:"Peru",PH:"Filipinas",PK:"Paquistão",PL:"Polônia",PT:"Portugal",
    RU:"Rússia",SA:"Arábia Saudita",SE:"Suécia",TH:"Tailândia",TR:"Turquia",TW:"Taiwan",
    TZ:"Tanzânia",UA:"Ucrânia",US:"Estados Unidos",UZ:"Uzbequistão",VN:"Vietnã",
    ZA:"África do Sul",ZM:"Zâmbia",ZW:"Zimbábue",ZZ:"Desconhecida"});
  const NASA = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/";
  const $ = id => document.getElementById(id);
  const make = (tag,text,cls) => {
    const el=document.createElement(tag);
    if(text!==undefined)el.textContent=String(text);
    if(cls)el.className=cls;
    return el;
  };
  const pct = value => (value*100).toLocaleString("pt-BR",{maximumFractionDigits:1})+"%";
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const size = zoom => 256*Math.pow(2,zoom);
  const project = (lon,lat,zoom) => {
    const phi=clamp(lat,-85.05,85.05)*Math.PI/180;
    return [size(zoom)*(lon+180)/360,size(zoom)*(1-Math.log(Math.tan(Math.PI/4+phi/2))/Math.PI)/2];
  };
  // GIBS DescribeDomains snapshot, queried 2026-11-07 (EPSG:3857, Terra/MODIS true color).
  const modisPeriods = [
    ["2000-02-24", "2000-04-25"],
    ["2000-04-28", "2000-08-06"],
    ["2000-08-18", "2001-06-15"],
    ["2001-07-03", "2002-03-19"],
    ["2002-03-28", "2003-12-16"],
    ["2003-12-24", "2008-12-20"],
    ["2008-12-23", "2016-02-18"],
    ["2016-02-27", "2022-10-10"],
    ["2022-10-23", "2025-08-08"],
    ["2025-08-10", "2025-11-08"],
    ["2025-11-10", "2026-11-07"],
  ];
  const isoDate = date => date.toISOString().slice(0, 10);
  const suggestedDate = new Date();
  suggestedDate.setUTCDate(suggestedDate.getUTCDate() - 5);
  const suggested = isoDate(suggestedDate);
  let modisDate = modisPeriods.reduce((chosen, [start, end]) => {
    return start <= suggested ? (end < suggested ? end : suggested) : chosen;
  }, modisPeriods[0][0]);
  const displayDate = date => date.split("-").reverse().join("/");
  const comparisonDay = new Intl.DateTimeFormat("pt-BR", {dateStyle: "long", timeZone: "UTC"});
  const validModisDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(value + "T00:00:00Z");
    return Number.isFinite(parsed.getTime()) && isoDate(parsed) === value &&
      modisPeriods.some(([start, end]) => start <= value && value <= end);
  };
  let scopeName=null,origins=[],selected=null,enabled=false,layer="blue",zoom=2;
  let center=project(5,17,zoom),drag=null;
  let comparisonDate = null;
  const sources={blue:{label:"NASA Blue Marble · composição histórica",id:"BlueMarble_NextGeneration",
    date:"2004-01-01",matrix:"GoogleMapsCompatible_Level8",extension:"jpeg",maxZoom:7},
    daily:{label:"NASA Terra/MODIS · observação datada",id:"MODIS_Terra_CorrectedReflectance_TrueColor",
    matrix:"GoogleMapsCompatible_Level9",extension:"jpg",maxZoom:8}};
  const mapView = prefix => ({
    view: $(prefix + "-viewport"),
    land: $(prefix + "-land"),
    landCopy: $(prefix + "-land-copy"),
    tiles: $(prefix + "-tiles"),
    markers: $(prefix + "-markers"),
    meta: $(prefix + "-imagery-meta"),
    status: $(prefix + "-imagery-state"),
    tileKey: "",
  });
  const referenceMap = mapView("geo"), comparisonMap = mapView("geo-compare");
  function dimensions() {
    const v=referenceMap.view;
    return [v.clientWidth||960,v.clientHeight||440];
  }
  function limitCenter() {
    const [,h]=dimensions(),world=size(zoom);
    // Horizontal wrapping is supported. Vertical panning is clipped to the Web Mercator world.
    center[1]=clamp(center[1],Math.min(h/2,world/2),Math.max(world-h/2,world/2));
    if(!Number.isFinite(center[0]))center[0]=world/2;
    if(Math.abs(center[0])>world*8)center[0]=((center[0]%world)+world)%world;
  }
  function point(lon,lat,w,h) {
    const [x,y]=project(lon,lat,zoom),world=size(zoom);
    let dx=x-center[0];dx=((dx+world/2)%world+world)%world-world/2;
    return [w/2+dx,h/2+y-center[1]];
  }
  function drawLand(map, left, top) {
    const world = size(zoom);
    map.land.style.width = map.land.style.height = world + "px";
    map.land.style.transform = "translate(" + (-left) + "px," + (-top) + "px)";
    // On a wrapped view the land outline is duplicated to avoid blank seams.
    const wrappedLeft = -left + (center[0] < world / 2 ? world : -world);
    map.landCopy.style.width = map.landCopy.style.height = world + "px";
    map.landCopy.style.transform = "translate(" + wrappedLeft + "px," + (-top) + "px)";
  }
  function clearTiles(map) {
    if (map.tileKey) map.tiles.replaceChildren();
    map.tileKey = "";
  }
  function drawTiles(map, date, w, h, left, top) {
    if (!enabled) {
      clearTiles(map);
      return;
    }
    const target = map.tiles;
    const config = sources[layer];
    const xmin=Math.floor(left/256),xmax=Math.ceil((left+w)/256)-1;
    const ymin=Math.max(0,Math.floor(top/256)),ymax=Math.min(Math.pow(2,zoom)-1,Math.ceil((top+h)/256)-1);
    const key=[zoom,layer,date,xmin,xmax,ymin,ymax].join("/");
    // Reuse the tile DOM when only panning within the same visible tile grid.
    if(key!==map.tileKey){
      map.tileKey = key;
      let tileErrors = 0, tilesLoaded = 0;
      const sourceLabel = config.label + " · data solicitada " + displayDate(date);
      const imageMeta = layer === "daily"
        ? "Produto nominal de 250 m/pixel no equador. O zoom do painel exibe mosaicos mais agregados. Nuvens, áreas sem dados e atraso de publicação podem limitar a cobertura."
        : "Composição histórica. A data identifica a camada no serviço.";
      map.meta.textContent = sourceLabel + ". " + imageMeta;
      target.replaceChildren();
      map.status.textContent = "Solicitando mosaicos à NASA…";
      function settleTile(img, loaded) {
        if (!target.contains(img)) return;
        img.onload = img.onerror = null;
        if (loaded) tilesLoaded++;
        else tileErrors++;
        if (tilesLoaded + tileErrors !== target.childElementCount) return;
        let status = tilesLoaded + " mosaicos recebidos.";
        if (!tilesLoaded) status = "Imagens indisponíveis para esta vista e data. Cartografia local disponível.";
        else if (tileErrors) status += " Falha em " + tileErrors + " mosaicos. A imagem está parcial.";
        map.status.textContent = status;
      }
      const n=Math.pow(2,zoom);
      for(let x=xmin;x<=xmax;x++)for(let y=ymin;y<=ymax;y++){
        const tx=((x%n)+n)%n;
        const img=make("img");
        img.alt="";img.decoding="async";img.referrerPolicy="no-referrer";
        img.draggable=false;
        img.dataset.tileX=String(x);img.dataset.tileY=String(y);
        img.onload = () => settleTile(img, true);
        img.onerror = () => settleTile(img, false);
        target.append(img);
        img.src=NASA+config.id+"/default/"+date+"/"+config.matrix+"/"+zoom+"/"+y+"/"+tx+"."+config.extension;
      }
    }
    for(const tile of target.children){
      const x=Number(tile.dataset.tileX),y=Number(tile.dataset.tileY);
      tile.style.transform="translate("+(x*256-left)+"px,"+(y*256-top)+"px)";
    }
  }
  function renderMarkers(map, w, h, interactive) {
    const holder = map.markers;
    holder.replaceChildren();
    for(const [code,share] of origins){
      const ll=anchors[code];if(!ll||!Number.isFinite(share)||share<=0)continue;
      const [x,y]=point(ll[0],ll[1],w,h);
      const marker = make(interactive ? "button" : "span", code, "geo-marker");
      marker.style.left=x+"px";marker.style.top=y+"px";
      marker.style.setProperty("--marker-size",(17+36*Math.sqrt(share))+"px");
      if (interactive) {
        marker.type = "button";
        marker.dataset.country = code;
        marker.setAttribute("aria-label",(names[code]||code)+": "+pct(share)+" da alocação declarada");
        marker.title=(names[code]||code)+" · "+pct(share);
        marker.setAttribute("aria-pressed",String(selected===code));
        marker.addEventListener("click",()=>chooseCountry(code));
      } else {
        marker.classList.add("geo-marker-static");
        marker.classList.toggle("is-selected", selected === code);
      }
      holder.append(marker);
    }
  }
  function positionOrigins() {
    const [w,h] = dimensions();
    renderMarkers(referenceMap, w, h, true);
    if (comparisonDate) renderMarkers(comparisonMap, w, h, false);
  }
  function showSelected() {
    const target=$("geo-selection");target.replaceChildren();
    const share = origins.find(([code]) => code === selected)?.[1];
    const canSelect=typeof share==="number"&&share>0;
    $("geo-to-scenario").disabled=!canSelect;
    if (!canSelect) {
      const message = origins.length
        ? "Origens sem posição no mapa. Consulte o gráfico ou a tabela."
        : "Nenhuma origem neste recorte.";
      target.append(make("p", message, "geo-hint"));
      return;
    }
    target.append(make("strong",names[selected]||selected));
    target.append(make("p",pct(share)+" da alocação declarada desta especificação."));
    target.append(make("p","Ponto aproximado do país, não localização de mina, porto, fornecedor ou rota logística.","geo-hint"));
  }
  function chooseCountry(code) {
    selected=code;
    positionOrigins();
    for(const btn of $("geo-origin-list").querySelectorAll("button[data-country]")){
      btn.setAttribute("aria-pressed",String(btn.dataset.country===code));
    }
    showSelected();
  }
  function renderOriginList() {
    const list = $("geo-origin-list");
    list.replaceChildren();
    for (const [code, share] of origins) {
      const button=make("button",undefined,"geo-origin-item");
      button.type="button";button.dataset.country=code;
      const name=make("span",(names[code]||code)+(anchors[code]?"":" · sem posição"));
      button.append(name,make("strong",pct(share)));
      button.disabled=!anchors[code];button.setAttribute("aria-pressed","false");
      if(anchors[code])button.addEventListener("click",()=>chooseCountry(code));
      list.append(button);
    }
    chooseCountry(origins.find(([code]) => anchors[code])?.[0] || null);
  }
  function renderHeading(id, date) {
    const time = $(id);
    if (time.dateTime === date) return;
    time.dateTime = date;
    time.textContent = comparisonDay.format(new Date(date));
  }
  function draw() {
    limitCenter();
    const [w,h] = dimensions(), left = center[0] - w / 2, top = center[1] - h / 2;
    drawLand(referenceMap, left, top);
    drawTiles(referenceMap, layer === "daily" ? modisDate : sources[layer].date, w, h, left, top);
    if (comparisonDate) {
      renderHeading("geo-reference-day", modisDate);
      renderHeading("geo-compare-day", comparisonDate);
      drawLand(comparisonMap, left, top);
      drawTiles(comparisonMap, comparisonDate, w, h, left, top);
    }
    positionOrigins();
  }
  function changeZoom(next) {
    const value=clamp(next,1,Math.min(6,sources[layer].maxZoom));
    if(value===zoom)return;
    const lon=center[0]/size(zoom)*360-180;
    const merc=center[1]/size(zoom),lat=Math.atan(Math.sinh(Math.PI*(1-2*merc)))*180/Math.PI;
    zoom=value;center=project(lon,lat,zoom);
    draw();
  }
  function setScope(name, entries) {
    scopeName = name;
    origins = entries;
    $("geo-material-name").textContent = name || "Origens declaradas";
    renderOriginList();
  }
  function refresh() { if (scopeName) draw(); }
  function clear() { setScope(null, []); }
  function setComparisonDate(value) {
    comparisonDate = value;
    const active = value !== null;
    $("geo-layout").classList.toggle("is-comparing", active);
    $("geo-reference-title").hidden = !active;
    $("geo-compare-pane").hidden = !active;
    if (!active) clearTiles(comparisonMap);
  }
  function setComparisonControls(open) {
    const toggle = $("geo-compare-toggle");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Encerrar comparação" : "Comparar duas datas";
    $("geo-compare-controls").hidden = !open;
    const date = $("geo-compare-date");
    date.disabled = !open;
    $("geo-apply-comparison").disabled = !open;
    if (!open) {
      date.value = "";
      date.removeAttribute("aria-invalid");
      $("geo-compare-feedback").textContent = "";
      setComparisonDate(null);
    }
  }
  function syncDateControls() {
    const showDate = enabled && layer === "daily";
    $("geo-date-controls").hidden = !showDate;
    $("geo-date").disabled = !showDate;
    $("geo-apply-date").disabled = !showDate;
    $("geo-compare-toggle").disabled = !showDate;
    $("geo-date").value = modisDate;
    $("geo-date").removeAttribute("aria-invalid");
    $("geo-date-feedback").textContent = "";
    $("geo-imagery-meta").hidden = !enabled;
    if (!showDate) setComparisonControls(false);
  }
  function bindDateControl(inputId, buttonId, feedbackId, otherDate, apply) {
    const date = $(inputId);
    const button = $(buttonId);
    const feedback = $(feedbackId);
    date.min = modisPeriods[0][0];
    date.max = modisPeriods.at(-1)[1];
    function clearFeedback() {
      date.removeAttribute("aria-invalid");
      feedback.textContent = "";
    }
    date.addEventListener("input", clearFeedback);
    button.addEventListener("click", () => {
      if (button.disabled) return;
      const value = date.value;
      const matchesOther = value === otherDate();
      if (!validModisDate(value) || matchesOther) {
        feedback.textContent = matchesOther
          ? "Escolha uma data diferente da outra vista."
          : "Data fora dos períodos publicados neste catálogo. Escolha outro dia.";
        date.setAttribute("aria-invalid", "true");
        date.focus();
        return;
      }
      clearFeedback();
      apply(value);
      draw();
    });
  }
  function activate() {
    enabled = !enabled;
    $("geo-enable").textContent = enabled ? "Desativar imagens externas" : "Ativar imagens NASA";
    $("geo-enable").setAttribute("aria-pressed", String(enabled));
    $("geo-imagery").disabled = !enabled;
    if (!enabled) $("geo-imagery-state").textContent = "Cartografia local · sem transmissão externa";
    syncDateControls();
    draw();
  }
  function init() {
    if (!referenceMap.view) return;
    bindDateControl("geo-date", "geo-apply-date", "geo-date-feedback", () => comparisonDate, value => { modisDate = value; });
    bindDateControl("geo-compare-date", "geo-apply-comparison", "geo-compare-feedback", () => modisDate, setComparisonDate);
    syncDateControls();
    $("geo-enable").addEventListener("click", activate);
    $("geo-imagery").addEventListener("change", event => {
      if (!enabled || !Object.hasOwn(sources, event.target.value)) return;
      layer = event.target.value;
      syncDateControls();
      draw();
    });
    $("geo-compare-toggle").addEventListener("click", event => {
      if (event.currentTarget.disabled) return;
      setComparisonControls($("geo-compare-controls").hidden);
      draw();
    });
    $("geo-zoom-in").addEventListener("click",()=>changeZoom(zoom+1));
    $("geo-zoom-out").addEventListener("click",()=>changeZoom(zoom-1));
    $("geo-reset").addEventListener("click",()=>{zoom=2;center=project(5,17,zoom);draw();});
    $("geo-to-scenario").addEventListener("click",()=>{
      const picker=$("scenario-country");
      if(!selected||!picker)return;
      if([...picker.options].some(option=>option.value===selected)){
        picker.value=selected;
        picker.dispatchEvent(new Event("change",{bubbles:true}));
        document.querySelector('nav [data-view="scenario"]')?.click();
        picker.focus();
      }
    });
    bindPan(referenceMap.view);
    bindPan(comparisonMap.view);
    window.addEventListener("resize",refresh);
    draw();
  }
  function bindPan(view) {
    view.addEventListener("pointerdown",event=>{
      if(drag||event.target.closest("button")||event.button!==0)return;
      drag={pointerId:event.pointerId,x:event.clientX,y:event.clientY,startX:center[0],startY:center[1]};
      try{view.setPointerCapture(event.pointerId);}catch(_){}
    });
    view.addEventListener("pointermove",event=>{
      if(!drag||event.pointerId!==drag.pointerId)return;
      center=[drag.startX-(event.clientX-drag.x),drag.startY-(event.clientY-drag.y)];
      draw();
    });
    for(const name of ["pointerup","pointercancel","lostpointercapture"])view.addEventListener(name,event=>{
      if (drag?.pointerId === event.pointerId) drag = null;
    });
    view.addEventListener("keydown",event=>{
      const deltas={ArrowLeft:[-90,0],ArrowRight:[90,0],ArrowUp:[0,-90],ArrowDown:[0,90]};
      if(event.target!==view||!deltas[event.key])return;
      event.preventDefault();
      const [dx,dy]=deltas[event.key];center[0]+=dx;center[1]+=dy;draw();
    });
  }
  document.addEventListener("DOMContentLoaded",init);
  window.StrataGeo={setScope,refresh,clear};
})();
