(() => {
  "use strict";
  // Single icon vocabulary for the globe, legend, list and operation details.
  const symbols = {
    mine: {label:"Mina", color:"#65eed0", path:"M2 16l6-11 3 5 2-3 5 9H2m4-7 2 2 2-2"},
    plant: {label:"Planta", color:"#d7b1ff", path:"M3 17V9l5 3V9l5 3 1-8h3l1 13H3m3-2h1m3 0h1m3 0h1"},
    port: {label:"Porto", color:"#ffc670", path:"M10 5v12m-4-8h8M4 12c0 3 2 5 6 5s6-2 6-5M2 13l2-1 2 1m8 0 2-1 2 1M8 4a2 2 0 1 0 4 0 2 2 0 1 0-4 0"},
    project: {label:"Projeto", color:"#f49bb8", path:"M10 2l8 8-8 8-8-8 8-8zm-4 8h8m-4-4v8"},
  };
  window.strataOperationSymbols = {symbols, icon(kind) {
    const item = symbols[kind];
    const ns = "http://www.w3.org/2000/svg";
    const icon = document.createElementNS(ns,"svg");
    icon.setAttribute("class","market-operation-icon");
    icon.setAttribute("viewBox","0 0 20 20");
    icon.setAttribute("aria-hidden","true");
    icon.style.color = item.color;
    const path = document.createElementNS(ns,"path");
    path.setAttribute("d",item.path);
    icon.append(path);
    return icon;
  }};
  const get = id => document.getElementById("market-globe" + id);
  const root = get(""), canvas = get("-canvas"), toggle = get("-style"), streets = get("-streets");
  if (!root || !canvas || !toggle) return;
  const styles = {dark: "mapbox://styles/mapbox/dark-v11", satellite: "mapbox://styles/mapbox/satellite-streets-v12"};
  const globalView = () => ({center: [-25, 18], zoom: root.clientWidth < 520 ? 0.5 : 1.05, pitch: 0, bearing: 0});
  const sdk = "https://api.mapbox.com/mapbox-gl-js/v3.35.0/mapbox-gl";
  let rows = new Map(), pick, selected, map, popup, timer, outline;
  let operations = new Map(), operationSelected, pickOperation;
  let pendingFocus, hoveredOperation;
  let requested = false, visible = false, layerReady = false, loadError = false, active = "outline";

  const full = getFullscreen();
  function getFullscreen() {
    const dialog = document.getElementById("market-map-fullscreen");
    const enter = document.getElementById("market-map-expand"), leave = document.getElementById("market-map-collapse");
    const stage = document.getElementById("market-map-fullscreen-stage");
    const selection = document.getElementById("market-map-fullscreen-selection");
    const operation = document.getElementById("market-map-fullscreen-operation");
    const figure = root.closest(".market-geo-figure");
    if (!figure || !dialog || typeof dialog.showModal !== "function") return null;
    const home = figure.parentNode;
    const next = figure.nextSibling;
    const resize = () => window.requestAnimationFrame(() => map?.resize());
    let restore;
    const returnFigure = () => {
      if (figure.parentNode === stage) home.insertBefore(figure,next);
      document.documentElement.classList.remove("market-map-dialog-open");
      resize();
    };
    function close(target) {
      restore = target;
      dialog.close();
      returnFigure();
      (restore ?? enter).focus({preventScroll:!target});
      restore = null;
    }
    enter.hidden = false;
    enter.addEventListener("click", () => {
      if (dialog.open) return;
      stage.append(figure);
      try { dialog.showModal(); }
      catch { returnFigure(); enter.focus(); return; }
      document.documentElement.classList.add("market-map-dialog-open");
      leave.focus();
      resize();
    });
    leave.addEventListener("click", () => close());
    dialog.addEventListener("cancel", event => { event.preventDefault(); close(); });
    dialog.addEventListener("close", () => { if (!dialog.open && figure.parentNode === stage) { returnFigure(); enter.focus(); } });
    operation.addEventListener("click", () => {
      const heading = document.getElementById("market-operations-name");
      close(heading);
      heading?.scrollIntoView?.({block:"center"});
    });
    return {open:() => dialog.open, select(current) {
      selection.hidden = !current;
      operation.textContent = current ? "Ver ficha: " + current.city : "";
    }};
  }

  function notice(text) {
    get("-status").textContent = text;
    get("-status").hidden = !text;
  }
  function data() {
    return {type: "FeatureCollection", features: [...rows.values()].map(({label, anchor}) => ({
      type: "Feature", geometry: {type: "Point", coordinates: anchor}, properties: {label, selected: label === selected},
    }))};
  }
  function operationData() {
    return {type: "FeatureCollection", features: [...operations.values()].map(item => ({
      type: "Feature", geometry: {type: "Point", coordinates: item.anchor},
      properties: {id: item.id, kind: item.kind, selected: item.id === operationSelected},
    }))};
  }
  function updateData() {
    map?.getSource("trade-partners")?.setData(data());
    map?.getSource("mineral-operations")?.setData(operationData());
  }
  function clearPopup() {
    hoveredOperation = null;
    popup?.remove();
    if (map) map.getCanvas().style.cursor = "";
  }
  function abandon(reason = "unavailable") {
    root.dataset.state = typeof reason === "string" ? reason : "context-lost";
    clearTimeout(timer);
    root.parentElement.classList.remove("has-market-globe");
    root.inert = true;
    get("-hint").hidden = true;
    visible = false;
    pendingFocus = null;
    if (map) { const old = map; map = null; old.remove(); }
  }
  function outlineStyle() {
    return {version: 8, name: "StrataSignal · Visão global", sources: {
      "public-outline": {type: "geojson", data: outline, attribution:
        '<a href="https://www.naturalearthdata.com/about/terms-of-use/">Natural Earth</a>'},
    }, layers: [
      {id: "oceans", type: "background", paint: {"background-color": "#173454"}},
      {id: "land", type: "fill", source: "public-outline", paint: {
        "fill-color": "#2f626c", "fill-outline-color": "#86a8a7"}},
    ]};
  }
  function setControls(disabled) {
    toggle.disabled = disabled;
    streets.disabled = disabled;
  }
  function changeStyle(name, message = "") {
    if (!map) return;
    clearTimeout(timer);
    active = name;
    layerReady = false;
    loadError = false;
    clearPopup();
    setControls(true);
    toggle.textContent = name === "satellite" ? "Sair do satélite" : "Satélite";
    streets.setAttribute("aria-pressed", String(name === "dark"));
    map.setMaxZoom(name === "outline" ? 5 : 18);
    if (name === "outline" && map.getZoom() > 5) map.jumpTo({zoom: 5});
    toggle.setAttribute("aria-pressed", String(name === "satellite"));
    notice(message);
    map.setStyle(name === "outline" ? outlineStyle() : styles[name]);
    timer = setTimeout(() => {
      if (active !== "outline") changeStyle("outline", "A camada detalhada não carregou. A visão global continua disponível.");
      else abandon("outline-timeout");
    }, 18000);
  }
  function loadAssets() {
    return new Promise((resolve, reject) => {
      if (window.mapboxgl) { resolve(); return; }
      const link = document.createElement("link"), script = document.createElement("script");
      link.rel = "stylesheet";
      link.href = sdk + ".css";
      script.src = sdk + ".js";
      let left = 2;
      for (const asset of [link, script]) {
        asset.onload = () => { if (!--left) resolve(); };
        asset.onerror = reject;
      }
      document.head.append(link, script);
    });
  }
  async function start() {
    if (requested) return;
    requested = true;
    try {
      const response = await fetch("/mapa/mapbox-config.json", {credentials: "same-origin"});
      if (!response.ok) return;
      const {publicToken} = await response.json();
      if (typeof publicToken !== "string" || !/^pk\.[\w-]+\.[\w-]+$/.test(publicToken)) return;
      const outlineResponse = await fetch("/mapa/world-outline.json", {credentials: "same-origin"});
      if (!outlineResponse.ok) { root.dataset.state = "outline-unavailable"; return; }
      outline = await outlineResponse.json();
      await loadAssets();
      const gl = window.mapboxgl;
      if (!gl?.supported()) { root.dataset.state = "webgl-unavailable"; return; }
      root.dataset.state = "creating";
      map = new gl.Map({container: canvas, accessToken: publicToken, style: outlineStyle(),
        projection: "globe", ...globalView(), minZoom: 0.5, maxZoom: 5});
      map.addControl(new gl.NavigationControl({showCompass: false}), "top-right");
      popup = new gl.Popup({closeOnClick: false, closeButton: false, offset: 13});
      timer = setTimeout(() => abandon("tile-timeout"), 40000);
      map.on("style.load", () => {
        if (!map) return;
        root.dataset.state = "style-loaded";
        map.setProjection("globe");
        map.setFog({color: "#adc8e2", "high-color": "#325380", "space-color": "#081424", "star-intensity": 0.12});
        map.addSource("trade-partners", {type: "geojson", data: data()});
        const chosen = ["boolean", ["get", "selected"], false];
        map.addLayer({id: "trade-partners", source: "trade-partners", type: "circle", paint: {
          "circle-color": ["case", chosen, "#f2c94c", "#a4d1ff"],
          "circle-stroke-color": "#081b33", "circle-stroke-width": 2,
          "circle-radius": ["case", chosen, 8, 6],
        }, layout: {"circle-sort-key": ["case", chosen, 1, 0]}});
        map.addSource("mineral-operations", {type:"geojson", data:operationData()});
        map.addLayer({id:"mineral-operations", source:"mineral-operations", type:"circle", paint:{
          "circle-color": ["match", ["get","kind"], ...Object.entries(symbols).flatMap(([k,v]) => [k,v.color]), "#a4d1ff"],
          "circle-radius": ["case", chosen, 14, 11],
          "circle-stroke-width": ["case", chosen, 3, 1.75],
          "circle-stroke-color": ["case", chosen, "#fff7dc", "#081b33"],
        }, layout:{"circle-sort-key": ["case",chosen,1,0]}});
        // Keep the underlying interactive circles if symbol rendering is unavailable.
        if (typeof Path2D === "function") {
          const tile = document.createElement("canvas");
          tile.width = tile.height = 40;
          const ctx = tile.getContext("2d");
          if (ctx) {
            for (const [kind, item] of Object.entries(symbols)) {
              ctx.setTransform(1,0,0,1,0,0);
              ctx.clearRect(0,0,40,40);
              ctx.scale(2,2);
              ctx.strokeStyle = "#081b33";
              ctx.lineWidth = 1.8;
              ctx.lineJoin = ctx.lineCap = "round";
              ctx.stroke(new Path2D(item.path));
              if (!map.hasImage("strata-op-" + kind)) map.addImage("strata-op-" + kind,ctx.getImageData(0,0,40,40),{pixelRatio:2});
            }
            map.addLayer({id:"mineral-operation-icons", source:"mineral-operations", type:"symbol", layout:{
              "icon-image":["concat","strata-op-",["get","kind"]],
              "icon-size":["case",chosen,0.97,0.77],
              "icon-allow-overlap":true, "icon-ignore-placement":true,
              "icon-rotation-alignment":"viewport", "icon-pitch-alignment":"viewport",
              "symbol-sort-key":["case",chosen,1,0],
            }});
          }
        }
      });
      map.on("sourcedata", event => {
        if (event.sourceId && event.sourceId !== "trade-partners" && event.coord && event.sourceDataType === "content") layerReady = true;
      });
      const reveal = () => {
        if (!map?.getSource("trade-partners") || !layerReady || (visible && !toggle.disabled)) return;
        const mount = canvas.getBoundingClientRect();
        const surface = map.getCanvas();
        const extent = surface.getBoundingClientRect();
        if (mount.width < 64 || mount.height < 64 ||
            Math.abs(extent.width - mount.width) > 2 || Math.abs(extent.height - mount.height) > 2 ||
            !surface.width || !surface.height) return;
        clearTimeout(timer);
        setControls(false);
        root.dataset.state = "ready";
        if (!visible) {
          visible = true;
          root.inert = false;
          root.parentElement.classList.add("has-market-globe");
          get("-hint").hidden = false;
          map.resize();
          if (pendingFocus) {
            const anchor = pendingFocus;
            pendingFocus = null;
            window.strataMarketGlobe.focus(anchor);
          }
        }
      };
      map.on("render", reveal);
      map.on("idle", () => {
        if (!loadError && map?.isStyleLoaded() && map.areTilesLoaded()) layerReady = true;
        reveal();
      });
      map.on("mousemove", "trade-partners", event => {
        const item = rows.get(event.features?.[0]?.properties.label);
        if (!item || map.queryRenderedFeatures?.(event.point, {layers:["mineral-operations"]})?.length) return;
        if (popup.isOpen() && popup.getLngLat().lng === item.anchor[0] && popup.getLngLat().lat === item.anchor[1]) return;
        const card = document.createElement("div"), title = document.createElement("strong");
        title.textContent = item.label;
        card.append(title, document.createTextNode(item.totals), document.createElement("br"), document.createTextNode(item.unit));
        popup.setLngLat(item.anchor).setDOMContent(card).addTo(map);
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "trade-partners", clearPopup);
      map.on("movestart", clearPopup);
      map.on("click", "trade-partners", event => {
        const label = event.features?.[0]?.properties.label;
        if (!map.queryRenderedFeatures?.(event.point, {layers:["mineral-operations"]})?.length && rows.has(label)) pick(label);
      });
      map.on("mousemove", "mineral-operations", event => {
        const item = operations.get(event.features?.[0]?.properties.id);
        if (!item || (hoveredOperation === item.id && popup.isOpen())) return;
        hoveredOperation = item.id;
        const card = document.createElement("div");
        card.className = "market-operation-preview";
        const header = document.createElement("div"), category = document.createElement("span");
        category.textContent = symbols[item.kind].label + " · " + item.country;
        header.append(window.strataOperationSymbols.icon(item.kind),category);
        const title = document.createElement("strong"), company = document.createElement("span");
        title.textContent = item.city;
        company.textContent = item.company;
        card.append(header,title,company);
        popup.setLngLat(item.anchor).setDOMContent(card).addTo(map);
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "mineral-operations", clearPopup);
      map.on("click", "mineral-operations", event => {
        const id = event.features?.[0]?.properties.id;
        if (operations.has(id)) { clearPopup(); pickOperation(id); }
      });
      map.on("error", event => {
        const code = Number(event?.error?.status ?? event?.error?.statusCode);
        if (![401, 403, 429].includes(code)) return;
        loadError = true;
        if (active !== "outline") changeStyle("outline", "A camada detalhada está indisponível. A visão global continua disponível.");
        else if (!visible && code !== 429) abandon("access-denied");
      });
      map.on("webglcontextlost", abandon);
    } catch {
      abandon("startup-failed");
    }
  }

  toggle.addEventListener("click", () => changeStyle(active === "satellite" ? "outline" : "satellite"));
  streets.addEventListener("click", () => changeStyle(active === "dark" ? "outline" : "dark"));
  get("-reset").addEventListener("click", () => { if (visible) map.jumpTo(globalView()); });
  window.strataMarketGlobe = {
    isFullscreen: () => Boolean(full?.open()),
    update(points, current, handler) {
      rows = new Map(points.map(item => [item.label, item]));
      selected = current;
      pick = handler;
      clearPopup();
      updateData();
      if (points.length) start();
    },
    operations(points, current, handler) {
      operations = new Map(points.map(item => [item.id, item]));
      operationSelected = current;
      full?.select(operations.get(current));
      if (!operations.has(current)) pendingFocus = null;
      pickOperation = handler;
      updateData();
      if (points.length) start();
    },
    focus(anchor, whenReady = false) {
      if (!visible) {
        if (whenReady && requested) pendingFocus = anchor;
        return false;
      }
      map.jumpTo({center: anchor, zoom: 4.2, pitch: 0, bearing: 0});
      return true;
    },
  };
})();
