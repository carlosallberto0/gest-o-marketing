
-- Tabela de feature flags para módulos e funções
CREATE TABLE public.module_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL,
  feature_key text NOT NULL DEFAULT '__module__',
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(module_key, feature_key)
);

ALTER TABLE public.module_feature_flags ENABLE ROW LEVEL SECURITY;

-- Super admin gerencia flags (ALL)
CREATE POLICY "Super admin manages flags"
ON public.module_feature_flags FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin');

-- Todos autenticados podem ler
CREATE POLICY "Authenticated can read flags"
ON public.module_feature_flags FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Tabela de permissões granulares por role
CREATE TABLE public.role_permissions (
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

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Super admin gerencia permissões
CREATE POLICY "Super admin manages permissions"
ON public.role_permissions FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin');

-- Todos autenticados podem ler
CREATE POLICY "Authenticated can read permissions"
ON public.role_permissions FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Função helper para verificar feature flag
CREATE OR REPLACE FUNCTION public.is_feature_enabled(
  p_module text, p_feature text DEFAULT '__module__'
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.module_feature_flags
     WHERE module_key = p_module AND feature_key = p_feature),
    true
  )
$$;

-- Seed inicial: todos os módulos habilitados
INSERT INTO public.module_feature_flags (module_key, feature_key, enabled)
VALUES
  ('media', '__module__', true),
  ('merchandising', '__module__', true),
  ('financeiro', '__module__', true),
  ('mapa', '__module__', true),
  ('agencia', '__module__', true),
  ('loteamentos', '__module__', true),
  ('analise', '__module__', true),
  ('configuracoes', '__module__', true);
