# QA REPORT — Controle ICP 1.0.0-MODULAR-SUITE
Data: 2026-09-16

## Escopo auditado
Núcleo, autenticação, registro de amostra, estoque, compras, fila de preparo, rotina, curvas, CQ, sequências ICP 5110, equipamento/Atlas de erros, requisições e caixas.

## Auditoria estática executada
- 21 ações protegidas registradas no dispatcher.
- Chamadas diretas gas() auditadas: nenhuma ação direta sem entrada correspondente no dispatcher.
- Includes do shell: ActionEngine, AuthEngine, OperationsView, LogisticaView, OperationsEngine e LogisticaEngine.
- IDs HTML dos módulos auditados: sem duplicidade detectada.
- Navegação expandida revisada.
- Permissões críticas revisadas no backend.
- Registro de amostra mantém prevenção de duplicidade e LockService.
- Banco operacional usa LockService em append/update.
- Consumo de curva reutiliza movimentação de estoque, preservando bloqueio de saldo negativo.
- CQ calcula status automaticamente quando limites são informados.

## Bugs encontrados durante a varredura e já corrigidos
1. Sidebar poderia ocultar itens/rodapé após a inclusão de muitos módulos.
   Solução: nav ganhou overflow-y:auto + min-height:0 e footer ganhou flex-shrink:0.
2. Botões de Curvas/Equipamento/Atlas e avanço de RI poderiam aparecer para OPERADOR embora o backend negasse.
   Solução: manager-only + applyRoleVisibility; backend continua sendo a autoridade.
3. instalador preparava apenas estoque.
   Solução: instalarControleICP agora prepara banco de estoque e banco operacional.

## Integrações verificadas em código
- Registro de amostra -> planilha mensal -> fila de preparo.
- Curva -> movimentação de saída no estoque quando item/volume são informados.
- CQ -> vínculo opcional com curva.
- Requisições -> planilha Requisições de Insumo - ICP.
- Caixas -> banco operacional.
- Sequências, equipamento e Atlas -> banco operacional modular.

## Testes que exigem implantação real
Estes itens NÃO são marcados como aprovados apenas por análise estática:
- autorização do novo banco no Apps Script;
- criação física da planilha Controle ICP - Operação;
- gravação real em cada aba;
- concorrência com dois usuários reais;
- comportamento em tela menor;
- validação visual final claro/noturno;
- leitura de uma etiqueta real;
- consumo real de uma curva em item de teste;
- atualização real de uma RI de teste.

## Status
Código: pronto para implantação de teste.
Produção: depende do smoke test acima no Web App implantado.
