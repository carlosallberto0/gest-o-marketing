# Periodicidade de Avaliações: Reset de Ciclo e Notificação aos Gerentes

## Comportamento atual
- Em **Configurações → Avaliações**, o slider "Status de Outdoors (Mídia Externa)" salva `evaluation_frequency.outdoor_days` em `system_settings`. Hoje esse valor é apenas referência visual: nenhuma rotina marca os outdoors como "pendente de nova avaliação" quando o prazo muda.
- A página **Progresso de Avaliações** considera `outdoor.status !== 'pending_evaluation'` como avaliado. Como nada reseta o status, postos que já estavam 100% continuam 100% indefinidamente, mesmo após o Super Admin abrir um novo ciclo.
- Os gerentes não recebem nenhum aviso quando o Super Admin altera o prazo.

## Comportamento desejado
Quando o Super Admin altera o valor de "Status de Outdoors (Mídia Externa)" e clica em **Salvar Alterações**:

1. **Reset seletivo do progresso (por PDV)**
   - Para cada PDV, contar quantos outdoors estão pendentes (`status = 'pending_evaluation'` ou `last_evaluation` nulo).
   - **Se 0 pendentes (PDV 100%)** → resetar todos os outdoors do PDV para `status = 'pending_evaluation'`, limpar `avaliacao_valida_ate` e zerar o progresso. Um novo ciclo começa.
   - **Se ≥ 1 pendente (PDV incompleto)** → não mexer em nada. O gerente ainda precisa terminar o ciclo anterior; não dar "anistia".
   - PDV sem outdoors é ignorado.

2. **Notificação aos gerentes impactados**
   - Apenas os gerentes dos PDVs que foram resetados recebem notificação `in-app` (tabela `notificacoes_sistema`) com:
     - Título: "Novo ciclo de avaliação de outdoors"
     - Mensagem: "Foi definido um novo prazo de N dias. Avalie os outdoors do seu posto."
     - URL de ação: rota de avaliação de outdoors do gerente.
   - PDVs que ficaram de fora (faltando avaliações) não geram notificação; o gerente continua vendo as pendências antigas.

3. **Auditoria**
   - Registrar em `audit_logs` quem disparou o reset, quantos PDVs/outdoors foram afetados e o novo valor de `outdoor_days`.

## Implementação

### Backend (Edge Function nova)
Criar `supabase/functions/reset-outdoor-evaluation-cycle/index.ts`:
- Recebe `{ outdoor_days: number }`.
- Verifica que o caller é `super_admin` (via JWT + tabela `profiles`).
- Usa `service role` para:
  1. Buscar todos os PDVs com seus outdoors (`pdv_id`, `status`, `manager_id`).
  2. Agrupar por PDV; identificar os PDVs **100% avaliados**.
  3. `UPDATE outdoors SET status='pending_evaluation', avaliacao_valida_ate=NULL, updated_at=now() WHERE pdv_id = ANY(<pdvs_resetados>)`.
  4. Para cada `manager_id` dos PDVs resetados (deduplicado), inserir em `notificacoes_sistema` (uma notificação por gerente, agregando os PDVs).
  5. Inserir entrada em `audit_logs` com o resumo.
- Retorna `{ pdvs_reset, outdoors_reset, managers_notified }`.
- Registrar em `supabase/config.toml` com `verify_jwt = true` (precisamos do JWT do Super Admin).

### Frontend
Editar `src/pages/Settings.tsx` (handler de salvar — bloco em torno da linha 236):
- Detectar se `outdoor_days` mudou em relação ao valor original (`systemSettings`).
- Se mudou:
  1. Salvar o novo valor (já é feito via `updateSetting.mutateAsync`).
  2. Antes de aplicar, mostrar `confirm` ao Super Admin: "Isso vai zerar o progresso dos PDVs 100% avaliados e notificar os gerentes. Continuar?".
  3. Em caso afirmativo, invocar a edge function via `supabase.functions.invoke('reset-outdoor-evaluation-cycle', { body: { outdoor_days } })`.
  4. Exibir toast de sucesso com o resumo: "X postos resetados, Y gerentes notificados".
  5. Invalidar queries: `['outdoors']`, `['pdvs']`, `['notificacoes']`.
- Se o valor de `outdoor_days` não mudou, manter o comportamento atual (sem reset, sem notificação).

### Página Progresso de Avaliações
Nenhuma mudança de lógica necessária — ela já lê de `outdoors` em tempo real. Após o reset, os PDVs zerados aparecerão automaticamente como 0%.

## Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `supabase/functions/reset-outdoor-evaluation-cycle/index.ts` |
| Editar | `supabase/config.toml` (registrar a função) |
| Editar | `src/pages/Settings.tsx` (handler de salvamento, confirmação e invocação da função) |

## O que NÃO será tocado
- Slider de "Avaliação de PDVs (Merchandising)" — o pedido é apenas sobre outdoors. (Posso estender depois se quiser.)
- Lógica de progresso e UI da página `EvaluationProgress`.
- Outdoors de PDVs incompletos — preservados intactos.
- Cálculo de `avaliacao_valida_ate` no momento de cada avaliação individual (continua usando `outdoor_cycle_config.validade_horas`).

## Resultado esperado
- Super Admin altera o prazo → confirma → PDVs 100% voltam a 0%, gerentes desses postos recebem notificação. PDVs com avaliações faltando ficam como estavam.