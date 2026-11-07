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
  const reportPanel = get("market-report");
  const newsNotice = get("market-news-status");
  const newsRetry = get("market-news-retry");
  const newsList = get("market-news-items");
  const newsSource = "Natural Resources Canada";
  const digits = new Intl.NumberFormat("pt-BR");
  const percent = new Intl.NumberFormat("pt-BR", {style: "percent", maximumFractionDigits: 1});
  const calendar = new Intl.DateTimeFormat("pt-BR", {dateStyle: "long", timeZone: "UTC"});
  const timestamp = new Intl.DateTimeFormat("pt-BR", {dateStyle: "medium", timeStyle: "short", timeZone: "UTC"});
  const monthFull = new Intl.DateTimeFormat("pt-BR", {month: "long", year: "numeric", timeZone: "UTC"});
  const monthShort = new Intl.DateTimeFormat("pt-BR", {month: "short", year: "2-digit", timeZone: "UTC"});
  const monthName = (value, formatter = monthFull) => formatter.format(new Date(value + "-01T00:00:00Z"));
  const monthSpan = months => months.length === 1 ? monthName(months[0]) :
    monthName(months[0]) + " a " + monthName(months.at(-1));
  const money = value => "US$ " + digits.format(value);
  const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  const integer = value => Number.isSafeInteger(value) && value >= 0;
  const sum = (records, metric) => records.reduce((total, record) => total + record[metric], 0);
  const options = (select, defaultLabel, items) => {
    select.replaceChildren(new Option(defaultLabel, ""), ...items.map(([label, value]) => new Option(label, value)));
  };
  let snapshot, snapshotSha256, reportSlice;
  let news, newsSha256;
  let newsState = "loading";

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

  function validateNews(data) {
    const instant = value => typeof value === "string" && Number.isFinite(Date.parse(value));
    if (data?.schema_version !== 1 || data.dataset_kind !== "public_curated_news" || data.source !== newsSource ||
        !instant(data.feed_updated_at) || !instant(data.fetched_at) ||
        Date.parse(data.feed_updated_at) > Date.parse(data.fetched_at) ||
        typeof data.feed_sha256 !== "string" || !/^[0-9a-f]{64}$/.test(data.feed_sha256) ||
        !integer(data.feed_entries) || data.feed_entries > 50 ||
        !Array.isArray(data.items) || data.items.length > data.feed_entries) {
      throw new Error("Invalid news snapshot");
    }
    const article = /^https:\/\/www\.canada\.ca\/en\/natural-resources-canada\/news\/\d{4}\/\d{2}\/[a-z0-9-]+\.html$/;
    const text = (value, limit) => typeof value === "string" && value.trim() && value.length <= limit;
    const labels = list => Array.isArray(list) && list.length <= 8 && list.every(value => text(value, 100));
    const codes = new Set(Array.from(product.options, option => option.value));
    const seen = new Set();
    const items = data.items.map(item => {
      if (!item || !text(item.url, 300) || item.url !== item.url.trim() || !article.test(item.url) || seen.has(item.url) ||
          !text(item.title, 150) || !text(item.summary, 400) || !text(item.possible_impact, 400) ||
          !text(item.topic, 80) || !validDate(item.published_on) ||
          (item.event_on !== null && !validDate(item.event_on)) ||
          !codes.has(item.ncm) || !labels(item.countries) || !item.countries.length || !labels(item.companies)) {
        throw new Error("Invalid news entry");
      }
      seen.add(item.url);
      const {url, title, summary, possible_impact, topic, published_on, event_on, ncm, countries, companies} = item;
      return {url, title, summary, possible_impact, topic, published_on, event_on, ncm, countries, companies};
    });
    return {...data, items};
  }

  function productFlow() {
    return snapshot.records.filter(row => row.ncm === product.value && row.flow === flow.value);
  }

  function refreshCountries() {
    const previous = country.value;
    const available = [...new Set(productFlow().map(row => row.country))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const mentioned = news?.items.filter(item => item.ncm === product.value).flatMap(item => item.countries) ?? [];
    const extra = [...new Set(mentioned)].filter(label => !available.includes(label)).sort((a, b) => a.localeCompare(b, "pt-BR"));
    options(country, "Todos os países", available.map(label => [label, label]));
    if (extra.length) {
      const group = element("optgroup");
      group.label = "Países citados nas notícias";
      group.append(...extra.map(label => new Option(label, label)));
      country.append(group);
    }
    country.value = available.includes(previous) || extra.includes(previous) ? previous : "";
    get("market-country-label").textContent = flow.value === "import" ? "País de origem" : "País de destino";
  }

  function summarize(records) {
    return {
      record_count: records.length,
      fob_usd: records.length ? sum(records, "fob_usd") : null,
      kg: records.length ? sum(records, "kg") : null,
    };
  }

  function renderSeries(series, caption) {
    const peak = Math.max(...series.map(row => row.fob_usd ?? 0));
    get("market-scale").textContent = "Escala de " + money(0) + " a " + money(peak) + " FOB";
    get("market-table-caption").textContent = caption;
    const bars = [];
    const table = [];
    for (const row of series) {
      const slot = element("li");
      slot.className = "market-bar-slot";
      slot.title = monthName(row.month) + " · " + (row.record_count ? money(row.fob_usd) + " FOB" : "sem registros");
      const track = element("div");
      track.className = "market-track";
      const bar = element("span");
      bar.className = "market-bar";
      bar.style.setProperty("--bar-height", (peak ? (row.fob_usd ?? 0) / peak * 100 : 0) + "%");
      track.append(bar);
      const label = element("time", monthName(row.month, monthShort));
      label.dateTime = row.month;
      slot.append(track, label);
      bars.push(slot);
      const line = element("tr");
      const header = element("th", monthName(row.month));
      header.scope = "row";
      line.append(header, element("td", row.record_count ? digits.format(row.fob_usd) : "Sem registros"),
        element("td", row.record_count ? digits.format(row.kg) : "—"));
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

  const selectedMonths = () => period.value ? [period.value] : snapshot.months;
  function relatedNews() {
    const months = selectedMonths();
    return news?.items.filter(item => item.ncm === product.value && months.includes(item.published_on.slice(0, 7)) &&
      (!country.value || item.countries.includes(country.value))) ?? [];
  }

  function newsCard(item) {
    const card = element("li");
    card.className = "card";
    const topic = element("p", item.topic + " · " + item.countries.join(", "));
    topic.className = "eyebrow";
    const date = element("time", calendar.format(new Date(item.published_on)));
    date.dateTime = item.published_on;
    const dates = element("p");
    dates.className = "market-news-meta";
    dates.append("Publicada em ", date);
    if (item.event_on) {
      const event = element("time", calendar.format(new Date(item.event_on)));
      event.dateTime = item.event_on;
      dates.append(" · Evento em ", event);
    } else {
      dates.append(" · Data exata do evento não informada");
    }
    const impact = element("p");
    impact.className = "market-news-impact";
    impact.append(element("strong", "Possível impacto"), item.possible_impact);
    const link = element("a", "Ler publicação original ↗");
    link.className = "market-news-link";
    link.href = item.url;
    link.setAttribute("aria-label", "Ler publicação original sobre " + item.title);
    card.append(topic, element("h3", item.title), dates, element("p", item.summary));
    if (item.companies.length) {
      const companies = element("p", "Empresas citadas · " + item.companies.join(", "));
      companies.className = "market-news-meta";
      card.append(companies);
    }
    card.append(impact, link);
    return card;
  }

  function renderNews() {
    if (!news || !snapshot) {
      newsList.hidden = true;
      newsNotice.textContent = newsState === "unavailable" ? "A carga publicada de notícias está indisponível." :
        newsState === "loading" ? "Carregando notícias…" : "Aguardando o recorte de comércio para filtrar as notícias.";
      return;
    }
    const items = relatedNews();
    const mineral = product.selectedOptions[0].dataset.mineral;
    const count = items.length ? items.length + (items.length === 1 ? " publicação" : " publicações") :
      "Nenhuma notícia da curadoria neste recorte";
    const scope = count + " · " + mineral + " · " + monthSpan(selectedMonths()) + " · " + (country.value || "todos os países");
    if (newsNotice.textContent !== scope) newsNotice.textContent = scope;
    newsList.replaceChildren(...items.map(newsCard));
    newsList.hidden = !items.length;
  }

  function render() {
    const months = selectedMonths();
    const grouped = productFlow().filter(row => months.includes(row.month));
    const records = country.value ? grouped.filter(row => row.country === country.value) : grouped;
    const span = monthSpan(months);
    const scope = flow.selectedOptions[0].textContent + " · NCM " + product.value + " · " + span + " · " +
      (country.value || "todos os países");
    const totals = {...summarize(records), partner_count: new Set(records.map(row => row.country)).size};
    const monthly = months.map(month => ({month, ...summarize(records.filter(row => row.month === month))}));
    reportSlice = {
      filters: {
        ncm: product.value, product: product.selectedOptions[0].textContent, flow: flow.value,
        period: period.value || null, country: country.value || null,
        country_role: flow.value === "import" ? "origin" : "destination",
      },
      months,
      totals,
      monthly,
      records,
    };
    const quantity = records.length === 1 ? "1 registro agregado" : digits.format(records.length) + " registros agregados";
    status.textContent = (records.length ? quantity : "Nenhum registro neste recorte") + " · " + scope;
    results.hidden = records.length === 0;
    renderNews();
    if (!records.length) return;
    get("market-fob").textContent = money(totals.fob_usd);
    get("market-kg").textContent = digits.format(totals.kg);
    get("market-partners").textContent = digits.format(totals.partner_count);
    renderSeries(monthly, scope);
    renderRanking(grouped);
  }

  function downloadReport() {
    const stories = relatedNews();
    const report = {
      report_type: "stratasignal_comex_slice",
      schema_version: 1,
      dataset_kind: snapshot.dataset_kind,
      generated_at: new Date().toISOString(),
      source: {
        name: "Comex Stat · SECEX/MDIC",
        url: "https://comexstat.mdic.gov.br/pt/home",
        updated_on: snapshot.updated_on,
        fetched_at: snapshot.fetched_at,
        snapshot_url: new URL("comex.json", document.baseURI).href,
        snapshot_sha256: snapshotSha256,
        quality: "Estatísticas aduaneiras agregadas sujeitas a revisão pela fonte.",
      },
      units: {fob_usd: "USD FOB correntes", kg: "quilogramas de peso líquido"},
      ...reportSlice,
      records: reportSlice.records.map(({month, ncm, country, flow, fob_usd, kg}) => ({
        month, ncm, country, flow, fob_usd, kg,
      })),
      news_context: {
        status: news ? (stories.length ? "available" : "no_matches") : newsState,
        dataset_kind: "public_curated_news",
        source: {
          name: newsSource,
          catalog_url: get("market-news-feed").href,
          snapshot_url: new URL("news.json", document.baseURI).href,
          snapshot_sha256: newsSha256 ?? null,
          feed_sha256: news?.feed_sha256 ?? null,
          feed_updated_at: news?.feed_updated_at ?? null,
          fetched_at: news?.fetched_at ?? null,
          quality: "Comunicados governamentais com curadoria editorial. Possíveis impactos são hipóteses qualitativas.",
        },
        coverage: news ? {feed_entries: news.feed_entries, curated_entries: news.items.length} : null,
        filters: {
          ncm: product.value, months: reportSlice.months, country: country.value || null,
          country_role: "mentioned", month_basis: "published_on", flow_applies: false,
        },
        items: stories,
      },
      limits: [
        "O relatório cobre o comércio exterior brasileiro por produto, fluxo, mês e país ou área parceira.",
        "Totais nulos indicam ausência de registros no recorte. Registros com valor zero são mantidos.",
        "Produção, dados empresariais, instalações e evidências geoespaciais não integram este recorte.",
        "As notícias dão contexto temático por mineral e não demonstram vínculos com transações ou códigos aduaneiros.",
      ],
    };
    const blob = new Blob([JSON.stringify(report, null, 2) + "\n"], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = element("a");
    link.href = url;
    link.download = "stratasignal-comex-" + report.filters.ncm + "-" + report.filters.flow + ".json";
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function readSnapshot(path, validateSnapshot) {
    const response = await fetch(path, {credentials: "omit", redirect: "error", cache: "no-store",
      signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error("Snapshot unavailable");
    const bytes = await response.arrayBuffer();
    const data = validateSnapshot(JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes)));
    const digest = crypto.subtle ? await crypto.subtle.digest("SHA-256", bytes) : null;
    const sha256 = digest && Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    return {data, sha256};
  }

  async function loadNews() {
    newsRetry.hidden = true;
    newsState = "loading";
    renderNews();
    try {
      ({data: news, sha256: newsSha256} = await readSnapshot("news.json", validateNews));
      newsState = "available";
      const coverage = get("market-news-coverage");
      coverage.textContent = "Curadoria de " + digits.format(news.items.length) + " entre " + digits.format(news.feed_entries) +
        " publicações do feed. Atualizado pela fonte em " + timestamp.format(new Date(news.feed_updated_at)) +
        " UTC. Consultado em " + timestamp.format(new Date(news.fetched_at)) + " UTC.";
      coverage.hidden = false;
      get("market-news-stale").hidden = Date.now() - Date.parse(news.fetched_at) <= 30 * 86400000;
      if (snapshot) refreshCountries();
    } catch {
      newsState = "unavailable";
      newsRetry.hidden = false;
    }
    renderNews();
  }

  async function load() {
    const controls = get("market-controls");
    controls.disabled = true;
    retry.hidden = true;
    results.hidden = true;
    reportPanel.hidden = true;
    status.textContent = "Carregando dados públicos…";
    try {
      ({data: snapshot, sha256: snapshotSha256} = await readSnapshot("comex.json", validate));
      get("market-through").textContent = monthName(snapshot.months.at(-1));
      get("market-updated").textContent = calendar.format(new Date(snapshot.updated_on));
      get("market-retrieved").textContent = "Consulta do StrataSignal em " + calendar.format(new Date(snapshot.fetched_at)) + ".";
      get("market-stale").hidden = Date.now() - Date.parse(snapshot.updated_on) <= 45 * 86400000;
      options(period, "Todo o período", snapshot.months.map(value => [monthName(value), value]));
      refreshCountries();
      render();
      controls.disabled = false;
      reportPanel.hidden = false;
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
  get("market-download").addEventListener("click", downloadReport);
  retry.addEventListener("click", load);
  newsRetry.addEventListener("click", loadNews);
  load();
  loadNews();
})();
