"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const mode = document.body.dataset.mode;
  const isDemo = mode === "demo";
  const node = (tag,text,className) => { const e=document.createElement(tag); if(text!==undefined)e.textContent=String(text); if(className)e.className=className; return e; };
  const fmt = (n,digits=0) => new Intl.NumberFormat("pt-BR",{maximumFractionDigits:digits}).format(n);
  const pct = n => n===null||n===undefined ? "Sem estimativa" : fmt(n*100,1)+"%";
  const clone = value => JSON.parse(JSON.stringify(value));
  const countries = {CN:"China",BR:"Brasil",MY:"Malásia",CL:"Chile",AR:"Argentina",AU:"Austrália",US:"Estados Unidos",CA:"Canadá",CD:"RD Congo",ID:"Indonésia",ZZ:"Desconhecida"};
  const countryName = code => countries[code] || code;
  const flagNames = {missing_evidence:"Evidência não fornecida",unknown_origin:"Origem desconhecida",origin_mismatch:"Origem declarada divergente",missing_issue_date:"Emissão não informada",issue_after_observation:"Emissão posterior à observação",expired_evidence:"Validade expirada",invalid_validity_window:"Janela de validade inconsistente",shared_fingerprint:"Mesmo hash em fornecedores distintos"};
  const labels = {material:"Código da especificação",material_name:"Nome da especificação",supplier:"Código do fornecedor",origin_country:"Origem declarada · duas letras",allocation_share:"Participação do fornecedor",monthly_demand_kg:"Demanda mensal · kg",stock_kg:"Estoque atual · kg",nominal_lead_days:"Prazo nominal · dias",unit_cost_usd:"Custo · USD/kg",id:"Identificador do registro",ordered_on:"Data do pedido",promised_on:"Data prometida",received_on:"Data recebida",quantity_kg:"Quantidade · kg",observed_on:"Data de observação",issued_on:"Data de emissão",expires_on:"Data de validade",sha256:"SHA-256 do documento"};
  const aliases = {material:["sku","codigo_material","material_id"],material_name:["nome_material","especificacao"],supplier:["fornecedor_id","codigo_fornecedor"],origin_country:["pais_origem","origem"],allocation_share:["participacao","alocacao"],monthly_demand_kg:["demanda_mensal_kg"],stock_kg:["estoque_kg"],nominal_lead_days:["prazo_dias"],unit_cost_usd:["custo_usd_kg"],ordered_on:["data_pedido"],promised_on:["data_prometida"],received_on:["data_recebida"],quantity_kg:["quantidade_kg"],observed_on:["data_observacao"],issued_on:["data_emissao"],expires_on:["data_validade"]};
  let status={current:null,previous:null,report_ready:false,ml_available:true},report=null,review=null,pending=false,activeJobId=null;
  const csvSources = Object.create(null);

  function switchView(view) {
    if(!["import","overview","intelligence","scenario","comparison","exports"].includes(view))return;
    document.querySelectorAll(".view").forEach(e=>{e.hidden=e.id!=="view-"+view;});
    document.querySelectorAll("nav [data-view]").forEach(e=>{if(e.dataset.view===view)e.setAttribute("aria-current","page");else e.removeAttribute("aria-current");});
    if(view==="overview")window.StrataGeo?.refresh();
  }
  function notice(message,error=false) {
    $("feedback").hidden=true;$("error").hidden=true;
    const target=$(error?"error":"feedback");target.textContent=message;target.hidden=false;
  }
  function controls() {
    document.querySelectorAll("[data-mutates]").forEach(e=>{e.disabled=pending;});
    $("cancel-analysis").hidden=!activeJobId;
    document.querySelectorAll("input[type=file]").forEach(e=>{e.disabled=pending||isDemo;});
    ["analyze","analyze-comparison"].forEach(id=>{$(id).disabled=pending||!status.current;});
    $("simulate").disabled=pending||!report;
    document.querySelectorAll(".export-action").forEach(e=>{e.disabled=pending||(e.dataset.kind==="input"?!status.current:!report);});
    $("import-json").disabled=pending||isDemo;
    $("import-csv").disabled=pending||isDemo;
    $("import-previous").disabled=pending||isDemo||!status.current;
    $("compare-previous").disabled=pending||!status.previous;
    if(!status.previous)$("compare-previous").checked=false;
    $("use-ml").disabled=pending||!status.ml_available;
    if(!status.ml_available)$("use-ml").checked=false;
  }
  async function task(message,fn) {
    if(pending)return;
    pending=true;$("busy-label").textContent=message;$("busy").hidden=false;$("error").hidden=true;controls();
    try { await fn(); } catch(error) { notice(error instanceof Error?error.message:"Não foi possível concluir a operação.",error.name!=="AbortError"); }
    finally {pending=false;$("busy").hidden=true;controls();}
  }
  const metric=(target,label,value)=>{const e=node("div",undefined,"metric-row");e.append(node("span",label),node("strong",value));target.append(e);};
  function updateStatus(value) {
    status=value;
    $("app-version").textContent="STRATASIGNAL / "+value.version;
    $("data-badge").textContent=!value.current?"Nenhum conjunto":value.current.dataset_kind==="synthetic"?"Dados fictícios":"Dados declarados";
    $("data-badge").className="badge "+(!value.current?"neutral":value.current.dataset_kind==="synthetic"?"demo":"client");
    $("current-date").textContent=value.current?"CORTE · "+value.current.as_of.split("-").reverse().join("/"):"Aguardando dados";
    $("previous-status").textContent=value.previous?"Base carregada: "+value.previous.as_of+" · carteira "+(value.previous.portfolio_id||"sem identificação"):"Nenhuma base anterior selecionada.";
    if(!value.report_ready){report=null;renderReport();}
    controls();
  }
  function renderReview(value) {
    review=value;$("review-empty").hidden=!!value;$("review-content").hidden=!value;
    const target=$("review-content");target.replaceChildren();
    if(!value)return;
    const s=value.summary;
    metric(target,"Carteira",s.portfolio_id||"Sem código para comparar períodos");metric(target,"Especificações / posições",s.materials+" / "+s.positions);
    metric(target,"Pedidos / evidências",s.orders+" / "+s.evidence);metric(target,"Sinais documentais",value.metadata_flags.length);
    target.append(node("p","Prévia das posições carregadas","mapping-note"));
    value.positions.slice(0,3).forEach(p=>{const e=node("div",undefined,"signal-item");e.append(node("strong",p.material_name),node("span",p.supplier+" · "+countryName(p.origin_country)+" · "+pct(p.allocation_share)+" · estoque "+fmt(p.stock_kg,1)+" kg"));target.append(e);});
    const list=node("ul",undefined,"review-list");value.notes.forEach(text=>list.append(node("li",text)));target.append(list);
  }

  function localAdapter() {
    const token=new URLSearchParams(location.hash.slice(1)).get("access");
    const validToken=typeof token==="string"&&/^[A-Za-z0-9_-]{32,128}$/.test(token)&&location.hostname==="127.0.0.1";
    async function request(path,data,raw=false) {
      if(!validToken)throw new Error("Abra o painel pelo endereço completo mostrado ao iniciar o StrataSignal nesta máquina.");
      if(!/^\/api\/[a-z0-9/-]+$/.test(path))throw new Error("Operação local inválida.");
      const headers={"Authorization":"Bearer "+token};
      const options={method:data===undefined?"GET":"POST",headers,credentials:"omit",cache:"no-store",redirect:"error"};
      if(data!==undefined){headers["Content-Type"]="application/json";options.body=JSON.stringify(data);}
      const response=await fetch(path,options);
      if(!response.ok){let message="Não foi possível concluir a operação local.";try{message=(await response.json()).error||message;}catch{}throw new Error(message);}
      return raw?response.blob():response.json();
    }
    return {status:async()=> (await request("/api/status")).status,
      demo:()=>request("/api/demo",{with_previous:true}),
      preview:payload=>request("/api/preview-csv",payload),
      import:payload=>request("/api/import",payload),
      analyze:async payload=>{
        const start=await request("/api/analyze",payload);
        if(!/^[0-9a-f]{32}$/.test(start.job?.id))throw new Error("Resposta de análise inválida.");
        activeJobId=start.job.id;controls();const deadline=Date.now()+95000;
        try{while(Date.now()<deadline){const result=await request("/api/jobs/"+activeJobId);if(result.job.state==="succeeded"&&result.report)return result;if(["cancelled","stale"].includes(result.job.state)){const error=new Error("Análise cancelada ou substituída. O último resultado válido foi preservado.");error.name="AbortError";throw error;}if(["failed","timed_out"].includes(result.job.state))throw new Error(result.job.error||"Não foi possível concluir a análise isolada.");$("busy-label").textContent="Analisando em processo isolado. Você pode cancelar esta operação.";await new Promise(resolve=>setTimeout(resolve,250));}throw new Error("A análise não respondeu no tempo esperado. Reinicie o painel se necessário.");}
        finally{activeJobId=null;controls();}
      },
      cancel:()=>activeJobId?request("/api/cancel",{job_id:activeJobId}):Promise.resolve(),
      simulate:payload=>request("/api/scenario",payload),
      reset:()=>request("/api/reset",{}),
      export:kind=>request("/api/export/"+kind,undefined,true)};
  }

  function demoAdapter() {
    let assets=null,active=null,loaded=false;
    async function load() {
      if(!assets){
        const paths=["demo/current-report.json","demo/monthly-report.json","demo/current-input.json"];
        const responses=await Promise.all(paths.map(path=>fetch(path,{credentials:"omit",redirect:"error"})));
        if(responses.some(r=>!r.ok))throw new Error("A demonstração não pôde ser carregada. Atualize a página.");
        const texts=await Promise.all(responses.map(r=>r.text()));
        assets={current:JSON.parse(texts[0]),monthly:JSON.parse(texts[1]),input:JSON.parse(texts[2]),inputText:texts[2]};
        if([assets.current,assets.monthly,assets.input].some(r=>r.dataset_kind!=="synthetic"))throw new Error("A demonstração requer dados inteiramente fictícios.");
      }
      return assets;
    }
    const describe=b=>({as_of:b.as_of,portfolio_id:b.portfolio_id,dataset_kind:"synthetic",materials:new Set(b.positions.map(p=>p.material)).size,positions:b.positions.length,orders:b.orders.length,evidence:b.evidence.length});
    const state=()=>({version:assets?assets.current.version:"0.4.0",mode:"demo",current:loaded?describe(assets.input):null,
      previous:loaded?{...describe(assets.input),as_of:assets.monthly.comparison.previous_as_of}:null,report_ready:!!active,ml_available:!!assets&&assets.current.delay_model.status==="synthetic_demo"});
    return {status:async()=>{await load();return state();},
      demo:async()=>{await load();loaded=true;active=null;return {status:state(),review:{summary:describe(assets.input),positions:assets.input.positions.slice(0,5),metadata_flags:assets.current.metadata_flags,notes:["Conjunto demonstrativo; todos os registros e resultados pertencem a dados fictícios.","A importação dos seus arquivos está disponível no aplicativo local."]}};},
      preview:async()=>{throw new Error("A importação de arquivos é feita na versão local.");},
      import:async()=>{throw new Error("Use a versão local para analisar seus arquivos.");},
      analyze:async options=>{await load();if(!loaded)throw new Error("Carregue a demonstração para continuar.");active=clone(options.compare_previous?assets.monthly:assets.current);if(!options.use_ml)active.delay_model={status:"disabled",reason:"Estimativas desativadas nesta análise.",predictions:[]};return {status:state(),report:clone(active)};},
      simulate:async p=>{
        if(!active||p.input_sha256!==active.input_sha256)throw new Error("Atualize a análise antes de simular.");
        if(!/^[A-Z]{2}$/.test(p.country)||!Number.isInteger(p.duration_days)||p.duration_days<1||p.duration_days>180||!Number.isFinite(p.reduction)||p.reduction<0||p.reduction>1)throw new Error("Premissas do cenário inválidas.");
        const outcomes=active.materials.map(m=>{const share=m.suppliers.filter(s=>s.origin_country===p.country).reduce((n,s)=>n+s.allocation_share,0);const gap=m.monthly_demand_kg/30*share*p.reduction;const uncovered=Math.max(0,gap*p.duration_days-m.stock_kg);return {material:m.material,affected_share:share,stockout_day:gap>0?Math.round(m.stock_kg/gap*10)/10:null,uncovered_kg:Math.round(uncovered*100)/100,replacement_reference_usd:Math.round(uncovered*m.weighted_unit_cost_usd*100)/100};});
        active.scenario={country:p.country,duration_days:p.duration_days,reduction:p.reduction,assumption:assets.current.scenario.assumption,outcomes};return {scenario:clone(active.scenario)};
      },
      reset:async()=>{loaded=false;active=null;return {status:state()};},
      export:async kind=>{
        await load();if(kind==="input"&&loaded)return new Blob([assets.inputText],{type:"application/json"});
        if(!active)throw new Error("Execute a demonstração antes de exportar.");
        if(kind==="json")return new Blob([JSON.stringify(active,null,2)+"\n"],{type:"application/json"});
        if(kind!=="html")throw new Error("Formato inválido.");
        const response=await fetch("demo/report-template.json",{credentials:"omit",redirect:"error"});if(!response.ok)throw new Error("O relatório não pôde ser preparado.");
        const envelope=await response.json();if(typeof envelope.html!=="string")throw new Error("Modelo de relatório inválido.");
        const template=envelope.html;const safe=JSON.stringify(active).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026");
        const pattern=/(<script id="report-data" type="application\/json">)[\s\S]*?(<\/script>)/;
        if(!pattern.test(template))throw new Error("Modelo de relatório inválido.");
        return new Blob([template.replace(pattern,(_,start,end)=>start+safe+end)],{type:"text/html;charset=utf-8"});
      }};
  }
  const adapter=isDemo?demoAdapter():localAdapter();

  async function readFile(input) {
    const file=input.files&&input.files[0];
    if(!file)throw new Error("Escolha um arquivo antes de carregar.");
    if(file.size===0||file.size>16*1024*1024)throw new Error("Cada arquivo deve ter conteúdo e até 16 MiB.");
    try { return new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(await file.arrayBuffer()); }
    catch {throw new Error("O arquivo deve estar em UTF-8. Exporte novamente nesse formato.");}
  }
  const normalize=value=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
  async function prepareCsv(table) {
    const input=$("csv-"+table);
    delete csvSources[table];$("mapping-"+table).replaceChildren();
    if(!input.files||!input.files.length){delete csvSources[table];$("mapping-"+table).replaceChildren();return;}
    const text=await readFile(input),delimiter=$("csv-delimiter").value==="tab"?"\t":$("csv-delimiter").value;
    const preview=await adapter.preview({text,table,delimiter});
    csvSources[table]={text,delimiter,preview};
    const area=$("mapping-"+table);area.replaceChildren(node("p",preview.row_count+" registros encontrados. Confira quais colunas representam cada informação.","mapping-note"));
    const grid=node("div",undefined,"mapping-grid");
    preview.fields.forEach(field=>{
      const label=node("label",labels[field]||field),select=node("select");select.dataset.field=field;
      const nullable=preview.nullable_fields.includes(field),empty=node("option",nullable?"Não informado":"Selecione a coluna");empty.value="-1";select.append(empty);
      const matches=[field,...(aliases[field]||[])].map(normalize);let selected=-1;
      preview.columns.forEach((column,index)=>{const option=node("option",column);option.value=String(index);select.append(option);if(matches.includes(normalize(column)))selected=index;});
      select.value=String(selected);label.append(select);grid.append(label);
    });area.append(grid);
  }
  function csvSpec(table) {
    const source=csvSources[table];if(!source)return null;
    const mapping=Object.create(null);
    $("mapping-"+table).querySelectorAll("select[data-field]").forEach(select=>{
      const index=Number(select.value),field=select.dataset.field;
      if(index<0&&!source.preview.nullable_fields.includes(field))throw new Error("Selecione a coluna de “"+(labels[field]||field)+"” na tabela "+table+".");
      mapping[field]=index<0?null:source.preview.columns[index];
    });
    return {text:source.text,delimiter:source.delimiter,mapping,number_format:$("number-format").value,date_format:$("date-format").value,allocation_unit:$("allocation-unit").value};
  }
  async function runAnalysis(compare) {
    const result=await adapter.analyze({use_ml:$("use-ml").checked,compare_previous:compare});
    updateStatus(result.status);report=result.report;renderReport();controls();
    switchView(compare?"comparison":"overview");notice(isDemo?"Demonstração preparada com resultados sintéticos. Explore os cenários e a comparação.":"Análise concluída. Confira as premissas e os sinais antes de decidir.");
  }
  function populateExplorationChoices(materials = []) {
    const positions = materials.flatMap(material => material.suppliers);
    const controls = [
      ["origin-choice", "Todas as origens", new Set(positions.map(position => position.origin_country)), countryName],
      ["supplier-choice", "Todos os fornecedores", new Set(positions.map(position => position.supplier)), code => code],
    ];
    for (const [id, allLabel, values, labelFor] of controls) {
      const select = $(id);
      const previous = select.value;
      const all = node("option", allLabel);
      all.value = "";
      select.replaceChildren(all);
      for (const value of [...values].sort((a, b) => labelFor(a).localeCompare(labelFor(b), "pt-BR"))) {
        const option = node("option", labelFor(value));
        option.value = value;
        select.append(option);
      }
      select.value = values.has(previous) ? previous : "";
    }
  }

  function renderOrigins() {
    const area = $("country-bars");
    const table = $("origin-table");
    area.replaceChildren();
    table.replaceChildren();
    const material = report?.materials.find(item => item.material === $("material-choice").value);
    if (!material) return;

    const origin = $("origin-choice").value;
    const supplier = $("supplier-choice").value;
    const positions = material.suppliers.filter(position =>
      (!origin || position.origin_country === origin) && (!supplier || position.supplier === supplier));
    const shares = new Map();
    for (const position of positions) {
      const country = position.origin_country;
      shares.set(country, (shares.get(country) || 0) + position.allocation_share);
    }
    const origins = [...shares].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    for (const [country, share] of origins) {
      const row = node("div", undefined, "country-row");
      const progress = node("progress");
      progress.max = 1;
      progress.value = share;
      progress.setAttribute("aria-label", countryName(country) + ": " + pct(share));
      row.append(node("span", countryName(country)), progress, node("strong", pct(share)));
      area.append(row);

      const tr = node("tr");
      const name = node("th", countryName(country));
      name.scope = "row";
      tr.append(name, node("td", pct(share)));
      table.append(tr);
    }
    if (!origins.length) {
      const message = "Nenhuma posição para esta combinação. Amplie o recorte em origem ou fornecedor.";
      area.append(node("p", message, "support"));
      const row = node("tr");
      const cell = node("td", message);
      cell.colSpan = 2;
      row.append(cell);
      table.append(row);
    }

    const originCount = origins.length === 1 ? "1 origem" : origins.length + " origens";
    const positionCount = positions.length === 1 ? "1 posição" : positions.length + " posições";
    const date = report.as_of.split("-").reverse().join("/");
    const source = report.dataset_kind === "synthetic" ? "carteira fictícia" : "carteira declarada";
    $("exploration-summary").textContent = `${originCount} · ${positionCount} · corte ${date} · ${source}`;
    $("reset-material").disabled = !origin && !supplier && material.material === report.materials[0]?.material;
    window.StrataGeo?.setScope(material.name, origins);
  }
  function renderScenario(value) {
    const area=$("scenario-results");area.replaceChildren();if(!report||!value)return;
    const names=Object.fromEntries(report.materials.map(m=>[m.material,m.name]));
    value.outcomes.forEach(o=>{const card=node("div",undefined,"scenario-result"+(o.uncovered_kg===0?" covered":""));card.append(node("h3",names[o.material]||o.material),node("div",fmt(o.uncovered_kg,1)+" kg","scenario-amount"),node("p","Demanda sem cobertura no cenário · origem responde por "+pct(o.affected_share)));
      card.append(node("p",o.uncovered_kg===0?"O estoque absorve a redução no período simulado.":"Estoque esgota no dia "+fmt(o.stockout_day,1)+". Referência do insumo faltante: US$ "+fmt(o.replacement_reference_usd,2)+"."));area.append(card);});
    $("scenario-assumption").textContent=value.assumption;
  }
  function renderModel() {
    const area=$("model-state"),evaluation=$("model-evaluation");area.replaceChildren();evaluation.replaceChildren();
    const model=report.delay_model;
    const name={synthetic_demo:"DEMONSTRAÇÃO SINTÉTICA",experimental:"ESTIMATIVAS EXPERIMENTAIS",abstained:"SEM ESTIMATIVAS",disabled:"ESTIMATIVAS DESATIVADAS"}[model.status]||model.status;
    area.append(node("span",name,"pill"),node("p",model.reason,"model-description"));
    if(isDemo&&model.status==="synthetic_demo")area.append(node("p","O modelo desta demonstração foi calculado previamente no conjunto fictício.","footnote"));
    const predictions=node("div",undefined,"model-predictions");
    (model.predictions||[]).slice(0,6).forEach(p=>metric(predictions,p.supplier,pct(p.estimated_delay_probability)));area.append(predictions);
    if(model.evaluation){const e=model.evaluation;[["Pedidos de treino / teste",e.train_orders+" / "+e.test_orders],["Brier do modelo",fmt(e.brier,5)],["Brier da referência",fmt(e.baseline_brier,5)],["AUC no teste",fmt(e.roc_auc,3)]].forEach(([label,value])=>metric(evaluation,label,value));if(e.stability)metric(evaluation,"Janelas melhores que a referência",e.stability.improved_windows+" / "+e.stability.evaluated_windows);(e.temporal_windows||[]).forEach(w=>evaluation.append(node("p",w.cutoff+": "+(w.state==="evaluated"?"Brier "+fmt(w.brier,5)+" · referência "+fmt(w.baseline_brier,5):"amostra insuficiente"),"footnote")));evaluation.append(node("p",e.calibration,"footnote"));}
    else evaluation.append(node("p",model.reason,"footnote"));
  }
  function renderComparison() {
    const comparison=report&&report.comparison;$("comparison-card").hidden=!comparison;if(!comparison)return;
    $("comparison-period").textContent=comparison.previous_as_of+" → "+comparison.current_as_of;
    const summary=$("comparison-summary");summary.replaceChildren();
    [[comparison.summary.comparable_materials,"Materiais comparáveis"],[comparison.summary.new_signals,"Sinais novos"],[comparison.summary.cleared_signals,"Sinais ausentes agora"]].forEach(([value,label])=>{const card=node("div",undefined,"comparison-stat");card.append(node("strong",value),node("span",label));summary.append(card);});
    const rows=$("comparison-rows");rows.replaceChildren();const statuses={comparable:"Comparável",added:"Adicionado",removed:"Fora do conjunto atual",specification_changed:"Conferir especificação"};
    const signed=(value,unit="")=>(value>0?"+":"")+fmt(value,2)+unit;
    comparison.materials.forEach(m=>{const row=node("tr"),values=[m.name,statuses[m.status]||m.status];if(m.status==="comparable")values.push(signed(m.metrics.country_hhi.delta),signed(m.metrics.coverage_days.delta," dias"),signed(m.metrics.priority_score.delta," pontos"),m.new_signals.length+" / "+m.cleared_signals.length);else values.push("—","—","—","—");values.forEach(v=>row.append(node("td",v)));rows.append(row);});
    $("comparison-note").textContent=comparison.scope;
  }
  function renderReport() {
    window.StrataInsights?.render(report,scenario=>{$("scenario-country").value=scenario.country;$("scenario-days").value=scenario.duration_days;$("scenario-reduction").value=scenario.reduction*100;rangeLabels();switchView("scenario");notice("Premissas selecionadas. Use Calcular cenário para atualizar o resultado e as exportações.");});
    document.querySelectorAll(".analysis-empty").forEach(e=>{e.hidden=!!report;});document.querySelectorAll(".analysis-content").forEach(e=>{e.hidden=!report;});
    if(!report){window.StrataGeo?.clear();populateExplorationChoices();$("material-choice").replaceChildren();$("country-bars").replaceChildren();$("origin-table").replaceChildren();$("exploration-summary").textContent="Aguardando análise.";$("reset-material").disabled=true;$("comparison-card").hidden=true;$("export-provenance").replaceChildren(node("p","A data de corte e a impressão digital do conjunto aparecem após a análise.","support"));return;}
    const kpis=$("overview-kpis");kpis.replaceChildren();
    [["Materiais em análise",report.materials.length,"Especificações técnicas distintas"],["Posições de fornecimento",report.materials.reduce((n,m)=>n+m.suppliers.length,0),"Relações material / fornecedor"],["Prioridade alta",report.materials.filter(m=>m.priority==="alta").length,"Regra de triagem, de 0 a 100"],["Sinais para conferência",report.metadata_flags.length,"Metadados documentais"]].forEach(([label,value,caption])=>{const card=node("div",undefined,"kpi");card.append(node("div",label,"kpi-label"),node("strong",value),node("small",caption));kpis.append(card);});
    const select=$("material-choice"),oldValue=select.value;select.replaceChildren();report.materials.forEach(m=>{const option=node("option",m.name);option.value=m.material;select.append(option);});
    if(report.materials.some(m=>m.material===oldValue))select.value=oldValue;
    populateExplorationChoices(report.materials);
    renderOrigins();
    $("priorities").replaceChildren();report.materials.slice(0,2).forEach((m,index)=>{const card=node("div",undefined,"priority-item"),title=node("strong");title.append(node("span","0"+(index+1),"priority-index"),node("span",m.name));card.append(title,node("p",m.actions[0]));$("priorities").append(card);});
    $("portfolio-table").replaceChildren();report.materials.forEach(m=>{const row=node("tr");row.append(node("td",m.name));const priority=node("td");priority.append(node("span",m.priority+" · "+m.priority_score,"pill "+m.priority));row.append(priority);[pct(m.top_origin_share),fmt(m.coverage_days,1)+" dias",fmt(m.max_nominal_lead_days)+" dias",m.evidence_flags].forEach(value=>row.append(node("td",value)));$("portfolio-table").append(row);});
    const signals=$("evidence-signals");signals.replaceChildren();let shown=0;
    function moreSignals(){const button=signals.querySelector("button");if(button)button.remove();report.metadata_flags.slice(shown,shown+12).forEach(f=>{const item=node("div",undefined,"signal-item");item.append(node("strong",flagNames[f.code]||f.code),node("span",f.supplier+" · "+(f.evidence_id||"sem evidência")+" · "+f.material));signals.append(item);});shown+=12;if(shown<report.metadata_flags.length){const more=node("button","Mostrar mais sinais","text-button");more.type="button";more.addEventListener("click",moreSignals);signals.append(more);}}
    if(report.metadata_flags.length)moreSignals();else signals.append(node("p","Nenhum sinal nas verificações implementadas.","support"));
    renderModel();renderComparison();
    const choices=[...new Set(report.materials.flatMap(m=>m.suppliers.map(s=>s.origin_country)).concat(report.scenario.country))].sort();$("scenario-country").replaceChildren();choices.forEach(code=>{const option=node("option",countryName(code)+" ("+code+")");option.value=code;$("scenario-country").append(option);});$("scenario-country").value=report.scenario.country;
    $("scenario-days").value=report.scenario.duration_days;$("scenario-reduction").value=report.scenario.reduction*100;rangeLabels();renderScenario(report.scenario);
    const provenance=$("export-provenance");provenance.replaceChildren();metric(provenance,"Carteira",report.portfolio_id||"Não identificada");metric(provenance,"Data de corte",report.as_of);metric(provenance,"Natureza do conjunto",report.dataset_kind==="synthetic"?"Fictício":"Declarado pelo cliente");provenance.append(node("p","Impressão digital do conjunto normalizado","support"),node("div",report.input_sha256,"hash"));
    if(report.comparison)provenance.append(node("p","Impressão digital da base anterior","footnote"),node("div",report.comparison.previous_input_sha256,"hash"));
  }
  function rangeLabels() {$("scenario-days-value").textContent=$("scenario-days").value+" dias";$("scenario-reduction-value").textContent=pct(Number($("scenario-reduction").value)/100);if(report){const last=report.scenario,current=last.country===$("scenario-country").value&&last.duration_days===Number($("scenario-days").value)&&Math.abs(last.reduction-Number($("scenario-reduction").value)/100)<1e-10;$("scenario-state").dataset.current=String(current);$("scenario-state").textContent=(current?"Resultado calculado: ":"Resultados e exportações ainda usam: ")+countryName(last.country)+" · "+last.duration_days+" dias · redução de "+pct(last.reduction)+"."+(current?"":" Calcule novamente para aplicar as premissas alteradas.");}}
  function download(blob,kind) {const url=URL.createObjectURL(blob),a=node("a");a.href=url;a.download={html:"stratasignal-report.html",json:"stratasignal-report.json",input:"stratasignal-input.json"}[kind];a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}

  document.querySelectorAll("nav [data-view]").forEach(button=>button.addEventListener("click",()=>switchView(button.dataset.view)));
  $("cancel-analysis").addEventListener("click",async()=>{if(!activeJobId)return;try{await adapter.cancel();}catch(error){notice(error.message,true);}});
  document.querySelectorAll("[data-go]").forEach(button=>button.addEventListener("click",()=>switchView(button.dataset.go)));
  document.querySelector(".brand").addEventListener("click",event=>{event.preventDefault();switchView(report?"overview":"import");});
  document.querySelectorAll(".demo-load").forEach(button=>button.addEventListener("click",()=>task("Preparando a carteira fictícia…",async()=>{const value=await adapter.demo();updateStatus(value.status);renderReview(value.review);$("compare-previous").checked=true;await runAnalysis(false);})));
  $("tab-json").addEventListener("click",()=>{ $("json-pane").hidden=false;$("csv-pane").hidden=true;$("tab-json").classList.add("selected");$("tab-csv").classList.remove("selected");$("tab-json").setAttribute("aria-pressed","true");$("tab-csv").setAttribute("aria-pressed","false");});
  $("tab-csv").addEventListener("click",()=>{ $("json-pane").hidden=true;$("csv-pane").hidden=false;$("tab-csv").classList.add("selected");$("tab-json").classList.remove("selected");$("tab-csv").setAttribute("aria-pressed","true");$("tab-json").setAttribute("aria-pressed","false");});
  $("current-file").addEventListener("change",()=>{$("current-file-label").textContent=$("current-file").files[0]?.name||"Nenhum arquivo selecionado";});
  $("import-json").addEventListener("click",()=>task("Conferindo o conjunto selecionado…",async()=>{const text=await readFile($("current-file")),value=await adapter.import({slot:"current",kind:"json",data:text});updateStatus(value.status);renderReview(value.review);notice("Conjunto carregado. Confira as informações e execute a análise.");}));
  ["positions","orders","evidence"].forEach(table=>$("csv-"+table).addEventListener("change",()=>task("Lendo colunas do arquivo CSV…",()=>prepareCsv(table))));
  $("csv-delimiter").addEventListener("change",()=>task("Atualizando as colunas com o separador escolhido…",async()=>{for(const table of ["positions","orders","evidence"])await prepareCsv(table);}));
  $("import-csv").addEventListener("click",()=>task("Validando campos e consistência da carteira…",async()=>{
    if(!csvSources.positions)throw new Error("Selecione o arquivo de posições de compra e confira suas colunas.");
    const tables={positions:csvSpec("positions")};for(const table of ["orders","evidence"])if(csvSources[table])tables[table]=csvSpec(table);
    const value=await adapter.import({slot:"current",kind:"csv",data:{portfolio_id:$("portfolio-id").value.trim(),as_of:$("as-of").value,dataset_kind:$("csv-kind").value,tables}});updateStatus(value.status);renderReview(value.review);notice("Arquivos mapeados e validados. Confira os totais antes de analisar.");
  }));
  $("import-previous").addEventListener("click",()=>task("Conferindo a base anterior…",async()=>{const text=await readFile($("previous-file")),value=await adapter.import({slot:"previous",kind:"json",data:text});updateStatus(value.status);renderReview(value.review);$("compare-previous").checked=true;notice("Período anterior carregado. Execute a comparação para atualizar os resultados.");}));
  $("analyze").addEventListener("click",()=>task("Calculando a análise da carteira…",()=>runAnalysis($("compare-previous").checked)));
  $("analyze-comparison").addEventListener("click",()=>task("Comparando os dois períodos…",()=>runAnalysis(true)));
  $("material-choice").addEventListener("change",renderOrigins);
  $("origin-choice").addEventListener("change", renderOrigins);
  $("supplier-choice").addEventListener("change", renderOrigins);
  $("reset-material").addEventListener("click", () => {
    if (!report) return;
    $("material-choice").value = report.materials[0]?.material || "";
    $("origin-choice").value = "";
    $("supplier-choice").value = "";
    renderOrigins();
    $("material-choice").focus();
  });
  $("scenario-country").addEventListener("change",rangeLabels);
  ["scenario-days","scenario-reduction"].forEach(id=>$(id).addEventListener("input",rangeLabels));
  $("simulate").addEventListener("click",()=>task("Calculando o cenário escolhido…",async()=>{if(!report)throw new Error("Execute uma análise antes de simular.");const value=await adapter.simulate({country:$("scenario-country").value,duration_days:Number($("scenario-days").value),reduction:Number($("scenario-reduction").value)/100,input_sha256:report.input_sha256});report.scenario=value.scenario;renderScenario(value.scenario);rangeLabels();notice("Cenário atualizado. As exportações incluem estas premissas.");}));
  document.querySelectorAll(".export-action").forEach(button=>button.addEventListener("click",()=>task("Preparando o arquivo…",async()=>{const blob=await adapter.export(button.dataset.kind);download(blob,button.dataset.kind);notice("Arquivo preparado para download. Guarde os dados pelo processo aprovado da sua organização.");})));
  $("reset").addEventListener("click",()=>task("Limpando os dados desta execução…",async()=>{const value=await adapter.reset();updateStatus(value.status);renderReview(null);document.querySelectorAll("input[type=file]").forEach(e=>{e.value="";});for(const key of Object.keys(csvSources))delete csvSources[key];["positions","orders","evidence"].forEach(t=>$("mapping-"+t).replaceChildren());$("current-file-label").textContent="Nenhum arquivo selecionado";switchView("import");notice("Espaço de trabalho limpo. Os arquivos originais não foram alterados.");}));
  $("as-of").value=new Date().toLocaleDateString("sv-SE");
  if(isDemo){$("demo-banner").hidden=false;$("geo-scope-tag").textContent="ORIGENS FICTÍCIAS";$("mode-label").textContent="Demonstração fictícia";$("mode-description").textContent="Uma carteira pronta para explorar o produto.";$("private-import-note").textContent="Este endereço usa apenas dados fictícios. Seus arquivos são analisados no aplicativo local.";}
  renderReport();controls();
  task("Abrindo o espaço de análise…",async()=>{
    updateStatus(await adapter.status());
    if(isDemo){
      const value=await adapter.demo();updateStatus(value.status);renderReview(value.review);$("compare-previous").checked=true;
      const result=await adapter.analyze({use_ml:$("use-ml").checked,compare_previous:true});
      updateStatus(result.status);report=result.report;renderReport();switchView("overview");
      if (location.hash === "#atlas") {
        $("atlas").scrollIntoView?.({block: "start"});
        $("geo-title").focus({preventScroll: true});
      }
    }
  });
})();
