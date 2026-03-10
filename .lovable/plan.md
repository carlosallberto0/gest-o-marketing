

# Correção: Menu do Diretor ignorando configurações

## Diagnóstico

Os dados no banco estão corretos (dashboard:false, outdoors:false, relatorios:false). A política RLS existe e é PERMISSIVE. O código de filtragem no AppLayout parece correto na lógica, mas o diretor ainda vê todos os itens.

Suspeita: o hook pode estar retornando `defaultPermissions` (tudo habilitado) silenciosamente — seja por erro no fetch, timing, ou cache. Vou reescrever a lógica de forma mais defensiva e direta.

## Alterações

### 1. `src/hooks/useDirectorMenuPermissions.ts`
- Adicionar `enabled: !!user?.id` para só buscar com sessão ativa
- Adicionar logs de debug para rastrear o valor retornado
- Garantir que `defaultPermissions` NÃO tenha tudo habilitado — mudar defaults para `false` nos itens configuráveis (deny-by-default)

### 2. `src/components/layout/AppLayout.tsx`
- Simplificar a lógica de filtragem do diretor, tornando-a mais explícita
- Enquanto permissions estiver carregando, esconder itens configuráveis (deny-by-default)

### 3. `src/pages/ModuleSelection.tsx`
- Para diretores, redirecionar para rota padrão configurada ao entrar no módulo Mídia Externa (igual ao gerente)

Nenhuma migração de banco necessária.

