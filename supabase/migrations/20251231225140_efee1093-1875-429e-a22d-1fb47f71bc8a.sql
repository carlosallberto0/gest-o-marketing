-- PARTE 1: Novos parâmetros globais de produção
INSERT INTO config_custos_operacionais (parametro, valor, unidade, descricao) VALUES
  ('custo_m2_lona', 45.00, 'R$/m²', 'Custo do material de lona por metro quadrado'),
  ('custo_impressao_base', 150.00, 'R$', 'Custo fixo de setup de impressão'),
  ('custo_impressao_m2', 25.00, 'R$/m²', 'Custo de impressão por metro quadrado'),
  ('custo_envio_base', 80.00, 'R$', 'Custo fixo de envio/frete'),
  ('custo_envio_km', 0.50, 'R$/km', 'Custo de envio por quilômetro')
ON CONFLICT (parametro) DO NOTHING;

-- PARTE 2: Novos campos de produção na tabela supplier_pricing
ALTER TABLE supplier_pricing ADD COLUMN IF NOT EXISTS custo_impressao_m2 DECIMAL(10,2) DEFAULT 0;
ALTER TABLE supplier_pricing ADD COLUMN IF NOT EXISTS custo_envio_base DECIMAL(10,2) DEFAULT 0;
ALTER TABLE supplier_pricing ADD COLUMN IF NOT EXISTS inclui_material BOOLEAN DEFAULT FALSE;
ALTER TABLE supplier_pricing ADD COLUMN IF NOT EXISTS custo_construcao_base DECIMAL(10,2) DEFAULT 0;
ALTER TABLE supplier_pricing ADD COLUMN IF NOT EXISTS custo_construcao_m2 DECIMAL(10,2) DEFAULT 0;