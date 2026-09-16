# Arquitetura — Controle ICP

## Objetivo
Manter o sistema modular desde a primeira versão, evitando concentrar regras operacionais no `codigo.gs` e permitindo que novas áreas do ICP sejam adicionadas sem retrabalho.

## Núcleo
### `codigo.gs`
Responsável apenas por:
- configuração global e IDs das fontes;
- versão do sistema;
- bootstrap inicial;
- helpers realmente compartilhados;
- entrada do Web App (`doGet`).

## Serviços de domínio
### `AmostraService.gs`
Responsável por:
- interpretação da bipagem;
- separação de prefixo / ID de amostra / embalagem;
- validação de métodos;
- prevenção de duplicidade;
- gravação na aba mensal da planilha de Liberação do Preparo.

### `EstoqueService.gs`
Responsável por:
- criação/autorreparo do banco nativo de estoque;
- cadastro e edição de itens;
- cálculo de status de estoque;
- entradas, saídas e ajustes;
- histórico de movimentações;
- pedidos semanais;
- lista automática de baixo estoque.

## Frontend
### `sistema.html`
Primeira interface operacional, com:
- Visão geral;
- Registro de amostra;
- Controle de estoque;
- Compras.

A evolução deve manter `sistema.html` como shell visual e extrair lógica de domínios maiores para módulos HTML próprios antes que o arquivo cresça demais.

## Banco de dados
- A planilha `Liberação Preparo do ICP - 2026` continua sendo a fonte operacional da liberação.
- O arquivo `Controle de Estoque - Preparo ICP.xlsx` permanece como fonte histórica/referência.
- O sistema cria `Controle ICP - Banco de Estoque` como Google Sheet nativa dentro da pasta do projeto para as operações transacionais.
- IDs persistidos do Drive devem validar existência, `isTrashed()` e pasta esperada antes de reutilização.

## Concorrência
Operações de escrita crítica usam `LockService` para evitar que dois usuários ocupem a mesma linha ou sobrescrevam saldo simultaneamente.

## Regra permanente de evolução
1. Consultar `Bauerzada/CACHE-API-RESPOSTAS_ANTERIORES` antes de mudanças relevantes.
2. Registrar nesse cache novos bugs, comandos, decisões e correções relevantes.
3. Não espalhar uma mesma regra de negócio entre frontend e backend.
4. Centralizar regras de códigos/bipagem para que mudanças de etiqueta não exijam refatoração da interface.
5. Toda ação assíncrona precisa encerrar estado de carregamento tanto em sucesso quanto em erro.


## Arquitetura modular v1.0
- DataService.gs — banco operacional genérico, IDs, locks e helpers de persistência.
- PreparoService.gs — fila e estados do preparo; registro de amostra alimenta a fila automaticamente.
- RotinaService.gs — atividades, repetições, confirmações e resolução.
- CurvasService.gs — curvas/padrões; consumo opcional desconta automaticamente o item de estoque selecionado.
- CQService.gs — CQ com limites, status automático e vínculo opcional com curva.
- ICP5110Service.gs — sequências, ocorrências do equipamento e Atlas de erros.
- LogisticaService.gs — requisições de insumo existentes e rastreabilidade de caixas.
- OperacaoService.gs — bootstrap consolidado da operação.
- OperationsView.html / OperationsEngine.html — telas e comportamento dos módulos laboratoriais.
- LogisticaView.html / LogisticaEngine.html — telas de requisições e caixas.

### Integrações configuradas
1. Registro de amostra -> Liberação mensal + Fila de preparo.
2. Curva com item/volume selecionado -> saída automática no estoque.
3. CQ -> vínculo opcional com ID da curva.
4. Requisições -> leitura e atualização da planilha Requisições de Insumo - ICP.
5. Sequências -> armazenam conjunto de amostras e quantidade calculada.
6. Equipamento -> ocorrência operacional separada do Atlas de erros, preservando conhecimento de solução.

### Regra de shell
sistema.html não deve receber novas regras de domínio. Novos módulos devem ser adicionados como View/Engine e incluídos pelo shell.
