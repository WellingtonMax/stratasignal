# StrataSignal — arquitetura da experiência e backlog de UX

Atualização em 7 de novembro de 2026. Este documento traduz os planos de produto/UX e negócios dessa data em entregas incrementais no repositório canônico. As preferências visuais e de exploração mais recentes do usuário têm precedência sobre a paleta e a sequência técnica dos planos anteriores.

## Objetivo da experiência

Permitir entender onde o mineral entra, como se transforma, para onde segue e por que isso importa economicamente, sempre com evidência e período identificados. O observatório público, os espaços empresariais privados e o acesso institucional autorizado são experiências distintas. O modelo atual tem um panorama público de comércio, uma carteira sintética e um aplicativo local. Espaços empresariais hospedados e acesso institucional são propostas.

Cada tela deverá responder: **qual é o recorte, o que sabemos, de onde veio, quando vale e o que falta?** A informação progride de visão geral para entidade, fato, evidência e relatório. Fontes com granularidades diferentes não ganham uma equivalência fictícia.

## Arquitetura da informação

| Área | Pergunta do usuário | Organização e limite atual |
| --- | --- | --- |
| Exploração / atlas | Onde se extrai, processa e comercializa? | O panorama público localiza os parceiros comerciais por NCM, fluxo e período. A carteira fictícia oferece alocações declaradas no atlas com satélite. Instalações e cargas rastreadas seguem no backlog. |
| Mercados | Quanto cada país importa e exporta e onde consultar as bolsas? | Catálogo mundial com país, produto aduaneiro, fluxo, série anual e ranking. A consulta a bolsas segue o país. A cotação por código e as séries nacionais de ferro têm fontes e períodos próprios. |
| Organizações e instalações | Quem atua e qual é a origem dessa informação? | Ficha, identificadores, materiais, portfólio e evidências por campo. Planejado. |
| Contexto mundial | O que mudou e quais relações podem ser afetadas? | Comunicados canadenses sobre lítio e contexto regulatório brasileiro para grafita, ligados ao mineral, ao mês de publicação e ao país citado. |
| Carteira privada | Onde está minha exposição e o que devo conferir? | Importação, visão da carteira, inteligência operacional, cenários e comparação já existem no aplicativo local. |
| Relatórios | Qual evidência sustenta esta leitura? | HTML e JSON para carteiras. O panorama público exporta comércio e notícias em seções separadas, com procedência e cobertura próprias. Evidências geoespaciais seguem planejadas. |
| Dados e participação | O que fornecer, quem acessa e o que recebo? | Jornada proposta de contribuição, qualidade, permissões e retorno; sem fingir autenticação ou qualificação funcional. |
| Fontes e metodologia | Qual cobertura, idade e confiança posso atribuir? | Fonte, versão, período, última consulta, lacunas, regras e revisão. Hoje: documentação e proveniência dos relatórios. |

A navegação publicada mantém as seis áreas funcionais da versão 0.4. Novas áreas só entram na navegação quando sua primeira jornada funcionar. O atlas mundial não deve sugerir cobertura mundial completa. Notícias e satélite contextualizam os dados; não certificam transações ou legalidade.

## Jornadas prioritárias

1. **Explorar:** abrir **Mapa** no panorama público → conferir produto, fluxo e período → selecionar um país pela tabela → ver gráficos, notícias e relatório do mesmo parceiro. Na carteira fictícia, comparar origens e levar a seleção ao simulador.
2. **Investigar:** filtrar mineral, país, período e empresa → abrir ficha → conferir um fato e sua evidência → relacionar o evento econômico. Depende de fontes e resolução de entidades.
3. **Contextualizar** pelo mineral e pelo país do recorte → ler notícias do período comercial ou escolher um mês de publicação → abrir a fonte original e conferir as datas → distinguir relato factual de hipótese de impacto.
4. **Entregar:** reunir fatos, indicadores, imagens e notícias disponíveis → revisar cobertura e divergências → exportar relatório com filtros e fontes congelados.
5. **Contribuir:** entender finalidade, campos, destinatários e retorno → enviar dados autorizados → corrigir pendências → receber análise própria e, quando elegível, indicadores coletivos protegidos.

