# Decisões pendentes para validação em teste

## 1. Regra exata da bipagem
A planilha histórica armazena normalmente um número de 10 dígitos no campo `ID`. Para a base inicial, a interpretação foi isolada no backend e configurada como:
- leitura de 10 dígitos: 6 dígitos de ID de amostra + 4 dígitos de embalagem;
- leitura de 12 dígitos: 2 dígitos de prefixo + os 10 dígitos acima.

Essa separação é **provisória** até ser comparada com uma etiqueta real usada no Preparo do ICP. Como a regra está centralizada em `AmostraService.gs`, uma correção não exige alterar a interface ou a persistência.

## 2. Classificação inicial dos itens de estoque
A planilha original não possui coluna de categoria. O sistema acrescenta a categoria para facilitar filtros e painéis.

A carga inicial usa classificação operacional provisória:
- ácidos, borohidreto, peróxido, hidróxidos e bicarbonato: Reagente;
- membranas, filtros, seringas, fita de pH e papel filtro: Consumível;
- Ítrio: Padrão.

O usuário poderá editar a categoria normalmente no sistema.

## 3. Status inicial da liberação
Na planilha histórica existem registros preenchidos como `Liberado`. Na tela nova, o cadastro começa como `Pendente`, permitindo a etapa de liberação posterior. Se o fluxo do setor exigir que a bipagem já entre como `Liberado`, basta alterar o padrão sem afetar o restante do modelo.
