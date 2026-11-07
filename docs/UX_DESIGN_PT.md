# StrataSignal — arquitetura da experiência e backlog de UX

Atualização em 7 de novembro de 2026. Este documento traduz os planos de produto/UX e negócios dessa data em entregas incrementais no repositório canônico. As preferências visuais e de exploração mais recentes do usuário têm precedência sobre a paleta e a sequência técnica dos planos anteriores.

## Objetivo da experiência

Permitir entender onde o mineral entra, como se transforma, para onde segue e por que isso importa economicamente, sempre com evidência e período identificados. O observatório público, os espaços empresariais privados e o acesso institucional autorizado são experiências distintas. O modelo atual é uma demonstração sintética e um aplicativo local; as outras experiências ainda são propostas.

Cada tela deverá responder: **qual é o recorte, o que sabemos, de onde veio, quando vale e o que falta?** A informação progride de visão geral para entidade, fato, evidência e relatório. Fontes com granularidades diferentes não ganham uma equivalência fictícia.

## Arquitetura da informação

| Área | Pergunta do usuário | Organização e limite atual |
| --- | --- | --- |
| Exploração / atlas | Onde se extrai, processa e comercializa? | Mapa, séries e relações por mineral e etapa. Hoje: alocação declarada por país, sem instalações ou cargas rastreadas. |
| Organizações e instalações | Quem atua e qual é a origem dessa informação? | Ficha, identificadores, materiais, portfólio e evidências por campo. Planejado. |
| Contexto mundial | O que mudou e quais relações podem ser afetadas? | Notícias e eventos relacionados a entidades e filtros. Planejado; não há feed ativo. |
| Carteira privada | Onde está minha exposição e o que devo conferir? | Importação, visão da carteira, inteligência operacional, cenários e comparação já existem no aplicativo local. |
| Relatórios | Qual evidência sustenta esta leitura? | HTML e JSON com proveniência já existem; integração de notícias e imagens ainda será construída. |
| Dados e participação | O que fornecer, quem acessa e o que recebo? | Jornada proposta de contribuição, qualidade, permissões e retorno; sem fingir autenticação ou qualificação funcional. |
| Fontes e metodologia | Qual cobertura, idade e confiança posso atribuir? | Fonte, versão, período, última consulta, lacunas, regras e revisão. Hoje: documentação e proveniência dos relatórios. |

A navegação publicada mantém as seis áreas funcionais da versão 0.4. Novas áreas só entram na navegação quando sua primeira jornada funcionar. O atlas mundial não deve sugerir cobertura mundial completa. Notícias e satélite contextualizam os dados; não certificam transações ou legalidade.

## Jornadas prioritárias

1. **Explorar:** escolher especificação → comparar origens no mapa e no gráfico → abrir a tabela equivalente → selecionar país → levar a premissa ao simulador. Primeiro recorte funcional, entregue nesta etapa.
2. **Investigar:** filtrar mineral, país, período e empresa → abrir ficha → conferir um fato e sua evidência → relacionar o evento econômico. Depende de fontes e resolução de entidades.
3. **Contextualizar:** partir do recorte de exploração → ver notícias relacionadas → abrir fonte original e data → distinguir relato factual de hipótese de impacto.
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
| UX-03 | Satélite temporal | Verificar documentação oficial, disponibilidade e uso da fonte escolhida; seletor de área/data e comparação onde houver suporte; origem, aquisição, resolução, nuvens/cobertura e falhas explícitas. Nenhum ponto inventado de instalação. | Data UTC e estados de cobertura entregues para Terra/MODIS. Comparação simultânea segue no backlog. |
| UX-04 | Notícias conectadas | Feed/API permitido, títulos e resumos próprios, links originais e datas; deduplicação, associação revisável a mineral/país/empresa, filtro, atualização e estados de erro/sem resultado. Conteúdo externo tratado como não confiável. | Planejado; não inserir notícias fictícias como atuais. |
| UX-05 | Relatório consolidado do recorte | Uma seleção reproduz mapa, indicadores, evidências e notícias disponíveis na visão e exportação; registrar fontes, filtros, unidades, data de geração, lacunas e divergências. Separar fato/inferência/previsão, alinhar períodos e evitar dupla contagem. | Planejado; HTML/JSON atuais preservados. |
| UX-06 | Fichas e origem dos fatos | Identificador antes de nome; evidência e versão por campo; distinção entre registro público, declaração da empresa e revisão. Voltar à busca sem perder filtros. | Planejado. |
| UX-07 | Contribuição e retorno | Explicar campos, autorização, finalidade, destinatários, qualidade, atualização e benefícios; manter dados próprios exportáveis nos termos aplicáveis; acesso coletivo condicionado a elegibilidade real. | Planejado; depende de controles de acesso. |
| UX-08 | Revisão transversal | Concluir jornada em celular/teclado, zoom, movimento reduzido, fontes indisponíveis, filtros vazios e mensagens de erro; registrar limites de verificação e tarefas com usuários. | Incremental; retestar áreas alteradas. |

Os critérios são condições de entrega, não funcionalidades já publicadas. Persistência, autenticação e conectores não serão expandidos apenas para sustentar uma maquete. A próxima etapa deve reutilizar esta fundação e continuar a branch/PR de UX existente enquanto estiver aberta, conciliando eventuais mudanças remotas antes de editar.

## Contratos de dados e estados

- **Escopo:** filtros ativos e contagens por fonte. Período da série, corte da carteira e aquisição da imagem são relógios diferentes.
- **Fonte:** origem, URL quando disponível, unidade, abrangência, atualização, restrição de uso e limite interpretativo.
- **Notícias:** distinguir publicação, evento conhecido e última atualização do feed; um possível impacto é hipótese contextualizada.
- **Estados mínimos:** carregando, vazio inicial, nenhum resultado, parcial, desatualizado, indisponível, sem autorização e sucesso. Exibir somente estados que o sistema consiga conhecer.
- **Privacidade:** dados empresariais brutos ficam no espaço autorizado. Não expor dados restritos em exportações, mapas, URLs, logs ou consultas externas.
- **Acesso institucional:** explicar escopo e fundamento do compartilhamento; cadastro de empresa não implica entrega invisível de dados ao governo.

## Verificação e passagem

A entrega tem critérios de comportamento em `tests/workbench.test.cjs`; as suítes Python e o caminho sem dependências são exigidos por `AGENTS.md`. A revisão visual deve cobrir desktop e larguras móveis, incluindo seletor longo, mapa, alternativa tabular e exportação. A evidência observada desta etapa fica em `docs/VERIFICATION.md`.

Antes de integrar satélite ou notícias novos, consultar as fontes oficiais e testar o contrato e as condições de uso; uma integração indisponível não será simulada como pronta. Testes internos e inspeção visual não substituem tarefas com usuários representativos. Medir compreensão do recorte e tempo para localizar a evidência antes de alegar ganho de produtividade.
