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
  const recentDate = () => {
    const now=new Date();
    // MODIS granules may appear after acquisition; choose a dated observation, never label as real-time.
    now.setUTCDate(now.getUTCDate()-5);
    return now.toISOString().slice(0,10);
  };
  let report=null,material=null,originFilter="",selected=null,enabled=false,layer="blue",zoom=2;
  let center=project(5,17,zoom),drag=null,tileErrors=0,tilesLoaded=0;
  const sources={blue:{label:"NASA Blue Marble · composição histórica",id:"BlueMarble_NextGeneration",
    date:"2004-01-01",matrix:"GoogleMapsCompatible_Level8",extension:"jpeg",maxZoom:7},
    daily:{label:"NASA Terra/MODIS · observação datada",id:"MODIS_Terra_CorrectedReflectance_TrueColor",
    date:recentDate(),matrix:"GoogleMapsCompatible_Level9",extension:"jpg",maxZoom:8}};
  let oldTileKey="";
  const viewport = () => $("geo-viewport");
  function dimensions() {
    const v=viewport();
    return [v.clientWidth||960,v.clientHeight||440];
  }
  function limitCenter() {
    const [w,h]=dimensions(),world=size(zoom);
    // Horizontal wrapping is supported. Vertical panning is clipped to the Web Mercator world.
    center[1]=clamp(center[1],Math.min(h/2,world/2),Math.max(world-h/2,world/2));
    if(!Number.isFinite(center[0]))center[0]=world/2;
    if(Math.abs(center[0])>world*8)center[0]=((center[0]%world)+world)%world;
  }
  function point(lon,lat) {
    const [w,h]=dimensions(),[x,y]=project(lon,lat,zoom),world=size(zoom);
    let dx=x-center[0];dx=((dx+world/2)%world+world)%world-world/2;
    return [w/2+dx,h/2+y-center[1]];
  }
  function drawLand() {
    const [w,h]=dimensions(),world=size(zoom),land=$("geo-land");
    const left=w/2-center[0],top=h/2-center[1];
    land.style.width=world+"px";land.style.height=world+"px";
    land.style.transform="translate("+left+"px,"+top+"px)";
    // On a wrapped view the land outline is duplicated to avoid blank seams.
    const copy=$("geo-land-copy");
    copy.style.width=world+"px";copy.style.height=world+"px";
    copy.style.transform="translate("+(left+(center[0]<world/2?world:-world))+"px,"+top+"px)";
  }
  function drawTiles() {
    const target=$("geo-tiles");
    if(!enabled){target.replaceChildren();oldTileKey="";return;}
    const config=sources[layer],date=config.date,[w,h]=dimensions(),world=size(zoom);
    const left=center[0]-w/2,top=center[1]-h/2;
    const xmin=Math.floor(left/256),xmax=Math.floor((left+w)/256);
    const ymin=Math.max(0,Math.floor(top/256)),ymax=Math.min(Math.pow(2,zoom)-1,Math.floor((top+h)/256));
    const key=[zoom,layer,date,xmin,xmax,ymin,ymax].join("/");
    // Reuse the tile DOM when only panning within the same visible tile grid.
    if(key!==oldTileKey){
      oldTileKey=key;tileErrors=0;tilesLoaded=0;
      target.replaceChildren();
      const n=Math.pow(2,zoom);
      for(let x=xmin;x<=xmax;x++)for(let y=ymin;y<=ymax;y++){
        const tx=((x%n)+n)%n;
        const img=make("img");
        img.alt="";img.decoding="async";img.referrerPolicy="no-referrer";
        img.draggable=false;
        img.dataset.tileX=String(x);img.dataset.tileY=String(y);
        img.src=NASA+config.id+"/default/"+date+"/"+config.matrix+"/"+zoom+"/"+y+"/"+tx+"."+config.extension;
        img.addEventListener("load",()=>{tilesLoaded++;if(tilesLoaded===1)$("geo-imagery-state").textContent=config.label+" · "+date;});
        img.addEventListener("error",()=>{
          tileErrors++;
          if(tileErrors>=2&&tilesLoaded===0)$("geo-imagery-state").textContent="Imagens indisponíveis. O mapa geográfico continua operante.";
        });
        target.append(img);
      }
    }
    for(const tile of target.children){
      const x=Number(tile.dataset.tileX),y=Number(tile.dataset.tileY);
      tile.style.transform="translate("+(x*256-left)+"px,"+(y*256-top)+"px)";
    }
  }
  function currentMaterial() {
    return report?.materials?.find(m=>m.material===material)||null;
  }
  function visibleOrigins() {
    return Object.entries(currentMaterial()?.country_shares || {})
      .filter(([code]) => !originFilter || code === originFilter);
  }
  function positionOrigins() {
    const holder=$("geo-markers");holder.replaceChildren();
    for(const [code,share] of visibleOrigins()){
      const ll=anchors[code];if(!ll||!Number.isFinite(share)||share<=0)continue;
      const [x,y]=point(ll[0],ll[1]);
      const marker=make("button",code,"geo-marker");
      marker.type="button";marker.dataset.country=code;
      marker.style.left=x+"px";marker.style.top=y+"px";
      marker.style.setProperty("--marker-size",(17+36*Math.sqrt(share))+"px");
      marker.setAttribute("aria-label",(names[code]||code)+": "+pct(share)+" da alocação declarada");
      marker.title=(names[code]||code)+" · "+pct(share);
      marker.setAttribute("aria-pressed",String(selected===code));
      marker.addEventListener("click",()=>chooseCountry(code));
      holder.append(marker);
    }
  }
  function showSelected() {
    const target=$("geo-selection");target.replaceChildren();
    const current=currentMaterial();
    const share=current?.country_shares?.[selected];
    const canSelect=typeof share==="number"&&share>0;
    $("geo-to-scenario").disabled=!canSelect;
    if (!canSelect) {
      const message = originFilter
        ? (visibleOrigins().length ? "Origem sem posição no mapa. Consulte o gráfico ou a tabela." : "Nenhuma origem neste recorte.")
        : "Selecione uma origem destacada para examinar sua participação.";
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
    const current=currentMaterial(),list=$("geo-origin-list");
    list.replaceChildren();selected=null;
    if(!current){showSelected();return;}
    const entries = visibleOrigins().sort((a, b) => b[1] - a[1]);
    const available=entries.filter(([code])=>!!anchors[code]);
    for(const [code,share] of entries){
      const button=make("button",undefined,"geo-origin-item");
      button.type="button";button.dataset.country=code;
      const name=make("span",(names[code]||code)+(anchors[code]?"":" · sem posição"));
      button.append(name,make("strong",pct(share)));
      button.disabled=!anchors[code];button.setAttribute("aria-pressed","false");
      if(anchors[code])button.addEventListener("click",()=>chooseCountry(code));
      list.append(button);
    }
    selected=available[0]?.[0]||null;
    chooseCountry(selected);
  }
  function draw() {
    limitCenter();drawLand();drawTiles();positionOrigins();
  }
  function changeZoom(next) {
    const value=clamp(next,1,Math.min(6,sources[layer].maxZoom));
    if(value===zoom)return;
    const lon=center[0]/size(zoom)*360-180;
    const merc=center[1]/size(zoom),lat=Math.atan(Math.sinh(Math.PI*(1-2*merc)))*180/Math.PI;
    zoom=value;center=project(lon,lat,zoom);
    oldTileKey="";draw();
  }
  function selectMaterial(value, origin = "") {
    if (!report?.materials.some(item => item.material === value)) return false;
    if (material === value && originFilter === origin) return true;
    material = value;
    originFilter = origin;
    $("geo-material-name").textContent=currentMaterial().name;
    renderOriginList();draw();
    return true;
  }
  function setReport(value, preferred = material, origin = "") {
    report=value&&Array.isArray(value.materials)?value:null;
    material=null;originFilter="";selected=null;
    if(!report||!report.materials.length){$("geo-material-name").textContent="Origens declaradas";$("geo-origin-list").replaceChildren();$("geo-markers").replaceChildren();showSelected();return;}
    selectMaterial(report.materials.some(m => m.material === preferred) ? preferred : report.materials[0].material, origin);
  }
  function refresh() {if(report)draw();}
  function clear() {setReport(null);}
  function activate() {
    enabled=!enabled;
    $("geo-enable").textContent=enabled?"Desativar imagens externas":"Ativar imagens NASA";
    $("geo-enable").setAttribute("aria-pressed",String(enabled));
    $("geo-imagery").disabled=!enabled;
    $("geo-imagery-state").textContent=enabled?"Solicitando imagens à NASA…":"Cartografia local · sem transmissão externa";
    tileErrors=0;tilesLoaded=0;oldTileKey="";draw();
  }
  function init() {
    if(!viewport())return;
    const view=viewport();
    $("geo-enable").addEventListener("click",activate);
    $("geo-imagery").addEventListener("change",event=>{
      if(event.target.value!=="blue"&&event.target.value!=="daily")return;
      layer=event.target.value;oldTileKey="";zoom=Math.min(zoom,6);
      $("geo-imagery-state").textContent=enabled?"Carregando camada "+sources[layer].label+"…":"Cartografia local · sem transmissão externa";
      draw();
    });
    $("geo-zoom-in").addEventListener("click",()=>changeZoom(zoom+1));
    $("geo-zoom-out").addEventListener("click",()=>changeZoom(zoom-1));
    $("geo-reset").addEventListener("click",()=>{zoom=2;center=project(5,17,zoom);oldTileKey="";draw();});
    $("geo-to-scenario").addEventListener("click",()=>{
      const picker=$("scenario-country");
      if(!selected||!report||!picker)return;
      if([...picker.options].some(option=>option.value===selected)){
        picker.value=selected;
        picker.dispatchEvent(new Event("change",{bubbles:true}));
        document.querySelector('nav [data-view="scenario"]')?.click();
        picker.focus();
      }
    });
    view.addEventListener("pointerdown",event=>{
      if(event.target.closest("button")||event.button!==0)return;
      drag={x:event.clientX,y:event.clientY,startX:center[0],startY:center[1]};
      try{view.setPointerCapture(event.pointerId);}catch(_){}
    });
    view.addEventListener("pointermove",event=>{
      if(!drag)return;
      center=[drag.startX-(event.clientX-drag.x),drag.startY-(event.clientY-drag.y)];
      draw();
    });
    for(const name of ["pointerup","pointercancel","lostpointercapture"])view.addEventListener(name,()=>{drag=null;});
    view.addEventListener("keydown",event=>{
      const deltas={ArrowLeft:[-90,0],ArrowRight:[90,0],ArrowUp:[0,-90],ArrowDown:[0,90]};
      if(!deltas[event.key])return;
      event.preventDefault();
      const [dx,dy]=deltas[event.key];center[0]+=dx;center[1]+=dy;draw();
    });
    window.addEventListener("resize",refresh);
    draw();
  }
  document.addEventListener("DOMContentLoaded",init);
  window.StrataGeo={setReport,selectMaterial,refresh,clear};
})();