O primeiro contribuinte recebe análise própria enriquecida por dados públicos. Benefícios coletivos só aparecem com amostra e proteção suficientes. A interface distinguirá visitante, contribuição em validação, ativa e desatualizada quando esses estados forem sustentados por autorização e validação reais. Dados brutos de concorrentes não entram nos relatórios coletivos.

## Sistema visual

| Token | Referência | Papel |
| --- | --- | --- |
| `--navy` | `#081B33` | Navegação e fundo do mapa. |
| `--blue` | `#2563EB` | Foco de teclado, seleção e contexto de exploração. |
| `--canvas` | `#F7FAFC` | Fundo claro de leitura. |
| `--white` | `#FFFFFF` | Superfícies de trabalho. |
| `--green` | `#087F6D` | Ação principal e estados positivos acompanhados de texto. |
| `--yellow` | `#F2C94C` | Acento e seleção sobre fundo escuro; atenção usa texto escuro. |
| `--ink` / `--muted` | `#172B44` / `#52647A` | Texto e metadados legíveis. |

Predominam azul e branco. Verde é funcional; amarelo aparece pontualmente. Sem bandeiras decorativas, efeitos de futebol, gradientes patrióticos ou neon excessivo. Tipografia de sistema sem requisições externas, números tabulares, títulos sans-serif, escala de espaço de 4/8 px, painéis de 10 px de raio e bordas discretas. Os tokens são compartilhados pelo mapa e pelo espaço de trabalho.

Controles principais buscam 44 CSS px de altura. Texto de suporte permanece legível; tabelas têm rolagem local em telas estreitas. Estado e significado também usam texto, unidades, legenda e estrutura. Animação respeita movimento reduzido. A meta é acessibilidade AA, sem declarar certificação a partir de inspeção visual e testes DOM.

## Contrato do primeiro recorte implementado

- Um único seletor de especificação controla mapa, gráfico e tabela de origens; não há seletores independentes com dados contraditórios.
- O resumo mostra quantidade de origens, posições e data de corte da carteira. A data das imagens NASA continua separada.
- O recorte permanece ao navegar entre áreas e refazer uma análise com a especificação ainda presente. Uma nova importação ou limpeza elimina o contexto anterior; especificação ausente recebe a primeira seleção válida.
- “Restaurar seleção inicial” volta à primeira especificação da análise, sem sugerir uma visão agregada de materiais incompatíveis.
- KPIs, demais tabelas, cenários e exportações continuam referentes à carteira completa. Esse escopo está visível junto ao seletor e aos downloads.
- Selecionar uma especificação não ativa imagens externas. A ação NASA permanece opcional e explícita. A origem selecionada é redefinida quando muda a especificação, impedindo uma premissa geográfica obsoleta.
- O gráfico oferece uma tabela expansível de origem e participação, gerada pelos mesmos valores. Rótulos importados continuam texto inerte.

## Filtros de origem e fornecedor declarados

A exploração combina uma especificação, uma origem e um código de fornecedor da carteira. Cada visualização soma somente as posições que atendem aos filtros, usando a alocação total da especificação como base. O mapa, o gráfico e a tabela mostram a mesma seleção, com contagem de origens e posições, fonte da carteira e data de corte. A participação de cada origem usa a alocação total da especificação como base. Origem e fornecedor permanecem selecionados durante a navegação e a reanálise enquanto existirem na carteira.

Uma combinação vazia informa a ausência de posições e permite ampliar o recorte pelos seletores de origem e fornecedor. Origens sem âncora cartográfica permanecem legíveis no gráfico e na tabela. “Restaurar seleção inicial” volta à primeira especificação, a todas as origens e a todos os fornecedores. O filtro abrange as três visualizações de origem. Indicadores e downloads abrangem a carteira completa.

## Recorte mensal do histórico de pedidos

