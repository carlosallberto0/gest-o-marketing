

# Correção definitiva: Menu do Diretor no módulo Mídia Externa

## Causa raiz identificada

O problema está na lista `mediaItems` (linhas 143-164 do `AppLayout.tsx`). Ela inclui `'director'` nos arrays `roles` de Dashboard, Outdoors, Aprovar Manutenção e Relatórios. Isso significa que há **dois caminhos** para o Diretor ver itens de menu:

1. **Caminho correto**: `getDirectorMediaItems()` — que filtra corretamente usando as permissões
2. **Caminho alternativo (bug)**: O filtro genérico `canAccessRoute(item.roles)` — que mostra TODOS os itens onde `'director'` aparece nos roles, **ignorando as permissões**

Esse caminho alternativo é ativado sempre que a condição `isDirector && activeModule === 'media'` falha momentaneamente (ex: durante carregamento do perfil, troca de sessão, ou se `activeModule` não estiver sincronizado).

## Solução

### 1. Remover `'director'` de TODOS os `roles` em `mediaItems` (`AppLayout.tsx`)

Remover `'director'` dos arrays de roles dos itens: Dashboard, Outdoors, Aprovar Manutenção, Relatórios. A única fonte de itens de menu para o Diretor será `getDirectorMediaItems()`.

Itens afetados:
- `Dashboard` → roles: `['super_admin', 'admin']` (remover director)
- `Outdoors` → roles: `['super_admin', 'admin']` (remover director)
- `Aprovar Manutenção` → roles: `['super_admin', 'admin']` (remover director)
- `Relatórios` → roles: `['super_admin', 'admin']` (remover director)
- `Observações Enviadas` → manter `['director']` (já é exclusivo)

### 2. Garantir que `getDirectorMediaItems()` é o ÚNICO caminho

Nenhuma alteração adicional necessária — o check em `filteredMenuItems` já usa `getDirectorMediaItems()` quando `isDirector && activeModule === 'media'`. Com a remoção de `'director'` dos roles genéricos, mesmo que esse check falhe, o filtro genérico não mostrará nada para o Diretor.

### Arquivos alterados
- `src/components/layout/AppLayout.tsx` — remover `'director'` dos roles dos 4 itens de menu

