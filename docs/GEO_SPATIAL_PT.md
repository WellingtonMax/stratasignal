# Camada geoespacial do StrataSignal

## Escopo e estágio

O explorador integrado à **Visão da carteira** representa as **participações declaradas por país** nas posições de aquisição de cada especificação mineral. O mapa não afirma conhecer coordenadas de minas, refinarias, portos, fornecedores ou rotas. País de origem pode significar extração, beneficiamento, refino ou embarque, dependendo do contrato e dos dados fornecidos.

**Atlas fictício com satélite** no panorama público abre o atlas da carteira fictícia, com o globo voltado para o Brasil. Use **Globo** e **Mapa plano** para trocar a projeção mantendo o centro, o nível de zoom, as datas e o recorte da carteira. A área visível muda com a projeção. **Centralizar país** traz a âncora escolhida para o centro das duas vistas. Arraste ou use as setas com o mapa em foco. No toque, o gesto horizontal gira ou desloca a vista e o gesto vertical permite rolar a página. A lista de origens e a tabela continuam acessíveis.

Os círculos têm tamanho proporcional à participação declarada de cada país para a especificação selecionada. A seleção de uma origem preenche o campo de país do simulador existente, **mas não executa uma nova simulação automaticamente**. Use o botão "Calcular cenário" para atualizar os resultados. O mapa não modifica as regras analíticas, os resultados exportados ou a natureza do conjunto.

## Mapa público de parceiros comerciais

**Mapa** no panorama mostra os parceiros com registros no produto, fluxo e período selecionados. A tabela reúne o valor FOB e o peso líquido de todos esses parceiros. A escolha pela tabela destaca o país e filtra os gráficos, as notícias e o relatório. A seleção continua ativa ao navegar dentro do panorama. O mês de publicação das notícias segue seu próprio seletor.

