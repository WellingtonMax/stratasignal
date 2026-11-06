# Camada geoespacial do StrataSignal

## Escopo e estágio

O explorador integrado à **Visão da carteira** representa as **participações declaradas por país** nas posições de aquisição de cada especificação mineral. O mapa não afirma conhecer coordenadas de minas, refinarias, portos, fornecedores ou rotas. País de origem pode significar extração, beneficiamento, refino ou embarque, dependendo do contrato e dos dados fornecidos.

Os círculos têm tamanho proporcional à participação declarada de cada país para a especificação selecionada. A seleção de uma origem preenche o campo de país do simulador existente, **mas não executa uma nova simulação automaticamente**. Use o botão "Calcular cenário" para atualizar os resultados. O mapa não modifica as regras analíticas, os resultados exportados ou a natureza do conjunto.

## Cartografia e observação por satélite

1. **Padrão local/offline:** contornos de terras de **Natural Earth 1:110m**, dados públicos de uso livre, convertidos e simplificados para o SVG incluído no pacote. Essa base geográfica aproximada funciona sem rede e não representa limites administrativos precisos. Fonte: https://www.naturalearthdata.com/about/terms-of-use/
2. **NASA GIBS, camada Blue Marble:** composição visual histórica de observações da Terra, com data explícita **2004-01-01** no serviço de mosaicos. Não é imagem em tempo real.
3. **NASA GIBS, Terra/MODIS:** camada de reflectância corrigida (cores verdadeiras) de **uma data específica**, inicialmente cinco dias UTC antes da data atual do navegador para reduzir a possibilidade de mosaicos ainda não publicados. A disponibilidade e qualidade podem variar: nuvens, resolução, períodos ausentes e atraso de publicação são esperados. O usuário não deve interpretar a data como garantia de cobertura.
4. As imagens utilizam o padrão **OGC WMTS**, projeção Web Mercator EPSG:3857, em mosaicos da NASA, sem token de API neste protótipo. Camadas: BlueMarble_NextGeneration e MODIS_Terra_CorrectedReflectance_TrueColor. Zoom limitado a 6 no cliente. Referências oficiais:
   - https://nasa-gibs.github.io/gibs-api-docs/access-basics/
   - https://nasa-gibs.github.io/gibs-api-docs/map-library-usage/
   - https://www.nasa.gov/nasa-brand-center/images-and-media/

A NASA não patrocinou, avaliou ou aprovou este produto. Atribuições NASA GIBS / NASA Earthdata e Natural Earth devem ser preservadas; o enquadramento comercial deverá observar as respectivas diretrizes de uso.

## Privacidade e segurança

- **Sem consentimento de mapa, não há pedido de imagens externas.** O explorador usa apenas o SVG cartográfico incluído no projeto, sem CDN e sem biblioteca JavaScript externa.
- O botão **Ativar imagens NASA** autoriza carregar mosaicos do domínio fixo gibs.earthdata.nasa.gov. A NASA (e a infraestrutura de rede intermediária) poderá observar endereço IP, data/hora e coordenadas/níveis dos mosaicos requisitados, como em qualquer recurso externo. As URLs não incluem identificador de cliente, fornecedor, material, preço, documento ou conteúdo de arquivo. Referrers são suprimidos nas imagens.
- O processo de análise dos dados da carteira permanece **local**. Não se realizam buscas de coordenadas em serviços de terceiros nem se enviam CSV/JSON, relatórios ou credenciais da API local. Os tiles são recursos visuais apenas.
- O CSP autoriza imagens externas **somente** do host fixo NASA GIBS; conexões programáticas continuam restritas à própria origem, assim como os scripts. Se imagens estiverem bloqueadas pelo navegador, por uma rede corporativa ou indisponíveis, a cartografia integrada permanece funcional.
- Para mapas internos de clientes que exijam isolamento estrito, **não ative imagens externas**. O botão pode ser removido ou o CSP endurecido numa implantação personalizada.
- Países sem âncora geográfica no dicionário offline são exibidos na lista textual, sem marcador. Suas participações não são recalculadas nem descartadas da análise.

## Limites e próximos passos

Os marcadores são **âncoras visuais aproximadas para países**, não centroides oficiais com precisão cadastral. Isso impede inferir a localização física de cadeias produtivas. Uma futura camada de instalações/fluxos somente deverá ser implementada a partir de fonte identificada e licenciada, identificador de sítio, período de validade, tipo de atividade (extração/refino/exportação) e nível de confiança registrado. Não inferir movimentação física por proximidade gráfica.

O satélite mostra o terreno e a cobertura observada naquele instante; por si só, não prova capacidade produtiva, volumes extraídos, restrições comerciais, estoques ou interrupções. A triagem de riscos deve continuar apoiada em dados de compras, comércio, legislação, documentos e validação humana.

## Como reproduzir

Na instalação local, execute: python -m stratasignal serve

Abra a **Visão da carteira**, carregue o exemplo fictício ou analise seus dados autorizados, selecione uma especificação, clique nos países e experimente a simulação. Use **Ativar imagens NASA** para a camada externa.

Demonstração sintética: python -m stratasignal.build_demo --out /tmp/stratasignal-public-geo --without-ml

O comando não publica o site na Internet; a hospedagem é um processo separado.

Testes: python -S -m unittest discover -s tests -v; npm ci --ignore-scripts && npm test.