Em Inteligência operacional, a seção Situação dos pedidos por mês filtra pelo mês da data do pedido. A situação de entrega reflete a data de corte informada. Gráfico e tabela compartilham quatro contagens de pedidos, com cobertura e fonte declaradas. A escolha persiste ao navegar e reanalisar a carteira enquanto o mês existir. Carteira sem pedidos e relatório anterior à série mensal têm mensagens distintas. As demais análises usam seu próprio escopo.

## Backlog de entregas verificáveis

| Ordem | Entrega | Critério de aceitação | Estado |
| --- | --- | --- | --- |
| UX-01 | Fundação visual e recorte único | Paleta em tokens; um seletor mantém mapa/gráfico/tabela coerentes; navegação, reanálise e restauração testadas; exports de carteira completa claramente identificados. | Implementado nesta etapa. |
| UX-02 | Contexto e filtros compartilhados | Mineral, período, país/região e empresa com contagens, filtros ativos e limpeza; explicação quando filtro não se aplica a uma fonte; estado vazio; preservação por navegação. Proibir agregação entre especificações incompatíveis. | Especificação, origem e fornecedor declarado entregues. Mês do pedido entregue para contagens do histórico. Identificação de empresas e períodos de outras fontes seguem no backlog. |
| UX-02A | Panorama público de comércio | Mostrar fonte, data, cobertura, unidades e lacunas. Abrir o mapa na navegação principal e selecionar um país pela tabela com teclado. Preservar o recorte ao abrir notícias e exportar. Manter parceiros sem coordenada na tabela. | Entregue para grafita natural em pó ou escamas e carbonatos de lítio, com mapa e tabela de parceiros da carga do Comex Stat. |
| UX-03 | Satélite temporal | Verificar documentação e uso da fonte; alternar globo e mapa preservando centro, zoom e data; mostrar origem, aquisição, resolução, nuvens/cobertura e falhas por vista. Nenhum ponto inventado de instalação. | Acesso ao atlas na abertura do panorama. Globo e mapa plano com cartografia local, Blue Marble e comparação A/B de Terra/MODIS. País selecionado pode ser centralizado em ambas as vistas. |
| UX-04 | Notícias conectadas | Feed/API permitido, textos próprios, links originais, datas, deduplicação e associação a entidades. O mês de publicação pode divergir do período comercial sem alterar os indicadores. Exibir cobertura, atualização, erros e ausência de resultados. Tratar conteúdo externo como não confiável. | Curadoria de lítio no Canadá e política de grafita e lítio no Brasil. O mês de notícias é acessível por teclado, persiste entre as seções e volta ao período comercial ao limpar filtros. Países citados podem aparecer sem registros de comércio. Outras regiões e filtros por empresa seguem no backlog. |
| UX-05 | Relatório consolidado do recorte | A exportação reproduz mapa, indicadores, evidências e notícias disponíveis, com filtros, fontes, datas, unidades, lacunas e divergências. Registrar separadamente períodos divergentes por fonte e evitar dupla contagem. Separar fato, inferência e previsão. | Comércio e notícias têm períodos, proveniência e cobertura próprios no mesmo JSON. O arquivo também identifica referências geográficas aproximadas e parceiros sem coordenadas no recorte. Evidências de satélite, produção e instalações seguem no backlog. |
| UX-06 | Fichas e origem dos fatos | Identificador antes de nome; evidência e versão por campo; distinção entre registro público, declaração da empresa e revisão. Voltar à busca sem perder filtros. | Planejado. |
| UX-07 | Contribuição e retorno | Explicar campos, autorização, finalidade, destinatários, qualidade, atualização e benefícios; manter dados próprios exportáveis nos termos aplicáveis; acesso coletivo condicionado a elegibilidade real. | Planejado; depende de controles de acesso. |
| UX-08 | Revisão transversal | Concluir jornada em celular/teclado, zoom, movimento reduzido, fontes indisponíveis, filtros vazios e mensagens de erro; registrar limites de verificação e tarefas com usuários. | Incremental; retestar áreas alteradas. |
| UX-09 | Mercados minerais por país | Buscar país ou produto por teclado e manter o recorte no endereço. Separar séries aduaneiras, cadastro de bolsas e cotações. Indicar lacunas e peso parcial. Oferecer tabela equivalente ao gráfico e abrir o provedor por ação explícita. | 250 países e áreas no seletor, 185 recortes HS e 1.017 bolsas e mercados no catálogo. O recorte mostra participação no total mundial e posição no último ano, além da participação histórica com gráfico e tabela equivalente. O JSON congela filtros, anos, unidades, lacunas, peso parcial, benchmark histórico, ranking, bolsas, limites e SHA-256 da série. As séries nacionais de ferro permanecem acessíveis. A associação de mineradoras e a cobertura de cotações e preços de referência exigem validação por fonte. |

