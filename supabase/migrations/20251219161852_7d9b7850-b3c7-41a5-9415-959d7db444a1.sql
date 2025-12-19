-- Tabela para registrar os lotes de importação (auditoria)
CREATE TABLE public.import_lotes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    arquivo_nome TEXT NOT NULL,
    quantidade_postos INTEGER DEFAULT 0,
    quantidade_outdoors INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'processando', -- 'processando', 'concluido', 'com_erros'
    erros JSONB DEFAULT '[]'::jsonb,
    usuario_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campos de origem na tabela de PDVs
ALTER TABLE public.pdvs ADD COLUMN IF NOT EXISTS fonte_importacao TEXT;
ALTER TABLE public.pdvs ADD COLUMN IF NOT EXISTS id_importacao TEXT;
ALTER TABLE public.pdvs ADD COLUMN IF NOT EXISTS status_importacao TEXT DEFAULT 'ativo';

-- Adicionar campos de origem na tabela de outdoors
ALTER TABLE public.outdoors ADD COLUMN IF NOT EXISTS fonte_importacao TEXT;
ALTER TABLE public.outdoors ADD COLUMN IF NOT EXISTS id_importacao TEXT;
ALTER TABLE public.outdoors ADD COLUMN IF NOT EXISTS status_importacao TEXT DEFAULT 'ativo';

-- Enable RLS
ALTER TABLE public.import_lotes ENABLE ROW LEVEL SECURITY;

-- Policies para import_lotes
CREATE POLICY "Admins can manage import lotes"
ON public.import_lotes
FOR ALL
USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Users can view import lotes"
ON public.import_lotes
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pdvs_status_importacao ON public.pdvs(status_importacao);
CREATE INDEX IF NOT EXISTS idx_outdoors_status_importacao ON public.outdoors(status_importacao);