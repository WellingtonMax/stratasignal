# Pesquisa de mercado e hipótese de produto — StrataSignal

**Data de referência: 6 de novembro de 2026.** Pesquisa documental em fontes primárias; nenhuma entrevista com comprador, venda ou validação de preço foi realizada. O nome é provisório. Links foram consultados nesta data.

## Decisão recomendada

Construir um serviço de inteligência de abastecimento de minerais críticos, apoiado por software privado: identificar concentração de compras, lacunas de evidência, padrões de atraso e o efeito de reduções de fornecimento sobre o estoque. O primeiro recorte comercial a testar é **grafita industrial em especificações homogêneas**, junto a distribuidores, transformadores e consultorias de suprimentos. Terras raras são uma expansão possível, a ser delimitada por produto e competência técnica.

O serviço responde a uma pergunta operacional: **qual posição de compra merece intervenção e qual evidência sustenta essa prioridade?** O cliente recebe diagnóstico, relatório interativo, fila de conferência e revisão das premissas. O MVP local já implementa esse fluxo analítico. A oferta comercial permanece uma hipótese.

## Evidências que sustentam a investigação

| Evidência primária | Implicação para o produto | O que ela não demonstra |
|---|---|---|
| A IEA relata aumento da concentração no refino e ampliação dos controles de exportação no Outlook 2026. Excluindo terras raras, a participação média do principal país refinador chegou a 72% em 2025. [S1] | Origem e concentração precisam aparecer na análise de compras, com distinção entre extração, refino e embarque. | Não permite calcular a probabilidade de ruptura de um fornecedor específico. |
| Pesquisa IEA/OCDE com mais de 80 empresas aponta custo, interoperabilidade e compartilhamento de informações como barreiras. A cobertura além de fornecedores diretos permanece limitada. [S2–S3] | Há razão para testar uma entrada pequena, com dados já existentes e entrega assistida. | Não prova que pequenas empresas brasileiras contratarão este serviço. |
| A Casa Civil anunciou em 05/11/2026 uma lista de 27 minerais prioritários em três classes, incluindo grafita e terras raras na primeira classe. [S4] | Há atenção institucional recente ao setor; acompanhar a cadeia e seus dados pode ganhar relevância. | Não concede benefícios ao produto nem comprova demanda por software. A aplicação jurídica exige os atos oficiais e análise própria. |
| O MDIC oferece dados mensais por NCM, país, volume e valor em CSV. [S5] | O contexto comercial agregado pode ser preparado sem comprar um feed proprietário. | Não identifica fornecedores, pureza, capacidade disponível ou a rota física de um lote. |
| A USGS publica o Mineral Commodity Summaries 2026 e seu conjunto de dados. [S6] | Há uma base pública complementar para contexto mineral e cobertura futura. | Não é uma série diária de preços nem um feed de entregas empresariais. Não foi integrado ao MVP. |

A inferência é comercial: existe um problema setorial verificável, mas a oportunidade específica depende da frequência da dor, do orçamento do comprador e do acesso aos seus registros. O entusiasmo geopolítico, infelizmente, não assina contrato.

## Alternativas consideradas

Avaliação qualitativa para uma operação inicial pequena; não é uma medição estatística do mercado.

| Oportunidade | Dados e competência necessários | Facilidade de um piloto pequeno | Decisão |
|---|---|---|---|
| Descoberta geológica por ML | Dados geológicos, geoquímicos, geofísicos, licenças e validação de campo | Baixa | Não é o primeiro produto |
| Previsão de preço de terras raras | Séries por composto, pureza, praça e termos; dados licenciados e mudanças de regime | Baixa | Adiar |
| Rastreabilidade física integral | Adesão de múltiplos elos, integração e auditoria material | Baixa a média | Integrar a parceiros no futuro |
| Verificação de qualidade de dados de compras | Arquivos próprios, definições claras e revisão humana | Alta | Parte do primeiro serviço |
| Exposição de abastecimento e simulação de estoque | Alocações, demanda, estoque e prazos do cliente | Alta | Núcleo do MVP |
| Estimativa de atraso de pedidos | Histórico com datas de pedido, promessa e recebimento; desfechos suficientes | Média | Módulo experimental com abstenção |

## Concorrência e posicionamento

