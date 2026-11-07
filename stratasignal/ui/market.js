"use strict";
(() => {
  const get = id => document.getElementById(id);
  const element = (tag, text) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const product = get("market-product");
  const flow = get("market-flow");
  const period = get("market-period");
  const country = get("market-country");
  const status = get("market-status");
  const retry = get("market-retry");
  const results = get("market-results");
  const digits = new Intl.NumberFormat("pt-BR");
  const percent = new Intl.NumberFormat("pt-BR", {style: "percent", maximumFractionDigits: 1});
  const calendar = new Intl.DateTimeFormat("pt-BR", {dateStyle: "long", timeZone: "UTC"});
  const monthFull = new Intl.DateTimeFormat("pt-BR", {month: "long", year: "numeric", timeZone: "UTC"});
  const monthShort = new Intl.DateTimeFormat("pt-BR", {month: "short", year: "2-digit", timeZone: "UTC"});
  const monthName = (value, formatter = monthFull) => formatter.format(new Date(value + "-01T00:00:00Z"));
  const money = value => "US$ " + digits.format(value);
  const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  const integer = value => Number.isSafeInteger(value) && value >= 0;
  const sum = (records, metric) => records.reduce((total, record) => total + record[metric], 0);
  const options = (select, defaultLabel, items) => {
    select.replaceChildren(new Option(defaultLabel, ""), ...items.map(([label, value]) => new Option(label, value)));
  };
  let snapshot;

  function validate(data) {
    const codes = new Set(Array.from(product.options, option => option.value));
    const flows = new Set(Array.from(flow.options, option => option.value));
    if (data?.schema_version !== 1 || data.dataset_kind !== "public_aggregate" ||
        !validDate(data.updated_on) || typeof data.fetched_at !== "string" || !Number.isFinite(Date.parse(data.fetched_at)) ||
        !Array.isArray(data.months) || data.months.length < 1 || data.months.length > 12 ||
        !data.months.every((value, index) => validDate(value + "-01") && (!index || value > data.months[index - 1])) ||
        !Array.isArray(data.records) || data.records.length > 4000) {
      throw new Error("Invalid trade snapshot");
    }
    const seen = new Set();
    for (const row of data.records) {
      if (!row || !codes.has(row.ncm) || !flows.has(row.flow) || !data.months.includes(row.month) ||
          typeof row.country !== "string" || !row.country.trim() || row.country.length > 100 ||
          !integer(row.fob_usd) || !integer(row.kg)) {
        throw new Error("Invalid trade record");
      }
      const key = JSON.stringify([row.ncm, row.flow, row.month, row.country.toLocaleLowerCase("pt-BR")]);
      if (seen.has(key)) throw new Error("Duplicate trade record");
      seen.add(key);
    }
    for (const selectedFlow of flows) {
      const records = data.records.filter(row => row.flow === selectedFlow);
      if (!integer(sum(records, "fob_usd")) || !integer(sum(records, "kg"))) {
        throw new Error("Invalid trade totals");
      }
    }
    return data;
  }

  function productFlow() {
    return snapshot.records.filter(row => row.ncm === product.value && row.flow === flow.value);
  }

  function refreshCountries() {
    const previous = country.value;
    const available = [...new Set(productFlow().map(row => row.country))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    options(country, "Todos os países", available.map(label => [label, label]));
    country.value = available.includes(previous) ? previous : "";
    get("market-country-label").textContent = flow.value === "import" ? "País de origem" : "País de destino";
  }

  function renderSeries(records, months, caption) {
    const series = months.map(value => {
      const matching = records.filter(row => row.month === value);
      return {month: value, hasData: matching.length > 0, usd: sum(matching, "fob_usd"), kg: sum(matching, "kg")};
    });
    const peak = Math.max(...series.map(row => row.usd));
    get("market-scale").textContent = "Escala de " + money(0) + " a " + money(peak) + " FOB";
    get("market-table-caption").textContent = caption;
    const bars = [];
    const table = [];
    for (const row of series) {
      const slot = element("li");
      slot.className = "market-bar-slot";
      slot.title = monthName(row.month) + " · " + (row.hasData ? money(row.usd) + " FOB" : "sem registros");
      const track = element("div");
      track.className = "market-track";
      const bar = element("span");
      bar.className = "market-bar";
      bar.style.setProperty("--bar-height", (peak ? row.usd / peak * 100 : 0) + "%");
      track.append(bar);
      const label = element("time", monthName(row.month, monthShort));
      label.dateTime = row.month;
      slot.append(track, label);
      bars.push(slot);
      const line = element("tr");
      const header = element("th", monthName(row.month));
      header.scope = "row";
      line.append(header, element("td", row.hasData ? digits.format(row.usd) : "Sem registros"),
        element("td", row.hasData ? digits.format(row.kg) : "—"));
      table.push(line);
    }
    get("market-bars").replaceChildren(...bars);
    get("market-monthly").replaceChildren(...table);
  }

  function renderRanking(records) {
    const totals = new Map();
    for (const row of records) totals.set(row.country, (totals.get(row.country) || 0) + row.fob_usd);
    const total = sum(records, "fob_usd");
    const top = [...totals].sort(([a, x], [b, y]) => y - x || a.localeCompare(b, "pt-BR")).slice(0, 5);
    get("market-ranking").replaceChildren(...top.map(([label, amount]) => {
      const item = element("li");
      const button = element("button");
      button.type = "button";
      button.setAttribute("aria-pressed", String(country.value === label));
      button.append(element("span", label), element("strong", money(amount)),
        element("small", total ? percent.format(amount / total) + " do valor FOB de todos os parceiros" : "Valor FOB total igual a zero"));
      button.addEventListener("click", () => {
        country.value = country.value === label ? "" : label;
        render();
        country.focus();
      });
      item.append(button);
      return item;
    }));
  }

  function render() {
    const months = period.value ? [period.value] : snapshot.months;
    const grouped = productFlow().filter(row => months.includes(row.month));
    const records = country.value ? grouped.filter(row => row.country === country.value) : grouped;
    const span = months.length === 1 ? monthName(months[0]) : monthName(months[0]) + " a " + monthName(months.at(-1));
    const scope = flow.selectedOptions[0].textContent + " · NCM " + product.value + " · " + span + " · " +
      (country.value || "todos os países");
    const quantity = records.length === 1 ? "1 registro agregado" : digits.format(records.length) + " registros agregados";
    status.textContent = (records.length ? quantity : "Nenhum registro neste recorte") + " · " + scope;
    results.hidden = records.length === 0;
    if (!records.length) return;
    get("market-fob").textContent = money(sum(records, "fob_usd"));
    get("market-kg").textContent = digits.format(sum(records, "kg"));
    get("market-partners").textContent = digits.format(new Set(records.map(row => row.country)).size);
    renderSeries(records, months, scope);
    renderRanking(grouped);
  }

  async function load() {
    const controls = get("market-controls");
    controls.disabled = true;
    retry.hidden = true;
    results.hidden = true;
    status.textContent = "Carregando dados públicos…";
    try {
      const response = await fetch("comex.json", {credentials: "omit", redirect: "error", cache: "no-store",
        signal: AbortSignal.timeout(10000)});
      if (!response.ok) throw new Error("Trade snapshot unavailable");
      snapshot = validate(await response.json());
      get("market-through").textContent = monthName(snapshot.months.at(-1));
      get("market-updated").textContent = calendar.format(new Date(snapshot.updated_on));
      get("market-retrieved").textContent = "Consulta do StrataSignal em " + calendar.format(new Date(snapshot.fetched_at)) + ".";
      get("market-stale").hidden = Date.now() - Date.parse(snapshot.updated_on) <= 45 * 86400000;
      options(period, "Todo o período", snapshot.months.map(value => [monthName(value), value]));
      refreshCountries();
      render();
      controls.disabled = false;
    } catch {
      get("market-retrieved").textContent = "Carga publicada indisponível.";
      status.textContent = "Não foi possível carregar o panorama. Tente novamente ou consulte o Comex Stat.";
      retry.hidden = false;
    }
  }

  for (const select of [product, flow]) select.addEventListener("change", () => {
    refreshCountries();
    render();
  });
  for (const select of [period, country]) select.addEventListener("change", render);
  get("market-clear").addEventListener("click", () => {
    product.selectedIndex = flow.selectedIndex = period.selectedIndex = country.selectedIndex = 0;
    refreshCountries();
    render();
    product.focus();
  });
  retry.addEventListener("click", load);
  load();
})();
