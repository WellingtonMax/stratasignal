# StrataSignal — arquitetura da experiência e backlog de UX

Atualização em 10 de novembro de 2026. Este documento traduz os planos de produto, UX e negócios em entregas incrementais no repositório canônico. As preferências visuais e de exploração mais recentes orientam a paleta e a sequência de entregas.

## Objetivo da experiência

Permitir entender onde o mineral entra, como se transforma, para onde segue e por que isso importa economicamente, sempre com evidência e período identificados. O observatório público, os espaços empresariais privados e o acesso institucional autorizado são experiências distintas. O modelo atual tem um panorama público de comércio, uma carteira sintética e um aplicativo local. Espaços empresariais hospedados e acesso institucional são propostas.

Cada tela deverá responder: **qual é o recorte, o que sabemos, de onde veio, quando vale e o que falta?** A informação progride de visão geral para entidade, fato, evidência e relatório. Fontes com granularidades diferentes não ganham uma equivalência fictícia.

## Arquitetura da informação

| Área | Pergunta do usuário | Organização e limite atual |
| --- | --- | --- |
| Exploração / atlas | Onde se extrai, processa e comercializa? | O panorama público localiza os parceiros comerciais por NCM, fluxo e período. A carteira fictícia oferece alocações declaradas no atlas com satélite. Instalações e cargas rastreadas seguem no backlog. |
| Mercados | Quanto cada país importa e exporta e onde consultar as bolsas? | Catálogo mundial com país, produto aduaneiro, fluxo, série anual e ranking. A consulta a bolsas segue o país. A cotação por código e as séries nacionais de ferro têm fontes e períodos próprios. |
| Organizações e instalações | Quem atua e qual é a origem dessa informação? | Mercados traz as primeiras fichas documentais de empresas no recorte de minério de ferro no Brasil. O cadastro de instalações segue no backlog. |
| Contexto mundial | O que mudou e quais relações podem ser afetadas? | Comunicados canadenses sobre lítio e contexto regulatório brasileiro para grafita, ligados ao mineral, ao mês de publicação e ao país citado. |
| Carteira privada | Onde está minha exposição e o que devo conferir? | Importação, visão da carteira, inteligência operacional, cenários e comparação já existem no aplicativo local. |
| Relatórios | Qual evidência sustenta esta leitura? | HTML e JSON para carteiras. O panorama público exporta comércio e notícias em seções separadas, com procedência e cobertura próprias. Evidências geoespaciais seguem planejadas. |
| Dados e participação | O que fornecer, quem acessa e o que recebo? | Jornada proposta de contribuição, qualidade, permissões e retorno; sem fingir autenticação ou qualificação funcional. |
| Fontes e metodologia | Qual cobertura, idade e confiança posso atribuir? | Fonte, versão, período, última consulta, lacunas, regras e revisão. Hoje: documentação e proveniência dos relatórios. |

A navegação pública tem cinco destinos. **Panorama** compara fluxos, **Mapa** localiza parceiros comerciais, **Mercados** explora séries e bolsas, **Notícias** abre a edição geral e **Carteira** leva à demonstração fictícia com atlas. A Carteira publicada também oferece esse menu, fixo durante a rolagem e separado dos controles da análise. Os links levam ao início de cada página, inclusive no celular e pelo teclado. O mapa público usa referências de países, e o atlas da Carteira identifica cenas datadas e locais demonstrativos.

## Jornadas prioritárias

1. **Explorar** → abrir **Mapa** → conferir produto, fluxo e período → selecionar um ponto ou país pela tabela → aproximar o parceiro → ver gráficos, notícias e relatório do recorte. Na carteira fictícia, comparar origens e levar a seleção ao simulador.
2. **Investigar:** filtrar mineral, país, período e empresa → abrir ficha → conferir um fato e sua evidência → relacionar o evento econômico. Depende de fontes e resolução de entidades.
3. **Contextualizar** → abrir **Notícias** para ler a edição geral ou usar **Ler notícias do recorte** para aplicar mineral, país citado e meses de publicação → conferir o comunicado original e separar o evento do possível impacto.
4. **Entregar:** reunir fatos, indicadores, imagens e notícias disponíveis → revisar cobertura e divergências → exportar relatório com filtros e fontes congelados.
5. **Contribuir:** entender finalidade, campos, destinatários e retorno → enviar dados autorizados → corrigir pendências → receber análise própria e, quando elegível, indicadores coletivos protegidos.

O primeiro contribuinte recebe análise própria enriquecida por dados públicos. Benefícios coletivos só aparecem com amostra e proteção suficientes. A interface distinguirá visitante, contribuição em validação, ativa e desatualizada quando esses estados forem sustentados por autorização e validação reais. Dados brutos de concorrentes não entram nos relatórios coletivos.

### Minha operação no mercado (proposta para UX-07)

