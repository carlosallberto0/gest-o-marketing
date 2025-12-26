-- Criar tabela para log de cargas em massa de imagens
CREATE TABLE public.logs_carga_massa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES public.profiles(id),
  arquivo_nome text NOT NULL,
  total_linhas integer NOT NULL DEFAULT 0,
  sucessos integer NOT NULL DEFAULT 0,
  erros integer NOT NULL DEFAULT 0,
  detalhes_erros jsonb DEFAULT '[]'::jsonb,
  modo_teste boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.logs_carga_massa ENABLE ROW LEVEL SECURITY;

-- Policy for super_admin only - full access
CREATE POLICY "super_admin_full_access" ON public.logs_carga_massa
  FOR ALL USING (
    get_user_role(auth.uid()) = 'super_admin'::user_role
  );

-- Add index for better query performance
CREATE INDEX idx_logs_carga_massa_usuario_id ON public.logs_carga_massa(usuario_id);
CREATE INDEX idx_logs_carga_massa_created_at ON public.logs_carga_massa(created_at DESC);