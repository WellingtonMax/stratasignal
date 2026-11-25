(() => {
  "use strict";
  const panel = document.getElementById("market-operations");
  if (!panel) return;
  const dom = id => document.getElementById("market-operations-" + id);
  const kinds = {mine:"Mineração e beneficiamento", plant:"Processamento industrial", port:"Porto e logística", project:"Projeto em desenvolvimento"};
  const geography = "Ponto aproximado no município ou na localidade, não coordenada da instalação.";
  const minas = "https://www.grafite.com/unidades-e-escritorio";
  const brazilProduct = "https://www.grafite.com/graflake";
  const cert = "https://www.grafite.com/wp-content/uploads/2025/07/certificado-iso-9001-2024.pdf";
  const syrahMine = "https://www.syrahresources.com.au/our-business/balama-graphite-operation";
  const logistics = "https://www.syrahresources.com.au/our-business/sales-marketing-logistics";
  const syrahPlant = "https://www.syrahresources.com.au/our-business/vidalia-active-anode-material-facility";
  const syrahQuarter = "https://company-announcements.afr.com/asx/syr/6788725f-d31a-11f1-a069-b6b1a9c70e34.pdf";
  const btr = "https://www.btrchina.com/en/Negativebusiness2/index.aspx";
  const graphcoa = "https://graphcoa.com/area-a-boa-sorte";
  const allied = "https://alliedgraphite.com/our-operations/";
  const alliedRelease = "https://alliedgraphite.com/allied-graphite-announces-vertical-furnace-partnerships-with-harper-and-onejoon/";
  const usitc = "https://www.usitc.gov/publications/701_731/pub5719.pdf";
  const sgb = "https://www.sgb.gov.br/documents/d/guest/favorabilidade_grafita_2025";
  const jordania = "https://graphcoa.com/area-c-grafite-jordania";
  const jordaniaPublic = "https://sistemas.meioambiente.mg.gov.br/licenciamento/site/agendada-solicitacao?id=957";
  const southStar = "https://southstarbatterymetals.com/wp-content/uploads/2026/08/08_STS-Shipment-Highlights-Aug-2026-20260806_v2F.pdf";
  const itabela = "https://www.camaradeitabela.ba.gov.br/noticias/628/audiencia-publica-discutiu-a-mineracao-de-grafite-e-seus-impactos-sociais-e-ambientais-em-itabela-26-05-2023";
  const declared = "Operação cadastrada pela empresa";
  const national = "Nacional de Grafite";
  const syrah = "Syrah Resources";
  const records = [
    {id:"itapecerica", city:"Itapecerica", region:"Minas Gerais", country:"Brasil", anchor:[-45.13,-20.47], company:national, kind:"mine", name:"Unidade de Itapecerica", material:"Grafita natural cristalina", status:declared, sources:[["Unidades",minas],["Certificado DNV (2024)",cert]]},
    {id:"pedra-azul", city:"Pedra Azul", region:"Minas Gerais", country:"Brasil", anchor:[-41.30,-16.01], company:national, kind:"mine", name:"Unidade de Pedra Azul", material:"Grafita natural em flocos", status:declared, sources:[["Unidades",minas],["Origem do Graflake",brazilProduct],["Certificado DNV (2024)",cert]]},
    {id:"salto-da-divisa", city:"Salto da Divisa", region:"Minas Gerais", country:"Brasil", anchor:[-39.94,-16.01], company:national, kind:"mine", name:"Unidade de Salto da Divisa", material:"Grafita natural em flocos", status:declared, sources:[["Unidades",minas],["Origem do Graflake",brazilProduct],["Certificado DNV (2024)",cert]]},
    {id:"itagimirim", city:"Itagimirim", region:"Bahia", country:"Brasil", anchor:[-39.62,-16.09], company:"Graphcoa", kind:"mine", name:"Mina Boa Sorte e planta demonstrativa", material:"Concentrado de grafita natural em flocos", status:"Planta demonstrativa no distrito de União Baiana, segundo a Graphcoa", sources:[["Mina Boa Sorte e planta demonstrativa",graphcoa],["Relação de fornecimento divulgada pela Allied",allied]]},
    {id:"itabela", city:"Itabela", region:"Bahia", country:"Brasil", anchor:[-39.57,-16.58], company:"South Star Battery Metals", kind:"mine", name:"Mina Santa Cruz", material:"Concentrado de grafita natural em flocos", status:"Produção e recebimento de pedido reportados em agosto de 2026; comprador não identificado", sources:[["Localização e empresa · Câmara de Itabela",itabela],["Atualização da South Star (agosto de 2026, PDF)",southStar]]},
    {id:"maiquinique", city:"Maiquinique", region:"Bahia", country:"Brasil", anchor:[-40.26,-15.62], company:"Grafite do Brasil (identificação do SGB)", kind:"mine", name:"Mina de Maiquinique", material:"Grafita natural", status:"Mina classificada como ativa no levantamento do SGB de 2025", sources:[["Relação de minas e depósitos · SGB (PDF)",sgb]]},
    {id:"jordania", city:"Jordânia", region:"Minas Gerais", country:"Brasil", anchor:[-40.18,-15.90], company:"Graphcoa", kind:"project", name:"Projeto Grafite Jordânia", material:"Concentrado de grafita natural (produto previsto)", status:"Em estudos de viabilidade; sem produção confirmada", sources:[["Projeto e estágio · Graphcoa",jordania],["Licenciamento · Portal de Meio Ambiente de Minas Gerais",jordaniaPublic]]},
    {id:"mesa", city:"Mesa", region:"Arizona", country:"Estados Unidos", anchor:[-111.82,33.42], company:"Allied Graphite (antiga Urbix)", kind:"plant", name:"Laboratório e unidade piloto de Mesa", material:"Processamento piloto de grafita para material de ânodo", status:"Laboratório e operação piloto; não é uma planta comercial", sources:[["Operações da Allied Graphite",allied],["Comunicado da Allied (março de 2026)",alliedRelease],["USITC: acordo de desenvolvimento e insumo (PDF)",usitc]]},
    {id:"balama", city:"Balama", region:"Cabo Delgado", country:"Moçambique", anchor:[38.57,-13.35], company:syrah, kind:"mine", name:"Operação de Balama", material:"Concentrado de grafita natural", status:"Produção reportada no 3º trimestre de 2026", sources:[["Operação",syrahMine],["Informe trimestral da Syrah (PDF)",syrahQuarter]]},
    {id:"nacala", city:"Nacala", region:"Nampula", country:"Moçambique", anchor:[40.68,-14.54], company:"Syrah Resources (usuária do porto)", kind:"port", name:"Porto de Nacala", material:"Grafita natural em contêineres", status:"Canal de escoamento divulgado pela Syrah", sources:[["Logística da Syrah",logistics],["Histórico da operação",syrahMine]]},
    {id:"pemba", city:"Pemba", region:"Cabo Delgado", country:"Moçambique", anchor:[40.52,-12.97], company:"Syrah Resources (usuária do porto)", kind:"port", name:"Porto de Pemba", material:"Grafita natural em carga geral não conteinerizada", status:"Canal de escoamento divulgado pela Syrah", sources:[["Logística da Syrah",logistics],["Histórico da operação",syrahMine]]},
    {id:"vidalia", city:"Vidalia", region:"Louisiana", country:"Estados Unidos", anchor:[-91.44,31.57], company:syrah, kind:"plant", name:"Planta de material ativo de ânodo", material:"Grafita esférica purificada e revestida para ânodos", status:"Rampa comercial iniciada em setembro de 2026, segundo a Syrah", sources:[["Planta de Vidalia",syrahPlant],["Informe trimestral da Syrah (PDF)",syrahQuarter]]},
    {id:"jixi", city:"Jixi", region:"Heilongjiang", country:"China", anchor:[130.97,45.30], company:"BTR New Material Group", kind:"plant", name:"Unidade Jixi BTR", material:"Grafita esférica e grafita de alta pureza", status:declared, sources:[["Unidades industriais da BTR",btr]]},
  ];
  const relations = [
    {a:"itagimirim", b:"mesa", text:"Relação de fornecimento divulgada: a Allied informa que a Graphcoa é sua fornecedora de concentrado de grafita natural em flocos. A ligação é entre empresas; não confirma embarque para Mesa, rota nem volume comercial.", url:allied},
    {a:"balama", b:"nacala", text:"Escoamento portuário em contêineres informado pela Syrah; primeiro embarque divulgado em 2017.", url:logistics},
    {a:"balama", b:"pemba", text:"Escoamento portuário em carga geral informado pela Syrah; atividade divulgada desde 2022.", url:logistics},
    {a:"balama", b:"vidalia", text:"Integração industrial divulgada pela Syrah: grafita de Balama é insumo da cadeia de ânodos de Vidalia. A fonte não comprova um itinerário marítimo.", url:syrahPlant},
  ];
  const lookup = new Map(records.map(x => [x.id,x]));
  let active = false, enabled = true, selected = "";
  const selector = dom("kind"), list = dom("list"), toggle = dom("toggle"), legend = dom("legend");
  const search = dom("search"), result = dom("result"), detail = dom("detail");
  const normalize = value => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
  const matches = (x, terms) => terms.every(term => normalize([x.city, x.company, x.region, x.country, x.name].join(" ")).includes(term));
  const terms = () => normalize(search.value).trim().split(/\s+/).filter(Boolean);
  const visible = () => {
    const query = terms();
    return records.filter(x => (!selector.value || x.kind === selector.value) && matches(x, query));
  };
  const create = (tag, value) => Object.assign(document.createElement(tag), {textContent:value});
  const link = (label, href) => Object.assign(create("a", label), {href});
  function update() {
    panel.hidden = !active;
    toggle.hidden = !active;
    legend.hidden = !active || !enabled;
    toggle.setAttribute("aria-pressed", String(enabled && active));
    window.strataMarketGlobe?.operations(active && enabled ? visible() : [], selected, open);
  }
  function renderList() {
    const items = visible();
    if (selected && !items.some(x => x.id === selected)) {
      selected = "";
      detail.hidden = true;
    }
    result.textContent = items.length ? (items.length === 1 ? "1 ponto" : items.length + " pontos") : "Nenhum ponto encontrado. Tente outra cidade ou empresa.";
    list.replaceChildren(...items.map(x => {
      const item = create("li","");
      const button = create("button", "");
      button.type = "button";
      button.dataset.operation = x.id;
      button.setAttribute("aria-pressed", String(x.id === selected));
      button.append(create("strong",x.city),create("span",x.company),create("small",kinds[x.kind]));
      button.addEventListener("click", () => open(x.id,true));
      item.append(button);
      return item;
    }));
  }
  function open(id, focusMap = false) {
    const record = lookup.get(id);
    if (!active || !record) return;
    selected = id;
    if (selector.value && selector.value !== record.kind) selector.value = "";
    if (!matches(record, terms())) search.value = "";
    renderList();
    if (focusMap && !enabled) enabled = true;
    for (const button of list.querySelectorAll("button")) button.setAttribute("aria-pressed",String(button.dataset.operation === id));
    dom("name").textContent = record.name;
    const fields = [["Localidade",record.city + " · " + record.region + " · " + record.country],
      ["Empresa",record.company],["Etapa",kinds[record.kind]],["Produto",record.material],["Situação",record.status]];
    dom("fields").replaceChildren(...fields.map(([k,v]) => {
      const group = create("div","");
      group.append(create("dt",k),create("dd",v));
      return group;
    }));
    dom("sources").replaceChildren(...record.sources.map(([label,url]) => {
      const li=create("li",""); li.append(link(label,url)); return li;
    }));
    const edges = relations.filter(x => x.a === id || x.b === id);
    dom("links").replaceChildren(...edges.map(x => {
      const other = lookup.get(x.a === id ? x.b : x.a);
      const li = create("li","");
      const button = create("button",other.city + " · " + other.name);
      button.type = "button";
      button.addEventListener("click", () => { open(other.id,true); dom("name").focus({preventScroll:true}); });
      li.append(button,create("p",x.text),link("Fonte da ligação",x.url));
      return li;
    }));
    dom("links-wrap").hidden = !edges.length;
    detail.hidden = false;
    dom("geo").textContent = geography;
    update();
    if (focusMap) {
      window.strataMarketGlobe?.focus(record.anchor);
      dom("name").focus({preventScroll:true});
    } else {
      dom("name").focus({preventScroll:true});
      dom("detail").scrollIntoView?.({block:"nearest"});
    }
  }
  toggle.addEventListener("click",() => { enabled = !enabled; update(); });
  const applyFilters = () => { renderList(); update(); };
  selector.addEventListener("change",applyFilters);
  search.addEventListener("input",applyFilters);
  renderList();
  window.strataMarketOperations = {show(value) { active = value === "25041000"; update(); }};
})();
