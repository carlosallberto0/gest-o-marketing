

# Notificações: número real + mensagens contextualizadas

## Problemas identificados

1. **Badge limitado a "9+"**: Em `NotificationsPopover.tsx` (linha 108) e `AlertsPopover.tsx` (linha 64), o contador é truncado.
2. **Mensagens genéricas**: As notificações dizem "Outdoor avaliado como Operacional" sem informar **qual** outdoor, **qual** PDV, ou **quem** fez a ação.

## Alterações

### 1. Remover limite do badge de notificações

**`src/components/notifications/NotificationsPopover.tsx`** — linha 108:
- De: `{naoLidas > 9 ? '9+' : naoLidas}` → Para: `{naoLidas}`
- Ajustar o tamanho do badge para se adaptar a números maiores (usar `min-w-5 h-5 px-1` com tamanho dinâmico)

**`src/components/alerts/AlertsPopover.tsx`** — linha 64:
- De: `{unreadCount > 99 ? '99+' : unreadCount}` → Para: `{unreadCount}`

### 2. Enriquecer mensagens de notificação com contexto

Cada hook que envia notificação precisa buscar os dados complementares (nome do outdoor, PDV, nome do usuário) antes de montar a mensagem:

**`src/hooks/useOutdoorData.ts`** — avaliação de outdoor:
- Buscar `outdoor.code` e `pdv.name` antes de notificar
- De: `"Nova Avaliação de Outdoor"` / `"Outdoor avaliado como Operacional"`
- Para: `"Avaliação: OUT-42 - Posto Shell Centro"` / `"Outdoor OUT-42 (Posto Shell Centro) avaliado como Operacional por João Silva"`

**`src/hooks/useMaintenanceRequests.ts`** — solicitação de manutenção:
- Buscar outdoor code e PDV name
- De: `"Nova Solicitação [🟡 Normal]"` / `"Manutenção Corretiva: Arte desbotada"`
- Para: `"Nova Solicitação [🟡 Normal] - OUT-42"` / `"Manutenção Corretiva em OUT-42 (Posto Shell): Arte desbotada"`

**`src/hooks/useMaintenancePackages.ts`** — pacote aprovação diretoria:
- De: `"Pacote de Manutenção Revisado"` / `"O pacote foi aprovado pela diretoria"`
- Para: `"Pacote de Manutenção Revisado pela Diretoria"` / `"Diretor(a) Maria aprovou pacote com 3 outdoor(s)"`

**`src/hooks/useServiceOrders.ts`** — ordens de serviço:
- De: `"Nova OS OS-2025-001 aguardando aprovação"`
- Para: `"Nova OS OS-2025-001 com 3 outdoor(s) aguardando aprovação"`

**`src/hooks/useSupplierWorkOrders.ts`** — fornecedor executou:
- Buscar nome do fornecedor
- De: `"Fornecedor concluiu execução de manutenção"`
- Para: `"Fornecedor Digidoor concluiu manutenção de 3 outdoor(s)"`

**`src/hooks/useOutdoorMonthlyReviews.ts`** — revisão mensal:
- Buscar outdoor code
- De: `"Um outdoor foi marcado como precisando de manutenção"`
- Para: `"OUT-42 (Posto Shell) marcado como precisando de manutenção na revisão mensal"`

### 3. Buscar dados complementares

Em cada hook acima, antes de chamar `notificarPorRole` ou `enviarNotificacao`, fazer uma query rápida para obter:
- `outdoor.code` (ex: OUT-42)
- `pdv.name` (ex: Posto Shell Centro)
- `profiles.name` do usuário logado (já disponível via `useAuth` / `useCurrentProfile`)
- `suppliers.name` (quando for ação do fornecedor)

### Arquivos a editar
- `src/components/notifications/NotificationsPopover.tsx` — badge sem limite
- `src/components/alerts/AlertsPopover.tsx` — badge sem limite
- `src/hooks/useOutdoorData.ts` — mensagem contextualizada
- `src/hooks/useMaintenanceRequests.ts` — mensagem contextualizada
- `src/hooks/useMaintenancePackages.ts` — mensagem contextualizada
- `src/hooks/useServiceOrders.ts` — mensagem contextualizada
- `src/hooks/useSupplierWorkOrders.ts` — mensagem contextualizada
- `src/hooks/useOutdoorMonthlyReviews.ts` — mensagem contextualizada

