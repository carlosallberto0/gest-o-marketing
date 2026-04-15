

# Roteirização Inteligente — Mapa Estratégico

## Visão Geral

Adicionar sistema de rotas ao módulo Mapa Estratégico sem alterar nenhuma funcionalidade existente (filtros, indicadores, layout, performance). A implementação será incremental e modular.

## Escopo — O que muda

### 1. Banco de Dados (3 novas tabelas)

**`routes`** — Rotas criadas (automáticas ou manuais)
- `id`, `name`, `type` (auto/manual/unified), `package_id` (nullable FK → maintenance_approval_packages), `supplier_id` (nullable FK → suppliers), `origin_lat`, `origin_lng`, `origin_label` (default "Formosa - GO"), `total_distance_km`, `estimated_days`, `deadline` (date), `production_days` (default 2), `status` (draft/active/completed), `created_by`, `created_at`, `updated_at`

**`route_points`** — Pontos ordenados de cada rota
- `id`, `route_id` (FK → routes), `outdoor_id` (FK → outdoors), `sequence` (int), `scheduled_date` (date), `priority` (critical/pending/preventive), `estimated_arrival_order`, `notes`, `created_at`

**`route_history`** — Log de alterações em rotas
- `id`, `route_id`, `action` (created/edited/unified/completed), `user_id`, `details` (jsonb), `created_at`

RLS: Super Admin e Admin leitura/escrita; Fornecedores leitura das rotas vinculadas ao seu `supplier_id`.

### 2. Edge Function — Otimização de Rota

**`supabase/functions/optimize-route/index.ts`**

Recebe lista de outdoor IDs + ponto de origem. Usa Lovable AI (Gemini Flash) para calcular a sequência ótima considerando:
- Coordenadas (lat/lng) de cada outdoor
- Proximidade geográfica (agrupamento regional)
- Prioridade por status (critical > pending > preventive)
- Prazo de 15 dias com 2 dias de produção de lona
- Distribuição equilibrada por dia (evitar sobrecarga)

Retorna: array ordenado com `outdoor_id`, `sequence`, `scheduled_date`, `priority`.

> A roteirização usa cálculo de distância haversine no backend + heurística nearest-neighbor com ajuste de prioridade. Não depende de API externa de direções.

### 3. Hook `useRoutes.ts`

- `useRoutes()` — lista rotas com pontos
- `useCreateAutoRoute(packageId)` — gera rota automática a partir de pacote aprovado
- `useCreateManualRoute()` — cria rota selecionando outdoors
- `useUnifyRoutes(routeIds)` — consolida múltiplas rotas
- `useUpdateRoutePoints()` — editar sequência/datas manualmente
- `useCompleteRoute()` — marcar rota concluída

### 4. Componentes do Mapa (novos, aditivos)

**`src/components/map/RouteLayer.tsx`**
- Desenha linhas (Mapbox `LineString`) conectando pontos da rota ativa
- Cores por prioridade (vermelho=crítico, amarelo=pendente, azul=preventivo)
- Números de sequência nos pontos

**`src/components/map/RoutePanel.tsx`**
- Painel lateral direito (abaixo das camadas) mostrando rota ativa
- Lista ordenada de pontos com data programada e status
- Botões: editar sequência, exportar para fornecedor

**`src/components/map/CreateRouteDialog.tsx`**
- Modal para criar rota manual: selecionar outdoors no mapa, nomear, definir fornecedor

**`src/components/map/UnifyRoutesDialog.tsx`**
- Modal para selecionar rotas ativas e unificar

### 5. Integração no `StrategicMapMapbox.tsx`

Apenas **adições** ao JSX existente:
- 3 novos botões na barra Admin (junto ao "Lote" e "Importar"): `Criar Rota`, `Rota Automática`, `Unificar Rotas`
- Novo estado `activeRoute` para controlar visualização
- Componente `<RouteLayer>` renderizado condicionalmente sobre o mapa
- Componente `<RoutePanel>` ao lado direito, abaixo das camadas

Nenhum código existente é modificado — os novos elementos são inseridos em pontos de extensão.

### 6. Gatilho Automático (pacote aprovado)

Na função `useDirectorReviewPackage` (dentro de `useMaintenancePackages.ts`), após o diretor aprovar o pacote, disparar chamada para gerar rota automática (chamada assíncrona, não bloqueia o fluxo de aprovação).

### 7. Visão do Fornecedor

No painel do fornecedor (`SupplierPanel.tsx`), adicionar seção "Rota Sugerida" mostrando:
- Sequência de execução por dia
- Ponto de partida (Formosa - GO)
- Link para localização de cada outdoor
- Badge indicando que a rota é sugestão

## Arquivos Envolvidos

| Ação | Arquivo |
|------|---------|
| Nova migração | `routes`, `route_points`, `route_history` + RLS |
| Novo | `supabase/functions/optimize-route/index.ts` |
| Novo | `src/hooks/useRoutes.ts` |
| Novo | `src/components/map/RouteLayer.tsx` |
| Novo | `src/components/map/RoutePanel.tsx` |
| Novo | `src/components/map/CreateRouteDialog.tsx` |
| Novo | `src/components/map/UnifyRoutesDialog.tsx` |
| Editar | `src/pages/StrategicMapMapbox.tsx` (apenas adição de botões + componentes condicionais) |
| Editar | `src/hooks/useMaintenancePackages.ts` (trigger pós-aprovação) |
| Editar | `src/pages/SupplierPanel.tsx` (seção rota sugerida) |

## O que NÃO será tocado

- Filtros, legendas, indicadores, layout atual do mapa
- Dados e queries existentes de PDVs/Outdoors
- Performance do mapa (rotas renderizadas via Mapbox nativo)
- Fluxo de aprovação existente (rota é gerada em paralelo)

## Resultado

Sistema de operação logística com planejamento automático de manutenção, visão estratégica para Super Admin e guia de execução para fornecedores.

