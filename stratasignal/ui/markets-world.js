(() => {
  "use strict";

  const get = id => document.getElementById(`world-${id}`);
  const status = get("status");
  const countrySelect = get("country");
  const productSelect = get("product");
  const flowSelect = get("flow");
  const retry = get("retry");
  const number = new Intl.NumberFormat("pt-BR", {maximumFractionDigits: 2});
  const compact = new Intl.NumberFormat("pt-BR", {notation: "compact", maximumFractionDigits: 2});
  const percent = new Intl.NumberFormat("pt-BR", {style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero"});
  const dates = new Intl.DateTimeFormat("pt-BR", {dateStyle: "short", timeZone: "UTC"});
  const regions = new Intl.DisplayNames(["pt-BR"], {type: "region"});
  const collator = new Intl.Collator("pt-BR", {sensitivity: "base"});
  const defaults = {pais: "BR", produto: "2601", fluxo: "export"};
  const groupNames = {"26": "Minérios, concentrados e resíduos · HS 26", "25": "Minerais industriais · HS 25",
    "27": "Combustíveis minerais sólidos", "71": "Gemas e metais preciosos", "72": "Ferro e ferroligas",
    "74": "Cobre", "75": "Níquel", "76": "Alumínio", "78": "Chumbo", "79": "Zinco", "80": "Estanho",
    refinado: "Insumos refinados selecionados", hs6: "Detalhe de minérios e minerais industriais · HS6"};
  const flows = {export: "Exportações", import: "Importações"};
  const cache = new Map();
  let catalog, countries, products, venues;
  let selection = {...defaults};
  let tradeRequest = 0;
  let reportSlice;

  function element(tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  }

  function region(code) {
    return code === "WORLD" ? "Mundo" : regions.of(code);
  }

  function normalized(value) {
    return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
  }

  function validDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  }

  async function read(path, limit, expectedHash) {
    const response = await fetch(path, {credentials: "omit", redirect: "error", cache: "no-store"});
    if (!response.ok) throw new Error("Fonte indisponível");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > limit) throw new Error("Fonte excede o limite");
    if (expectedHash) {
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
      if (hash !== expectedHash) throw new Error("Arquivo comercial divergente");
    }
    return JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes));
  }

  function validCatalog(data) {
    return data?.schema_version === 2 && data.dataset_kind === "world_mineral_trade" && /^\d{6}$/.test(data.release)
      && validDate(data.published_on) && validDate(data.checked_on) && data.published_on <= data.checked_on
      && Array.isArray(data.years) && data.years.length === 3
      && data.years.every((year, index) => Number.isInteger(year) && year >= 2022 && year === data.years[0] + index)
      && Array.isArray(data.countries) && data.countries.length <= 260 && data.countries.includes("BR")
      && data.countries.every(code => typeof code === "string" && /^[A-Z]{2}$/.test(code))
      && new Set(data.countries).size === data.countries.length
      && data.products && Object.hasOwn(data.products, "2601") && Object.keys(data.products).length <= 250
      && Object.entries(data.products).every(([code, value]) => /^\d{4}(?:\d{2})?$/.test(code)
        && Array.isArray(value) && typeof value[0] === "string" && value[0].length <= 800
        && Object.hasOwn(groupNames, value[1]) && /^[0-9a-f]{64}$/.test(data.trade_sha256?.[code]))
      && Array.isArray(data.venues) && data.venues.length <= 2000
      && data.venues.every(row => Array.isArray(row) && data.countries.includes(row[0])
        && (row[0] === "BR" && row[1] === "BR-B3" || /^Q[1-9]\d{0,11}$/.test(row[1]))
        && typeof row[2] === "string" && row[2].length <= 240
        && Array.isArray(row[3]) && row[3].length > 0 && row[3].every(kind => ["ações", "commodities", "futuros"].includes(kind)));
  }

  function fillOptions(select, items, chosen, query, hint) {
    const filter = normalized(query);
    const matches = items.filter(({search}) => search.includes(filter));
    const groups = new Map();
    select.replaceChildren();
    if (!matches.some(({key}) => key === chosen)) {
      const active = items.find(({key}) => key === chosen);
      select.add(new Option(`${active.label} (seleção atual)`, active.key));
    }
    for (const {key, label, group} of matches) {
      const option = new Option(label, key);
      if (!group) {
        select.add(option);
        continue;
      }
      if (!groups.has(group)) {
        const container = document.createElement("optgroup");
        container.label = groupNames[group];
        groups.set(group, container);
        select.append(container);
      }
      groups.get(group).append(option);
    }
    select.value = chosen;
    hint.textContent = filter ? (matches.length ? `${matches.length} opções na busca` : "Sem opções para esta busca") : "";
  }

  function renderOptions() {
    fillOptions(countrySelect, countries, selection.pais, get("country-search").value, get("country-hint"));
    fillOptions(productSelect, products, selection.produto, get("product-search").value, get("product-hint"));
    flowSelect.value = selection.fluxo;
  }

  function renderVenue() {
    const option = get("venue").selectedOptions[0];
    if (!option) return;
    const venue = venues[Number(option.value)];
    get("venue-meta").textContent = `${region(venue[0])} · ${venue[3].join(", ")}`;
    const b3 = venue[1] === "BR-B3";
    get("venue-source").href = b3 ? "https://ri.b3.com.br/pt-br/b3/perfil/" : `https://www.wikidata.org/wiki/${venue[1]}`;
    get("venue-source").textContent = b3 ? "Consultar a B3" : `Consultar ${venue[2]} no Wikidata`;
  }

  function renderVenues() {
    const select = get("venue");
    const options = venues.flatMap(([country, , label], index) => selection.pais === "WORLD" || country === selection.pais
      ? [new Option(selection.pais === "WORLD" ? `${region(country)} · ${label}` : label, String(index))] : []);
    select.replaceChildren(...options);
    get("venue-controls").hidden = !options.length;
    get("venue-count").textContent = options.length
      ? `${options.length} ${options.length === 1 ? "registro" : "registros"} no catálogo · ${region(selection.pais)}`
      : `${region(selection.pais)} · Sem bolsa identificada neste catálogo`;
    renderVenue();
    const curated = ["BR", "AU"].includes(selection.pais);
    get("curated").hidden = !curated;
    if (curated) get("curated").href = `nacional.html?pais=${selection.pais}#markets-equity-title`;
  }

  function money(value) {
    return value === undefined ? "Sem registro" : `US$ ${compact.format(value)}`;
  }

  function renderSeries(series) {
    const slot = selection.fluxo === "export" ? 0 : 1;
    const years = catalog.years;
    const year = years.at(-1);
    const valueSlot = (years.length - 1) * 2 + slot;
    const periods = years.map((_, index) => series[selection.pais]?.[2 * index + slot]);
    const current = periods.at(-1);
    const previous = periods.at(-2);
    const empty = get("empty");
    empty.hidden = Boolean(current);
    empty.textContent = `Sem fluxo registrado para este recorte em ${year}. Confira os demais anos ou troque a seleção.`;
    get("trade").hidden = false;
    get("year").textContent = get("volume-year").textContent = year;
    get("value").textContent = money(current?.[0]);
    get("volume").textContent = current?.[1] == null ? "Indisponível" : compact.format(current[1] / 1000);
    get("volume-coverage").textContent = current && current[2] < current[3]
      ? `Toneladas · ${current[2]}/${current[3]} fluxos com peso` : "Toneladas métricas";
    const variation = previous?.[0] > 0 && current ? (current[0] - previous[0]) / previous[0] : null;
    get("change").textContent = variation === null ? "Indisponível" : percent.format(variation);
    get("change").dataset.change = variation > 0 ? "gain" : variation < 0 ? "loss" : "flat";
    get("change-period").textContent = `${years.at(-2)} → ${year}`;
    get("caption").textContent = get("selection").textContent;
    const max = Math.max(1, ...periods.map(cell => cell?.[0] ?? 0));
    get("bars").replaceChildren(...years.map((year, index) => {
      const bar = element("div", "");
      bar.className = "markets-bar";
      const value = periods[index]?.[0];
      const meter = document.createElement("meter");
      meter.max = max;
      meter.value = value ?? 0;
      bar.append(element("span", year), meter, element("strong", money(value)));
      return bar;
    }));
    get("rows").replaceChildren(...years.map((year, index) => {
      const cell = periods[index];
      const row = document.createElement("tr");
      const label = element("th", year);
      label.scope = "row";
      const weight = element("td", cell?.[1] == null ? "Indisponível" : number.format(cell[1] / 1000));
      if (cell && cell[2] < cell[3]) weight.append(element("small", ` ${cell[2]}/${cell[3]} com peso`));
      row.append(label, element("td", cell ? number.format(cell[0]) : "Sem registro"), weight);
      return row;
    }));
    const ranked = catalog.countries.filter(code => series[code]?.[valueSlot])
      .sort((left, right) => series[right][valueSlot][0] - series[left][valueSlot][0] || collator.compare(region(left), region(right)));
    const worldCurrent = series.WORLD?.[valueSlot];
    const share = current && worldCurrent?.[0] > 0 ? current[0] / worldCurrent[0] : null;
    const rank = selection.pais === "WORLD" ? null : ranked.indexOf(selection.pais) + 1 || null;
    get("share-year").textContent = get("position-year").textContent = year;
    get("share").textContent = selection.pais === "WORLD" && current ? "100%" : share === null ? "Indisponível" : percent.format(share);
    get("share-context").textContent = selection.pais === "WORLD" ? "Total mundial reconciliado" :
      share === null ? "País ou total mundial sem valor comparável" : money(current[0]) + " de " + money(worldCurrent[0]);
    get("position").textContent = selection.pais === "WORLD" ? "—" : rank === null ? "Indisponível" : number.format(rank) + "º";
    get("position-context").textContent = selection.pais === "WORLD" ? "Selecione um país ou território" :
      rank === null ? "Sem posição entre " + ranked.length + " áreas com registro" :
        "de " + number.format(ranked.length) + " países e territórios com registro";
    get("rank").hidden = !ranked.length;
    get("rank-meta").textContent = `${flows[selection.fluxo]} de ${year} · ${ranked.length} países e territórios com registro`;
    get("ranking").replaceChildren(...ranked.slice(0, 5).map(code => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.country = code;
      button.setAttribute("aria-pressed", String(code === selection.pais));
      button.append(element("span", region(code)), element("strong", money(series[code][valueSlot][0])));
      item.append(button);
      return item;
    }));
    reportSlice = {
      filters: {
        country_code: selection.pais,
        country: region(selection.pais),
        country_role: selection.pais === "WORLD" ? "world_total" : selection.fluxo === "export" ? "reporter_exporter" : "reporter_importer",
        hs_code: selection.produto,
        product: catalog.products[selection.produto][0],
        flow: selection.fluxo,
      },
      observations: years.map((year, index) => {
        const cell = periods[index];
        return cell ? {
          year,
          status: "observed",
          fob_usd: cell[0],
          net_weight_kg: cell[1],
          weight_coverage: {flows_with_weight: cell[2], total_flows: cell[3], status: cell[2] === cell[3] ? "complete" : "partial"},
        } : {year, status: "no_record", fob_usd: null, net_weight_kg: null, weight_coverage: null};
      }),
      ranking: {
        year,
        scope: `Países e territórios identificados com ${flows[selection.fluxo].toLowerCase()} registradas`,
        countries_with_record: ranked.length,
        top_five: ranked.slice(0, 5).map(code => ({country_code: code, country: region(code), fob_usd: series[code][valueSlot][0]})),
      },
      world_benchmark: {
        year,
        world_fob_usd: worldCurrent?.[0] ?? null,
        country_share: selection.pais === "WORLD" && current ? 1 : share,
        country_rank: rank,
        countries_with_record: ranked.length,
      },
    };
    get("download").disabled = false;
    get("download-status").textContent = "Relatório pronto para o recorte atual.";
    status.textContent = `${region(selection.pais)} · ${periods.filter(Boolean).length} de ${years.length} anos com registro`;
  }

  async function renderTrade() {
    const request = ++tradeRequest;
    const {pais, produto, fluxo} = selection;
    get("trade").hidden = get("rank").hidden = get("empty").hidden = retry.hidden = true;
    reportSlice = undefined;
    get("download").disabled = true;
    get("download-status").textContent = "Aguardando a série comercial do recorte.";
    get("selection").textContent = `${region(pais)} · ${flows[fluxo]} · ${catalog.products[produto][0]} · HS ${produto}`;
    status.textContent = "Carregando o recorte comercial…";
    try {
      if (!cache.has(produto)) {
        const data = await read(`comercio/${produto}.json`, 180_000, catalog.trade_sha256[produto]);
        const metric = value => Number.isSafeInteger(value) && value >= 0;
        if (data.code !== produto || !data.series || !Object.entries(data.series).every(([code, cells]) =>
          (code === "WORLD" || catalog.countries.includes(code)) && Array.isArray(cells) && cells.length === 2 * catalog.years.length
          && cells.every(cell => cell === null || Array.isArray(cell) && cell.length === 4 && metric(cell[0])
            && metric(cell[2]) && metric(cell[3]) && cell[3] > 0 && cell[2] <= cell[3]
            && (cell[2] > 0 ? metric(cell[1]) : cell[1] === null)))) {
          throw new Error("Série comercial inválida");
        }
        cache.set(produto, data.series);
      }
      if (request === tradeRequest) renderSeries(cache.get(produto));
    } catch {
      if (request !== tradeRequest) return;
      status.textContent = "Recorte comercial indisponível. O catálogo de bolsas continua disponível.";
      get("download-status").textContent = "Relatório indisponível porque a série comercial não pôde ser verificada.";
      retry.hidden = false;
    }
  }

  function downloadReport() {
    if (!catalog || !reportSlice) return;
    const countryVenues = venues.filter(([country]) => selection.pais === "WORLD" || country === selection.pais);
    const report = {
      report_type: "stratasignal_world_mineral_trade_slice",
      schema_version: 1,
      dataset_kind: catalog.dataset_kind,
      generated_at: new Date().toISOString(),
      source: {
        name: "CEPII BACI HS 2022",
        url: "https://www.international-economics.eu/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37",
        release: catalog.release,
        published_on: catalog.published_on,
        checked_on: catalog.checked_on,
        years: catalog.years,
        license: "Licence Ouverte 2.0",
        trade_shard_url: new URL(`comercio/${selection.produto}.json`, document.baseURI).href,
        trade_shard_sha256: catalog.trade_sha256[selection.produto],
        quality: "Fluxos bilaterais reconciliados e estimados em equivalente FOB pelo CEPII.",
      },
      units: {fob_usd: "USD correntes, equivalente FOB", net_weight_kg: "quilogramas de peso líquido disponível"},
      ...reportSlice,
      exchange_registry: {
        source: "Wikidata CC0, com perfil oficial da B3 no registro BR-B3",
        checked_on: catalog.checked_on,
        status: countryVenues.length ? "available" : "no_matches",
        records: countryVenues.map(([country, id, name, kinds]) => ({country_code: country, id, name, kinds})),
        note: "O cadastro auxilia a descoberta. Não comprova atividade atual, cobertura de ativos ou disponibilidade de cotação.",
      },
      interpretation: {
        observations: "Os valores e pesos anuais acima são agregados publicados no recorte selecionado.",
        inferences: [],
        predictions: [],
      },
      limits: [
        "Um código HS descreve mercadorias aduaneiras e não comprova espécie, teor, origem física ou etapa industrial.",
        "Recortes de família e detalhe HS são alternativas e não devem ser somados, pois podem duplicar comércio.",
        "Ausência de registro é uma lacuna da carga e não equivale a valor zero.",
        "Peso parcial soma somente fluxos com quantidade disponível.",
        "Cotações, preços de referência, produção, capitalização, empresas e instalações exigem fontes distintas e não integram este arquivo.",
      ],
    };
    const blob = new Blob([JSON.stringify(report, null, 2) + "\n"], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = element("a");
    link.href = url;
    link.download = `stratasignal-mercado-${selection.pais.toLowerCase()}-${selection.produto}-${selection.fluxo}.json`;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    get("download-status").textContent = "Relatório gerado com os filtros e a procedência do recorte atual.";
  }

  async function load() {
    retry.hidden = true;
    status.textContent = "Carregando o catálogo mundial…";
    try {
      const data = await read("catalogo.json", 300_000);
      if (!validCatalog(data)) throw new Error("Catálogo inválido");
      catalog = data;
      countries = [{key: "WORLD", label: "Mundo", search: "mundo world"}, ...data.countries.map(key => {
        const label = region(key);
        return {key, label, search: normalized(`${label} ${key}`)};
      }).sort((left, right) => collator.compare(left.label, right.label))];
      products = Object.entries(data.products).map(([key, [name, group]]) => ({
        key, label: `${name} · ${key}`, group, search: normalized(`${name} ${key}`),
      })).sort((left, right) => Object.keys(groupNames).indexOf(left.group) - Object.keys(groupNames).indexOf(right.group)
        || collator.compare(left.label, right.label));
      venues = [...data.venues].sort((left, right) => collator.compare(region(left[0]), region(right[0])) || collator.compare(left[2], right[2]));
      const query = new URLSearchParams(location.search);
      selection = {
        pais: countries.find(({key}) => key === query.get("pais"))?.key ?? defaults.pais,
        produto: Object.hasOwn(data.products, query.get("produto")) ? query.get("produto") : defaults.produto,
        fluxo: Object.hasOwn(flows, query.get("fluxo")) ? query.get("fluxo") : defaults.fluxo,
      };
      get("coverage").textContent = `${data.countries.length} países e territórios · ${products.length} recortes aduaneiros · ${new Set(venues.map(venue => venue[1])).size} bolsas e mercados no catálogo`;
      get("trade-date").textContent = `BACI ${data.release} · ${data.years[0]}–${data.years.at(-1)} · Edição de ${dates.format(new Date(data.published_on))}`;
      get("venues-date").textContent = `Wikidata · CC0 · Consulta de ${dates.format(new Date(data.checked_on))} UTC`;
      get("controls").disabled = false;
      get("content").hidden = false;
      renderOptions();
      renderVenues();
      await renderTrade();
    } catch {
      catalog = undefined;
      get("controls").disabled = true;
      get("content").hidden = true;
      status.textContent = "Catálogo mundial indisponível. Tente novamente ou abra as séries nacionais.";
      retry.hidden = false;
    }
  }

  function update(field, value) {
    selection[field] = value;
    history.replaceState(null, "", `?${new URLSearchParams(selection)}`);
    if (field === "pais") renderVenues();
    renderTrade();
  }

  function showQuote() {
    const ticker = get("ticker").value.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9_.-]{0,16}:[A-Z0-9][A-Z0-9_.!-]{0,26}$/.test(ticker)) {
      get("quote-status").textContent = "Informe o código no formato BOLSA:ATIVO, como BMFBOVESPA:VALE3.";
      get("ticker").focus();
      return;
    }
    get("quote").replaceChildren(marketQuoteFrame([[ticker, `${ticker}|1D`]], `Cotação da TradingView · ${ticker}`));
    get("quote").hidden = get("hide-quote").hidden = get("ticker-source").hidden = false;
    get("ticker-source").href = `https://br.tradingview.com/symbols/${encodeURIComponent(ticker.replace(":", "-"))}/`;
    get("quote-status").textContent = `Consulta enviada para ${ticker}. Confira no gráfico a moeda, a disponibilidade e o atraso.`;
  }

  countrySelect.addEventListener("change", () => update("pais", countrySelect.value));
  productSelect.addEventListener("change", () => update("produto", productSelect.value));
  flowSelect.addEventListener("change", () => update("fluxo", flowSelect.value));
  get("country-search").addEventListener("input", renderOptions);
  get("product-search").addEventListener("input", renderOptions);
  get("venue").addEventListener("change", renderVenue);
  get("reset").addEventListener("click", () => {
    selection = {...defaults};
    get("country-search").value = get("product-search").value = "";
    renderOptions();
    update("pais", selection.pais);
  });
  get("ranking").addEventListener("click", event => {
    const button = event.target.closest("button[data-country]");
    if (!button) return;
    get("country-search").value = "";
    update("pais", button.dataset.country);
    renderOptions();
    countrySelect.focus();
  });
  get("show-quote").addEventListener("click", showQuote);
  get("ticker").addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.isComposing) showQuote();
  });
  get("hide-quote").addEventListener("click", () => {
    get("quote").replaceChildren();
    get("quote").hidden = get("hide-quote").hidden = get("ticker-source").hidden = true;
    get("quote-status").textContent = "Cotação fechada.";
    get("show-quote").focus();
  });
  get("download").addEventListener("click", downloadReport);
  retry.addEventListener("click", () => catalog ? renderTrade() : load());
  load();
})();