| Concorrente | Oferta anunciada | Consequência para a entrada |
|---|---|---|
| Benchmark Mineral Intelligence | Preços, previsões, inteligência de cadeias e acesso a analistas. [S7] | Não disputar cobertura global e preços proprietários no início. |
| MineSpans / McKinsey | Modelos de ativos, oferta, demanda, custos e ESG em várias cadeias. [S8] | Um painel amplo de mineração seria uma disputa inadequada para este estágio. |
| Circulor | Rastreabilidade, evidências de cadeia e passaportes digitais. [S9] | Rastreabilidade comprovada exige dados e verificação além dos metadados. |
| Minespider | Passaportes, documentos, integração e compartilhamento controlado. A página consultada anuncia planos anuais de €11.900, €19.700 e €34.500. [S10] | É evidência de uma categoria comercial adjacente, não uma referência direta para o preço de um diagnóstico menor. |

Não foi demonstrada exclusividade técnica: os concorrentes também tratam dados, evidências e risco. O posicionamento a testar combina **escopo pequeno, implementação assistida, processamento local, metodologia explícita e uma decisão prática por relatório**. Um cliente pode usar a entrega como preparação para um sistema maior. O diferencial precisa ser confirmado nas entrevistas.

## Comprador inicial e situações de contratação

Priorizar responsáveis por compras, operações ou qualidade que mantenham registros em arquivos e dependam de poucas fontes para uma especificação industrial. Uma consultoria de suprimentos pode ser um canal inicial: ela conhece a demanda e fornece a revisão setorial; o produto organiza os dados e a entrega.

Situações de uso a investigar: pedido crítico com atrasos recorrentes; revisão de estoque de segurança; concentração em uma origem; troca de fornecedor; documentos vencidos ou conflitantes; preparação de um diagnóstico para a diretoria.

Os exemplos abaixo são **empresas reais identificadas por páginas públicas**, úteis para entender segmentos e buscar entrevistas caso o usuário autorize contato. Não são clientes, leads qualificados, empresas com falhas detectadas ou demonstração de interesse. Nenhum contato foi realizado.

| Exemplo | Fato publicado pela própria empresa | Uso nesta pesquisa |
|---|---|---|
| Nacional de Grafite | Catálogo com flocos, micronizados, dispersões e outras formas. [S11] | Mostra por que um único rótulo “grafita” mistura produtos distintos; referência técnica de segmentação. |
| SEA Grafite | Descreve fabricação com matéria-prima importada e certificada. [S12] | Hipótese de segmento com dependência de suprimento e documentação; confirmar grau e forma antes de selecionar NCM. |
| Carbomec | Apresenta atuação em carvões e grafites industriais e distribuição Toyo Tanso. [S13] | Exemplo de transformador/distribuidor; pode envolver grafite sintético, que exige outro recorte. |
| Santolli Grafite | Declara distribuição de fabricantes nacionais e importados. [S14] | Exemplo de canal industrial; aderência deve ser investigada. |
| IBAR | Descreve refratários MgO-C com grafite em sua composição. [S15] | Exemplo de aplicação consumidora; porte, acesso e necessidade de compra não foram avaliados. |

Não confundir grafita natural com grafite sintético/isostático, óxido NdPr com ímã pronto ou minério com material refinado. O catálogo comercial e a especificação devem vir antes da estatística agregada. A validação de teor, contaminação, substituição e homologação cabe a um especialista técnico do cliente ou parceiro.

## Oferta inicial e hipóteses de preço

Valores abaixo são **propostas para teste**, não preços observados de mercado, cotações ou promessas de receita. Não há cobrança nem contratação configurada.

| Pacote de teste | Entrega proposta | Faixa a experimentar |
|---|---|---|
| Diagnóstico de entrada | Até 3 especificações e 10 posições de compra; uma carga de dados, uma revisão e uma reunião de até 45 minutos | R$ 2.500–6.000 ou US$ 500–1.200, conforme país e escopo |
| Acompanhamento mensal | Uma atualização mensal, relatório comparável e revisão de pendências; teto de volume e de horas definido em contrato | R$ 1.200–3.500 ou US$ 250–750/mês |
| Integração específica | Mapeamento de exportação do ERP, tratamento de dados e documentação de operação | Orçamento separado após conhecer os arquivos |

As faixas em BRL e USD são propostas independentes para segmentos diferentes, não conversão cambial. Não incluir parecer jurídico, auditoria certificadora, homologação de fornecedor ou consultoria mineral especializada nesse preço.

Uma conta de capacidade, e não uma previsão: quatro clientes a R$ 1.500/mês representam R$ 6.000 de receita bruta mensal. Se cada um exigir quatro horas de serviço, são 16 horas de entrega, além de aquisição, preparação inicial, suporte, impostos e custos. O piloto deve medir essas horas; se o trabalho ultrapassar o teto, reduzir escopo ou reajustar a oferta. Não há base para projetar margem ou probabilidade de atingir essa receita.

