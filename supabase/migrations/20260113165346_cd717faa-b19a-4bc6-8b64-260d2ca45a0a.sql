-- =============================================
-- MÓDULO AGÊNCIA - Tabelas
-- =============================================

-- Agências parceiras
CREATE TABLE agencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  contato_nome TEXT,
  contato_email TEXT,
  contato_telefone TEXT,
  especialidades TEXT[] DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demandas para agências
CREATE TABLE agencia_demandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID REFERENCES agencias(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT DEFAULT 'outros',
  status TEXT DEFAULT 'pendente',
  prazo_entrega DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catálogo de vídeos
CREATE TABLE agencia_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID REFERENCES agencias(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  link_video TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catálogo de fotos
CREATE TABLE agencia_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID REFERENCES agencias(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  link_album TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MÓDULO LOTEAMENTOS - Tabelas
-- =============================================

-- Lançamentos imobiliários
CREATE TABLE loteamentos_lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  localizacao TEXT NOT NULL,
  status TEXT DEFAULT 'planejamento',
  total_lotes INTEGER,
  lotes_vendidos INTEGER DEFAULT 0,
  data_lancamento DATE,
  links_drive TEXT[] DEFAULT '{}',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagamentos dos lançamentos
CREATE TABLE loteamentos_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id UUID REFERENCES loteamentos_lancamentos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  tipo TEXT,
  data_vencimento DATE,
  data_pagamento DATE,
  status TEXT DEFAULT 'pendente',
  comprovante_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contratos de venda
CREATE TABLE loteamentos_contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id UUID REFERENCES loteamentos_lancamentos(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL,
  cliente_cpf TEXT,
  cliente_telefone TEXT,
  cliente_email TEXT,
  lote_numero TEXT NOT NULL,
  quadra TEXT,
  valor DECIMAL(12,2) NOT NULL,
  entrada DECIMAL(12,2),
  parcelas INTEGER,
  status TEXT DEFAULT 'negociacao',
  data_assinatura DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RLS POLICIES - Apenas Super Admin
-- =============================================

-- Agências
ALTER TABLE agencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin full access on agencias" ON agencias
  FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');

-- Agência Demandas
ALTER TABLE agencia_demandas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin full access on agencia_demandas" ON agencia_demandas
  FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');

-- Agência Vídeos
ALTER TABLE agencia_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin full access on agencia_videos" ON agencia_videos
  FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');

-- Agência Fotos
ALTER TABLE agencia_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin full access on agencia_fotos" ON agencia_fotos
  FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');

-- Loteamentos Lançamentos
ALTER TABLE loteamentos_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin full access on loteamentos_lancamentos" ON loteamentos_lancamentos
  FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');

-- Loteamentos Pagamentos
ALTER TABLE loteamentos_pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin full access on loteamentos_pagamentos" ON loteamentos_pagamentos
  FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');

-- Loteamentos Contratos
ALTER TABLE loteamentos_contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin full access on loteamentos_contratos" ON loteamentos_contratos
  FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');

-- =============================================
-- TRIGGERS para updated_at
-- =============================================

CREATE TRIGGER update_agencias_updated_at
  BEFORE UPDATE ON agencias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agencia_demandas_updated_at
  BEFORE UPDATE ON agencia_demandas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loteamentos_lancamentos_updated_at
  BEFORE UPDATE ON loteamentos_lancamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loteamentos_pagamentos_updated_at
  BEFORE UPDATE ON loteamentos_pagamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loteamentos_contratos_updated_at
  BEFORE UPDATE ON loteamentos_contratos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();