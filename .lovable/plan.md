

# Painel de Acompanhamento de Avaliações para Diretores

## Contexto

A lógica de cálculo de progresso por PDV (total de outdoors, avaliados, pendentes) já existe em `OutdoorEvaluation.tsx` (linhas 134-180). O diretor já tem `isSuperView = true`, mas não tem um menu dedicado para essa visualização. A proposta é criar uma página focada em monitoramento com UX limpo.

## Alterações

### 1. Nova página `src/pages/EvaluationProgress.tsx`

Painel de monitoramento com:
- **KPIs no topo**: Total de PDVs, PDVs com pendências, Taxa de conclusão global, Total de outdoors pendentes
- **Lista de PDVs**: Cards ou tabela com: nome do PDV, gerente responsável, barra de progresso (avaliados/total), badge de status (Completo verde, Pendente amarelo, Crítico vermelho para 0%), contagem de pendentes
- **Ordenação**: PDVs com mais pendências primeiro
- **Filtro**: Todos / Apenas pendentes / Completos
- Reutiliza os hooks `useOutdoors` e `usePDVs` que já fornecem os dados necessários

### 2. Rota e menu (`App.tsx` + `AppLayout.tsx`)

- Adicionar rota `/evaluation-progress` com a nova página
- Adicionar item **"Progresso Avaliações"** no menu do diretor como item **mandatório** (sempre visível), posicionado antes de "Aprovar Manutenção"
- Ícone: `BarChart3` ou `ClipboardCheck`

### Arquivos
- **Criar**: `src/pages/EvaluationProgress.tsx`
- **Editar**: `src/App.tsx` (nova rota)
- **Editar**: `src/components/layout/AppLayout.tsx` (novo item mandatório no menu do diretor)

