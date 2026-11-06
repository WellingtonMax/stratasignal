# Importação de planilhas no painel local

O painel aceita arquivos CSV em UTF-8. Na planilha, use **Salvar como CSV UTF-8**. Não basta mudar a extensão de `.xlsx` para `.csv` — o Excel não se deixa converter por decreto.

Execute `python -m stratasignal serve`, entre em **Importar dados → Planilhas CSV** e escolha o código da carteira e a data de corte. Para uma comparação futura, mantenha o mesmo código e os mesmos identificadores de material e fornecedor.

## Exemplo pronto

Os três arquivos em [examples/csv-synthetic](../examples/csv-synthetic) contêm somente registros fictícios. Use separador **ponto e vírgula**, números **1.234,56**, datas **DD/MM/AAAA**, participação **percentual** e natureza **Demonstração fictícia**. Os cabeçalhos sugerem o mapeamento, mas podem ser alterados: confira cada campo no painel.

O exemplo tem três especificações, seis posições, seis pedidos ilustrativos e cinco evidências. Esse histórico curto não permite publicar estimativas de ML. Para explorar o modelo sintético completo, use **Carregar demonstração**, que inclui 780 pedidos artificiais.

## Campos e unidades

| Arquivo | Informação | Regra |
|---|---|---|
| Posições, obrigatório | Material, nome da especificação, fornecedor e origem | Códigos estáveis; país declarado em duas letras maiúsculas; `ZZ` para desconhecido |
| Posições | Participação do fornecedor | Fração entre 0 e 1 ou percentual entre 0 e 100, conforme a escolha; total de 100% por material |
| Posições | Demanda mensal e estoque | kg; repetir os mesmos totais em todas as linhas do mesmo material; o estoque não é somado por fornecedor |
| Posições | Prazo e custo | Dias e USD/kg; converter moeda e unidade antes de importar |
| Pedidos, opcional | ID, material, fornecedor, origem, datas e quantidade | Quantidade em kg; recebimento vazio significa pedido aberto; datas não podem introduzir informação posterior ao corte |
| Evidências, opcional | ID, material, fornecedor, origem, observação, emissão, validade e SHA-256 | Emissão/validade podem ficar vazias; hash deve ter 64 caracteres hexadecimais minúsculos |

Cada material representa uma especificação homogênea. Purezas, formas de produto, etapas de processamento ou definições distintas de origem precisam de códigos distintos e revisão técnica. O mapeamento de colunas não resolve essas diferenças.

O formato de número é explícito: no formato brasileiro, `1.234` significa mil duzentos e trinta e quatro; no formato com ponto decimal, significa um inteiro e 234 milésimos. O programa não adivinha a intenção. Não misture convenções no mesmo conjunto. No modo percentual, `72` e `72%` representam 72%; no modo fração, use `0,72` com vírgula decimal.

## Conferência e continuidade

Confira os campos mapeados e carregue os arquivos. O painel aplica as mesmas regras do motor: até 16 MiB por arquivo e por conjunto normalizado, 100 materiais, 500 posições, 20.000 pedidos e 5.000 evidências. Cabeçalhos duplicados, números não finitos, referências inexistentes e alocações inconsistentes são rejeitados.

Após analisar, exporte **Conjunto normalizado** e guarde-o de forma privada. No próximo acompanhamento, carregue os novos dados como carteira atual e importe aquele JSON como período anterior. Uma importação atual bem-sucedida limpa a base anterior e os resultados, evitando misturar versões. Uma importação inválida preserva a última carteira válida.

Os arquivos ficam na memória da execução local até você limpar o espaço ou encerrar o processo. Eles não são enviados à demonstração online. Os downloads são gravados pelo navegador conforme suas configurações. O JSON normalizado contém os dados comerciais da carteira; compartilhe-o apenas pelo processo aprovado.
