(() => {
  "use strict";
  const get = id => document.getElementById("market-globe" + id);
  const root = get(""), canvas = get("-canvas"), toggle = get("-style");
  if (!root || !canvas || !toggle) return;
  const styles = {dark: "mapbox://styles/mapbox/dark-v11", satellite: "mapbox://styles/mapbox/satellite-streets-v12"};
  const view = {center: [-37, 19], zoom: 1.22, pitch: 0, bearing: 0};
  const sdk = "https://api.mapbox.com/mapbox-gl-js/v3.35.0/mapbox-gl";
  let rows = new Map(), pick, selected, map, popup, timer;
  let requested = false, visible = false, layerReady = false, loadError = false, active = "dark";

  function notice(text) {
    get("-status").textContent = text;
    get("-status").hidden = !text;
  }
  function data() {
    return {type: "FeatureCollection", features: [...rows.values()].map(({label, anchor}) => ({
      type: "Feature", geometry: {type: "Point", coordinates: anchor}, properties: {label, selected: label === selected},
    }))};
  }
  function updateData() {
    map?.getSource("trade-partners")?.setData(data());
  }
  function clearPopup() {
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
    if (map) { const old = map; map = null; old.remove(); }
  }
  function changeStyle(name, message = "") {
    if (!map) return;
    clearTimeout(timer);
    active = name;
    layerReady = false;
    loadError = false;
    clearPopup();
    toggle.disabled = true;
    toggle.textContent = name === "satellite" ? "Mapa escuro" : "Satélite";
    toggle.setAttribute("aria-pressed", String(name === "satellite"));
    notice(message);
    map.setStyle(styles[name]);
    timer = setTimeout(() => {
      if (active === "satellite") changeStyle("dark", "Satélite indisponível. Voltando ao mapa escuro.");
      else abandon();
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
      await loadAssets();
      const gl = window.mapboxgl;
      if (!gl?.supported()) { root.dataset.state = "webgl-unavailable"; return; }
      root.dataset.state = "creating";
      map = new gl.Map({container: canvas, accessToken: publicToken, style: styles.dark,
        projection: "globe", ...view, minZoom: 0.5, maxZoom: 18});
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
        toggle.disabled = false;
        if (!visible) {
          visible = true;
          root.dataset.state = "ready";
          root.inert = false;
          root.parentElement.classList.add("has-market-globe");
          get("-hint").hidden = false;
          map.resize();
        }
      };
      map.on("render", reveal);
      map.on("idle", () => {
        if (!loadError && map?.isStyleLoaded() && map.areTilesLoaded()) layerReady = true;
        reveal();
      });
      map.on("mousemove", "trade-partners", event => {
        const item = rows.get(event.features?.[0]?.properties.label);
        if (!item) return;
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
        if (rows.has(label)) pick(label);
      });
      map.on("error", event => {
        const code = Number(event?.error?.status ?? event?.error?.statusCode);
        if (![401, 403, 429].includes(code)) return;
        loadError = true;
        if (active === "satellite") changeStyle("dark", "Satélite indisponível. Voltando ao mapa escuro.");
        else if (!visible && code !== 429) abandon("access-denied");
      });
      map.on("webglcontextlost", abandon);
    } catch {
      abandon("startup-failed");
    }
  }

  toggle.addEventListener("click", () => changeStyle(active === "dark" ? "satellite" : "dark"));
  get("-reset").addEventListener("click", () => { if (visible) map.jumpTo(view); });
  window.strataMarketGlobe = {
    update(points, current, handler) {
      rows = new Map(points.map(item => [item.label, item]));
      selected = current;
      pick = handler;
      clearPopup();
      updateData();
      if (points.length) start();
    },
    focus(anchor) {
      if (!visible) return false;
      map.jumpTo({center: anchor, zoom: 4.2, pitch: 0, bearing: 0});
      return true;
    },
  };
})();
