

# Limpeza do Módulo Mídia Externa — Super Admin (Revisado)

## Sobre "Avaliar Outdoor" no menu do Super Admin

A página `/outdoor-evaluation` já possui uma **visão de monitoramento exclusiva para o Super Admin** com:
- Progresso por Posto (total de outdoors, avaliados, pendentes, % concluído)
- Seleção de postos pendentes e exportação de lista de cobrança em Excel

Portanto, faz sentido **manter o item no menu, mas renomeá-lo** para refletir o uso real do Super Admin. Em vez de "Avaliar Outdoor" (que sugere ação operacional), usar **"Progresso Avaliações"** — deixando claro que é uma tela de acompanhamento.

---

## Alterações

### 1. Dashboard (`MediaDashboard.tsx`)
- Remover bloco "Ações Rápidas" — duplica sidebar
- Remover bloco "Outdoors Recentes" — duplica página /outdoors
- Remover botão "Avaliar Outdoor" do header — ação operacional do gerente

### 2. Sidebar (`AppLayout.tsx`)
- **Renomear** "Avaliar Outdoor" para **"Progresso Avaliações"** para o `super_admin` (manter o path `/outdoor-evaluation`, que já exibe a visão de monitoramento)
- Remover "Solicitar Materiais" do menu Mídia do Super Admin

### 3. Rotas órfãs (`App.tsx`)
- Remover `/admin/aprovacoes` — substituída por `/maintenance-approval`
- Remover `/supplier-management` — substituída por `/suppliers` + `/service-orders`
- Remover `/gerente/validacoes` — fluxo usa `/maintenance-requests`
- Remover `/diretoria/aprovacoes` — fluxo usa `/maintenance-approval`

### Arquivos a editar
- `src/pages/MediaDashboard.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/App.tsx`

