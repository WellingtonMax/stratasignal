(() => {
  "use strict";

  const get = id => document.getElementById(`world-gallium-${id}`);
  const panel = get("panel");
  const stages = {bauxite: "Bauxita e logística", alumina: "Refino de alumina", primary_recovery: "Recuperação de gálio",
    purification: "Purificação", semiconductors: "Compostos e semicondutores"};
  const statuses = {operation_documented: "Operação documentada", coverage_gap: "Lacuna no recorte",
    research_reported: "Pesquisa declarada", project_announced: "Projeto anunciado", application_documented: "Aplicação documentada"};
  const hosts = new Set(["www.hydro.com", "agenciadenoticias.bndes.gov.br", "www.riotinto.com", "www.canada.ca",
    "pubs.usgs.gov", "portal.if.usp.br", "www.gov.br", "www.wcoomd.org"]);
  let selection, catalog, reader, edition, source, loading = false, failed = false;

  function node(tag, text, className) {
    const item = document.createElement(tag);
    item.textContent = text;
    if (className) item.className = className;
    return item;
  }

  function sourceDate(value) {
    if (!value) return "data não informada";
    if (value.length === 4) return value;
    const date = new Date(value.length === 7 ? `${value}-01` : value);
    return new Intl.DateTimeFormat("pt-BR", {timeZone: "UTC",
      year: "numeric", month: value.length === 7 ? "long" : "2-digit",
      ...(value.length === 10 ? {day: "2-digit"} : {})}).format(date);
  }

  function safeSource(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" && hosts.has(parsed.host) && !parsed.username && !parsed.password;
    } catch {
      return false;
    }
  }

  function validDate(value) {
    if (value === null) return true;
    if (typeof value !== "string" || !/^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(value)) return false;
    const padded = value.length === 4 ? `${value}-01-01` : value.length === 7 ? `${value}-01` : value;
    const date = new Date(padded);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, value.length) === value;
  }

  function valid(data) {
    const text = value => typeof value === "string" && value.length > 0 && value.length <= 600;
    return data?.schema_version === 1 && data.dataset_kind === "public_documentary_evidence"
      && data.material === "gallium" && typeof data.reviewed_on === "string" && data.reviewed_on.length === 10
      && validDate(data.reviewed_on) && text(data.coverage)
      && data.sources && Object.keys(data.sources).length <= 20
      && Object.values(data.sources).every(item => text(item.publisher) && safeSource(item.url)
        && validDate(item.published_on) && validDate(item.updated_on))
      && Array.isArray(data.records) && data.records.length > 0 && data.records.length <= 40
      && new Set(data.records.map(item => item.id)).size === data.records.length
      && data.records.every(item => text(item.id) && Object.hasOwn(stages, item.stage) && Object.hasOwn(statuses, item.status)
        && ["place", "title", "summary", "limit"].every(key => text(item[key]))
        && validDate(item.reference_period)
        && Array.isArray(item.sources) && item.sources.length > 0 && item.sources.every(key => Object.hasOwn(data.sources, key)))
      && data.concentration?.scope === "world_primary_low_purity_gallium" && data.concentration.method === "published_estimate"
      && data.concentration.country === "CN" && Number.isFinite(data.concentration.share_percent)
      && data.concentration.share_percent >= 0 && data.concentration.share_percent <= 100
      && Number.isInteger(data.concentration.year) && Object.hasOwn(data.sources, data.concentration.source)
      && Array.isArray(data.brazil_supply) && data.brazil_supply.length === 2
      && data.brazil_supply.every(item => item.country === "BR" && ["primary_recovery", "purification"].includes(item.stage)
        && ["unavailable", "documented"].includes(item.status) && Array.isArray(item.evidence_ids)
        && item.evidence_ids.every(id => data.records.some(record => record.id === id)))
      && data.baci_context?.edition === catalog.release && data.baci_context.status === "group_only"
      && data.baci_context.classification?.code === "811292" && data.baci_context.classification.scope === "group"
      && data.baci_context.gallium_amounts === null && JSON.stringify(data.baci_context.years) === JSON.stringify(catalog.years);
  }

  function render() {
    panel.hidden = selection?.produto !== "811292";
    if (panel.hidden) return;
    get("body").hidden = !edition;
    get("retry").hidden = !failed;
    get("status").textContent = edition
      ? `${edition.records.length} evidências · Revisão em ${sourceDate(edition.reviewed_on)}`
      : failed ? "Evidências indisponíveis. Tente carregar novamente. A série comercial tem sua própria verificação."
      : "Carregando a edição documental do gálio…";
    if (!edition) return;
    get("scope").textContent = `${edition.coverage} País e fluxo selecionam a série comercial. Esta ficha conserva os casos documentais e seus períodos próprios.`;
    const concentration = edition.concentration;
    get("concentration").textContent = new Intl.NumberFormat("pt-BR").format(concentration.share_percent) + "%";
    get("concentration-scope").textContent = `China · parcela estimada da produção mundial de gálio primário de baixa pureza em ${concentration.year} · USGS.`;
    get("concentration-source").href = edition.sources[concentration.source].url;
    get("supply").replaceChildren(...edition.brazil_supply.map(item => {
      const block = node("div", "");
      block.append(node("dt", item.stage === "primary_recovery" ? "Recuperação comercial no Brasil" : "Purificação no Brasil"),
        node("dd", item.status === "unavailable" ? "Volume indisponível" : "Produção documentada"),
        node("p", item.status === "unavailable" ? "Falta observação compatível de produção nesta edição."
          : "Consulte as evidências e os períodos da atividade.", "markets-context"));
      return block;
    }));
    get("stages").replaceChildren(...Object.entries(stages).map(([key, label], index) => {
      const stage = node("li", "");
      stage.append(node("h3", `${index + 1}. ${label}`));
      for (const record of edition.records.filter(item => item.stage === key)) {
        const detail = document.createElement("details");
        const summary = node("summary", "");
        summary.append(node("span", statuses[record.status], `world-gallium-state ${record.status}`), node("span", record.title));
        detail.append(summary, node("p", `${record.place} · Referência ${sourceDate(record.reference_period)}`, "markets-context"),
          node("p", record.summary), node("p", record.limit, "markets-context"));
        const references = node("ul", "", "world-gallium-sources");
        for (const id of record.sources) {
          const citation = edition.sources[id];
          const item = node("li", "");
          const link = node("a", `${citation.publisher} · Publicação ${sourceDate(citation.published_on)}`, "markets-source");
          link.href = citation.url;
          item.append(link);
          if (citation.updated_on) item.append(node("small", `Atualização da fonte em ${sourceDate(citation.updated_on)}`));
          references.append(item);
        }
        detail.append(references);
        stage.append(detail);
      }
      return stage;
    }));
    get("edition-link").href = source.snapshot_url;
  }

  async function load() {
    loading = true;
    failed = false;
    render();
    try {
      const manifest = await reader("../source-manifest.json", 100_000);
      const descriptor = manifest?.markets_snapshot?.gallium_evidence;
      const match = /^mercados\/edicoes\/galio-([0-9a-f]{64})\.json$/.exec(descriptor?.path);
      if (!match || descriptor.sha256 !== match[1]) throw new Error("Edição documental inválida");
      const data = await reader(`../${descriptor.path}`, 64_000, descriptor.sha256);
      if (!valid(data) || descriptor.reviewed_on !== data.reviewed_on) throw new Error("Evidência inválida");
      edition = data;
      source = {snapshot_url: new URL(`../${descriptor.path}`, document.baseURI).href,
        sha256: descriptor.sha256, reviewed_on: descriptor.reviewed_on};
    } catch {
      failed = true;
    } finally {
      loading = false;
      render();
    }
  }

  get("retry").addEventListener("click", () => load());
  window.marketGallium = {
    update(context, worldCatalog, read) {
      selection = {...context};
      catalog = worldCatalog;
      reader = read;
      render();
      if (!panel.hidden && !edition && !loading && !failed) load();
    },
    slice() {
      if (selection?.produto !== "811292") return null;
      return edition ? {status: "available", source, edition}
        : {status: loading ? "loading" : "unavailable", source: null, edition: null};
    },
  };
})();
