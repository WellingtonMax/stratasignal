"use strict";
(() => {
  const report = JSON.parse(document.getElementById("report-data").textContent);
  const $ = (id) => document.getElementById(id);
  const fmt = (n, digits = 0) => new Intl.NumberFormat("pt-BR", {maximumFractionDigits: digits}).format(n);
  const pct = (n) => n === null || n === undefined ? "Sem estimativa" : fmt(n * 100, 1) + "%";
  const node = (tag, text, className) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = String(text); if (className) e.className = className; return e; };
  const countryNames = {CN:"China",BR:"Brasil",MY:"Malásia",CL:"Chile",AR:"Argentina",AU:"Austrália",US:"Estados Unidos",CA:"Canadá",CD:"RD Congo",ID:"Indonésia",ZZ:"Desconhecida"};
  const countryName = (code) => countryNames[code] || code;
  const names = Object.fromEntries(report.materials.map(m => [m.material, m.name]));
  const synthetic = report.dataset_kind === "synthetic";
  $("cutoff").textContent = "CORTE · " + report.as_of.split("-").reverse().join("/");
  $("report-version").textContent = report.version;
  $("notice").textContent = synthetic ? "DEMONSTRAÇÃO · Fornecedores, preços, estoques e histórico são inteiramente fictícios. Resultados não comprovam desempenho comercial ou preditivo real." : "RELATÓRIO PRIVADO · Dados declarados pelo operador. Revise premissas, origem e qualidade dos registros antes de decidir.";
  document.querySelectorAll("nav button").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".view").forEach(view => { view.hidden = view.id !== button.dataset.view; });
    document.querySelectorAll("nav button").forEach(b => b.removeAttribute("aria-current"));
    button.setAttribute("aria-current", "page");
  }));
  const kpis = [
    ["Materiais em análise", report.materials.length, "Especificações técnicas distintas"],
    ["Posições de fornecimento", report.materials.reduce((n, m) => n + m.suppliers.length, 0), "Relações material / fornecedor"],
    ["Prioridade alta", report.materials.filter(m => m.priority === "alta").length, "Triagem operacional · regra v0.1"],
    ["Sinais para conferência", report.metadata_flags.length, "Metadados · sem juízo de autenticidade"]
  ];
  kpis.forEach(([label, value, caption]) => { const card = node("div", undefined, "kpi"); card.append(node("div", label, "kpi-label"), node("strong", value), node("small", caption)); $("kpis").append(card); });
  report.materials.forEach(m => {
    const option = node("option", m.name); option.value = m.material; $("material-select").append(option);
    const tr = node("tr"); tr.append(node("td", m.name));
    const td = node("td"); td.append(node("span", m.priority + " · " + m.priority_score, "pill " + (m.priority === "alta" ? "high" : m.priority === "moderada" ? "mid" : ""))); tr.append(td);
    [pct(m.top_origin_share), fmt(m.coverage_days, 1) + " dias", fmt(m.max_nominal_lead_days) + " dias", m.evidence_flags].forEach(v => tr.append(node("td", v)));
    $("materials-table").append(tr);
  });
  function origins() {
    const m = report.materials.find(m => m.material === $("material-select").value);
    $("origin-bars").replaceChildren();
    Object.entries(m.country_shares).sort((a,b) => b[1]-a[1]).forEach(([code, share]) => {
      const row = node("div", undefined, "origin-row"); const bar = node("progress"); bar.max = 1; bar.value = share; bar.setAttribute("aria-label", countryName(code) + ": " + pct(share));
      row.append(node("span", countryName(code)), bar, node("strong", pct(share))); $("origin-bars").append(row);
    });
  }
  $("material-select").addEventListener("change", origins); origins();
  report.materials.slice(0, 2).forEach((m, index) => { const action = node("div", undefined, "action"); action.append(node("strong", "0" + (index + 1) + " / " + m.name), node("span", m.actions[0])); $("next-actions").append(action); });
  const flagNames = {missing_evidence:"Evidência não fornecida",unknown_origin:"Origem desconhecida",origin_mismatch:"Origem declarada divergente",missing_issue_date:"Emissão não informada",issue_after_observation:"Emissão posterior à observação",expired_evidence:"Validade expirada",invalid_validity_window:"Janela de validade inconsistente",shared_fingerprint:"Mesmo hash em fornecedores distintos"};
  report.metadata_flags.forEach(f => { const tr = node("tr"); [flagNames[f.code] || f.code, names[f.material], f.supplier, f.evidence_id || "—"].forEach(v => tr.append(node("td", v))); $("evidence-table").append(tr); });
  if (!report.metadata_flags.length) { const tr = node("tr"); const td = node("td", "Nenhum sinal nas verificações implementadas."); td.colSpan = 4; tr.append(td); $("evidence-table").append(tr); }
  const countries = [...new Set(report.materials.flatMap(m => m.suppliers.map(s => s.origin_country)).concat(report.scenario.country))].sort();
  countries.forEach(code => { const option = node("option", countryName(code) + " (" + code + ")"); option.value = code; $("shock-country").append(option); });
  $("shock-country").value = countries.includes(report.scenario.country) ? report.scenario.country : countries[0];
  $("shock-days").value = report.scenario.duration_days;
  $("shock-reduction").value = report.scenario.reduction * 100;
  $("scenario-assumption").textContent = report.scenario.assumption;
  function simulate() {
    const country = $("shock-country").value; const duration = Number($("shock-days").value); const reduction = Number($("shock-reduction").value) / 100;
    $("days-value").textContent = duration + " dias"; $("reduction-value").textContent = pct(reduction);
    $("scenario-results").replaceChildren();
    report.materials.forEach(m => {
      const share = m.suppliers.filter(s => s.origin_country === country).reduce((n,s) => n+s.allocation_share,0);
      const gap = m.monthly_demand_kg / 30 * share * reduction;
      const uncovered = Math.max(0, gap * duration - m.stock_kg);
      const result = node("div", undefined, "scenario-result" + (uncovered === 0 ? " ok" : ""));
      result.append(node("h3", m.name), node("strong", fmt(uncovered, 1) + " kg"), node("small", "Demanda sem cobertura no cenário · origem responde por " + pct(share)));
      result.append(node("small", gap > 0 && uncovered > 0 ? "Estoque esgota no dia " + fmt(m.stock_kg / gap, 1) + ". Custo de referência do insumo faltante: US$ " + fmt(uncovered * m.weighted_unit_cost_usd, 2) + "." : "Estoque absorve a redução durante o período simulado."));
      $("scenario-results").append(result);
    });
  }
  ["shock-country","shock-days","shock-reduction"].forEach(id => $(id).addEventListener("input",simulate)); simulate();
  const model = report.delay_model;
  $("model-summary").append(node("span", model.status === "synthetic_demo" ? "MODELO EM DADOS SINTÉTICOS" : model.status === "experimental" ? "EXPERIMENTAL" : "ESTIMATIVAS NÃO PUBLICADAS", "pill"), node("p", model.reason));
  const metrics = model.evaluation;
  function metric(target, label, value) { const row = node("div", undefined, "metric-row"); row.append(node("span",label),node("strong",value)); target.append(row); }
  if (metrics) {
    [["Treino / teste temporal",metrics.train_orders + " / " + metrics.test_orders],["Corte do holdout",metrics.cutoff],["Brier do modelo (menor é melhor)",fmt(metrics.brier,5)],["Brier da referência",fmt(metrics.baseline_brier,5)],["AUC no holdout",fmt(metrics.roc_auc,3)]].forEach(([label,value]) => metric($("model-summary"),label,value));
    $("model-summary").append(node("p",metrics.calibration));
  }
  (model.predictions || []).forEach(p => { const tr = node("tr"); [names[p.material],p.supplier,pct(p.estimated_delay_probability),p.reason || (synthetic ? "Demonstração sintética" : "Experimental; validar localmente")].forEach(v => tr.append(node("td",v))); $("predictions-table").append(tr); });
  if (!(model.predictions || []).length) { const tr = node("tr"); const td = node("td",model.reason); td.colSpan = 4; tr.append(td); $("predictions-table").append(tr); }
  metric($("provenance"),"Natureza do conjunto",synthetic ? "Sintético" : "Declarado pelo cliente");
  metric($("provenance"),"Data de corte",report.as_of);
  $("provenance").append(node("p","SHA-256 do arquivo de entrada"),node("div",report.input_sha256,"inline-key"),node("p","Relatório sem conexões de rede. Hash identifica consistência; não atesta veracidade dos dados."));
  const market = report.market_context;
  if (market) {
    $("market-context").append(node("p",market.source + " · NCM " + market.ncm + " · " + market.flow + " · " + market.start + " a " + market.end));
    metric($("market-context"),"Quilogramas no fluxo selecionado",fmt(market.total_kg));
    metric($("market-context"),"HHI por país no fluxo brasileiro",market.country_hhi === null ? "Sem registros" : fmt(market.country_hhi));
    $("market-context").append(node("p",market.scope));
  } else {
    $("market-context").append(node("p","Nenhum arquivo público foi incorporado a este relatório. O adaptador local aceita o CSV oficial do Comex Stat por NCM e período; dados de demonstração não representam comércio real."));
  }
  $("download").addEventListener("click", () => { const blob = new Blob([JSON.stringify(report,null,2)], {type:"application/json"}); const url = URL.createObjectURL(blob); const a = node("a"); a.href = url; a.download = "stratasignal-analysis.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); });
})();
