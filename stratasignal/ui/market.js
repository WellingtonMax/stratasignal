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
  const addressFilters = {ncm: product, fluxo: flow};
  const query = new URLSearchParams(location.search);
  for (const [key, select] of Object.entries(addressFilters)) {
    const value = query.get(key);
    if (Array.from(select.options).some(option => option.value === value)) select.value = value;
  }
  const period = get("market-period");
  const country = get("market-country");
  const status = get("market-status");
  const retry = get("market-retry");
  const results = get("market-results");
  const reportPanel = get("market-report");
  const newsNotice = get("market-news-status");
  const newsRetry = get("market-news-retry");
  const newsList = get("market-news-items");
  const newsPeriod = get("market-news-period");
  const geographyContent = get("market-geo-content");
  const geographyStatus = get("market-geo-status");
  const geographyRows = get("market-geo-partners");
  const geographySource = get("market-geo-source");
  const svgNamespace = "http://www.w3.org/2000/svg";
  // Reviewed Comex Stat names matched to Natural Earth 5.1.1 Admin 0 label points,
  // rounded to tenths of a degree. Unknown names stay in the table and report.
  const partnerAnchors = new Map([
    ["Alemanha", [9.7, 51]], ["Angola", [18, -12.2]], ["Argentina", [-64.2, -33.5]],
    ["Bélgica", [4.8, 50.8]], ["Bolívia", [-64.6, -16.7]], ["Brasil", [-49.6, -12.1]],
    ["Canadá", [-101.9, 60.3]], ["Chile", [-72.3, -38.2]], ["China", [106.3, 32.5]],
    ["Colômbia", [-73.2, 3.4]], ["Congo, República Democrática", [23.5, -1.9]],
    ["Coreia do Sul", [128.1, 36.4]], ["Equador", [-78.2, -1.3]], ["Espanha", [-3.5, 40.1]],
    ["Estados Unidos", [-97.5, 39.5]], ["França", [2.6, 46.7]], ["Indonésia", [101.9, -1]],
    ["Japão", [138.4, 36.1]], ["México", [-102.3, 23.9]], ["Noruega", [9.7, 61.4]],
    ["Países Baixos (Holanda)", [5.6, 52.4]], ["Paraguai", [-60.1, -21.7]],
    ["Peru", [-72.9, -13]], ["Polônia", [19.5, 52]], ["Reino Unido", [-2.1, 54.4]],
    ["República Dominicana", [-70.7, 19.1]], ["Rússia", [44.7, 58.2]], ["Sérvia", [20.8, 44.2]],
    ["Tailândia", [101.1, 15.5]], ["Uruguai", [-56, -33]], ["Venezuela", [-64.6, 7.2]],
    ["África do Sul", [23.7, -29.7]], ["Índia", [79.4, 22.7]],
  ]);
  const newsSource = "Natural Resources Canada";
  const mdicSource = "MDIC · Brasil";
  const mdicFeed = get("market-news-mdic-feed").href;
  const mdicNovemberFeed = get("market-news-mdic-november-feed").href;
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
    const hash = value => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
    const feedCount = value => integer(value) && value <= 50;
    if (data?.schema_version !== 1 || data.dataset_kind !== "public_curated_news" || data.source !== newsSource ||
        !instant(data.feed_updated_at) || !instant(data.fetched_at) ||
        Date.parse(data.feed_updated_at) > Date.parse(data.fetched_at) ||
        !hash(data.feed_sha256) || !feedCount(data.feed_entries) ||
        !Array.isArray(data.items) || data.items.length > 100) {
      throw new Error("Invalid news snapshot");
    }
    const validMdic = (source, feed) => source && source.source === mdicSource && source.feed_url === feed &&
      source.feed_updated_at === null && instant(source.fetched_at) && hash(source.feed_sha256) && feedCount(source.feed_entries);
    const archives = data.mdic_archives === undefined ? [] : data.mdic_archives;
    if ((data.mdic !== undefined && !validMdic(data.mdic, mdicFeed)) ||
        !Array.isArray(archives) || archives.length > 1 ||
        !archives.every(source => validMdic(source, mdicNovemberFeed))) {
      throw new Error("Invalid MDIC news source");
    }
    const mdicSources = [data.mdic, ...archives].filter(Boolean);
    const canadaArticle = /^https:\/\/www\.canada\.ca\/en\/natural-resources-canada\/news\/\d{4}\/\d{2}\/[a-z0-9-]+\.html$/;
    const mdicArticle = (url, feed) => {
      if (!mdicSources.some(source => source.feed_url === feed)) return false;
      const prefix = feed.slice(0, -3);
      return url.startsWith(prefix) && /^[a-z0-9-]+$/.test(url.slice(prefix.length));
    };
    const text = (value, limit) => typeof value === "string" && value.trim() && value.length <= limit;
    const labels = list => Array.isArray(list) && list.length <= 8 && list.every(value => text(value, 100));
    const codes = new Set(Array.from(product.options, option => option.value));
    const seen = new Set();
    const items = data.items.map(item => {
      const mdicItem = item?.source_id === "mdic";
      const feed = item?.feed_url === undefined ? mdicFeed : item.feed_url;
      const related = item?.related_ncms;
      if (!item || !text(item.url, 300) || item.url !== item.url.trim() || seen.has(item.url) ||
          (mdicItem ? !mdicArticle(item.url, feed) :
            !canadaArticle.test(item.url) || item.source_id !== undefined || item.feed_url !== undefined) ||
          !text(item.title, 150) || !text(item.summary, 400) || !text(item.possible_impact, 400) ||
          !text(item.topic, 80) || !validDate(item.published_on) ||
          (item.event_on !== null && !validDate(item.event_on)) ||
          !codes.has(item.ncm) || !labels(item.countries) || !item.countries.length || !labels(item.companies) ||
          (related !== undefined && (!Array.isArray(related) || related.length >= codes.size ||
            new Set(related).size !== related.length || !related.every(code => code !== item.ncm && codes.has(code))))) {
        throw new Error("Invalid news entry");
      }
      seen.add(item.url);
      const {url, title, summary, possible_impact, topic, published_on, event_on, ncm, countries, companies, source_id,
        feed_url, related_ncms} = item;
      return {url, title, summary, possible_impact, topic, published_on, event_on, ncm, countries, companies, source_id,
        feed_url, related_ncms};
    });
    const brazilSources = mdicSources.map(source => ({
      name: mdicSource, feed_url: source.feed_url, feed_updated_at: null, fetched_at: source.fetched_at,
      feed_sha256: source.feed_sha256, feed_entries: source.feed_entries,
      curated_entries: items.filter(item => item.source_id === "mdic" && (item.feed_url ?? mdicFeed) === source.feed_url).length,
    }));
    const canadaCount = items.filter(item => item.source_id === undefined).length;
    if (brazilSources.some(source => source.curated_entries > source.feed_entries) || canadaCount > data.feed_entries) {
      throw new Error("Invalid news coverage");
    }
    return {...data, items, brazilSources, canadaCount};
  }

  function productFlow() {
    return snapshot.records.filter(row => row.ncm === product.value && row.flow === flow.value);
  }

  const matchesMineral = item => item.ncm === product.value || item.related_ncms?.includes(product.value);

  function refreshCountries() {
    const previous = country.value;
    const available = [...new Set(productFlow().map(row => row.country))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const mentioned = news?.items.filter(matchesMineral).flatMap(item => item.countries) ?? [];
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

  function summarizePartners(records) {
    const groups = new Map();
    for (const row of records) {
      if (!groups.has(row.country)) groups.set(row.country, []);
      groups.get(row.country).push(row);
    }
    return [...groups].map(([label, rows]) => ({
      label, ...summarize(rows), anchor: partnerAnchors.get(label),
    })).sort((a, b) => b.fob_usd - a.fob_usd || a.label.localeCompare(b.label, "pt-BR"));
  }

  function togglePartner(label) {
    country.value = country.value === label ? "" : label;
    render();
  }

  function renderRanking(partners) {
    const total = sum(partners, "fob_usd");
    const top = partners.slice(0, 5);
    get("market-ranking").replaceChildren(...top.map(({label, fob_usd: amount}) => {
      const item = element("li");
      const button = element("button");
      button.type = "button";
      button.setAttribute("aria-pressed", String(country.value === label));
      button.append(element("span", label), element("strong", money(amount)),
        element("small", total ? percent.format(amount / total) + " do valor FOB de todos os parceiros" : "Valor FOB total igual a zero"));
      button.addEventListener("click", () => {
        togglePartner(label);
        country.focus();
      });
      item.append(button);
      return item;
    }));
  }

  function mapPin({label, anchor: [lon, lat]}, selected) {
    const phi = lat * Math.PI / 180;
    const pin = document.createElementNS(svgNamespace, "circle");
    // The packaged Natural Earth outline uses a 1024 × 1024 Web Mercator world.
    pin.setAttribute("cx", 1024 * (lon + 180) / 360);
    pin.setAttribute("cy", 512 * (1 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / Math.PI));
    pin.setAttribute("r", selected ? "16" : "8");
    pin.setAttribute("class", selected ? "market-geo-pin selected" : "market-geo-pin");
    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = label;
    pin.append(title);
    return pin;
  }

  function renderGeography(partners, scope) {
    geographyContent.hidden = !partners.length;
    const mapped = partners.filter(partner => partner.anchor);
    geographyStatus.textContent = (partners.length ?
      digits.format(mapped.length) + " de " + digits.format(partners.length) + " parceiros no mapa" :
      "Nenhum parceiro com registros") + " · " + scope;
    const selected = partners.find(partner => partner.label === country.value);
    const pins = mapped.filter(partner => partner !== selected).map(partner => mapPin(partner, false));
    if (selected?.anchor) pins.push(mapPin(selected, true));
    get("market-geo-pins").replaceChildren(...pins);
    get("market-geo-selection").textContent = !country.value ? "Todos os parceiros do período." :
      country.value + (selected?.anchor ? " está destacado no mapa." :
        selected ? " tem registros na tabela e ainda não possui ponto no mapa." : " está sem registros no período.");
    get("market-geo-table-caption").textContent = scope;
    const focusedLabel = geographyRows.contains(document.activeElement) ? document.activeElement.value : null;
    let nextFocus;
    const rows = partners.map(({label, fob_usd, kg, anchor}) => {
      const row = element("tr");
      const header = element("th");
      header.scope = "row";
      const button = element("button", label);
      button.type = "button";
      button.value = label;
      button.className = "button secondary";
      button.setAttribute("aria-pressed", String(label === country.value));
      button.addEventListener("click", () => togglePartner(label));
      if (label === focusedLabel) nextFocus = button;
      header.append(button);
      if (!anchor) header.append(element("small", "Sem ponto no mapa"));
      row.append(header, element("td", digits.format(fob_usd)), element("td", digits.format(kg)));
      return row;
    });
    geographyRows.replaceChildren(...rows);
    nextFocus?.focus({preventScroll: true});
  }

  function reportGeography(partners) {
    const points = [], partnersWithoutAnchor = [];
    for (const {label, anchor} of partners) {
      if (anchor) points.push({country: label, longitude: anchor[0], latitude: anchor[1]});
      else partnersWithoutAnchor.push(label);
    }
    return {
      kind: "approximate_country_anchors",
      source: "Natural Earth · Admin 0 – Countries",
      source_url: geographySource.href,
      source_version: "5.1.1",
      scale: "1:110m",
      points,
      partners_without_anchor: partnersWithoutAnchor,
    };
  }

  const selectedMonths = () => period.value ? [period.value] : snapshot.months;
  const newsMonths = () => newsPeriod.value ? [newsPeriod.value] : selectedMonths();
  function relatedNews() {
    const months = newsMonths();
    return news?.items.filter(item => matchesMineral(item) && months.includes(item.published_on.slice(0, 7)) &&
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
    dates.append(item.source_id === "mdic" ? mdicSource : newsSource, " · Publicada em ", date);
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
    newsPeriod.disabled = !news || !snapshot;
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
    const scope = count + " · " + mineral + " · " + monthSpan(newsMonths()) + " · " + (country.value || "todos os países");
    if (newsNotice.textContent !== scope) newsNotice.textContent = scope;
    newsList.replaceChildren(...items.map(newsCard));
    newsList.hidden = !items.length;
  }

  function render() {
    const baciLink = get("market-baci-link");
    baciLink.hidden = product.value !== "25041000";
    if (!baciLink.hidden) {
      const query = new URLSearchParams({pais: "BR", produto: "250410", fluxo: flow.value});
      baciLink.href = `mercados/?${query}`;
    }
    const months = selectedMonths();
    const grouped = productFlow().filter(row => months.includes(row.month));
    const records = country.value ? grouped.filter(row => row.country === country.value) : grouped;
    const scopeBase = flow.selectedOptions[0].textContent + " · NCM " + product.value + " · " + monthSpan(months);
    const scope = scopeBase + " · " + (country.value || "todos os países");
    const partners = summarizePartners(grouped);
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
      partner_geography: reportGeography(partners.filter(partner => !country.value || partner.label === country.value)),
    };
    const quantity = records.length === 1 ? "1 registro agregado" : digits.format(records.length) + " registros agregados";
    status.textContent = (records.length ? quantity : "Nenhum registro neste recorte") + " · " + scope;
    results.hidden = records.length === 0;
    renderGeography(partners, scopeBase);
    renderNews();
    if (!records.length) return;
    get("market-fob").textContent = money(totals.fob_usd);
    get("market-kg").textContent = digits.format(totals.kg);
    get("market-partners").textContent = digits.format(totals.partner_count);
    renderSeries(monthly, scope);
    renderRanking(partners);
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
        coverage: news ? {feed_entries: news.feed_entries, curated_entries: news.canadaCount} : null,
        mdic_source: news?.brazilSources.find(source => source.feed_url === mdicFeed) ?? null,
        mdic_archives: news?.brazilSources.filter(source => source.feed_url !== mdicFeed) ?? [],
        filters: {
          ncm: product.value, months: newsMonths(), country: country.value || null,
          period_mode: newsPeriod.value ? "independent" : "trade_period",
          country_role: "mentioned", month_basis: "published_on", flow_applies: false,
        },
        items: stories,
      },
      limits: [
        "O relatório cobre o comércio exterior brasileiro por produto, fluxo, mês e país ou área parceira.",
        "Totais nulos indicam ausência de registros no recorte. Registros com valor zero são mantidos.",
        "Produção, dados empresariais, instalações e evidências geoespaciais não integram este recorte.",
        "As coordenadas são referências aproximadas de países parceiros. O mapa não identifica locais de extração, instalação ou rota de transporte.",
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
      coverage.textContent = newsSource + " · Curadoria de " + digits.format(news.canadaCount) + " entre " + digits.format(news.feed_entries) +
        " publicações do feed. Atualizado pela fonte em " + timestamp.format(new Date(news.feed_updated_at)) +
        " UTC. Consultado em " + timestamp.format(new Date(news.fetched_at)) + " UTC.";
      coverage.hidden = false;
      for (const source of news.brazilSources) {
        const isSeptember = source.feed_url === mdicFeed;
        const prefix = isSeptember ? "market-news-mdic" : "market-news-mdic-november";
        const month = isSeptember ? "2026-09" : "2026-11";
        const brazilCoverage = get(prefix + "-coverage");
        brazilCoverage.textContent = mdicSource + " · Curadoria de " + digits.format(source.curated_entries) + " entre " +
          digits.format(source.feed_entries) + " publicações do arquivo de " + monthName(month) + ". " +
          "Atualização do feed não informada. Consultado em " + timestamp.format(new Date(source.fetched_at)) + " UTC.";
        brazilCoverage.hidden = false;
        get(prefix + "-feed").hidden = false;
      }
      const oldest = Math.min(Date.parse(news.fetched_at), ...news.brazilSources.map(source => Date.parse(source.fetched_at)));
      get("market-news-stale").hidden = Date.now() - oldest <= 30 * 86400000;
      const months = [...new Set(news.items.map(item => item.published_on.slice(0, 7)))].sort().reverse();
      options(newsPeriod, "Mesmo período do comércio", months.map(month => [monthName(month), month]));
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
    geographyContent.hidden = true;
    geographyStatus.textContent = "Carregando parceiros do comércio…";
    status.textContent = "Carregando dados públicos…";
    try {
      ({data: snapshot, sha256: snapshotSha256} = await readSnapshot("comex.json", validate));
      get("market-through").textContent = monthName(snapshot.months.at(-1));
      get("market-updated").textContent = calendar.format(new Date(snapshot.updated_on));
      get("market-geo-updated").textContent = "Atualização do Comex Stat em " + get("market-updated").textContent + ".";
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
      geographyStatus.textContent = "Mapa indisponível enquanto a carga de comércio estiver indisponível.";
      retry.hidden = false;
    }
  }

  function saveFiltersToAddress() {
    const url = new URL(location.href);
    for (const [key, select] of Object.entries(addressFilters)) url.searchParams.set(key, select.value);
    history.replaceState(history.state, "", url);
  }

  for (const select of [product, flow]) select.addEventListener("change", () => {
    saveFiltersToAddress();
    refreshCountries();
    render();
  });
  for (const select of [period, country]) select.addEventListener("change", render);
  newsPeriod.addEventListener("change", renderNews);
  get("market-clear").addEventListener("click", () => {
    product.selectedIndex = flow.selectedIndex = period.selectedIndex = country.selectedIndex = newsPeriod.selectedIndex = 0;
    saveFiltersToAddress();
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
