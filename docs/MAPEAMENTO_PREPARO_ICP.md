# Mapeamento funcional — Preparo do ICP

Levantamento inicial realizado em 16/09/2026 a partir das planilhas existentes no Google Drive.

## 1. Liberação Preparo do ICP - 2026

**Spreadsheet ID:** `1iZKcE__TOzTjGvvq6XnHJWoAC-iDPSER7h8gQrld_RU`

Abas mensais existentes: Agosto, Setembro, Outubro, Novembro e Dezembro.

### Colunas operacionais
| Coluna | Campo |
|---|---|
| B | Data |
| C | Liberação |
| D | ID |
| E | CQ |
| F | Total |
| G | Gerador |
| H | Dissolvido |
| I | Dissolvido Gerador |
| J | Urânio |
| K | Urânio Dissolvido |
| L | Diluição |
| M | Observação |
| N | mL |
| O | Itrio |
| P | Técnico |

### Métodos
Os campos F:K são independentes e devem ser tratados como multisseleção no sistema:
- Total
- Gerador
- Dissolvido
- Dissolvido Gerador
- Urânio
- Urânio Dissolvido

Uma mesma amostra pode possuir mais de um método simultaneamente.

### Regra do ID / embalagem observada
Os registros possuem ID numérico normalmente com 10 dígitos. O padrão observado é compatível com a composição de um ID de amostra seguido de um identificador de embalagem. A regra de leitura será centralizada no backend, sem depender de fórmulas da planilha, para permitir ajuste seguro quando a regra operacional for confirmada durante os testes.

### Comportamento proposto
- Scanner/campo de bipagem com foco automático.
- Interpretar código lido e apresentar ID e embalagem separadamente.
- Permitir seleção múltipla de métodos.
- Campos complementares: CQ, diluição, observação, mL, ítrio e técnico.
- Gravar na aba correspondente ao mês da data de registro.
- Evitar duplicidade acidental do mesmo ID/embalagem.
- Status de liberação explícito.

## 2. Controle de Estoque - Preparo ICP.xlsx

**Drive file ID:** `1MAdbJDibPeg5fAhukQ5i5ILTpnFHVHUb`

O arquivo possui duas abas: `Estoque` e `Lista de Mercado`.

### Estoque
Colunas A:K:
- Item
- Lote
- Unidade
- Quantidade em estoque
- Qtde de lotes/embalagens
- Estoque mínimo
- Status
- Responsável
- Última atualização
- Observações
- Ordem (ajuda)

Regra original do status:
- Item vazio: sem status.
- Estoque mínimo vazio: `Definir mínimo`.
- Quantidade em estoque <= estoque mínimo: `Baixo estoque`.
- Caso contrário: `OK`.

A coluna `Ordem (ajuda)` existe apenas para enumerar itens em baixo estoque e alimentar a lista automática. No sistema web essa coluna não será necessária como dado operacional; a lista será derivada diretamente pelo backend.

Os valores atuais de estoque mínimo destacados em amarelo foram descritos na própria planilha como valores sugeridos, devendo ser ajustados ao consumo real do setor.

### Bug encontrado na fonte
As fórmulas de status nas linhas 18 e 19 da aba `Estoque` referenciam linhas anteriores:
- G18 usa F17/D17.
- G19 usa F18/D18.

O sistema não reproduzirá essa falha: o status será calculado pelos valores do próprio registro.

### Lista de Mercado
A seção superior é automática e lista os itens com `Baixo estoque`.

A seção `Pedido da semana` possui os campos:
- Item
- Quantidade a comprar
- Fornecedor
- Data do pedido
- Status do pedido
- Observações

Status permitidos pela validação da planilha:
- Pendente
- Enviado
- Recebido

### Modelo de dados do novo sistema
Além das colunas herdadas, o sistema passa a classificar o item por `categoria`, inicialmente com opções como:
- Consumível
- Solução
- Padrão
- Insumo
- Reagente
- Outro

Essa categoria é um campo novo do sistema e não altera o arquivo Excel original.

## 3. Decisões de arquitetura
- Google Apps Script Web App.
- `codigo.gs` concentra backend e regras de persistência.
- `sistema.html` concentra a primeira interface, seguindo o design system definido para o projeto.
- Escritas usam `LockService` para reduzir risco de concorrência.
- A fonte de liberação permanece a Google Sheet existente.
- O `.xlsx` de estoque é tratado como fonte histórica de regras. Para uso operacional do Web App, o instalador cria uma Google Sheet nativa de banco de estoque dentro da pasta do projeto e migra os dados iniciais, porque Apps Script não atualiza um XLSX de forma confiável como banco transacional.
- O frontend possui estado de carregamento com liberação garantida em sucesso e falha, seguindo a memória técnica dos projetos anteriores.
