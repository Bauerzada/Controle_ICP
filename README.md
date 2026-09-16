# Controle ICP

Sistema web em Google Apps Script para o setor de ICP (metais), usando Google Drive/Google Sheets como base operacional.

## Fontes do Preparo do ICP
- `Liberação Preparo do ICP - 2026`: fonte operacional do registro/liberação das amostras.
- `Controle de Estoque - Preparo ICP.xlsx`: fonte histórica usada para mapear itens, mínimos, alertas e pedido semanal.

Os IDs das fontes e da pasta do projeto ficam centralizados em `codigo.gs`.

## Estrutura atual
- `codigo.gs` — núcleo, configuração, bootstrap e helpers compartilhados.
- `AmostraService.gs` — bipagem, métodos e gravação na liberação mensal.
- `EstoqueService.gs` — banco de estoque, movimentações, alertas e pedidos.
- `sistema.html` — interface operacional responsiva.
- `appsscript.json` — manifesto V8 / fuso de São Paulo.
- `ARCHITECTURE.md` — regras de arquitetura e evolução.
- `docs/MAPEAMENTO_PREPARO_ICP.md` — leitura funcional das planilhas originais.
- `docs/DECISOES_PENDENTES.md` — pontos que precisam de validação durante os testes.

## Visões da primeira versão
### Visão geral
- total de itens cadastrados;
- quantidade em baixo estoque;
- quantidade com estoque OK;
- itens sem mínimo definido;
- relação automática dos alertas de estoque.

### Registro de amostra
- campo preparado para leitor/bipagem;
- visualização de prefixo, ID da amostra e embalagem;
- multisseleção dos métodos `Total`, `Gerador`, `Dissolvido`, `Dissolvido Gerador`, `Urânio` e `Urânio Dissolvido`;
- CQ, diluição, observação, mL, ítrio e técnico;
- gravação na aba correspondente ao mês;
- proteção contra duplicidade do mesmo código na aba mensal;
- `LockService` para reduzir colisão entre usuários.

### Controle de estoque
- cadastro e edição de consumíveis, reagentes, soluções, padrões, insumos e outros;
- lote, unidade, quantidade, número de embalagens, mínimo, responsável e observações;
- cálculo automático `quantidade <= mínimo => Baixo estoque`;
- entrada, saída e ajuste de saldo;
- histórico de movimentações;
- proteção contra saldo negativo;
- lista automática de compras.

### Compras
- lista dos itens em baixo estoque;
- registro de pedido semanal;
- status `Pendente`, `Enviado` e `Recebido`.

## Banco de estoque
O `.xlsx` original permanece intacto. Na primeira execução operacional, o sistema cria dentro da pasta do projeto a planilha nativa:

`Controle ICP - Banco de Estoque`

Ela recebe os registros iniciais e cria as abas:
- `Estoque`
- `Movimentações`
- `Pedidos`

A referência persistida é autorreparável: antes de reutilizar o ID, o backend verifica se o arquivo existe, não está na lixeira e continua dentro da pasta esperada.

## Implantação no Google Apps Script
1. Criar um projeto Apps Script no contexto da conta que possui acesso às planilhas do ICP.
2. Adicionar os arquivos deste repositório preservando os nomes: `codigo.gs`, `AmostraService.gs`, `EstoqueService.gs`, `sistema.html` e `appsscript.json`.
3. Executar uma vez `instalarControleICP()` pelo editor para autorizar Drive/Sheets e criar o banco nativo de estoque.
4. Conferir se `Controle ICP - Banco de Estoque` foi criado dentro da pasta do projeto.
5. Implantar como aplicativo da Web apenas para o público interno autorizado definido na implantação do Apps Script.
6. Abrir o Web App e executar os testes de fumaça abaixo antes de usar em produção.

## Smoke test inicial
- Abrir a Visão geral e confirmar os 17 registros iniciais do estoque.
- Conferir que o lote `82919 - ICP` aparece em baixo estoque, pois 548,5 <= 1000.
- Testar uma entrada e uma saída em um item não crítico e conferir a aba `Movimentações`.
- Testar um pedido e confirmar a gravação na aba `Pedidos`.
- Bipar uma etiqueta real do ICP e comparar prefixo / ID / embalagem com a interpretação exibida.
- Registrar uma amostra de teste com dois métodos e confirmar os dois checkboxes na aba mensal.
- Repetir o mesmo código e confirmar o bloqueio de duplicidade.

## Ponto importante antes da produção
A decomposição exata do código de bipagem ainda precisa ser validada com uma etiqueta real. A primeira implementação interpreta o valor histórico de 10 dígitos como `6 dígitos de amostra + 4 de embalagem`, aceitando ainda `2 dígitos de prefixo` quando a leitura possuir 12 dígitos. Essa regra está isolada em `AmostraService.gs` justamente para ser corrigida sem alterar o restante do sistema.

## Memória técnica
Antes de mudanças relevantes, consultar `Bauerzada/CACHE-API-RESPOSTAS_ANTERIORES`. Novos bugs, comandos, decisões e correções relevantes deste projeto devem ser registrados lá.
