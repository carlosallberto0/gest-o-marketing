-- Fase 1: Migração do Banco de Dados para Perfil Diretoria

-- 1.1 Criar tabela observacoes_diretoria_outdoor
CREATE TABLE public.observacoes_diretoria_outdoor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outdoor_id UUID NOT NULL REFERENCES public.outdoors(id) ON DELETE CASCADE,
  diretor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  criada_em TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.observacoes_diretoria_outdoor ENABLE ROW LEVEL SECURITY;

-- RLS: Diretor vê apenas suas próprias observações
CREATE POLICY "Directors can view own observations"
ON public.observacoes_diretoria_outdoor
FOR SELECT
USING (diretor_id = auth.uid());

-- RLS: Diretor pode criar observações
CREATE POLICY "Directors can insert observations"
ON public.observacoes_diretoria_outdoor
FOR INSERT
WITH CHECK (
  diretor_id = auth.uid() AND 
  get_user_role(auth.uid()) = 'director'
);

-- RLS: Super Admin pode ver todas as observações
CREATE POLICY "Super admins can view all observations"
ON public.observacoes_diretoria_outdoor
FOR SELECT
USING (get_user_role(auth.uid()) = 'super_admin');

-- RLS: Super Admin pode gerenciar todas as observações
CREATE POLICY "Super admins can manage all observations"
ON public.observacoes_diretoria_outdoor
FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin');

-- 1.2 Adicionar coluna prioridade na tabela notificacoes_sistema
ALTER TABLE public.notificacoes_sistema 
ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'normal';

-- 1.3 Adicionar coluna data_revisao para manutenções "seguradas"
ALTER TABLE public.maintenance_package_items 
ADD COLUMN IF NOT EXISTS data_revisao DATE;

-- 1.4 Adicionar coluna justificativa_diretoria para manutenções
ALTER TABLE public.maintenance_package_items 
ADD COLUMN IF NOT EXISTS justificativa_diretoria TEXT;