

# Corrigir criação de rota manual + painel de rotas + erro no mapa

## Problemas Identificados

### 1. Rota criada mas painel não aparece
O `CreateRouteDialog` fecha o dialog após sucesso mas nunca comunica ao `StrategicMapMapbox` qual rota foi criada. Não há callback `onRouteCreated` — então `activeRouteId` nunca é setado e `showRoutePanel` permanece `false`.

**Solução**: Adicionar prop `onRouteCreated(routeId)` ao `CreateRouteDialog` e chamá-la no `onSuccess` da mutation. No `StrategicMapMapbox`, usar essa callback para setar `activeRouteId` e `showRoutePanel = true`.

### 2. Desmarcar "Apenas OS ativa" não ajuda
Quando o toggle está ligado, os outdoors fora da OS ficam escondidos (filtro visual). Ao desligar o toggle, todos os outdoors reaparecem na lista, mas os checkboxes continuam refletindo apenas a seleção pré-feita (somente OS). O usuário pode marcar manualmente, mas não tem botão de "selecionar todos".

**Solução**: Adicionar botão "Selecionar todos" / "Limpar seleção" na área de outdoors. Isso permite ao Super Admin selecionar todos os outdoors visíveis com um clique.

### 3. Erro runtime no RouteLayer (map.getSource antes do style load)
O `RouteLayer` chama `map.getSource()` sem verificar se o estilo do mapa foi carregado (`map.isStyleLoaded()`), causando crash.

**Solução**: Guardar o efeito até `map.isStyleLoaded()` retornar `true`, ou ouvir o evento `style.load`.

## Arquivos

| Ação | Arquivo |
|------|---------|
| Editar | `src/components/map/CreateRouteDialog.tsx` — adicionar callback `onRouteCreated`, botão selecionar todos/limpar |
| Editar | `src/pages/StrategicMapMapbox.tsx` — passar `onRouteCreated` ao dialog |
| Editar | `src/components/map/RouteLayer.tsx` — guard `isStyleLoaded()` antes de acessar source/layer |

