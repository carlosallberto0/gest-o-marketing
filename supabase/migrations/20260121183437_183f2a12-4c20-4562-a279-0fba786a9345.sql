-- ================================================
-- MÓDULO: ANÁLISE ESTRATÉGICA
-- Tabelas para clusterização e insights de PDVs
-- ================================================

-- Tabela de configuração de clusters
CREATE TABLE public.analise_clusters_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo_pdv TEXT NOT NULL CHECK (tipo_pdv IN ('conveniencia', 'outdoor')),
  cor_hex TEXT NOT NULL DEFAULT '#3b82f6',
  criterios_midia JSONB NOT NULL DEFAULT '{}'::jsonb,
  criterios_merchandising JSONB NOT NULL DEFAULT '{}'::jsonb,
  peso_midia NUMERIC NOT NULL DEFAULT 0.5,
  peso_merchandising NUMERIC NOT NULL DEFAULT 0.5,
  faixa_min NUMERIC NOT NULL DEFAULT 0,
  faixa_max NUMERIC NOT NULL DEFAULT 100,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de cálculos de cluster por PDV
CREATE TABLE public.analise_clusters_calculo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pdv_id UUID NOT NULL REFERENCES public.pdvs(id) ON DELETE CASCADE,
  pdv_tipo TEXT NOT NULL CHECK (pdv_tipo IN ('conveniencia', 'outdoor')),
  cluster_id UUID REFERENCES public.analise_clusters_config(id) ON DELETE SET NULL,
  pontuacao_total NUMERIC NOT NULL DEFAULT 0,
  pontuacao_midia NUMERIC NOT NULL DEFAULT 0,
  pontuacao_merchandising NUMERIC NOT NULL DEFAULT 0,
  pontuacao_detalhada JSONB NOT NULL DEFAULT '{}'::jsonb,
  gap_midia_merch NUMERIC NOT NULL DEFAULT 0,
  potencial_aproveitamento NUMERIC NOT NULL DEFAULT 0,
  data_calculo TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de insights gerados
CREATE TABLE public.analise_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('tendencia', 'alerta', 'oportunidade')),
  pdv_tipo TEXT NOT NULL CHECK (pdv_tipo IN ('conveniencia', 'outdoor', 'ambos')),
  modulo_foco TEXT NOT NULL CHECK (modulo_foco IN ('midia', 'merchandising', 'integrado')),
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  acoes_recomendadas JSONB NOT NULL DEFAULT '[]'::jsonb,
  impacto_estimado NUMERIC NOT NULL DEFAULT 0,
  pdv_id UUID REFERENCES public.pdvs(id) ON DELETE CASCADE,
  lido BOOLEAN NOT NULL DEFAULT false,
  data_geracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de relatórios agendados
CREATE TABLE public.analise_relatorios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  pdv_tipo TEXT CHECK (pdv_tipo IN ('conveniencia', 'outdoor', 'todos')),
  parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
  agendamento_cron TEXT,
  ultima_geracao TIMESTAMP WITH TIME ZONE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configurações do módulo
CREATE TABLE public.analise_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- ================================================
-- ÍNDICES
-- ================================================
CREATE INDEX idx_analise_clusters_calculo_pdv ON public.analise_clusters_calculo(pdv_id);
CREATE INDEX idx_analise_clusters_calculo_tipo ON public.analise_clusters_calculo(pdv_tipo);
CREATE INDEX idx_analise_clusters_calculo_cluster ON public.analise_clusters_calculo(cluster_id);
CREATE INDEX idx_analise_insights_tipo ON public.analise_insights(tipo);
CREATE INDEX idx_analise_insights_pdv_tipo ON public.analise_insights(pdv_tipo);
CREATE INDEX idx_analise_insights_data ON public.analise_insights(data_geracao DESC);

-- ================================================
-- RLS POLICIES
-- ================================================

-- Enable RLS
ALTER TABLE public.analise_clusters_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analise_clusters_calculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analise_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analise_relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analise_config ENABLE ROW LEVEL SECURITY;

-- Policies for analise_clusters_config
CREATE POLICY "Super admin and director can view cluster configs"
ON public.analise_clusters_config FOR SELECT
USING (get_user_role(auth.uid()) IN ('super_admin', 'director'));

CREATE POLICY "Super admin can manage cluster configs"
ON public.analise_clusters_config FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin');

-- Policies for analise_clusters_calculo
CREATE POLICY "Super admin and director can view cluster calculations"
ON public.analise_clusters_calculo FOR SELECT
USING (get_user_role(auth.uid()) IN ('super_admin', 'director'));

