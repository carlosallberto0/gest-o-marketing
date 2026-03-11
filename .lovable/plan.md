

# RBAC com Permissoes Granulares + Feature Flags

## Resumo da Analise

Analisei todo o sistema e identifiquei o estado atual:

- A tabela `user_roles` ja existe no banco mas esta **vazia** (nunca foi usada)
- A funcao `has_app_role()` ja existe mas so e usada em 1 politica (access_logs)
- **30+ politicas RLS** usam `get_user_role()` que le de `profiles.role`
- **40+ referencias no frontend** a `profile.role`
- Nenhum sistema de feature flags existe atualmente

**Conclusao: E viavel implementar sem quebrar nada**, usando uma estrategia de camadas adicionais.

---

## Estrategia: Camadas Adicionais (sem alterar o existente)

O sistema atual continua funcionando exatamente como esta. As novas funcionalidades sao camadas **adicionais** que, quando configuradas, adicionam restricoes. Se nao configuradas, tudo funciona como hoje.

---

## Fase 1: Feature Flags para Modulos e Funcoes

### Nova tabela: `module_feature_flags`

Permite ao Super Admin habilitar/desabilitar modulos inteiros e funcoes especificas dentro de cada modulo.

| Coluna | Descricao |
|--------|-----------|
| `module_key` | Ex: `media`, `merchandising`, `financeiro` |
| `feature_key` | Ex: `__module__` (modulo inteiro) ou `criar_outdoor`, `exportar_relatorio` |
| `enabled` | Se esta habilitado ou nao |

**Comportamento:**
- Se `module_key='financeiro'` e `feature_key='__module__'` esta `enabled=false`, NINGUEM acessa o modulo Financeiro
- Se `feature_key='exportar_relatorio'` esta `enabled=false`, essa funcao fica bloqueada para todos
- Se nao existir registro na tabela, o padrao e **habilitado** (compatibilidade retroativa)

### Arquivos criados:
- `src/hooks/useFeatureFlags.ts` -- Hook para consultar flags
- `src/components/settings/FeatureFlagsSettings.tsx` -- Tela de configuracao (Super Admin)

### Integracao:
- `ModuleSelection.tsx` filtra modulos desabilitados
- Componentes de funcoes especificas verificam se a funcao esta habilitada

---

## Fase 2: Permissoes Granulares por Perfil

### Nova tabela: `role_permissions`

Permite ao Super Admin definir o que cada perfil pode fazer em cada modulo.

| Coluna | Descricao |
|--------|-----------|
| `role` | Perfil (director, manager, etc.) |
| `module_key` | Modulo |
| `permission_key` | Acao (create, read, update, delete, approve) |
| `entity_key` | Entidade (outdoor, contract, material, ou `*` para todas) |
| `granted` | Se esta concedido ou nao |

**Comportamento:**
- Super Admin tem TODAS as permissoes automaticamente (nao precisa configurar)
- Se nao existir registro na tabela para um perfil/acao, usa o comportamento atual como padrao
- O hook `useCanAccess(module, feature, permission)` combina: flag habilitada + permissao concedida

### Arquivos criados:
- `src/hooks/useRolePermissions.ts` -- Hook para consultar permissoes
- `src/hooks/useCanAccess.ts` -- Hook combinado (flag + permissao)
- `src/components/settings/PermissionsSettings.tsx` -- Grid editavel Role x Permissao

---

## Fase 3: Painel do Super Admin

Nova aba "Permissoes" nas Configuracoes com:
- **Sub-aba Modulos**: Toggles para habilitar/desabilitar modulos e funcoes
- **Sub-aba Perfis**: Grid mostrando cada perfil e suas permissoes por modulo

---

## Detalhes Tecnicos

### Migracao SQL

```sql
-- Tabela de feature flags
CREATE TABLE module_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL,
  feature_key text NOT NULL DEFAULT '__module__',
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(module_key, feature_key)
);

ALTER TABLE module_feature_flags ENABLE ROW LEVEL SECURITY;

-- Apenas super_admin gerencia flags
CREATE POLICY "Super admin manages flags"
ON module_feature_flags FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin');

-- Todos autenticados podem ler (para saber se modulo esta ativo)
CREATE POLICY "Authenticated can read flags"
ON module_feature_flags FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Tabela de permissoes por role
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  module_key text NOT NULL,
  permission_key text NOT NULL,
  entity_key text NOT NULL DEFAULT '*',
  granted boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, module_key, permission_key, entity_key)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin manages permissions"
ON role_permissions FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Authenticated can read permissions"
ON role_permissions FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Funcao helper para verificar feature flag
CREATE OR REPLACE FUNCTION is_feature_enabled(
  p_module text, p_feature text DEFAULT '__module__'
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM module_feature_flags
     WHERE module_key = p_module AND feature_key = p_feature),
    true  -- default: habilitado
  )
$$;

-- Seed inicial: todos os modulos habilitados
INSERT INTO module_feature_flags (module_key, feature_key, enabled)
VALUES
  ('media', '__module__', true),
  ('merchandising', '__module__', true),
  ('financeiro', '__module__', true),
  ('mapa', '__module__', true),
  ('agencia', '__module__', true),
  ('loteamentos', '__module__', true),
  ('analise', '__module__', true),
  ('configuracoes', '__module__', true);
```

### Hooks Frontend

**`useFeatureFlags()`**: Busca todas as flags e expoe `isModuleEnabled(module)` e `isFeatureEnabled(module, feature)`

**`useCanAccess(module, feature?, permission?)`**: Logica combinada:
1. Verifica se o modulo esta habilitado (feature flag)
2. Se feature especifica, verifica se esta habilitada
3. Se permission, verifica se o role do usuario tem permissao
4. Super Admin sempre retorna `true`

### Integracao Gradual

A integracao e feita progressivamente -- cada tela pode ser migrada individualmente:

```text
// Antes (hardcoded):
if (profile.role === 'super_admin') { ... }

// Depois (gradual):
const { canAccess } = useCanAccess('media', 'criar_outdoor');
if (canAccess) { ... }
```

### Garantias de Seguranca

1. Nenhuma tabela existente sera alterada
2. `profile.role` continua funcionando normalmente
3. RLS policies existentes permanecem iguais
4. Default seguro: sem configuracao = comportamento atual
5. Super Admin sempre tem acesso total (bypass automatico)

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|--------|------|
| Migracao SQL | CRIAR tabelas + RLS + seed |
| `src/hooks/useFeatureFlags.ts` | CRIAR |
| `src/hooks/useRolePermissions.ts` | CRIAR |
| `src/hooks/useCanAccess.ts` | CRIAR |
| `src/components/settings/FeatureFlagsSettings.tsx` | CRIAR |
| `src/components/settings/PermissionsSettings.tsx` | CRIAR |
| `src/pages/Settings.tsx` | MODIFICAR -- adicionar abas |
| `src/pages/ModuleSelection.tsx` | MODIFICAR -- filtrar por flags |

---

## Riscos

| Risco | Mitigacao |
|-------|-----------|
| Quebrar acesso existente | Default `true` para tudo sem configuracao |
| Performance (queries extras) | Cache de 5 min via React Query |
| Super Admin perder acesso | Bypass hardcoded no hook |

