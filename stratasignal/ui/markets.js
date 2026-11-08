(() => {
  "use strict";

  const get = id => document.getElementById(`markets-${id}`);
  const country = get("country");
  const status = get("status");
  const toggle = get("quote-toggle");
  const quote = get("quote");
  const catalog = {
    BR: {host: "balanca.economia.gov.br", currency: "USD", money: "US$", exchange: "BMFBOVESPA", maxAge: 45},
    AU: {host: "www.industry.gov.au", currency: "AUD", money: "A$", exchange: "ASX", maxAge: 120},
  };
  const number = new Intl.NumberFormat("pt-BR", {maximumFractionDigits: 2});
  const percent = new Intl.NumberFormat("pt-BR", {style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero"});
  const date = new Intl.DateTimeFormat("pt-BR", {dateStyle: "short", timeZone: "UTC"});
  let snapshot;

  function validDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  }

  function validMarket(market, config, reviewed) {
    if (!market || !validDate(market.published_on) || market.published_on > reviewed) return false;
    const source = new URL(market.source_url);
    const text = value => typeof value === "string" && value.length > 0 && value.length <= 160;
    const metric = value => Number.isFinite(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER;
    return source.origin === `https://${config.host}` && !source.username && !source.password
      && market.trade_currency === config.currency && market.exchange_symbol === config.exchange
      && [market.source, market.value_basis, market.volume_unit, market.exchange, market.quote_currency].every(text)
      && Array.isArray(market.periods) && market.periods.length === 2
      && market.periods.every(period => text(period?.label) && metric(period.value_millions) && metric(period.volume_mt))
      && market.periods[0].label !== market.periods[1].label
      && Array.isArray(market.assets) && market.assets.length === 2
      && market.assets.every(asset => text(asset?.name) && typeof asset.symbol === "string" && /^[A-Z0-9]{1,8}$/.test(asset.symbol))
      && market.assets[0].symbol !== market.assets[1].symbol;
  }

  function element(tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  }

  function renderQuotes() {
    const active = toggle.getAttribute("aria-pressed") === "true";
    quote.hidden = !active;
    const container = get("quote-frame");
    container.replaceChildren();
    if (!active) return;
    const market = snapshot.countries[country.value];
    const symbols = market.assets.map(asset => [asset.name, `${market.exchange_symbol}:${asset.symbol}|1D`]);
    container.append(marketQuoteFrame(symbols, `Cotações com atraso pela TradingView · ${country.selectedOptions[0].text}`));
  }

  function render() {
    if (!Object.hasOwn(catalog, country.value)) country.value = "BR";
    const market = snapshot.countries[country.value];
    const config = catalog[country.value];
    const name = country.selectedOptions[0].text;
    const [previous, current] = market.periods;
    const variation = (current.value_millions - previous.value_millions) / previous.value_millions;
    const billions = value => `${config.money} ${number.format(value / 1000)} bi`;
    get("period").textContent = `${name} · ${current.label} · Total nacional publicado`;
    get("value").textContent = billions(current.value_millions);
    get("value-unit").textContent = `${market.trade_currency} · ${market.value_basis}`;
    get("volume").textContent = number.format(current.volume_mt);
    get("volume-unit").textContent = `milhões de ${market.volume_unit}`;
    get("change").textContent = percent.format(variation);
    get("change").dataset.change = Math.abs(variation) < .0005 ? "flat" : variation > 0 ? "gain" : "loss";
    get("change-period").textContent = `Ante ${previous.label}`;
    get("caption").textContent = `${name} · Exportações nacionais de minério de ferro`;
    get("money-col").textContent = `Milhões de ${market.trade_currency} (${market.value_basis})`;
    get("weight-col").textContent = `Milhões de ${market.volume_unit}`;
    get("rows").replaceChildren(...market.periods.map(period => {
      const row = document.createElement("tr");
      const label = element("th", period.label);
      label.scope = "row";
      row.append(label, element("td", number.format(period.value_millions)), element("td", number.format(period.volume_mt)));
      return row;
    }));
    const max = Math.max(previous.value_millions, current.value_millions);
    get("bars").replaceChildren(...market.periods.map(period => {
      const bar = document.createElement("div");
      bar.className = "markets-bar";
      const meter = document.createElement("meter");
      meter.max = max;
      meter.value = period.value_millions;
      bar.append(element("span", period.label), meter, element("strong", billions(period.value_millions)));
      return bar;
    }));
    get("source-date").textContent = `Publicação de ${date.format(new Date(market.published_on))} · Conferida em ${date.format(new Date(snapshot.reviewed_on))}`;
    get("source").textContent = market.source;
    get("source").href = market.source_url;
    get("stale").hidden = Date.now() - Date.parse(market.published_on) < config.maxAge * 86400000;
    get("exchange").textContent = `${market.exchange} · ${market.quote_currency}`;
    get("symbols").replaceChildren(...market.assets.map(asset => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `https://br.tradingview.com/symbols/${config.exchange}-${asset.symbol}/`;
      link.append(element("b", asset.symbol), element("span", asset.name));
      item.append(link);
      return item;
    }));
    renderQuotes();
    status.textContent = `${name} · 2 períodos de exportação · 2 ações selecionadas`;
  }

  async function load() {
    get("retry").hidden = true;
    status.textContent = "Carregando dados de mercado…";
    try {
      const response = await fetch("dados.json", {credentials: "omit", redirect: "error", cache: "no-store"});
      if (!response.ok) throw new Error("Snapshot indisponível");
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 16384) throw new Error("Snapshot excede o tamanho permitido");
      const data = JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes));
      if (data?.schema_version !== 1 || data.dataset_kind !== "public_markets_snapshot" || data.mineral !== "iron_ore"
          || !validDate(data.reviewed_on)
          || !Object.entries(catalog).every(([id, config]) => validMarket(data.countries?.[id], config, data.reviewed_on))) {
        throw new Error("Snapshot inválido");
      }
      snapshot = data;
      const requested = new URLSearchParams(location.search).get("pais");
      if (Object.hasOwn(catalog, requested)) country.value = requested;
      render();
      country.disabled = false;
      get("content").hidden = false;
    } catch {
      status.textContent = "Dados de mercado indisponíveis. Tente novamente.";
      get("retry").hidden = false;
    }
  }

  country.addEventListener("change", render);
  get("retry").addEventListener("click", load);
  toggle.addEventListener("click", () => {
    const show = toggle.getAttribute("aria-pressed") === "false";
    toggle.setAttribute("aria-pressed", String(show));
    renderQuotes();
  });
  load();
})();
