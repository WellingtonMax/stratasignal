"use strict";
(() => {
  const radians = Math.PI / 180;
  const textureWidth = 1536;
  const textureHeight = 768;
  const wms = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";

  function imageryUrl(layer, date) {
    const query = new URLSearchParams({
      SERVICE: "WMS", VERSION: "1.1.1", REQUEST: "GetMap", SRS: "EPSG:4326",
      BBOX: "-180,-90,180,90", WIDTH: String(textureWidth), HEIGHT: String(textureHeight),
      LAYERS: layer, STYLES: "", FORMAT: "image/jpeg", TIME: date,
    });
    return wms + "?" + query;
  }

  function geometry(lon, lat, width, height, zoom) {
    return {
      lon: lon * radians, sinLat: Math.sin(lat * radians), cosLat: Math.cos(lat * radians),
      radius: Math.min(width, height) * 0.43 * 1.42 ** (zoom - 2), width, height,
    };
  }

  function point(lon, lat, view) {
    const lambda = lon * radians - view.lon, phi = lat * radians;
    const east = Math.cos(phi) * Math.sin(lambda);
    const north = view.cosLat * Math.sin(phi) - view.sinLat * Math.cos(phi) * Math.cos(lambda);
    const depth = view.sinLat * Math.sin(phi) + view.cosLat * Math.cos(phi) * Math.cos(lambda);
    if (depth <= 0) return null;
    const x = view.width / 2 + east * view.radius, y = view.height / 2 - north * view.radius;
    return x >= 0 && x <= view.width && y >= 0 && y <= view.height ? [x, y] : null;
  }

  function pixels(image, width, height, mercator) {
    const buffer = document.createElement("canvas");
    buffer.width = width;
    buffer.height = height;
    const context = buffer.getContext("2d", {willReadFrequently: true});
    context.drawImage(image, 0, 0, width, height);
    return {rgba: context.getImageData(0, 0, width, height).data, width, height, mercator};
  }

  function paint(context, frame, texture, radius, view) {
    const {width, height, data} = frame;
    const cx = width / 2, cy = height / 2, lonShift = view.lon / (2 * Math.PI) + 0.5;
    data.fill(0);
    for (let y = Math.max(0, Math.ceil(cy - radius - 0.5)); y < Math.min(height, cy + radius - 0.5); y++) {
      const sy = (cy - y - 0.5) / radius;
      const half = Math.sqrt(Math.max(0, 1 - sy * sy));
      for (let x = Math.max(0, Math.ceil(cx - radius * half - 0.5)); x < Math.min(width, cx + radius * half - 0.5); x++) {
        const sx = (x + 0.5 - cx) / radius, z = Math.sqrt(Math.max(0, 1 - sx * sx - sy * sy));
        const dst = (y * width + x) * 4;
        const light = 0.72 + 0.28 * z;
        let r = 20, g = 49, b = 84;
        if (texture) {
          let u = lonShift + Math.atan2(sx, z * view.cosLat - sy * view.sinLat) / (2 * Math.PI);
          u -= Math.floor(u);
          const latitude = Math.min(1, Math.max(-1, sy * view.cosLat + z * view.sinLat));
          const v = texture.mercator
            ? 0.5 - Math.log((1 + latitude) / (1 - latitude)) / (4 * Math.PI)
            : 0.5 - Math.asin(latitude) / Math.PI;
          if (v >= 0 && v <= 1) {
            const src = (Math.min(texture.height - 1, Math.floor(v * texture.height)) * texture.width +
              Math.floor(u * texture.width)) * 4;
            if (texture.rgba[src + 3]) {
              r = texture.rgba[src]; g = texture.rgba[src + 1]; b = texture.rgba[src + 2];
            }
          }
        }
        data[dst] = r * light; data[dst + 1] = g * light; data[dst + 2] = b * light;
        data[dst + 3] = 255 * Math.min(1, z * Math.sqrt(radius));
      }
    }
    context.putImageData(frame, 0, 0);
  }

  let base = null;

  function create(canvas, land, report) {
    const context = canvas.getContext("2d");
    if (!context) return null;
    let request = null, source, remote, view, animation, frame;

    function redraw() {
      if (!view || animation !== undefined) return;
      animation = requestAnimationFrame(() => {
        animation = undefined;
        const limit = view.moving ? 360 : 640;
        const scale = Math.min(1.5, window.devicePixelRatio || 1, limit / Math.max(view.width, view.height));
        const width = Math.max(1, Math.round(view.width * scale));
        const height = Math.max(1, Math.round(view.height * scale));
        if (canvas.width !== width || canvas.height !== height || !frame) {
          canvas.width = width;
          canvas.height = height;
          frame = context.createImageData(width, height);
        }
        paint(context, frame, remote || base, view.radius * scale, view);
      });
    }

    function loadLand() {
      if (!base) base = pixels(land, 1024, 1024, true);
      redraw();
    }
    if (land.complete && land.naturalWidth) loadLand();
    else land.addEventListener("load", loadLand, {once: true});

    function cancel() {
      if (!request) return;
      clearTimeout(request.timeout);
      request.image.onload = request.image.onerror = null;
      request = null;
    }

    function setSource(url) {
      if (source === url) return;
      cancel();
      source = url;
      remote = null;
      if (!url) {
        report("Cartografia local · sem transmissão externa");
        return;
      }
      report("Carregando a imagem global da NASA…");
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.referrerPolicy = "no-referrer";
      image.decoding = "async";
      const pending = {image, timeout: setTimeout(() => finish(null), 15000)};
      request = pending;
      function finish(texture) {
        if (request !== pending) return;
        cancel();
        remote = texture;
        report(texture ? "Imagem global da NASA carregada." : "Imagem indisponível para esta data. Cartografia local disponível.");
        redraw();
      }
      image.onload = () => {
        try {
          finish(image.naturalWidth === textureWidth && image.naturalHeight === textureHeight
            ? pixels(image, textureWidth, textureHeight, false) : null);
        } catch {
          finish(null);
        }
      };
      image.onerror = () => finish(null);
      image.src = url;
    }

    return {
      update(nextView, url) {
        if (!view && source === url && remote) report("Imagem global da NASA carregada.");
        view = nextView;
        setSource(url);
        redraw();
      },
      deactivate(keepTexture = false) {
        cancel();
        if (animation !== undefined) cancelAnimationFrame(animation);
        if (!keepTexture || !remote) source = remote = undefined;
        view = animation = frame = undefined;
        canvas.width = canvas.height = 1;
      },
    };
  }

  window.StrataGlobe = {geometry, point, imageryUrl, create};
})();
