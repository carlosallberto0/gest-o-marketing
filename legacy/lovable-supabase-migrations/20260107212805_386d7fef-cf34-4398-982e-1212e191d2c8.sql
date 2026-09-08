-- Tabela principal de custos externos
CREATE TABLE custos_externos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('material', 'transporte', 'mao_obra', 'outro')),
  valor_total NUMERIC(12,2) NOT NULL,
  
  -- Informações do fornecedor
  fornecedor_id UUID NOT NULL REFERENCES suppliers(id),
  data_compra DATE NOT NULL,
  
  -- Perdas (informadas pelo fornecedor)
  teve_perdas BOOLEAN DEFAULT false,
  perda_descricao TEXT,
  perda_valor NUMERIC(12,2) DEFAULT 0,
  
  -- Comprovante
  comprovante_url TEXT NOT NULL,
  
  -- Vínculo opcional com OS
  service_order_id UUID REFERENCES service_orders(id),
  
  -- Alocação
  alocacao_tipo VARCHAR(20) DEFAULT 'unico' CHECK (alocacao_tipo IN ('unico', 'multiplo')),
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- Tabela de alocação para postos/outdoors
CREATE TABLE custo_alocacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custo_externo_id UUID NOT NULL REFERENCES custos_externos(id) ON DELETE CASCADE,
  posto_id UUID NOT NULL REFERENCES pdvs(id),
  outdoor_id UUID REFERENCES outdoors(id),
  percentual_alocacao NUMERIC(5,2) NOT NULL CHECK (percentual_alocacao >= 0 AND percentual_alocacao <= 100),
  valor_alocado NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_custos_externos_fornecedor ON custos_externos(fornecedor_id);
CREATE INDEX idx_custos_externos_data ON custos_externos(data_compra);
CREATE INDEX idx_custos_externos_created_by ON custos_externos(created_by);
CREATE INDEX idx_custos_externos_deleted ON custos_externos(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_custo_alocacao_posto ON custo_alocacao(posto_id);
CREATE INDEX idx_custo_alocacao_outdoor ON custo_alocacao(outdoor_id);
CREATE INDEX idx_custo_alocacao_custo ON custo_alocacao(custo_externo_id);

-- RLS Policies
ALTER TABLE custos_externos ENABLE ROW LEVEL SECURITY;
ALTER TABLE custo_alocacao ENABLE ROW LEVEL SECURITY;

-- Super admin pode ver/editar tudo em custos_externos
CREATE POLICY "Super admin full access custos_externos"
  ON custos_externos FOR ALL
  USING (get_user_role(auth.uid()) = 'super_admin');

-- Super admin pode ver/editar tudo em custo_alocacao
CREATE POLICY "Super admin full access custo_alocacao"
  ON custo_alocacao FOR ALL
  USING (get_user_role(auth.uid()) = 'super_admin');

-- Trigger para updated_at
CREATE TRIGGER update_custos_externos_updated_at
  BEFORE UPDATE ON custos_externos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();