## Como validar sem transformar a ideia em um projeto interminável

1. Selecionar um único segmento e realizar dez entrevistas com responsáveis por compras/qualidade. Investigar um episódio recente, sua consequência, o processo atual e o orçamento de resolução.
2. Buscar duas organizações dispostas a fornecer um conjunto autorizado, minimizado e pseudonimizado para diagnóstico. A função comercial continua útil sem ML; não exigir histórico artificial apenas para apresentar um modelo.
3. Vender um piloto com escopo, prazo e critérios escritos. Medir horas de preparação, discrepâncias confirmadas, decisões apoiadas e utilidade percebida pelo responsável.
4. Quando houver histórico suficiente, comparar o modelo com a frequência histórica, avaliar estabilidade em outros cortes, calibração e comportamento prospectivo. A métrica em dados sintéticos não entra na promessa comercial.
5. Avançar para assinatura quando existir ao menos um piloto pago e uma necessidade recorrente confirmada. Se as entrevistas mostrarem pouco valor, orçamento ausente ou dados inviáveis, revisar o nicho antes de ampliar o software.

Perguntas centrais: “qual foi a última compra que comprometeu o planejamento?”, “quanto tempo levou para reunir as informações?”, “quem poderia aprovar um diagnóstico?”, “como essa análise mudaria uma decisão?” e “qual dado vocês não poderiam compartilhar?”. Não perguntar apenas se a pessoa “gostou da ideia”.

Não há estimativa confiável de TAM/SAM/SOM nesta pesquisa: faltam universo de compradores compatíveis, incidência da dor e disposição de pagar. Os números agregados do setor mineral não medem o mercado deste serviço.

## Produto entregue e trabalho restante

O repositório contém motor analítico local, relatório interativo, simulador, metadados básicos de arquivo, triagem de manifestações documentais, regressão logística experimental, importador de CSV Comex, testes e documentação de segurança.

Ainda necessários: validação comercial, dados reais autorizados, revisão de um profissional de suprimentos/minerais, avaliação prospectiva do modelo e operação de um piloto. Um eventual SaaS acrescentaria autenticação, autorização, isolamento de clientes, criptografia e gestão de segredos, retenção, restauração e monitoramento; nada disso é declarado como implementado. A primeira versão não tem backend hospedado nem recebe documentos pela internet.

## Fontes primárias

- **[S1] IEA, Global Critical Minerals Outlook 2026 — Executive summary:** https://www.iea.org/reports/global-critical-minerals-outlook-2026/executive-summary
- **[S2] IEA/OCDE, Critical Mineral Traceability for Energy and Economic Security (22/04/2026):** https://www.iea.org/reports/critical-mineral-traceability-for-energy-and-economic-security
- **[S3] Sumário executivo do relatório de rastreabilidade:** https://www.iea.org/reports/critical-mineral-traceability-for-energy-and-economic-security/executive-summary
- **[S4] Casa Civil, lista brasileira de minerais críticos e estratégicos (05/11/2026):** https://www.gov.br/casacivil/pt-br/assuntos/noticias/2026/novembro/governo-federal-aprova-lista-brasileira-de-minerais-criticos-e-estrategicos
- **[S5] MDIC, Estatísticas de Comércio Exterior em Dados Abertos:** https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/estatisticas/base-de-dados-bruta
- **[S6] USGS, Mineral Commodity Summaries 2026:** https://www.usgs.gov/publications/mineral-commodity-summaries-2026
- **[S7] Benchmark Mineral Intelligence:** https://www.benchmarkminerals.com/
- **[S8] MineSpans:** https://www.mckinsey.com/industries/metals-and-mining/how-we-help-clients/minespans/overview
- **[S9] Circulor:** https://circulor.com/
- **[S10] Minespider, plataforma e preços publicados:** https://www.minespider.com/pt/platform
- **[S11] Nacional de Grafite, catálogo:** https://grafite.com/nossos-produtos
- **[S12] SEA Grafite, apresentação da operação:** https://seagrafite.com.br/contato/
- **[S13] Carbomec, empresa:** https://www.carbomec.com.br/empresa.php
- **[S14] Santolli Grafite:** https://santolligrafite.com.br/
- **[S15] IBAR, refratários básicos:** https://ibar.com.br/detalhe-produto/conformados/basicos

Os relatórios IEA consultados indicam CC BY 4.0, mas direitos e condições de bases ou componentes de terceiros precisam ser verificados antes de redistribuição comercial. O protótipo não redistribui bases proprietárias, índices comerciais nem conteúdo de clientes.
