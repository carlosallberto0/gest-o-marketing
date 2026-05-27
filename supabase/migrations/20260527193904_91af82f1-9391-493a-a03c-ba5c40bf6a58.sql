
-- 1. Colunas opcionais em pdvs
ALTER TABLE public.pdvs
  ADD COLUMN IF NOT EXISTS bandeira TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Tabela pivot pdv_servicos
CREATE TABLE IF NOT EXISTS public.pdv_servicos (
  pdv_id UUID NOT NULL REFERENCES public.pdvs(id) ON DELETE CASCADE,
  servico_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pdv_id, servico_key)
);
CREATE INDEX IF NOT EXISTS idx_pdv_servicos_pdv ON public.pdv_servicos(pdv_id);
CREATE INDEX IF NOT EXISTS idx_pdv_servicos_key ON public.pdv_servicos(servico_key);

GRANT SELECT ON public.pdv_servicos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdv_servicos TO authenticated;
GRANT ALL ON public.pdv_servicos TO service_role;

ALTER TABLE public.pdv_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view pdv services"
  ON public.pdv_servicos FOR SELECT
  USING (true);

CREATE POLICY "Super admin manages pdv services"
  ON public.pdv_servicos FOR ALL
  USING (get_user_role(auth.uid()) = 'super_admin'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'super_admin'::user_role);

-- 3. Acesso público de leitura aos pdvs (portal público /rede)
GRANT SELECT ON public.pdvs TO anon;

CREATE POLICY "Public can view active pdvs"
  ON public.pdvs FOR SELECT
  TO anon
  USING (status = 'active' OR status IS NULL);

-- 4. Leitura pública de system_options (para listar serviços no portal)
GRANT SELECT ON public.system_options TO anon;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='system_options' AND policyname='Public can view active options'
  ) THEN
    CREATE POLICY "Public can view active options"
      ON public.system_options FOR SELECT
      TO anon
      USING (is_active = true);
  END IF;
END $$;

-- 5. Seed das 9 categorias de serviço de posto
INSERT INTO public.system_options (category, option_key, option_label, display_order, is_active)
VALUES
  ('servico_posto', 'troca_oleo',        'Troca de Óleo',          1, true),
  ('servico_posto', 'conveniencia',      'Conveniência',           2, true),
  ('servico_posto', 'loja_acessorios',   'Loja de Acessórios',     3, true),
  ('servico_posto', 'restaurante',       'Restaurante',            4, true),
  ('servico_posto', 'lanchonete',        'Lanchonete',             5, true),
  ('servico_posto', 'lava_jato',         'Lava Jato',              6, true),
  ('servico_posto', 'banheiro_chuveiro', 'Banheiro c/ Chuveiro',   7, true),
  ('servico_posto', 'borracharia',       'Borracharia',            8, true),
  ('servico_posto', 'calibrador_pneus',  'Calibrador de Pneus',    9, true)
ON CONFLICT DO NOTHING;
