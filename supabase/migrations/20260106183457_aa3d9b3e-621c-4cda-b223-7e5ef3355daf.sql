
-- 1. Tabela de atribuição de manutenções a fornecedores
CREATE TABLE supplier_maintenance_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Status do vínculo
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  
  -- Prazos acordados
  deadline_days INTEGER,
  deadline_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Orçamento
  quoted_value NUMERIC(10,2),
  approved_value NUMERIC(10,2),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  
  -- Observações
  supplier_notes TEXT,
  admin_notes TEXT,
  
  -- Auditoria
  assigned_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(maintenance_request_id, supplier_id)
);

-- 2. Tabela de histórico de prazos
CREATE TABLE supplier_deadline_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES supplier_maintenance_assignments(id) ON DELETE CASCADE,
  
  deadline_type TEXT NOT NULL CHECK (deadline_type IN ('initial', 'adjusted', 'final')),
  deadline_days INTEGER NOT NULL,
  deadline_date TIMESTAMPTZ NOT NULL,
  reason TEXT,
  
  set_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de relatórios enviados para fornecedores
CREATE TABLE supplier_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}',
  
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES profiles(id),
  email_sent BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Índices para performance
CREATE INDEX idx_sma_status ON supplier_maintenance_assignments(status);
CREATE INDEX idx_sma_supplier ON supplier_maintenance_assignments(supplier_id);
CREATE INDEX idx_sma_deadline ON supplier_maintenance_assignments(deadline_date);
CREATE INDEX idx_sma_maintenance ON supplier_maintenance_assignments(maintenance_request_id);
CREATE INDEX idx_sdh_assignment ON supplier_deadline_history(assignment_id);
CREATE INDEX idx_sr_supplier ON supplier_reports(supplier_id);

-- 5. Trigger para updated_at
CREATE TRIGGER update_supplier_maintenance_assignments_updated_at
  BEFORE UPDATE ON supplier_maintenance_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Habilitar RLS
ALTER TABLE supplier_maintenance_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_deadline_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_reports ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS para supplier_maintenance_assignments
CREATE POLICY "Admins can manage assignments"
ON supplier_maintenance_assignments FOR ALL TO authenticated
USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Users with media access can view assignments"
ON supplier_maintenance_assignments FOR SELECT TO authenticated
USING (has_module_access(auth.uid(), 'media'));

-- 8. Políticas RLS para supplier_deadline_history
CREATE POLICY "Admins can manage deadline history"
ON supplier_deadline_history FOR ALL TO authenticated
USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Users with media access can view deadline history"
ON supplier_deadline_history FOR SELECT TO authenticated
USING (has_module_access(auth.uid(), 'media'));

-- 9. Políticas RLS para supplier_reports
CREATE POLICY "Admins can manage reports"
ON supplier_reports FOR ALL TO authenticated
USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Users with media access can view reports"
ON supplier_reports FOR SELECT TO authenticated
USING (has_module_access(auth.uid(), 'media'));
