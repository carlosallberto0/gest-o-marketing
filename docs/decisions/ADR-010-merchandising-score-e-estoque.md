# ADR-010 — Merchandising: score calculado na conclusão e estoque sem tabela de movimento

> Registro de decisões arquiteturais e de produto — 2026-09-08.

**Status:** aceito

**Contexto.** A Fase 3 (Merchandising) exige score de avaliação de PDV "calculado pelo banco, nunca confiado do cliente" e decremento de estoque na entrega de material, com movimentação de estoque (`stock_movements` do sistema antigo) explicitamente fora de escopo desta rodada. Duas decisões de mecanismo não tinham um padrão direto nas fases anteriores (Fase 1/2 não têm um fluxo de "cabeçalho + itens agregados" nem um saldo decrementado por outra tabela).

**Decisão 1 — score calculado na transição de estado, não a cada resposta.**

`avaliacoes_pdv` nasce em `rascunho` (editável) e tem uma única transição possível, terminal: `rascunho → concluida`. O trigger `avaliacoes_pdv_before_update` calcula `pontos_total`, `pontos_possiveis_total`, `percentual_total` e `scores_categoria` (jsonb, breakdown por categoria) a partir de `respostas_checklist` **só nesse momento**, não a cada INSERT/UPDATE/DELETE de resposta. Ele também valida, antes de permitir a conclusão, que toda resposta já registrada com `exige_foto`/`exige_comentario`/`exige_material` (herdado da pergunta) tem o campo correspondente preenchido.

Consequência: `avaliacoes_pdv` fica imutável depois de `concluida` (nem o próprio trigger aceita reabrir), e `respostas_checklist` ganha uma trigger irmã (`respostas_checklist_bloquear_apos_conclusao`) que bloqueia qualquer mutação de resposta quando a avaliação pai já está concluída — sem isso, o cliente poderia editar uma resposta por fora, sem tocar o status da avaliação, e driblar um score já calculado. Corrigir uma resposta errada depois de concluída exige uma **nova avaliação**; não há fluxo de reabertura nesta fase.

**Alternativa descartada:** recalcular o score a cada resposta salva (trigger em `respostas_checklist`). Rejeitada por custo (recalcula dezenas de vezes por avaliação) e porque o score só tem sentido de "resultado final" quando a avaliação está de fato concluída — um score parcial de rascunho não é um dado que qualquer parte do sistema precisa consumir.

**Decisão 2 — estoque decrementado direto em `materiais.estoque_atual`, sem tabela de movimento.**

Fora de escopo desta rodada, por pedido explícito do usuário. O trigger `solicitacoes_material_before_update`, na transição para `entregue`, lê `materiais.estoque_atual` com `SELECT ... FOR UPDATE` (trava a linha), bloqueia a transição se `estoque_atual - quantidade < 0` (estoque negativo proibido, mesma regra do PRD antigo) e, se passar, executa o `UPDATE` do saldo — tudo dentro da mesma transação da transição de status. Ajuste manual de estoque (ex.: reposição, correção de contagem) usa o mesmo `UPDATE` direto de `materiais`, sob o grant `merchandising/materiais/editar/rede_toda` (só `super_admin`/`admin`) — não há uma ação dedicada de "ajustar estoque".

**Consequência aceita:** sem tabela de log, não há como auditar ou reverter um decremento indevido além do que `audit_logs` já registra (a transição de status da solicitação, não o delta de estoque isoladamente) — se um `admin` editar `estoque_atual` manualmente por engano, não sobra rastro de "quanto era antes". Se o produto precisar de trilha de estoque no futuro, isso é uma tabela nova (`movimentos_estoque` ou equivalente) e um trigger substituindo o `UPDATE` direto — não implementado aqui.

**Alternativa descartada:** tabela de movimento própria (espelhando `stock_movements` do antigo). Rejeitada porque o usuário definiu explicitamente que estoque nesta fase é "só um campo de saldo atual editável direto (sem histórico de movimento)".
