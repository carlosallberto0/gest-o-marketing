-- ================================================
-- SISTEMA DE CUSTOS E ORÇAMENTOS
-- ================================================

-- 1. Tabela de configuração de custos operacionais globais
CREATE TABLE public.config_custos_operacionais (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    parametro text NOT NULL UNIQUE,
    valor numeric(10,2) NOT NULL DEFAULT 0,
    unidade text NOT NULL DEFAULT 'valor',
    descricao text,
    atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
    atualizado_por uuid REFERENCES public.profiles(id)
);

-- Inserir valores padrão
INSERT INTO public.config_custos_operacionais (parametro, valor, unidade, descricao) VALUES
('hospedagem_diaria', 150.00, 'dia', 'Custo médio de hospedagem por técnico por dia'),
('dias_servico_remoto', 2, 'dias', 'Dias padrão para serviços remotos'),
('alimentacao_diaria', 80.00, 'dia', 'Vale-refeição por dia por pessoa'),
('custo_por_km', 1.20, 'km', 'Custo médio por km rodado'),
('consumo_veiculo', 10.00, 'km_por_litro', 'Consumo padrão do veículo em km/l'),
('distancia_minima_hospedagem', 100.00, 'km', 'Distância mínima para considerar hospedagem'),
('quantidade_tecnicos', 2, 'pessoas', 'Quantidade padrão de técnicos por serviço'),
('depreciacao_equipamentos', 5.00, 'porcentagem', 'Depreciação de equipamentos por serviço'),
('seguros_licencas', 3.00, 'porcentagem', 'Seguros e licenças sobre valor do serviço'),
('margem_contingencia', 10.00, 'porcentagem', 'Margem de contingência recomendada');

-- Enable RLS
ALTER TABLE public.config_custos_operacionais ENABLE ROW LEVEL SECURITY;

-- Policies: Super Admin pode gerenciar, Director pode visualizar
CREATE POLICY "Super admin can manage operational costs"
ON public.config_custos_operacionais FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Directors can view operational costs"
ON public.config_custos_operacionais FOR SELECT
USING (get_user_role(auth.uid()) IN ('super_admin', 'director'));

-- 2. Tabela de multiplicadores regionais
CREATE TABLE public.custos_regionais (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    estado text NOT NULL UNIQUE,
    multiplicador numeric(4,2) NOT NULL DEFAULT 1.00,
    observacao text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Inserir todos os estados brasileiros com multiplicador padrão
INSERT INTO public.custos_regionais (estado, multiplicador, observacao) VALUES
('AC', 1.30, 'Região Norte - custo logístico elevado'),
('AL', 1.10, 'Nordeste'),
('AM', 1.35, 'Região Norte - custo logístico elevado'),
('AP', 1.35, 'Região Norte - custo logístico elevado'),
('BA', 1.05, 'Nordeste'),
('CE', 1.10, 'Nordeste'),
('DF', 1.00, 'Centro-Oeste - referência'),
('ES', 0.95, 'Sudeste'),
('GO', 1.00, 'Centro-Oeste'),
('MA', 1.15, 'Nordeste'),
('MG', 0.95, 'Sudeste'),
('MS', 1.05, 'Centro-Oeste'),
('MT', 1.10, 'Centro-Oeste'),
('PA', 1.25, 'Região Norte'),
('PB', 1.10, 'Nordeste'),
('PE', 1.05, 'Nordeste'),
('PI', 1.15, 'Nordeste'),
('PR', 0.95, 'Sul'),
('RJ', 1.00, 'Sudeste'),
('RN', 1.10, 'Nordeste'),
('RO', 1.25, 'Região Norte'),
('RR', 1.35, 'Região Norte - custo logístico elevado'),
('RS', 0.95, 'Sul'),
('SC', 0.95, 'Sul'),
('SE', 1.10, 'Nordeste'),
('SP', 1.00, 'Sudeste - referência'),
('TO', 1.15, 'Centro-Oeste/Norte');

-- Enable RLS
ALTER TABLE public.custos_regionais ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Super admin can manage regional costs"
ON public.custos_regionais FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Directors can view regional costs"
ON public.custos_regionais FOR SELECT
USING (get_user_role(auth.uid()) IN ('super_admin', 'director'));

-- Trigger para updated_at
CREATE TRIGGER update_custos_regionais_updated_at
BEFORE UPDATE ON public.custos_regionais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Tabela de preços por fornecedor
CREATE TABLE public.supplier_pricing (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    service_type text NOT NULL,
    custo_base numeric(10,2) NOT NULL DEFAULT 0,
    custo_por_m2 numeric(10,2) NOT NULL DEFAULT 0,
    custo_hora_trabalho numeric(10,2) NOT NULL DEFAULT 0,
    tempo_estimado_horas numeric(5,2) DEFAULT 4,
    observacoes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(supplier_id, service_type)
);

-- Enable RLS
ALTER TABLE public.supplier_pricing ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage supplier pricing"
ON public.supplier_pricing FOR ALL
USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Users with media access can view pricing"
ON public.supplier_pricing FOR SELECT
USING (has_module_access(auth.uid(), 'media'));

-- Trigger para updated_at
CREATE TRIGGER update_supplier_pricing_updated_at
BEFORE UPDATE ON public.supplier_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Adicionar campos de detalhamento de custos em service_orders
ALTER TABLE public.service_orders
ADD COLUMN IF NOT EXISTS custo_fornecedor numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS custos_operacionais numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS multiplicador_regional numeric(4,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS detalhamento_custos jsonb DEFAULT '{}'::jsonb;

-- Comentários nas colunas
COMMENT ON TABLE public.config_custos_operacionais IS 'Configuração global de custos operacionais para cálculo de estimativas';
COMMENT ON TABLE public.custos_regionais IS 'Multiplicadores de custo por região/estado';
COMMENT ON TABLE public.supplier_pricing IS 'Tabela de preços por fornecedor e tipo de serviço';
COMMENT ON COLUMN public.service_orders.custo_fornecedor IS 'Custo calculado do fornecedor';
COMMENT ON COLUMN public.service_orders.custos_operacionais IS 'Custos operacionais (hospedagem, alimentação, combustível)';
COMMENT ON COLUMN public.service_orders.multiplicador_regional IS 'Multiplicador regional aplicado';
COMMENT ON COLUMN public.service_orders.detalhamento_custos IS 'JSON com breakdown completo dos custos';