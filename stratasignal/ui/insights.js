"use strict";
(() => {
  const node=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(className)e.className=className;return e;};
  const fmt=(value,digits=0)=>new Intl.NumberFormat("pt-BR",{maximumFractionDigits:digits}).format(value);
  const pct=value=>value===null||value===undefined?"Sem histórico":fmt(value*100,1)+"%";
  function table(headers){const wrapper=node("div",undefined,"table-wrap table-scroll"),t=node("table"),head=node("thead"),tr=node("tr"),body=node("tbody");headers.forEach(h=>tr.append(node("th",h)));head.append(tr);t.append(head,body);wrapper.append(t);return {wrapper,body};}
  const row=(target,values)=>{const tr=node("tr");values.forEach(value=>tr.append(node("td",value)));target.append(tr);return tr;};
  function card(title,caption){const e=node("article",undefined,"card");if(caption)e.append(node("p",caption,"eyebrow"));e.append(node("h2",title));return e;}
  let selectedMonth = "";
  const deliveryStates = [
    ["received_on_time", "Recebidos no prazo"],
    ["received_late", "Recebidos em atraso"],
    ["open_overdue", "Abertos em atraso"],
    ["open_pending", "Abertos dentro do prazo"],
  ];
  const monthLabel = month => month.split("-").reverse().join("/");

  function deliveryHistory(report) {
    const history = card("Situação dos pedidos por mês", "HISTÓRICO DECLARADO");
    history.id = "delivery-monthly";
    const months = report.intelligence.delivery_months;
    if (!months?.length) {
      selectedMonth = "";
      const message = months
        ? "A carteira não contém pedidos para exibir neste histórico."
        : "Reexecute a análise para gerar a distribuição mensal de pedidos.";
      history.append(node("p", message, "support"));
      return history;
    }

    const label = node("label", "Mês do pedido", "field-label");
    const select = node("select");
    select.id = "delivery-month";
    label.htmlFor = select.id;
    const all = node("option", "Todos os meses com pedidos");
    all.value = "";
    select.append(all);
    for (const entry of [...months].reverse()) {
      const option = node("option", monthLabel(entry.month));
      option.value = entry.month;
      select.append(option);
    }
    select.value = months.some(entry => entry.month === selectedMonth) ? selectedMonth : "";
    const summary = node("p", undefined, "support");
    summary.id = "delivery-month-summary";
    summary.setAttribute("role", "status");
    const chart = node("div");
    const details = node("details", undefined, "origin-data");
    const counts = table(["Situação", "Pedidos"]);
    details.append(node("summary", "Ver contagens em tabela"), counts.wrapper);

    function draw() {
      selectedMonth = select.value;
      const visible = months.filter(entry => !selectedMonth || entry.month === selectedMonth);
      const values = deliveryStates.map(([key]) => visible.reduce((sum, entry) => sum + entry[key], 0));
      const total = values.reduce((sum, value) => sum + value, 0);
      const scope = selectedMonth ? monthLabel(selectedMonth) : visible.length + " meses com pedidos";
      summary.textContent = fmt(total) + (total === 1 ? " pedido" : " pedidos") + " · " + scope;
      chart.replaceChildren();
      counts.body.replaceChildren();
      deliveryStates.forEach(([, state], index) => {
        const count = values[index];
        const bar = node("progress");
        bar.max = total;
        bar.value = count;
        bar.setAttribute("aria-label", state + ": " + fmt(count) + " de " + fmt(total) + " pedidos");
        const line = node("div", undefined, "country-row delivery-row");
        line.append(node("span", state), bar, node("strong", fmt(count)));
        chart.append(line);
        row(counts.body, [state, fmt(count)]);
      });
    }

    select.addEventListener("change", draw);
    const cutoff = report.as_of.split("-").reverse().join("/");
    history.append(
      node("p", "Fonte: histórico da carteira " + (report.dataset_kind === "synthetic" ? "fictícia" : "declarada") + " · corte " + cutoff, "support"),
      label, select, summary, chart, details,
      node("p", "O mês corresponde à data do pedido. As situações refletem o corte da carteira. Este filtro se aplica às contagens desta seção.", "footnote"),
    );
    draw();
    return history;
  }

  function render(report,onScenario){
    const root=document.getElementById("insights-content");if(!root)return;root.replaceChildren();
    const data=report&&report.intelligence;
    if(!data){selectedMonth="";root.append(node("p","Execute uma análise nesta versão para examinar pontualidade e cenários de estresse.","support"));return;}
    const quality=data.data_quality,kpis=node("div",undefined,"kpis");
    [[data.supplier_performance.reduce((n,p)=>n+p.observed_orders,0),"Desfechos observados"],[quality.positions_with_evidence+" / "+quality.positions,"Posições com evidência"],[data.stress_matrix.length,"Cenários condicionais"],[quality.unknown_origin_positions,"Posições de origem desconhecida"]].forEach(([value,label])=>{const e=node("div",undefined,"kpi");e.append(node("div",label,"kpi-label"),node("strong",value));kpis.append(e);});root.append(kpis);
    const origins=card("Dependências entre especificações","EXPOSIÇÃO DECLARADA"),originTable=table(["Origem","Especificações","Referência mensal · USD"]);
    data.origin_dependencies.slice(0,12).forEach(origin=>row(originTable.body,[origin.country,origin.materials.length,fmt(origin.reference_monthly_usd,2)]));origins.append(originTable.wrapper,node("p","Referência de custo mensal atribuída a cada origem. Não é perda financeira nem participação na produção mundial.","footnote"));root.append(origins);
    const stress=card("Onde o estoque deixa de absorver a redução","GRADE DE ESTRESSE"),label=node("label","Origem do cenário","field-label label"),select=node("select"),stressTable=table(["Duração","Redução","Materiais sem cobertura","Referência do insumo · USD"]);
    label.htmlFor="insights-country";select.id="insights-country";
    data.origin_dependencies.slice(0,data.stress_grid.countries_evaluated).forEach(origin=>{const option=node("option",origin.country);option.value=origin.country;select.append(option);});
    const names=Object.fromEntries(report.materials.map(m=>[m.material,m.name]));
    function drawStress(){stressTable.body.replaceChildren();data.stress_matrix.filter(s=>s.country===select.value).forEach(s=>{const tr=row(stressTable.body,[s.duration_days+" dias",pct(s.reduction),s.materials_without_coverage.length,fmt(s.replacement_reference_usd,2)]);tr.title=s.materials_without_coverage.map(id=>names[id]||id).join(" · ");if(onScenario){const td=node("td"),button=node("button","Usar premissas","button secondary export");button.type="button";button.addEventListener("click",()=>onScenario(s));td.append(button);tr.append(td);}});}
    if(onScenario)stressTable.wrapper.querySelector("thead tr").append(node("th","Explorar"));
    select.addEventListener("change",drawStress);stress.append(label,select,stressTable.wrapper,node("p",data.stress_grid.selection+" Origens fora da grade: "+data.stress_grid.countries_outside_grid+". Cada linha é um cenário independente; valores não devem ser somados.","footnote"));drawStress();root.append(stress);
    const history=card("Pontualidade com o tamanho da amostra à vista","HISTÓRICO DE ENTREGA"),searchLabel=node("label","Filtrar material ou fornecedor","field-label label"),search=node("input"),historyTable=table(["Material / fornecedor","Desfechos","Atrasos","Intervalo descritivo 95%","Prazo P90 recebido","Abertos em atraso"]);
    search.type="search";search.id="insights-search";searchLabel.htmlFor=search.id;
    const navigation=node("div",undefined,"insight-toolbar"),previous=node("button","Anterior","button secondary export"),next=node("button","Próxima","button secondary export"),position=node("span",undefined,"footnote");previous.type=next.type="button";
    let page=0;
    const performance=[...data.supplier_performance].sort((a,b)=>b.open_overdue_orders-a.open_overdue_orders||(b.late_rate??-1)-(a.late_rate??-1)||a.supplier.localeCompare(b.supplier));
    function drawHistory(){const query=search.value.trim().toLocaleLowerCase("pt-BR"),filtered=performance.filter(p=>(p.name+" "+p.material+" "+p.supplier).toLocaleLowerCase("pt-BR").includes(query));const last=Math.max(0,Math.ceil(filtered.length/20)-1);page=Math.min(page,last);historyTable.body.replaceChildren();filtered.slice(page*20,page*20+20).forEach(p=>{const interval=p.late_rate_interval_95?`${pct(p.late_rate_interval_95[0])} a ${pct(p.late_rate_interval_95[1])}`:"Sem histórico";row(historyTable.body,[p.name+" / "+p.supplier,p.observed_orders+(p.sample_status==="small_sample"?" · amostra pequena":""),pct(p.late_rate),interval,p.received_lead_p90_days===null?"Menos de 10 recebimentos":p.received_lead_p90_days+" dias",p.open_overdue_orders]);});if(!filtered.length)row(historyTable.body,["Nenhuma posição corresponde ao filtro."]);position.textContent="Página "+(page+1)+" de "+(last+1)+" · "+filtered.length+(filtered.length===1?" posição":" posições");previous.disabled=page===0;next.disabled=page>=last;}
    search.addEventListener("input",()=>{page=0;drawHistory();});previous.addEventListener("click",()=>{page--;drawHistory();});next.addEventListener("click",()=>{page++;drawHistory();});navigation.append(previous,position,next);history.append(searchLabel,search,historyTable.wrapper,navigation,node("p",data.scope,"footnote"));drawHistory();root.append(history,deliveryHistory(report));
  }
  window.StrataInsights={render};
})();
