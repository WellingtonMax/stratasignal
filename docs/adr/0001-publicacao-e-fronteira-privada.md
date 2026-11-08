# ADR 0001 Publicação estática e fronteira privada

8 de novembro de 2026. F0/SS01 da Diretiva de Implementação v1.0.

## Decisão

Manter um repositório canônico e um publicador estático para o observatório. O build empacota dados públicos aprovados e a demonstração da carteira, que usa exclusivamente dados fictícios. O motor Python e o processamento de dados empresariais continuam no aplicativo local. Quando houver um serviço privado, evoluir o mesmo repositório como monólito modular, com API e workers em processos separados. O serviço poderá consumir versões públicas aprovadas. Sua entrega dependerá dos controles de identidade, isolamento e armazenamento descritos em [Security](../../SECURITY.md).

Antes de publicar uma mudança, identificar o commit integrado, a versão de cada carga e a publicação que recebe o pacote. O SHA do código no manifesto, o SHA do pacote no repositório do Site e o número da versão do Site identificam objetos distintos. Se uma nova carga falhar, o build atual termina com erro. A última publicação verificada fica disponível para recuperação. A política de coleta e o cálculo de hashes estão no [procedimento de build](../DEVELOPMENT.md#build-the-public-trade-panorama).

## Linha de base conferida

Em 8 de novembro de 2026, às 10h28 de Brasília, a versão pública era a **20**. A comparação no GitHub mostrou três commits no [PR #9](https://github.com/WellingtonMax/stratasignal/pull/9) à frente do `main`.

| Evidência | Referência observada |
| --- | --- |
| Commit integrado em `main` | `7a4e9b05ae2a39d04e800ff5dae9a32ec4f1377e` |
| Commit canônico em `source-manifest.json` servido | `922052c154172cf4d6877f807963317d6c9e4b20`, head do PR #9 |
| Versão 20 no Site e commit do pacote | `ad264b2cb66f33ad21119cfbc5bdbd06c1e0c4fc`, implantação confirmada |
| Carga Comex Stat | Ago–out de 2026, 79 registros, consultada às 08h15 UTC. SHA-256 `e4963bf0590be3ea8f745c5d15505a2b3064061f165c458eaf35c58f7bb2b79b` |
| Carga BACI | Edição 202601, HS 2022, anos 2022–2024. O hash do catálogo coincide com o manifesto público. |

O [Panorama](https://stratasignal.com.br/#explorar) concentra série oficial mensal, mapa de parceiros, fontes, notícias e exportação por recorte. [Mercados](https://stratasignal.com.br/mercados/?pais=BR&produto=250410&fluxo=export) usa o BACI para comércio anual. As séries nacionais de ferro e o cadastro de bolsas têm fontes próprias. [Carteira](https://stratasignal.com.br/carteira/) permanece identificada como fictícia e separada da carga pública.

O navegador mostrou US$ 7.923.071 FOB e 3.482.994 kg para exportações brasileiras de grafita NCM 25041000 no período inteiro. A seleção dos Estados Unidos pelo teclado abriu o recorte de destino. A tabela e o JSON baixado somaram US$ 2.980.767 e 1.309.529 kg em três meses. O campo `source.snapshot_sha256` do relatório coincide com o hash da carga no manifesto servido. Recarregar o Panorama sem parâmetros voltou às importações e a todos os parceiros.

O build canônico reexecutado com o código de origem da versão 20 gerou os mesmos arquivos de interface e de Mercados. Os arquivos `comex.json`, `news.json` e o manifesto raiz mudaram com a nova coleta. A nova carga Comex teve os mesmos 79 registros e a mesma janela. Para reproduzir a edição publicada, usar o pacote retido e conferir seus hashes. A recompilação com a API atual representa outra coleta.

No conteúdo equivalente ao `main`, passaram 112 testes Python, 104 no modo sem dependências com 8 opcionais ignorados, e 51 testes DOM após `npm ci --ignore-scripts`. O CI de testes e empacotamento do PR #9 passou. O CodeQL gerou SARIF e falhou na etapa de envio. O log do [workflow](https://github.com/WellingtonMax/stratasignal/actions/runs/42479508008) registra code scanning desativado e acesso insuficiente da integração. O pacote servido a partir do PR aberto expõe risco de regressão em uma publicação reconstruída somente a partir do `main`.

## Aceite do piloto e reversão

Para testar o primeiro fluxo de F1, abra Brasil e grafita HS 250410 em Mercados, escolha o fluxo e siga ao Panorama. O destino deve preservar o fluxo com NCM 25041000. O país no mapa e no relatório oficial representa o parceiro comercial. As duas fontes mantêm suas unidades e janelas próprias.

Na prévia de 8 de novembro, uma nova consulta retornou HTTP 429. O build de verificação reutilizou as cargas da v20 após conferir seus hashes. No Chromium, o atalho apareceu em 320, 768 e 1280 px CSS e com zoom real de 200%, sem rolagem horizontal da página. Enter levou o foco à seção do Panorama. O recorte de exportação persistiu após recarregar, e a volta ao BACI preservou a troca para importação. Antártida mostrou zero de três anos com registro e o atalho brasileiro ficou oculto. A árvore de acessibilidade expôs a seção e o link com seus nomes.

O JSON baixado na prévia conferiu com gráfico e tabela. Exportações de agosto a outubro de 2026 somaram 54 registros, 27 parceiros, US$ 7.923.071 FOB e 3.482.994 kg, com o SHA-256 da carga v20. Os testes DOM do piloto cobrem o atalho fora do recorte, parâmetros inválidos e a equivalência do relatório.

O próximo contrato do Comex Stat precisa fixar o grão e a edição da classificação, manter duas revisões recuperáveis e distinguir ausência de registro de zero observado. A publicação que adotar o contrato deverá preservar uma edição anterior verificável e mostrar o estado da fonte quando falhar uma atualização.

O incremento SS02 implementa a primeira parte desse contrato. Cada pacote passa a expor a carga corrente em uma rota content-addressed e pode carregar a edição aprovada anterior sem alterar seus bytes. O Panorama mostra a edição efetivamente lida, e o relatório aponta para o mesmo arquivo congelado. O manifesto lista as edições retidas. O grão permanece mês × NCM × fluxo × país parceiro, com FOB em USD correntes e peso líquido em quilogramas. A classificação ainda é identificada pelo NCM de oito dígitos informado na consulta. O próximo incremento deverá versionar explicitamente a edição da tabela NCM e testar uma correção de classificação, sem inferi-la apenas do código.

Para reverter uma publicação, selecionar no Site a versão aprovada anterior e conferir manifesto, rota e relatório após a reversão. Para reverter esta navegação no código, reverter o commit do atalho e reconstruir o pacote com a carga aprovada.
