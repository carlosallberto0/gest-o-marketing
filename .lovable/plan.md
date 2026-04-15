

# Ajustes no Mapa Estratégico — Coordenadas, Menu Admin e Painel de Rotas Móvel

## 3 Problemas Identificados

### 1. Coordenadas dos outdoors não batem com a URL do Google Maps
Os outdoors usam `lat`/`lng` salvos no banco, mas muitos foram importados com coordenadas do viewport (`@lat,lng`) em vez do ponto exato (`!3d/!4d`). Quando o outdoor só tem `location_url` (link curto ou completo do Google Maps), as coordenadas salvas podem não corresponder ao ponto real.

**Solução**: Criar um script de recalibração em lote (edge function ou migration) que:
- Percorre todos os outdoors que possuem `location_url` preenchida
- Usa a lógica de `resolve-google-maps-url` para re-extrair coordenadas priorizando `!3d/!4d`
- Compara com `lat`/`lng` atuais — se diferença > 50m, atualiza
- Registra log das alterações
- Adicionar botão "Recalibrar Coordenadas" nas configurações ou no Modo Admin do mapa para executar sob demanda

### 2. Menu Admin mal posicionado
Atualmente o toolbar admin fica em uma segunda linha (`top-[72px]`), ocupando espaço visual e empurrando os filtros para baixo. 

**Solução**: Mover os botões admin para dentro da mesma barra do título (linha 1264-1278), após o botão de refresh. Usar um separador visual (`|`) entre os controles de navegação e os botões admin. Em mobile, os botões admin ficam em overflow horizontal com scroll.

### 3. Painel de Rotas fixo (não móvel)
O `RoutePanel` está posicionado com `absolute top-72 right-4`, sem possibilidade de arrastar.

**Solução**: Tornar o `RoutePanel` arrastável (draggable) usando:
- Estado `position` (`x`, `y`) no componente
- Handler `onMouseDown` no header do card para iniciar drag
- `onMouseMove`/`onMouseUp` no `document` para atualizar posição
- Cursor `grab`/`grabbing` no header como indicação visual
- Ícone de "grip" no header para sinalizar que é arrastável
- Sem dependência externa — apenas eventos nativos do mouse/touch

## Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `supabase/functions/recalibrate-outdoor-coords/index.ts` — Edge function para recalibrar coordenadas em lote |
| Editar | `src/pages/StrategicMapMapbox.tsx` — Mover admin bar para linha do título; adicionar botão recalibrar; ajustar posição do RoutePanel para draggable |
| Editar | `src/components/map/RoutePanel.tsx` — Adicionar lógica de drag (mouse + touch) com estado de posição |

## O que NÃO será tocado
- Filtros, legendas, indicadores, camadas existentes
- Dados e queries de PDVs/Outdoors (apenas coordenadas atualizadas via edge function)
- Performance do mapa
- Fluxos de aprovação e OS existentes

