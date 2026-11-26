(() => {
  "use strict";
  const panel = document.getElementById("market-operations");
  if (!panel) return;
  const dom = id => document.getElementById("market-operations-" + id);
  const kinds = {mine:"Mineração e beneficiamento", plant:"Processamento industrial", port:"Porto e logística", project:"Projeto em desenvolvimento"};
  const graphics = window.strataOperationSymbols;
  const icons = {mine:"Mina",plant:"Planta",port:"Porto",project:"Projeto"};
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
  const websites = new Map([
    [national,"https://www.grafite.com/"],
    ["Graphcoa","https://graphcoa.com/"],
    ["South Star Battery Metals","https://southstarbatterymetals.com/"],
    ["Allied Graphite (antiga Urbix)","https://alliedgraphite.com/"],
    [syrah,"https://www.syrahresources.com.au/"],
    ["Syrah Resources (usuária do porto)","https://www.syrahresources.com.au/"],
    ["BTR New Material Group",btr],
  ]);
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
    {a:"itagimirim", b:"mesa", kind:"Fornecimento divulgado", text:"Relação de fornecimento divulgada: a Allied informa que a Graphcoa é sua fornecedora de concentrado de grafita natural em flocos. A ligação é entre empresas; não confirma embarque para Mesa, rota nem volume comercial.", url:allied},
    {a:"balama", b:"nacala", kind:"Escoamento documentado", text:"Escoamento portuário em contêineres informado pela Syrah; primeiro embarque divulgado em 2017.", url:logistics},
    {a:"balama", b:"pemba", kind:"Escoamento documentado", text:"Escoamento portuário em carga geral informado pela Syrah; atividade divulgada desde 2022.", url:logistics},
    {a:"balama", b:"vidalia", kind:"Integração industrial", text:"Integração industrial divulgada pela Syrah: grafita de Balama é insumo da cadeia de ânodos de Vidalia. A fonte não comprova um itinerário marítimo.", url:syrahPlant},
  ];
  const groups = new Map([
    [national,["itapecerica","pedra-azul","salto-da-divisa"]],
    ["Graphcoa",["itagimirim","jordania"]],
    [syrah,["balama","nacala","pemba","vidalia"]],
  ]);
  const lookup = new Map(records.map(x => [x.id,x]));
  let active = false, enabled = true, selected = "";
  const selector = dom("kind"), list = dom("list"), toggle = dom("toggle"), legend = dom("legend");
  const routesPanel = document.getElementById("market-logistics");
  const routesChoices = document.getElementById("market-logistics-choices");
  const routeContext = document.getElementById("market-logistics-context");
  const routeSource = document.getElementById("market-logistics-source");
  const roadStudy = "https://www.dfc.gov/sites/default/files/esia/2023/syrahbalama/Appendices/PartIV-TrafficandTransportAssessment.pdf";
  const routeCarrier = {
    nacala:{text:"Grindrod Logistics Moçambique — transporte rodoviário documentado em 2024.", source:"ITIE Moçambique · tabela 39, p. 147", url:"https://eiti.org/sites/default/files/ITIE%20Moc%CC%A7ambique_13o%20Relato%CC%81rio_I2A%20Consultoria_Final.pdf#page=147"},
    pemba:{text:"Grindrod — redirecionamento de carga por Pemba documentado em 2022.", source:"Grindrod · comunicado de setembro de 2022", url:"https://www.grindrod.com/article/332-from-the-desk-of-andrew-waller-ceo-grindrod-limited"},
  };
  // Static road approximation: OSRM driving profile, © OpenStreetMap contributors,
  // queried 2026-11-26 from the Balama locality via Metoro to port areas.
  // Simplified to ~33 m in source coordinate space; not a recorded truck trip.
  const roadShapes = {
    nacala:[[38.57036,-13.34956],[38.56973,-13.34871],[38.5749,-13.3468],[38.58395,-13.34722],[38.59725,-13.34355],[38.60243,-13.3408],[38.62241,-13.33443],[38.64041,-13.34147],[38.64679,-13.34171],[38.6569,-13.34598],[38.66792,-13.34616],[38.6736,-13.34466],[38.69877,-13.34479],[38.71303,-13.33766],[38.72234,-13.3336],[38.72642,-13.33083],[38.73431,-13.32729],[38.7394,-13.32564],[38.7475,-13.32175],[38.75866,-13.31762],[38.76967,-13.31469],[38.77672,-13.31205],[38.78724,-13.30495],[38.79112,-13.30177],[38.80361,-13.29382],[38.81395,-13.28369],[38.81907,-13.28001],[38.82438,-13.27758],[38.83977,-13.2608],[38.84914,-13.25408],[38.85284,-13.25269],[38.8565,-13.24848],[38.86113,-13.24594],[38.86577,-13.24088],[38.87327,-13.22921],[38.87855,-13.22492],[38.8852,-13.21693],[38.88958,-13.21428],[38.89283,-13.21117],[38.89777,-13.20427],[38.91264,-13.19315],[38.92065,-13.18552],[38.92697,-13.17667],[38.9321,-13.17407],[38.93793,-13.17197],[38.95088,-13.16617],[38.95639,-13.1646],[38.97047,-13.15567],[38.97396,-13.15282],[38.97949,-13.1466],[38.98329,-13.14081],[38.98693,-13.13822],[38.99572,-13.13025],[38.99588,-13.12947],[39.01185,-13.11962],[39.01209,-13.11803],[39.01774,-13.11728],[39.03053,-13.11293],[39.06089,-13.11177],[39.07537,-13.10878],[39.09454,-13.10307],[39.11373,-13.09471],[39.12769,-13.09087],[39.14805,-13.07929],[39.16166,-13.07567],[39.18128,-13.06775],[39.1931,-13.06069],[39.22974,-13.05088],[39.24101,-13.04535],[39.25596,-13.04385],[39.27807,-13.03693],[39.28453,-13.03406],[39.28632,-13.03267],[39.29605,-13.02167],[39.30891,-13.01278],[39.31573,-13.00225],[39.3258,-12.99529],[39.32899,-12.99399],[39.35515,-12.98751],[39.35713,-12.98652],[39.37418,-12.96945],[39.39195,-12.95535],[39.41074,-12.92681],[39.42789,-12.91599],[39.43901,-12.9135],[39.4418,-12.91358],[39.45498,-12.91749],[39.47104,-12.91537],[39.49911,-12.90281],[39.50046,-12.90255],[39.50257,-12.90296],[39.51687,-12.91079],[39.54951,-12.93571],[39.5622,-12.94083],[39.56959,-12.95179],[39.57564,-12.95612],[39.59136,-12.97213],[39.59242,-12.97436],[39.59583,-12.99038],[39.59656,-12.99173],[39.59822,-12.99306],[39.61045,-12.99804],[39.61985,-13.00055],[39.63632,-13.01179],[39.64366,-13.01198],[39.64556,-13.01254],[39.6808,-13.03401],[39.70196,-13.04464],[39.70402,-13.04486],[39.7097,-13.04349],[39.71186,-13.04357],[39.73246,-13.05424],[39.7734,-13.06447],[39.79718,-13.07724],[39.81076,-13.09317],[39.81285,-13.09475],[39.82324,-13.09606],[39.84035,-13.1035],[39.85878,-13.1055],[39.86811,-13.10543],[39.87249,-13.1059],[39.87219,-13.11018],[39.87463,-13.13177],[39.8732,-13.13457],[39.86635,-13.13751],[39.86439,-13.13994],[39.86315,-13.14566],[39.86371,-13.14756],[39.86555,-13.15064],[39.86568,-13.15225],[39.86484,-13.15667],[39.86191,-13.16113],[39.86153,-13.16272],[39.86192,-13.1705],[39.86564,-13.18491],[39.86765,-13.19064],[39.86701,-13.19305],[39.86252,-13.19737],[39.86098,-13.20099],[39.86176,-13.20399],[39.866,-13.20904],[39.86655,-13.21085],[39.86519,-13.2183],[39.86163,-13.22599],[39.86312,-13.23522],[39.86292,-13.23687],[39.86151,-13.24021],[39.86044,-13.24147],[39.8508,-13.24801],[39.84591,-13.25386],[39.84001,-13.25695],[39.83752,-13.26124],[39.8363,-13.2624],[39.82131,-13.26698],[39.81939,-13.26855],[39.81863,-13.2704],[39.81579,-13.28463],[39.81289,-13.29334],[39.81153,-13.30469],[39.80886,-13.3111],[39.80868,-13.31431],[39.80989,-13.31867],[39.80998,-13.32213],[39.80788,-13.32804],[39.79841,-13.33659],[39.7877,-13.34089],[39.7865,-13.3419],[39.7822,-13.34921],[39.7788,-13.35796],[39.77624,-13.36934],[39.77709,-13.37569],[39.77818,-13.37712],[39.79449,-13.3888],[39.79545,-13.39128],[39.79839,-13.40676],[39.79537,-13.41801],[39.79212,-13.4238],[39.78874,-13.42753],[39.78798,-13.43525],[39.7856,-13.43949],[39.78453,-13.44346],[39.77829,-13.45482],[39.77872,-13.46038],[39.78065,-13.4651],[39.77876,-13.47182],[39.7799,-13.47643],[39.78256,-13.47893],[39.78474,-13.48252],[39.78562,-13.48836],[39.78246,-13.50353],[39.78345,-13.51719],[39.78333,-13.52355],[39.78833,-13.52993],[39.79046,-13.53552],[39.79182,-13.5371],[39.80752,-13.54377],[39.8095,-13.54558],[39.81007,-13.5471],[39.81054,-13.55434],[39.81371,-13.55986],[39.81547,-13.56226],[39.81955,-13.56439],[39.82299,-13.56754],[39.82375,-13.56868],[39.82645,-13.57676],[39.83198,-13.58214],[39.84376,-13.6143],[39.84366,-13.61657],[39.83934,-13.62866],[39.83921,-13.63077],[39.84206,-13.64328],[39.85059,-13.65641],[39.85102,-13.65789],[39.85097,-13.66169],[39.83181,-13.70664],[39.83088,-13.7097],[39.83406,-13.71536],[39.83395,-13.72458],[39.83986,-13.73529],[39.85468,-13.7887],[39.88256,-13.84241],[39.88848,-13.8741],[39.90258,-13.89958],[39.90351,-13.90479],[39.90266,-13.91064],[39.90316,-13.91317],[39.90951,-13.92548],[39.92422,-13.93852],[39.92854,-13.94478],[39.92934,-13.9467],[39.93177,-13.96043],[39.93657,-13.97288],[39.93827,-13.9749],[39.94813,-13.98204],[39.95443,-13.99704],[39.95422,-13.99907],[39.94992,-14.00972],[39.94731,-14.02851],[39.94417,-14.03375],[39.94021,-14.04474],[39.93363,-14.05551],[39.93177,-14.06087],[39.92929,-14.06495],[39.92922,-14.06633],[39.93065,-14.07188],[39.93049,-14.0731],[39.92946,-14.07437],[39.92573,-14.07634],[39.92337,-14.08287],[39.92399,-14.08896],[39.91819,-14.10757],[39.91824,-14.1091],[39.91977,-14.11166],[39.91994,-14.1128],[39.9178,-14.12458],[39.91525,-14.13019],[39.91449,-14.1364],[39.91494,-14.13819],[39.91753,-14.1412],[39.91736,-14.14628],[39.91995,-14.15127],[39.9195,-14.15452],[39.91839,-14.15583],[39.90933,-14.16202],[39.9082,-14.16362],[39.90424,-14.18276],[39.89751,-14.19552],[39.89733,-14.20186],[39.89449,-14.20756],[39.88916,-14.22897],[39.88883,-14.23726],[39.8834,-14.25757],[39.88109,-14.26306],[39.87864,-14.27294],[39.87935,-14.27643],[39.88024,-14.27812],[39.88335,-14.2818],[39.88855,-14.28432],[39.8906,-14.28693],[39.89292,-14.28878],[39.8964,-14.29466],[39.90255,-14.30213],[39.90498,-14.30719],[39.90524,-14.30896],[39.90387,-14.31757],[39.90655,-14.32418],[39.90511,-14.33124],[39.90537,-14.34146],[39.90595,-14.34382],[39.91154,-14.35452],[39.9121,-14.35679],[39.91142,-14.36218],[39.90046,-14.38607],[39.89669,-14.41415],[39.89578,-14.42867],[39.89597,-14.43052],[39.90491,-14.45522],[39.90452,-14.46104],[39.90127,-14.4674],[39.90041,-14.47433],[39.90299,-14.48486],[39.90234,-14.49528],[39.89992,-14.50186],[39.89731,-14.51504],[39.89779,-14.53399],[39.90181,-14.54666],[39.89883,-14.56497],[39.8961,-14.57277],[39.89599,-14.57714],[39.89168,-14.58551],[39.8871,-14.59285],[39.88685,-14.59431],[39.88767,-14.59734],[39.89385,-14.61075],[39.89501,-14.62126],[39.90061,-14.63609],[39.90206,-14.63802],[39.90806,-14.64348],[39.91095,-14.6483],[39.91463,-14.66755],[39.91364,-14.67484],[39.91438,-14.67807],[39.91634,-14.68121],[39.92143,-14.68456],[39.92291,-14.68613],[39.9329,-14.71032],[39.93954,-14.71947],[39.94565,-14.72591],[39.94877,-14.73179],[39.95229,-14.7364],[39.95747,-14.74811],[39.96647,-14.76348],[39.96706,-14.78164],[39.95947,-14.82174],[39.95483,-14.83],[39.95385,-14.83646],[39.95707,-14.85329],[39.95364,-14.86387],[39.95489,-14.87713],[39.95555,-14.87961],[39.97076,-14.90288],[39.97366,-14.91089],[39.97848,-14.91705],[39.98128,-14.92367],[40.04365,-14.89976],[40.09161,-14.89086],[40.09403,-14.89096],[40.14971,-14.90286],[40.17985,-14.89841],[40.18627,-14.89941],[40.18765,-14.89994],[40.20316,-14.9109],[40.20894,-14.91351],[40.23141,-14.91611],[40.23326,-14.9171],[40.2399,-14.92319],[40.24558,-14.92468],[40.25274,-14.92379],[40.25967,-14.91822],[40.27275,-14.91438],[40.27956,-14.90899],[40.28496,-14.89989],[40.29243,-14.89448],[40.29452,-14.8941],[40.30998,-14.89593],[40.32151,-14.89135],[40.32318,-14.88995],[40.32643,-14.88526],[40.32851,-14.87509],[40.32863,-14.8728],[40.32649,-14.86561],[40.32608,-14.86075],[40.33091,-14.84912],[40.33155,-14.83715],[40.33368,-14.83087],[40.37728,-14.78155],[40.40677,-14.77286],[40.4168,-14.77043],[40.42752,-14.76033],[40.44591,-14.74985],[40.4507,-14.74182],[40.45192,-14.74062],[40.46626,-14.73561],[40.48958,-14.72025],[40.49164,-14.71942],[40.50162,-14.71681],[40.52164,-14.72299],[40.53312,-14.72321],[40.53536,-14.72183],[40.54463,-14.71081],[40.55537,-14.70666],[40.56178,-14.7018],[40.56559,-14.70086],[40.571,-14.70241],[40.57512,-14.70675],[40.57721,-14.70751],[40.58498,-14.7071],[40.59784,-14.7034],[40.60413,-14.70387],[40.61476,-14.70374],[40.6223,-14.70501],[40.62444,-14.70468],[40.63409,-14.69878],[40.64142,-14.69239],[40.64999,-14.68693],[40.65802,-14.67735],[40.66294,-14.67355],[40.66801,-14.66717],[40.66985,-14.66619],[40.67463,-14.66547],[40.67654,-14.66437],[40.68226,-14.65809],[40.68329,-14.65553],[40.68396,-14.62186],[40.6816,-14.60972],[40.6816,-14.57557],[40.68095,-14.57344],[40.67437,-14.56301],[40.67373,-14.5574],[40.67424,-14.55027],[40.6739,-14.54613],[40.67251,-14.54466],[40.67073,-14.54463],[40.66688,-14.54138],[40.66554,-14.54285],[40.66672,-14.54386]],
    pemba:[[38.57036,-13.34956],[38.56973,-13.34871],[38.5749,-13.3468],[38.58395,-13.34722],[38.59725,-13.34355],[38.60243,-13.3408],[38.62241,-13.33443],[38.64041,-13.34147],[38.64679,-13.34171],[38.6569,-13.34598],[38.66792,-13.34616],[38.6736,-13.34466],[38.69877,-13.34479],[38.71303,-13.33766],[38.72234,-13.3336],[38.72642,-13.33083],[38.73431,-13.32729],[38.7394,-13.32564],[38.7475,-13.32175],[38.75866,-13.31762],[38.76967,-13.31469],[38.77672,-13.31205],[38.78724,-13.30495],[38.79112,-13.30177],[38.80361,-13.29382],[38.81395,-13.28369],[38.81907,-13.28001],[38.82438,-13.27758],[38.83977,-13.2608],[38.84914,-13.25408],[38.85284,-13.25269],[38.8565,-13.24848],[38.86113,-13.24594],[38.86577,-13.24088],[38.87327,-13.22921],[38.87855,-13.22492],[38.8852,-13.21693],[38.88958,-13.21428],[38.89283,-13.21117],[38.89777,-13.20427],[38.91264,-13.19315],[38.92065,-13.18552],[38.92697,-13.17667],[38.9321,-13.17407],[38.93793,-13.17197],[38.95088,-13.16617],[38.95639,-13.1646],[38.97047,-13.15567],[38.97396,-13.15282],[38.97949,-13.1466],[38.98329,-13.14081],[38.98693,-13.13822],[38.99572,-13.13025],[38.99588,-13.12947],[39.01185,-13.11962],[39.01209,-13.11803],[39.01774,-13.11728],[39.03053,-13.11293],[39.06089,-13.11177],[39.07537,-13.10878],[39.09454,-13.10307],[39.11373,-13.09471],[39.12769,-13.09087],[39.14805,-13.07929],[39.16166,-13.07567],[39.18128,-13.06775],[39.1931,-13.06069],[39.22974,-13.05088],[39.24101,-13.04535],[39.25596,-13.04385],[39.27807,-13.03693],[39.28453,-13.03406],[39.28632,-13.03267],[39.29605,-13.02167],[39.30891,-13.01278],[39.31573,-13.00225],[39.3258,-12.99529],[39.32899,-12.99399],[39.35515,-12.98751],[39.35713,-12.98652],[39.37418,-12.96945],[39.39195,-12.95535],[39.41074,-12.92681],[39.42789,-12.91599],[39.43901,-12.9135],[39.4418,-12.91358],[39.45498,-12.91749],[39.47104,-12.91537],[39.49911,-12.90281],[39.50046,-12.90255],[39.50257,-12.90296],[39.51687,-12.91079],[39.54951,-12.93571],[39.5622,-12.94083],[39.56959,-12.95179],[39.57564,-12.95612],[39.59136,-12.97213],[39.59242,-12.97436],[39.59583,-12.99038],[39.59768,-12.99277],[39.61045,-12.99804],[39.61985,-13.00055],[39.63632,-13.01179],[39.64366,-13.01198],[39.64556,-13.01254],[39.6808,-13.03401],[39.70196,-13.04464],[39.70402,-13.04486],[39.7097,-13.04349],[39.71186,-13.04357],[39.73246,-13.05424],[39.7734,-13.06447],[39.79718,-13.07724],[39.81076,-13.09317],[39.81285,-13.09475],[39.82324,-13.09606],[39.84035,-13.1035],[39.85878,-13.1055],[39.86811,-13.10543],[39.87604,-13.10632],[39.87806,-13.10723],[39.88295,-13.11167],[39.89502,-13.11414],[39.90012,-13.11421],[39.90195,-13.11382],[39.91825,-13.1066],[39.94721,-13.11166],[39.95194,-13.11116],[39.96368,-13.10597],[39.97458,-13.1044],[39.98318,-13.10496],[39.99336,-13.11155],[40.01082,-13.11388],[40.01228,-13.11509],[40.01966,-13.12432],[40.02552,-13.12897],[40.04716,-13.1399],[40.05025,-13.14059],[40.0908,-13.14014],[40.09792,-13.1371],[40.12188,-13.13249],[40.13397,-13.13564],[40.13591,-13.13575],[40.15808,-13.12855],[40.16485,-13.12871],[40.17287,-13.12511],[40.17492,-13.12502],[40.1832,-13.12677],[40.18509,-13.12615],[40.18854,-13.12346],[40.19081,-13.123],[40.19636,-13.12336],[40.19849,-13.12431],[40.21049,-13.13516],[40.22616,-13.14723],[40.22819,-13.1478],[40.23357,-13.14777],[40.23536,-13.14704],[40.24115,-13.14148],[40.25774,-13.13913],[40.268,-13.13316],[40.27948,-13.12428],[40.28745,-13.11203],[40.29122,-13.10787],[40.29284,-13.10667],[40.29992,-13.10394],[40.31166,-13.09296],[40.31399,-13.09222],[40.34413,-13.08838],[40.35097,-13.08573],[40.35279,-13.08455],[40.36101,-13.07442],[40.36311,-13.07269],[40.38062,-13.0671],[40.38366,-13.06739],[40.39619,-13.0733],[40.40799,-13.07226],[40.4214,-13.07644],[40.42943,-13.08499],[40.43768,-13.08874],[40.44409,-13.09633],[40.44597,-13.10045],[40.44716,-13.10166],[40.45322,-13.10536],[40.45931,-13.105],[40.46896,-13.09726],[40.4727,-13.0901],[40.47475,-13.0881],[40.49733,-13.07781],[40.50265,-13.07743],[40.51393,-13.07483],[40.51991,-13.07142],[40.52101,-13.06962],[40.52216,-13.06455],[40.52746,-13.05446],[40.53238,-13.0322],[40.5331,-13.01268],[40.53045,-13.0006],[40.52972,-12.99483],[40.52222,-12.97508],[40.5155,-12.96872],[40.50495,-12.96703],[40.50269,-12.96502],[40.49661,-12.96244],[40.49435,-12.96193],[40.49108,-12.96201],[40.48857,-12.96417],[40.48766,-12.96569],[40.48607,-12.96575],[40.48596,-12.96671]],
  };
  const carrierText = document.getElementById("market-logistics-carrier");
  const carrierSource = document.getElementById("market-logistics-carrier-source");
  const portRoutes = relations.filter(edge => edge.kind === "Escoamento documentado" && roadShapes[edge.b])
    .map(edge => ({...edge, anchors:roadShapes[edge.b], carrier:routeCarrier[edge.b],
      label:lookup.get(edge.a).city + " → " + lookup.get(edge.b).city}));
  let selectedRoute;
  function updateRoutes() {
    if (!routesPanel) return;
    routesPanel.hidden = !active || !portRoutes.length;
    if (!active) { routesPanel.open = false; selectedRoute = null; }
    const routes = active && routesPanel.open ? portRoutes.map(route => ({
      anchors:route.anchors, selected:route === selectedRoute,
    })) : [];
    routeContext.hidden = !selectedRoute;
    routeContext.textContent = selectedRoute?.text ?? "";
    const carrier = selectedRoute?.carrier;
    if (carrierText && carrierSource) {
      carrierText.hidden = carrierSource.hidden = !carrier;
      carrierText.textContent = carrier?.text ?? "";
      carrierSource.textContent = carrier ? carrier.source + " ↗" : "";
      if (carrier) carrierSource.href = carrier.url;
      else carrierSource.removeAttribute("href");
    }
    for (const button of routesChoices.querySelectorAll("button")) {
      button.setAttribute("aria-pressed",String(button.dataset.port === selectedRoute?.b));
    }
    window.strataMarketGlobe?.logistics?.(routes);
    window.dispatchEvent(new CustomEvent("strata-market-logistics",{detail:routes}));
  }
  const search = dom("search"), result = dom("result"), detail = dom("detail");
  const overlay = document.getElementById("market-operation-dialog");
  const detailHome = detail.parentNode, detailNext = detail.nextSibling;
  const website = dom("website");
  let returnTo;
  function restoreDetail() {
    if (detail.parentNode === overlay) detailHome.insertBefore(detail, detailNext);
    const previous = returnTo;
    returnTo = null;
    if (overlay?.closest("dialog[open]")) {
      const target = previous?.isConnected && !previous.closest("[hidden],[inert]") ? previous : document.getElementById("market-map-collapse");
      target?.focus({preventScroll:true});
    }
  }
  function closeOverlay() {
    if (overlay?.open) overlay.close();
    if (detail.parentNode === overlay) restoreDetail();
  }
  function showOverlay(origin) {
    if (!overlay || typeof overlay.showModal !== "function") return;
    if (!overlay.open) {
      returnTo = origin;
      overlay.append(detail);
      try { overlay.showModal(); }
      catch { restoreDetail(); return; }
    }
    overlay.scrollTop = 0;
    dom("name").focus({preventScroll:true});
  }
  let backdropDown = false;
  overlay?.addEventListener("pointerdown", event => { backdropDown = event.target === overlay; });
  overlay?.addEventListener("click", event => {
    if (event.target === overlay && (backdropDown || event.detail === 0)) closeOverlay();
    backdropDown = false;
  });
  overlay?.addEventListener("cancel", event => {
    event.preventDefault();
    event.stopPropagation();
    closeOverlay();
  });
  overlay?.addEventListener("close", () => { if (!overlay.open && detail.parentNode === overlay) restoreDetail(); });
  const normalize = value => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
  const matches = (x, terms) => terms.every(term => normalize([x.city, x.company, x.region, x.country, x.name].join(" ")).includes(term));
  const terms = () => normalize(search.value).trim().split(/\s+/).filter(Boolean);
  const visible = () => {
    const query = terms();
    return records.filter(x => (!selector.value || x.kind === selector.value) && matches(x, query));
  };
  const ownHash = /^#operacao=([a-z0-9-]+)$/;
  const addressId = () => ownHash.exec(location.hash)?.[1] || "";
  const setAddress = id => {
    const url = new URL(location.href);
    url.hash = id ? "operacao=" + id : "";
    if (url.href !== location.href) history.replaceState(history.state,"",url);
  };
  const create = (tag, value) => Object.assign(document.createElement(tag), {textContent:value});
  const link = (label, href) => Object.assign(create("a", label), {href});
  const symbol = kind => graphics?.icon(kind) ?? create("span","");
  if (routesPanel) {
    routeSource.href = logistics;
    const studyLink = document.getElementById("market-logistics-study");
    if (studyLink) studyLink.href = roadStudy;
    routesChoices.append(...portRoutes.map(route => {
      const button = create("button",route.label);
      button.type = "button";
      button.dataset.port = route.b;
      button.setAttribute("aria-pressed","false");
      button.addEventListener("click", () => {
        selectedRoute = route;
        updateRoutes();
        const lons = route.anchors.map(p => p[0]), lats = route.anchors.map(p => p[1]);
        const sw = [Math.min(...lons),Math.min(...lats)], ne = [Math.max(...lons),Math.max(...lats)];
        const center = sw.map((n,i) => (n + ne[i]) / 2);
        if (!window.strataMarketGlobe?.fitRoute?.([sw,ne])) {
          window.dispatchEvent(new CustomEvent("strata-market-logistics-focus",{detail:center}));
        }
      });
      return button;
    }));
    routesPanel.addEventListener("toggle",() => {
      if (!routesPanel.open) selectedRoute = null;
      updateRoutes();
    });
  }
  const close = dom("close"), focus = dom("focus"), trade = dom("trade");
  let tradeCountries = new Set();
  const tradePartner = document.getElementById("market-country");
  function tradeOption(record) {
    if (!record || !tradePartner || tradePartner.disabled || tradePartner.closest("fieldset")?.disabled) return null;
    return [...tradePartner.options].find(option => option.value && tradeCountries.has(option.value) && normalize(option.value) === normalize(record.country)) ?? null;
  }
  const filter = kind => {
    selector.value = selector.value === kind ? "" : kind;
    applyFilters();
  };
  legend.replaceChildren(...Object.entries(icons).map(([kind,label]) => {
    const button = create("button","");
    button.type = "button";
    button.dataset.kind = kind;
    button.append(symbol(kind),create("span",label));
    button.addEventListener("click",() => filter(kind));
    return button;
  }));
  function relatedButton(other) {
    const button = create("button","");
    button.type = "button";
    const label = create("span","");
    label.append(create("strong",other.city + " · " + other.name),create("small",other.company + " · " + other.country));
    button.append(symbol(other.kind),label);
    button.addEventListener("click", () => open(other.id,true,true));
    return button;
  }
  function update() {
    panel.hidden = !active;
    toggle.hidden = !active;
    legend.hidden = !active || !enabled;
    toggle.setAttribute("aria-pressed", String(enabled && active));
    for (const button of legend.querySelectorAll("button")) button.setAttribute("aria-pressed",String(selector.value === button.dataset.kind));
    if (trade) {
      const option = active ? tradeOption(lookup.get(selected)) : null;
      trade.hidden = !option;
      if (option) trade.textContent = "Comércio do país · dados agregados";
    }
    const points = active && enabled ? visible() : [];
    if (overlay?.open && !points.some(point => point.id === selected)) closeOverlay();
    window.strataMarketGlobe?.operations(points, selected, (id,origin) => open(id,false,false,origin));
  }
  function renderList() {
    const items = visible();
    if (selected && !items.some(x => x.id === selected)) {
      if (addressId() === selected) setAddress("");
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
      const label = create("span","");
      label.append(create("strong",x.city),create("span",x.company),create("small",kinds[x.kind]));
      button.append(symbol(x.kind),label);
      button.addEventListener("click", () => open(x.id,true,true));
      item.append(button);
      return item;
    }));
  }
  function open(id, focusMap = false, alignDetail = false, origin = null) {
    const record = lookup.get(id);
    if (!active || !record) return;
    selected = id;
    setAddress(id);
    if (selector.value && selector.value !== record.kind) selector.value = "";
    if (!matches(record, terms())) search.value = "";
    renderList();
    if (!enabled) enabled = true;
    for (const button of list.querySelectorAll("button")) button.setAttribute("aria-pressed",String(button.dataset.operation === id));
    if (focus) focus.textContent = "Centrar no globo";
    detail.querySelector?.("details")?.removeAttribute("open");
    dom("name").textContent = record.name;
    dom("badge")?.replaceChildren(symbol(record.kind),create("span",kinds[record.kind]));
    if (dom("subtitle")) dom("subtitle").textContent = record.city + " · " + record.country + " | " + record.company;
    const official = websites.get(record.company);
    website.hidden = !official;
    if (official) website.href = official;
    else website.removeAttribute("href");
    const direct = dom("permalink");
    direct.href = "/mapa/?ncm=25041000#operacao=" + record.id;
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
      li.append(create("p",x.kind),relatedButton(other),create("p",x.text),link("Fonte da ligação",x.url));
      return li;
    }));
    dom("links-wrap").hidden = !edges.length;
    const linked = new Set(edges.map(x => x.a === id ? x.b : x.a));
    const peers = [...groups.values()].find(group => group.includes(id))?.filter(key => key !== id && !linked.has(key)) ?? [];
    dom("related")?.replaceChildren(...peers.map(key => {
      const li = create("li","");
      li.append(relatedButton(lookup.get(key)));
      return li;
    }));
    if (dom("related-wrap")) dom("related-wrap").hidden = !peers.length;
    detail.hidden = false;
    dom("geo").textContent = geography;
    update();
    if (focusMap) window.strataMarketGlobe?.focus(record.anchor, true);
    if (window.strataMarketGlobe?.isFullscreen?.()) {
      if (origin || overlay?.open) showOverlay(origin);
    } else {
      dom("name").focus({preventScroll:true});
      if (!focusMap || alignDetail) detail.scrollIntoView?.({block:"nearest"});
    }
  }
  close?.addEventListener("click",() => {
    if (overlay?.open) { closeOverlay(); return; }
    const previous = selected;
    selected = "";
    setAddress("");
    detail.hidden = true;
    renderList();
    update();
    list.querySelector('[data-operation="' + previous + '"]')?.focus();
  });
  trade?.addEventListener("click",() => {
    const option = tradeOption(lookup.get(selected));
    if (!option) return;
    if (overlay?.open) window.strataMarketGlobe?.closeFullscreen();
    tradePartner.value = option.value;
    tradePartner.dispatchEvent(new Event("change",{bubbles:true}));
    const countryTitle = document.getElementById("market-geo-selection");
    countryTitle?.focus();
    countryTitle?.scrollIntoView?.({block:"center"});
  });
  focus?.addEventListener("click",() => {
    const record = lookup.get(selected);
    const globe = document.getElementById("market-globe");
    if (!record || !globe) return;
    // A visible globe remains usable while the next basemap is loading.
    if (!window.strataMarketGlobe?.focus(record.anchor)) {
      focus.textContent = "Globo 3D indisponível";
      return;
    }
    if (!enabled) { enabled = true; update(); }
    focus.textContent = "Centrar no globo";
    if (overlay?.open) closeOverlay();
    else globe.scrollIntoView?.({block:"center"});
  });
  toggle.addEventListener("click",() => { enabled = !enabled; update(); });
  const applyFilters = () => { renderList(); update(); };
  selector.addEventListener("change",applyFilters);
  search.addEventListener("input",applyFilters);
  const openAddress = () => {
    const id = addressId();
    if (lookup.has(id) && id !== selected) open(id,true,true);
  };
  panel.querySelectorAll("[data-open-operation]").forEach(button => {
    button.addEventListener("click",() => open(button.dataset.openOperation,true,true));
  });
  window.addEventListener("hashchange",openAddress);
  renderList();
  window.strataMarketOperations = {closeOverlay, show(value, partnerLabels = []) {
    tradeCountries = new Set(partnerLabels);
    active = value === "25041000";
    updateRoutes();
    if (!active && addressId()) {
      setAddress("");
      selected = "";
      detail.hidden = true;
      renderList();
    }
    update();
    if (active) openAddress();
  }};
})();