O mapa reutiliza o contorno Natural Earth da carteira e plota as posições de rótulo `LABEL_X` e `LABEL_Y` da coleção Admin 0 – Countries 5.1.1, arredondadas a um décimo de grau. A correspondência é explícita para os nomes do Comex Stat. Parceiros sem correspondência ficam na tabela e na lista de lacunas do relatório. A posição serve para orientação por país, com círculos de tamanho fixo e um anel para a seleção. O navegador lê o contorno do próprio Site. [Coleção de países](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/) · [Condições de uso](https://www.naturalearthdata.com/about/terms-of-use/)

## Cartografia e observação por satélite

1. **Padrão local/offline:** contornos de terras de **Natural Earth 1:110m**, dados públicos de uso livre, convertidos e simplificados para o SVG incluído no pacote. Essa base geográfica aproximada funciona sem rede e não representa limites administrativos precisos. Fonte: https://www.naturalearthdata.com/about/terms-of-use/
2. **NASA GIBS, camada Blue Marble:** composição visual histórica de observações da Terra, com data explícita **2004-01-01** no serviço de mosaicos. Não é imagem em tempo real.
3. **NASA GIBS, Terra/MODIS:** composição diária de reflectância corrigida em cores verdadeiras. Após ativar as imagens externas, selecione Terra/MODIS, escolha a data UTC e use **Aplicar data**. A sugestão inicial usa cinco dias antes da data UTC do navegador, limitada à última data elegível do catálogo. O painel mostra a data solicitada, o produto nominal de 250 m/pixel no equador e o resultado do carregamento dos mosaicos. O zoom do painel usa mosaicos mais agregados. Nuvens, cobertura ausente e atraso de publicação limitam a leitura. O recebimento de um mosaico comprova apenas a resposta da imagem.
4. O **mapa plano** usa mosaicos OGC WMTS da NASA em Web Mercator (EPSG:3857). O **globo** usa OGC WMS 1.1.1 em EPSG:4326 para obter uma imagem global de 1536 × 768 pixels por vista e data. A projeção ortográfica é calculada no navegador. Girar ou ampliar reutiliza a imagem global carregada. A ampliação do globo não aumenta a resolução da fonte. As duas projeções usam BlueMarble_NextGeneration e MODIS_Terra_CorrectedReflectance_TrueColor, sem token. Referências oficiais:
   - https://nasa-gibs.github.io/gibs-api-docs/access-basics/
   - https://nasa-gibs.github.io/gibs-api-docs/map-library-usage/
   - https://www.nasa.gov/nasa-brand-center/images-and-media/

A NASA não patrocinou, avaliou ou aprovou este produto. Atribuições NASA GIBS / NASA Earthdata e Natural Earth devem ser preservadas; o enquadramento comercial deverá observar as respectivas diretrizes de uso.


O catálogo local usa os 11 intervalos diários que o [DescribeDomains da NASA](https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/MODIS_Terra_CorrectedReflectance_TrueColor/default/GoogleMapsCompatible_Level9/all/all.xml) retornou em 07/11/2026. A faixa total vai de 24/02/2000 a 07/11/2026, com lacunas. O seletor exige uma data dentro de um dos intervalos e mantém o último recorte aplicado ao rejeitar uma data. Datas publicadas posteriormente dependem de atualização do catálogo. Alterar a data conserva o enquadramento e as alocações.

Em **Comparar duas datas**, escolha um segundo dia UTC distinto e aplique. As vistas A e B compartilham o centro, o nível de zoom e a projeção. Arraste qualquer vista, use as setas com o mapa em foco ou use os controles comuns de zoom. Em telas estreitas, as vistas ficam empilhadas. Cada vista mostra sua data solicitada e seu carregamento. A vista com falha mantém a cartografia local. O gráfico e a tabela de alocações continuam disponíveis. **Encerrar comparação** volta à imagem de referência. Desativar imagens externas remove as duas camadas e impede novas requisições de imagem.

Imagens fornecidas pelo NASA Global Imagery Browse Services (GIBS), parte do Earth Science Data and Information System (ESDIS) da NASA. Consulte as [orientações de uso e crédito](https://nasa-gibs.github.io/gibs-api-docs/#data-use-guidance-and-acknowledgements) e o [produto Terra/MODIS](https://gis.earthdata.nasa.gov/portal/home/item.html?id=780c03ffe3dc42e8bb03ca3b07bb283e).

## Privacidade e segurança

- **Sem consentimento de mapa, não há pedido de imagens externas.** O explorador usa apenas o SVG cartográfico incluído no projeto, sem CDN e sem biblioteca JavaScript externa.
- O botão **Ativar imagens NASA** autoriza imagens do domínio fixo gibs.earthdata.nasa.gov. A NASA pode observar IP, data/hora e a camada consultada. No mapa plano, também recebe coordenadas e níveis dos mosaicos. O globo solicita sempre a mesma extensão mundial e calcula a posição localmente. As URLs não incluem identificador de cliente, fornecedor, material, preço, documento ou conteúdo de arquivo. As imagens usam referrer suprimido e o WMS é carregado com CORS anônimo.
- O processo de análise dos dados da carteira permanece **local**. Não se realizam buscas de coordenadas em serviços de terceiros nem se enviam CSV/JSON, relatórios ou credenciais da API local. Os tiles são recursos visuais apenas.
- O CSP autoriza imagens externas **somente** do host fixo NASA GIBS; conexões programáticas continuam restritas à própria origem, assim como os scripts. Se imagens estiverem bloqueadas pelo navegador, por uma rede corporativa ou indisponíveis, a cartografia integrada permanece funcional.
- Para mapas internos de clientes que exijam isolamento estrito, **não ative imagens externas**. O botão pode ser removido ou o CSP endurecido numa implantação personalizada.
- Países sem âncora geográfica no dicionário offline são exibidos na lista textual, sem marcador. Suas participações não são recalculadas nem descartadas da análise.

## Limites e próximos passos

Os marcadores são **âncoras visuais aproximadas para países**, não centroides oficiais com precisão cadastral. Isso impede inferir a localização física de cadeias produtivas. Uma futura camada de instalações/fluxos somente deverá ser implementada a partir de fonte identificada e licenciada, identificador de sítio, período de validade, tipo de atividade (extração/refino/exportação) e nível de confiança registrado. Não inferir movimentação física por proximidade gráfica.

O satélite mostra o terreno e a cobertura observada naquele instante; por si só, não prova capacidade produtiva, volumes extraídos, restrições comerciais, estoques ou interrupções. A triagem de riscos deve continuar apoiada em dados de compras, comércio, legislação, documentos e validação humana.

| Fonte | Uso avaliado | Condição de acesso |
| --- | --- | --- |
| [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/) | Blue Marble para o contexto global e Terra/MODIS para datas comparáveis. | Integração atual em endpoints públicos sem chave, com atribuição. |
| [Google Maps Photorealistic 3D Tiles](https://developers.google.com/maps/documentation/tile/usage-and-billing) | Relevo e construções em 3D nas áreas cobertas. | Requer credencial e faturamento habilitado, inclusive com franquia. Não integrado. |
| [Copernicus Sentinel-2 L2A](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html) | Bandas RGB de 10 m para cenas e áreas selecionadas. | O [Sentinel Hub](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Overview/Authentication.html) usa OAuth e tem [cotas](https://documentation.dataspace.copernicus.eu/Quotas.html). Não integrado. |

## Como reproduzir

Na instalação local, execute: python -m stratasignal serve

Abra a **Visão da carteira**, carregue o exemplo fictício ou analise seus dados autorizados, selecione uma especificação, clique nos países e experimente a simulação. Use **Ativar imagens NASA** para a camada externa.

Demonstração sintética: python -m stratasignal.build_demo --out /tmp/stratasignal-public-geo --without-ml

O comando não publica o site na Internet; a hospedagem é um processo separado.

Testes: python -S -m unittest discover -s tests -v; npm ci --ignore-scripts && npm test.
