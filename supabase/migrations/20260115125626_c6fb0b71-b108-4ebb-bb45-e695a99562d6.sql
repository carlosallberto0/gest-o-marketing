-- Add payment method options to system_options
INSERT INTO system_options (category, option_key, option_label, display_order, is_active)
VALUES 
  ('contract_payment_method', 'cash', 'Dinheiro', 1, true),
  ('contract_payment_method', 'fuel', 'Combustível', 2, true),
  ('contract_payment_method', 'both', 'Misto', 3, true),
  ('contract_payment_method', 'pix', 'PIX', 4, true)
ON CONFLICT DO NOTHING;

-- Alter payment_method column to TEXT to support dynamic options
ALTER TABLE contracts 
ALTER COLUMN payment_method TYPE TEXT 
USING payment_method::TEXT;

-- Add contract alert settings to system_settings
INSERT INTO system_settings (key, value)
VALUES (
  'contract_alert_settings',
  '{"alert_days": [7, 15, 30], "notify_email": true, "notify_dashboard": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;