O observatório combina registros governamentais e divulgações empresariais autorizadas. Uma ficha distingue o que foi publicado por uma fonte externa, o que a organização declarou e o que foi verificado. Nome, papel na cadeia, regiões e fontes podem aparecer num diretório de participantes mediante autorização específica. O diretório indica a cobertura disponível e limita campos de divulgação ao escopo autorizado.

| Acesso | Dados e análise disponíveis |
| --- | --- |
| Visitante | Séries e fichas publicáveis, com fonte, período, cobertura e lacunas. |
| Membro autorizado da organização | **Minha operação no mercado** cruza seus volumes, origens, destinos e etapas com as referências públicas compatíveis. Inclui participação no fluxo observado, evolução e concentração por mercado. |
| Organização com contribuição elegível | Indicadores de comparação coletiva liberados para o grupo, com cobertura e regras próprias. A elegibilidade depende de autorização, qualidade e atualização dos registros. |

O registro mínimo da operação contém organização e papel, identificador do evento, produto e classificação aplicável, etapa, período de referência, origem e destino quando conhecidos, volume, unidade, evidência e escopo autorizado. Revisão, duplicidade, incompatibilidade e dado desatualizado têm motivo visível e caminho de correção.

**Participação no fluxo observado** = volume próprio elegível ÷ volume total da referência comparável × 100. O recorte precisa coincidir em produto e edição da classificação, período, etapa, unidade e base de medida, fluxo e papéis geográficos. O numerador deve pertencer ao universo do denominador. Uma exportação de 1.000 t incluída nas 50.000 t registradas no recorte resulta em 2% do fluxo observado. As 1.000 t já estão no total. Volumes de produção, revenda interna e exportação têm denominadores próprios. A passagem do mesmo lote por mina e distribuidora não cria uma segunda exportação. Para avaliar um destino, explicitar se a referência cobre apenas o fluxo Brasil → destino ou todo o mercado de importação do destino.

A tela separa **Minha operação**, **Referência pública** e **Comparação coletiva**. Gráfico, tabela e relatório registram numerador, denominador, período, unidade, fonte, edição, atualização e qualidade. Com cobertura parcial, declarar o universo coberto. Em caso de base incompatível, inexistente ou zero, mostrar o motivo da indisponibilidade. Numerador maior que o total exige revisão. Uma referência coletiva descreve o grupo contribuinte, com regra de deduplicação, proteção contra grupos pequenos ou dominados e testes de reidentificação por filtros. Preços negociados, clientes e rotas detalhadas são privados.

