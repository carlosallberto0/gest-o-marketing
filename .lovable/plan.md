

# Correção: Dashboard do Fornecedor + Visibilidade das Ordens

## Problemas Identificados

### 1. Fornecedor vê o dashboard completo
Quando o fornecedor seleciona o módulo "Mídia Externa", ele é redirecionado para `/media/dashboard`, que mostra o dashboard administrativo com Taxa Operacional, Total Outdoors, Status, Ações Rápidas, etc. O fornecedor deveria ir direto para `/supplier-panel`.

### 2. Ordens de serviço não aparecem no painel
O perfil do Rogério Silveira tem `supplier_id = null` no banco. As ordens foram atribuídas ao fornecedor `b5d12791-eaa9-4597-8e05-374fcaeed990` ("Rogério Silveira" na tabela suppliers). A política de segurança (RLS) usa `get_user_supplier_id(auth.uid())` que retorna `null`, então nenhuma ordem é retornada.

## Correções

### 1. Vincular perfil ao fornecedor (migração SQL)
```sql
UPDATE profiles 
SET supplier_id = 'b5d12791-eaa9-4597-8e05-374fcaeed990' 
WHERE id = '0fd7ddc8-2976-4c0b-a2e2-66b1a89483d1';
```

### 2. Redirecionar fornecedor para `/supplier-panel` (ModuleSelection.tsx)
No `handleModuleSelect`, adicionar tratamento para o role `supplier`:
- Se `profile.role === 'supplier'` e módulo é `media`, navegar para `/supplier-panel` ao invés de `/media/dashboard`.

### 3. Ocultar dashboard do fornecedor (MediaDashboard.tsx)
Adicionar redirecionamento caso o role seja `supplier` — se ele tentar acessar `/media/dashboard`, redirecionar para `/supplier-panel`.

### Arquivos a editar
- **`src/pages/ModuleSelection.tsx`** — redirect do supplier
- **`src/pages/MediaDashboard.tsx`** — guard redirect
- **Migração SQL** — vincular `supplier_id` no perfil