Os critérios são condições de entrega, não funcionalidades já publicadas. Persistência, autenticação e conectores não serão expandidos apenas para sustentar uma maquete. A próxima etapa deve reutilizar esta fundação e continuar a branch/PR de UX existente enquanto estiver aberta, conciliando eventuais mudanças remotas antes de editar.

### Edições verificáveis do Comex Stat

O Panorama mostra o identificador abreviado da carga que efetivamente alimentou os gráficos e oferece o JSON congelado em uma rota content-addressed. O relatório aponta para essa mesma edição e mantém separada a rota mutável da publicação corrente. Ao preparar uma nova publicação, o operador pode reter a edição anterior já conferida. O manifesto enumera ambas com hash, atualização da fonte e data de consulta. A ausência de registros permanece nula no relatório, enquanto um registro publicado com valor zero continua sendo zero observado.

O cartão da fonte oferece um histórico expansível quando há ao menos duas edições. Cada linha identifica a edição em uso ou anterior, seu hash abreviado, a data informada pela fonte e o download congelado. Hashes distintos são descritos como arquivos diferentes que exigem revisão; a interface não os chama de correção, irregularidade ou erro. Se a data da fonte não mudou, isso também fica explícito.

## Contratos de dados e estados

- **Escopo:** filtros ativos e contagens por fonte. Período da série, corte da carteira e aquisição da imagem são relógios diferentes.
- **Piloto Brasil e grafita:** Mercados leva o HS 250410 e o fluxo ao NCM 25041000 no Panorama. O Comex Stat usa seu próprio período e o filtro de país passa a representar origem ou destino parceiro. A série mensal, o mapa, a tabela e o JSON usam o recorte do Panorama. Os totais do BACI e do Comex Stat são exibidos separadamente.
- **Fonte:** origem, URL quando disponível, unidade, abrangência, atualização, restrição de uso e limite interpretativo.
- **Notícias:** distinguir publicação, evento conhecido e última atualização do feed; um possível impacto é hipótese contextualizada.
- **Estados mínimos:** carregando, vazio inicial, nenhum resultado, parcial, desatualizado, indisponível, sem autorização e sucesso. Exibir somente estados que o sistema consiga conhecer.
- **Privacidade:** dados empresariais brutos ficam no espaço autorizado. Não expor dados restritos em exportações, mapas, URLs, logs ou consultas externas.
- **Acesso institucional:** explicar escopo e fundamento do compartilhamento; cadastro de empresa não implica entrega invisível de dados ao governo.

## Verificação e passagem

A entrega tem critérios de comportamento em `tests/workbench.test.cjs`; as suítes Python e o caminho sem dependências são exigidos por `AGENTS.md`. A revisão visual deve cobrir desktop e larguras móveis, incluindo seletor longo, mapa, alternativa tabular e exportação. A evidência observada desta etapa fica em `docs/VERIFICATION.md`.

Antes de integrar satélite ou notícias novos, consultar as fontes oficiais e testar o contrato e as condições de uso; uma integração indisponível não será simulada como pronta. Testes internos e inspeção visual não substituem tarefas com usuários representativos. Medir compreensão do recorte e tempo para localizar a evidência antes de alegar ganho de produtividade.
