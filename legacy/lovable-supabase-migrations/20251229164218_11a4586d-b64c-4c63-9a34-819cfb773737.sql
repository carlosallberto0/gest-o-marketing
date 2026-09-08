-- Criar tabela system_options para armazenar opções configuráveis
CREATE TABLE public.system_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  option_key text NOT NULL,
  option_label text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  UNIQUE(category, option_key)
);

-- Habilitar RLS
ALTER TABLE public.system_options ENABLE ROW LEVEL SECURITY;

-- Políticas: todos podem ler, apenas super_admin pode modificar
CREATE POLICY "Anyone can view active options" 
ON public.system_options 
FOR SELECT 
USING (true);

CREATE POLICY "Super admin can manage options" 
ON public.system_options 
FOR ALL 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Inserir opções iniciais

-- Tipos de Outdoor (Descrição/Tipo)
INSERT INTO system_options (category, option_key, option_label, display_order) VALUES
('outdoor_description_type', 'etanol_gasolina', 'Etanol/Gasolina', 1),
('outdoor_description_type', 'diesel', 'Diesel', 2),
('outdoor_description_type', 'institucional', 'Institucional', 3),
('outdoor_description_type', 'servico', 'Serviço', 4),
('outdoor_description_type', 'carta_frete', 'Carta Frete', 5);

-- Tipo de Propriedade do Outdoor
INSERT INTO system_options (category, option_key, option_label, display_order) VALUES
('outdoor_ownership_type', 'owned', 'Próprio', 1),
('outdoor_ownership_type', 'rented', 'Alugado', 2);

-- Status de Importação PDV
INSERT INTO system_options (category, option_key, option_label, display_order) VALUES
('pdv_status_importacao', 'pendente', 'Pendente', 1),
('pdv_status_importacao', 'validado', 'Validado', 2),
('pdv_status_importacao', 'erro', 'Com Erro', 3);

-- Status de PDV
INSERT INTO system_options (category, option_key, option_label, display_order) VALUES
('pdv_status', 'pre_cadastrado', 'Pré-cadastrado', 1),
('pdv_status', 'em_revisao', 'Em Revisão', 2),
('pdv_status', 'ativo', 'Ativo', 3),
('pdv_status', 'inativo', 'Inativo', 4);

-- Tipo de PDV
INSERT INTO system_options (category, option_key, option_label, display_order) VALUES
('pdv_type', 'posto', 'Posto', 1),
('pdv_type', 'conveniencia', 'Conveniência', 2),
('pdv_type', 'both', 'Ambos', 3);

-- Status de Requisição de Material
INSERT INTO system_options (category, option_key, option_label, display_order) VALUES
('material_request_status', 'pending', 'Pendente', 1),
('material_request_status', 'approved', 'Aprovado', 2),
('material_request_status', 'rejected', 'Rejeitado', 3),
('material_request_status', 'delivered', 'Entregue', 4);

-- Status de Manutenção
INSERT INTO system_options (category, option_key, option_label, display_order) VALUES
('maintenance_request_status', 'pending_review', 'Aguardando Revisão', 1),
('maintenance_request_status', 'approved', 'Aprovado', 2),
('maintenance_request_status', 'rejected', 'Rejeitado', 3),
('maintenance_request_status', 'in_progress', 'Em Andamento', 4),
('maintenance_request_status', 'completed', 'Concluído', 5);

-- Status de Campanha
INSERT INTO system_options (category, option_key, option_label, display_order) VALUES
('campaign_status', 'draft', 'Rascunho', 1),
('campaign_status', 'active', 'Ativa', 2),
('campaign_status', 'paused', 'Pausada', 3),
('campaign_status', 'completed', 'Concluída', 4),
('campaign_status', 'cancelled', 'Cancelada', 5);