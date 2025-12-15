-- Insert standard merchandising materials with initial stock
INSERT INTO public.trade_materials (code, name, type, category, description, unit_cost, current_stock, minimum_stock, status)
VALUES
  ('MAT-001', 'Wobbler', 'promotional', 'merchandising', 'Sinalizador promocional para prateleiras - deve estar na altura dos olhos', 8.50, 200, 50, 'active'),
  ('MAT-002', 'Stopper', 'promotional', 'merchandising', 'Barreira de prateleira para destaque de produto', 12.00, 150, 40, 'active'),
  ('MAT-003', 'Móbile de Teto', 'promotional', 'merchandising', 'Suspenso para teto com mensagem promocional', 45.00, 80, 20, 'active'),
  ('MAT-004', 'Clip Strip', 'display', 'merchandising', 'Suporte para produtos em gôndolas', 6.50, 300, 80, 'active'),
  ('MAT-005', 'Display de Balcão', 'display', 'merchandising', 'Expositor para balcão de atendimento', 35.00, 60, 15, 'active'),
  ('MAT-006', 'Faixa de Gôndola', 'signage', 'merchandising', 'Faixa promocional para frente de gôndola', 18.00, 120, 30, 'active'),
  ('MAT-007', 'Precificador', 'printed', 'merchandising', 'Etiqueta de preço para produtos', 0.25, 2000, 500, 'active'),
  ('MAT-008', 'Adesivo de Chão', 'sticker', 'merchandising', 'Adesivo promocional para piso da loja', 22.00, 100, 25, 'active'),
  ('MAT-009', 'Cartaz de Vidro', 'poster', 'merchandising', 'Cartaz para porta de vidro ou janela da loja', 15.00, 150, 40, 'active'),
  ('MAT-010', 'Adesivo de Geladeira', 'sticker', 'merchandising', 'Adesivo promocional para portas de geladeiras', 20.00, 120, 30, 'active'),
  ('MAT-011', 'Banner Promocional', 'banner', 'merchandising', 'Banner para destaque de campanhas e promoções', 55.00, 50, 10, 'active'),
  ('MAT-012', 'Flyer/Folheto', 'flyer', 'merchandising', 'Material impresso para distribuição aos clientes', 0.15, 5000, 1000, 'active')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  unit_cost = EXCLUDED.unit_cost,
  minimum_stock = EXCLUDED.minimum_stock;