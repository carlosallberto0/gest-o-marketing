-- Insert default service types into system_options
INSERT INTO system_options (category, option_key, option_label, display_order) VALUES
  ('supplier_service_type', 'installation', 'Instalação', 1),
  ('supplier_service_type', 'maintenance', 'Manutenção Geral', 2),
  ('supplier_service_type', 'removal', 'Remoção', 3),
  ('supplier_service_type', 'replacement', 'Substituição de Lona', 4),
  ('supplier_service_type', 'construction', 'Construção', 5)
ON CONFLICT (category, option_key) DO NOTHING;