**Primeiro aceite.** Na carteira fictícia, usar grafita e dois destinos para verificar a participação em um fluxo compatível, a diferença entre participação no mercado e concentração da própria carteira, a exclusão de um lote repetido e um destino sem base comparável. A prévia e o JSON devem reproduzir os mesmos resultados e motivos. A entrada de dados reais hospedados depende dos testes de isolamento da fase F3 da diretiva.

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
| UX-02A | Panorama público de comércio | Mostrar fonte, data, cobertura, unidades e lacunas. Abrir o mapa na navegação principal e selecionar um país pela tabela com teclado. Preservar o recorte ao abrir notícias e exportar. Manter parceiros sem coordenada na tabela. | Entregue para grafita natural em pó ou escamas e carbonatos de lítio. O painel do parceiro mostra valor, peso, participação no recorte, posição e distribuição mensal do valor, inclusive lacunas, além de uma ação explícita para voltar a todos; mapa e tabela compartilham a seleção. |
| UX-03 | Satélite temporal | Verificar documentação e uso da fonte; alternar globo e mapa preservando centro, zoom e data; mostrar origem, aquisição, resolução, nuvens/cobertura e falhas por vista. Nenhum ponto inventado de instalação. | Acesso ao atlas pela página Mapa. Globo e mapa plano com cartografia local, Blue Marble e comparação A/B de Terra/MODIS. País selecionado pode ser centralizado em ambas as vistas. |
| UX-04 | Notícias conectadas | Feed/API permitido, textos próprios, links originais, datas, deduplicação e associação a entidades. O mês de publicação pode divergir do período comercial sem alterar os indicadores. Exibir cobertura, atualização, erros e ausência de resultados. Rejeitar XML inseguro antes de gerar a edição seguinte. | Página própria com edição geral, resumo de cobertura, filtros de mineral, país citado e mês. Cada publicação abre o comércio do mineral no Mapa; o parceiro só é preservado quando também é citado na matéria. O caminho inverso mantém o recorte ao abrir Notícias. A edição pode ser renovada independentemente da carga comercial, após conferência de integridade. Outras regiões, empresas e descoberta editorial recorrente seguem no backlog. |
| UX-05 | Relatório consolidado do recorte | Revisar por teclado e no celular os filtros, os períodos por fonte e a cobertura antes de baixar. A prévia e o JSON compartilham o recorte. Distinguir zero, ausência de registros e fonte indisponível. A exportação reúne indicadores, evidências e notícias disponíveis, com fontes, datas, unidades, lacunas e divergências. Separar fato, inferência e previsão e evitar dupla contagem. | Mapa e Panorama têm prévia de comércio, referências cartográficas e notícias. Comércio e notícias têm períodos, proveniência e cobertura próprios no mesmo JSON. O arquivo identifica referências aproximadas e parceiros sem coordenadas. Evidências de satélite, produção e instalações seguem no backlog. |
| UX-06 | Fichas e origem dos fatos | Identificador antes de nome; evidência e versão por campo; distinção entre registro público, declaração da empresa e revisão. Voltar à busca sem perder filtros. | Primeiras fichas em Mercados para minério de ferro no Brasil. Fichas autônomas, instalações e ampliação de cobertura seguem no backlog. |
| UX-07 | Contribuição e retorno | Separar operação própria, referência pública e comparação coletiva. Exibir a participação apenas com numerador e denominador compatíveis. Explicar autorização, destinatários, qualidade e benefícios. | Jornada e primeiro aceite definidos em [Minha operação no mercado](#minha-operação-no-mercado-proposta-para-ux-07). O piloto hospedado depende de controles de acesso. |
| UX-08 | Revisão transversal | Concluir jornada em celular/teclado, zoom, movimento reduzido, fontes indisponíveis, filtros vazios e mensagens de erro; registrar limites de verificação e tarefas com usuários. | Incremental; retestar áreas alteradas. |
| UX-09 | Mercados minerais por país | Buscar país ou produto por teclado e manter o recorte no endereço. Separar séries aduaneiras, cadastro de bolsas e cotações. Indicar lacunas e peso parcial. Oferecer tabela equivalente ao gráfico e abrir o provedor por ação explícita. | 250 países e áreas no seletor, 185 recortes HS e 1.017 bolsas e mercados no catálogo. O recorte mostra participação no total mundial e posição no último ano, além da participação histórica com gráfico e tabela equivalente. O JSON congela filtros, anos, unidades, lacunas, peso parcial, benchmark histórico, ranking, bolsas, limites e SHA-256 da série. As séries nacionais de ferro permanecem acessíveis. A associação de mineradoras e a cobertura de cotações e preços de referência exigem validação por fonte. |
| UX-11 | Minério e mercado por rota | Ao selecionar um parceiro no mapa ou na tabela, mostrar valor, volume e valor declarado por unidade para o mesmo produto, fluxo e período. A prévia e o JSON devem refletir a seleção. Em etapas seguintes, ligar rotas, transformações, empresas e bolsas apenas com evidência, separar cotação, valor comercial e valor adicionado e indicar as lacunas de cobertura. | O mapa alterna valor FOB, peso líquido e valor por quilo na série mensal do parceiro. A tabela do Panorama e o JSON permitem conferir os três indicadores, inclusive meses sem registros e peso insuficiente. A participação por valor e por peso usa a base de todos os parceiros do mesmo produto, fluxo e período, com numerador e denominador visíveis no mapa e na prévia. Ligações entre instalações, empresas, fluxos físicos e séries financeiras seguem no backlog. |
| UX-10 | Páginas do observatório | Menu público persistente, inclusive ao abrir o atlas da Carteira. Cada aba leva ao início de sua página por toque ou teclado. Mapa e Panorama preservam produto, fluxo, mês e parceiro. Notícias funciona quando o comércio estiver indisponível. Aproximação no mapa com alternativa em tabela e respeito a movimento reduzido. | Rotas `/`, `/mapa/`, `/mercados/`, `/noticias/` e `/carteira/`. A Carteira mostra o menu público acima do conteúdo, separado do menu de análise. Referências antigas para mapa e notícias apontam para as novas páginas. |

Os critérios são condições de entrega, não funcionalidades já publicadas. Persistência, autenticação e conectores não serão expandidos apenas para sustentar uma maquete. A próxima etapa deve reutilizar esta fundação e continuar a branch/PR de UX existente enquanto estiver aberta, conciliando eventuais mudanças remotas antes de editar.

### Busca e cobertura em Mercados (F2, UX-09)

Após escolher país ou território, produto HS e fluxo, a cobertura informa os anos com registros BACI, a edição e o período da fonte. O cadastro informa os vínculos de bolsas do recorte e quantos países e territórios têm registros no catálogo. A consulta de cotações exige o código da listagem, com disponibilidade e atraso informados pelo provedor. Os três cartões levam à série, à busca no cadastro e à consulta por código.

O cadastro aceita nome, país, tipo ou identificador, com busca por teclado e sem distinção de acentos. Começa no país do recorte. A opção mundial amplia apenas a busca de bolsas. O endereço, os valores e o relatório preservam país, produto e fluxo do recorte comercial. Uma busca sem resultados, um país sem registros no cadastro e uma série comercial indisponível têm mensagens distintas. O catálogo atual inclui produtos aduaneiros selecionados.

**Comparar exportações e importações** reúne os dois fluxos do país ou território e produto HS selecionados. A tabela informa a edição BACI, as unidades e quantos anos têm os dois valores. O saldo usa exportações menos importações no mesmo ano. Um zero registrado entra no cálculo e uma lacuna deixa o saldo indisponível. A comparação fica acessível por teclado, independe do seletor de fluxo e entra no JSON em `flow_comparison`. Para o total mundial, o campo é nulo, pois os dois totais reconciliados somam as mesmas transações.

### Empresas documentadas em Mercados (F2, UX-06)

O recorte Brasil ou Mundo com minério de ferro (HS 2601) oferece as fichas de Vale e CSN Mineração. Cada ficha separa atividade declarada, país da atividade, bolsa e código de negociação, com links e datas das evidências. O país da listagem consta separadamente no relatório. A correspondência com HS 2601 é temática e a cobertura é parcial.

O fluxo e os anos da série BACI se aplicam ao comércio. As fichas têm sua própria data de revisão. A ação de usar um código preenche a consulta e move o foco ao campo. Exibir a cotação permanece uma ação explícita. O JSON exporta as mesmas fichas em `issuer_evidence`, separadas dos agregados. Recortes fora da cobertura e arquivo indisponível têm estados distintos. O manifesto identifica a curadoria por caminho e SHA-256. Ela reúne fatos e referências públicas, sem reproduzir relatórios empresariais, cotações ou dados da carteira privada.

### Edições verificáveis do Comex Stat

O Panorama mostra o identificador abreviado da carga que efetivamente alimentou os gráficos e oferece o JSON congelado em uma rota content-addressed. O relatório aponta para essa mesma edição e mantém separada a rota mutável da publicação corrente. Ao preparar uma nova publicação, o operador pode reter a edição anterior já conferida. O manifesto enumera ambas com hash, atualização da fonte e data de consulta. A ausência de registros permanece nula no relatório, enquanto um registro publicado com valor zero continua sendo zero observado.

O cartão da fonte oferece um histórico expansível quando há ao menos duas edições. Cada linha identifica a edição em uso ou anterior, seu hash abreviado, a data informada pela fonte e o download congelado. Hashes distintos são descritos como arquivos diferentes que exigem revisão; a interface não os chama de correção, irregularidade ou erro. Se a data da fonte não mudou, isso também fica explícito.

## Contratos de dados e estados

- **Escopo:** filtros ativos e contagens por fonte. Período da série, corte da carteira e aquisição da imagem são relógios diferentes.
- **Piloto Brasil e grafita:** Mercados leva o HS 250410 e o fluxo ao NCM 25041000 no Panorama. O Comex Stat usa seu próprio período e o filtro de país passa a representar origem ou destino parceiro. A série mensal, o mapa, a tabela e o JSON usam o recorte do Panorama. Os totais do BACI e do Comex Stat são exibidos separadamente.
- **Fonte:** origem, URL quando disponível, unidade, abrangência, atualização, restrição de uso e limite interpretativo.
- **Notícias:** distinguir publicação, evento conhecido e última atualização do feed. A fonte combina com mineral, país e período editorial e acompanha o recorte até o relatório. A contagem responde à seleção, enquanto a cobertura por feed descreve a edição. Um possível impacto é hipótese contextualizada.
- **Estados mínimos:** carregando, vazio inicial, nenhum resultado, parcial, desatualizado, indisponível, sem autorização e sucesso. Exibir somente estados que o sistema consiga conhecer.
- **Privacidade:** dados empresariais brutos ficam no espaço autorizado. Não expor dados restritos em exportações, mapas, URLs, logs ou consultas externas.
- **Acesso institucional:** explicar escopo e fundamento do compartilhamento; cadastro de empresa não implica entrega invisível de dados ao governo.

## Verificação e passagem

A entrega tem critérios de comportamento em `tests/workbench.test.cjs`; as suítes Python e o caminho sem dependências são exigidos por `AGENTS.md`. A revisão visual deve cobrir desktop e larguras móveis, incluindo seletor longo, mapa, alternativa tabular e exportação. A evidência observada desta etapa fica em `docs/VERIFICATION.md`.

Antes de integrar satélite ou notícias novos, consultar as fontes oficiais e testar o contrato e as condições de uso; uma integração indisponível não será simulada como pronta. Testes internos e inspeção visual não substituem tarefas com usuários representativos. Medir compreensão do recorte e tempo para localizar a evidência antes de alegar ganho de produtividade.
