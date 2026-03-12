

# Reorganização da Barra de Ações e Justificativa Obrigatória na Rejeição

## Alterações

### 1. Mover barra de ações para junto das abas (`MaintenanceRequests.tsx`)

Atualmente a barra flutuante fica fixa no rodapé (`fixed bottom-4`). Será movida para a **mesma linha das abas** (Todas, Pendentes, Aprovadas, Consolidadas), ficando à direita das tabs quando há itens selecionados. Layout: tabs à esquerda, ações à direita, tudo na mesma faixa horizontal.

### 2. Justificativa obrigatória ao rejeitar (`MaintenanceRequests.tsx`)

Atualmente `handleReject` chama diretamente `rejectRequest.mutateAsync(id)` sem pedir justificativa. A alteração:

- Adicionar estado `rejectJustification` e `showRejectDialog`
- Ao clicar "Rejeitar", abrir um sub-dialog com campo `Textarea` obrigatório para justificativa
- Botão de confirmar desabilitado enquanto justificativa estiver vazia
- Passar a justificativa como `rejection_reason` no `rejectRequest.mutateAsync`
- O mesmo padrão se aplica ao hook `useRejectMaintenanceRequest` — verificar se já aceita um campo de justificativa ou se precisa de ajuste

### Arquivo a editar
- `src/pages/MaintenanceRequests.tsx`
- `src/hooks/useMaintenanceRequests.ts` (se necessário ajustar o hook de rejeição para aceitar justificativa)