CREATE POLICY "Super admin can manage cluster calculations"
ON public.analise_clusters_calculo FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin');

-- Policies for analise_insights
CREATE POLICY "Super admin and director can view insights"
ON public.analise_insights FOR SELECT
USING (get_user_role(auth.uid()) IN ('super_admin', 'director'));

CREATE POLICY "Super admin can manage insights"
ON public.analise_insights FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin');

-- Policies for analise_relatorios
CREATE POLICY "Super admin and director can view reports"
ON public.analise_relatorios FOR SELECT
USING (get_user_role(auth.uid()) IN ('super_admin', 'director'));

CREATE POLICY "Super admin can manage reports"
ON public.analise_relatorios FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin');

-- Policies for analise_config
CREATE POLICY "Super admin and director can view config"
ON public.analise_config FOR SELECT
USING (get_user_role(auth.uid()) IN ('super_admin', 'director'));

CREATE POLICY "Super admin can manage config"
ON public.analise_config FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin');

-- ================================================
-- DADOS INICIAIS - Clusters padrão
-- ================================================

-- Clusters para Conveniência
INSERT INTO public.analise_clusters_config (nome, tipo_pdv, cor_hex, peso_midia, peso_merchandising, faixa_min, faixa_max, ordem, criterios_midia, criterios_merchandising) VALUES
('Premium Plus', 'conveniencia', '#22c55e', 0.4, 0.6, 85, 100, 1, '{"visibilidade": 0.3, "localizacao": 0.4, "conservacao": 0.3}', '{"share_gondola": 0.35, "posicionamento": 0.3, "promocao": 0.2, "organizacao": 0.15}'),
('Oportunidade Visível', 'conveniencia', '#3b82f6', 0.4, 0.6, 70, 84, 2, '{"visibilidade": 0.3, "localizacao": 0.4, "conservacao": 0.3}', '{"share_gondola": 0.35, "posicionamento": 0.3, "promocao": 0.2, "organizacao": 0.15}'),
('Necessita Merchandising', 'conveniencia', '#f59e0b', 0.4, 0.6, 50, 69, 3, '{"visibilidade": 0.3, "localizacao": 0.4, "conservacao": 0.3}', '{"share_gondola": 0.35, "posicionamento": 0.3, "promocao": 0.2, "organizacao": 0.15}'),
('Crítico', 'conveniencia', '#ef4444', 0.4, 0.6, 0, 49, 4, '{"visibilidade": 0.3, "localizacao": 0.4, "conservacao": 0.3}', '{"share_gondola": 0.35, "posicionamento": 0.3, "promocao": 0.2, "organizacao": 0.15}');

-- Clusters para Outdoors
INSERT INTO public.analise_clusters_config (nome, tipo_pdv, cor_hex, peso_midia, peso_merchandising, faixa_min, faixa_max, ordem, criterios_midia, criterios_merchandising) VALUES
('Estratégico Total', 'outdoor', '#22c55e', 0.7, 0.3, 85, 100, 1, '{"tamanho_m2": 0.4, "fluxo_veicular": 0.35, "visibilidade_distancia": 0.25}', '{"disponibilidade_estoque": 0.5, "acesso_facil": 0.3, "sinalizacao": 0.2}'),
('Viário Prioritário', 'outdoor', '#3b82f6', 0.7, 0.3, 70, 84, 2, '{"tamanho_m2": 0.4, "fluxo_veicular": 0.35, "visibilidade_distancia": 0.25}', '{"disponibilidade_estoque": 0.5, "acesso_facil": 0.3, "sinalizacao": 0.2}'),
('Parada Funcional', 'outdoor', '#f59e0b', 0.7, 0.3, 50, 69, 3, '{"tamanho_m2": 0.4, "fluxo_veicular": 0.35, "visibilidade_distancia": 0.25}', '{"disponibilidade_estoque": 0.5, "acesso_facil": 0.3, "sinalizacao": 0.2}'),
('Necessita Atenção', 'outdoor', '#ef4444', 0.7, 0.3, 0, 49, 4, '{"tamanho_m2": 0.4, "fluxo_veicular": 0.35, "visibilidade_distancia": 0.25}', '{"disponibilidade_estoque": 0.5, "acesso_facil": 0.3, "sinalizacao": 0.2}');

-- Configurações iniciais do módulo
INSERT INTO public.analise_config (key, value) VALUES
('modulo_ativo', 'true'),
('cache_timeout_minutos', '30'),
('alerta_gap_threshold', '20'),
('recalculo_automatico', 'true');