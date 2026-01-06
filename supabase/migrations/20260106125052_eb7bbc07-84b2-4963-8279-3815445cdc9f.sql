-- Add evaluation validity timestamp to outdoors table
ALTER TABLE public.outdoors 
ADD COLUMN IF NOT EXISTS avaliacao_valida_ate TIMESTAMP WITH TIME ZONE;

-- Add index for efficient queries on evaluation validity
CREATE INDEX IF NOT EXISTS idx_outdoors_avaliacao_valida_ate ON public.outdoors(avaliacao_valida_ate);

-- Insert outdoor cycle configuration in system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'outdoor_cycle_config',
  '{"validade_horas": 24, "comportamento_expiracao": "pendente_reavaliacao", "notificar_gerente_horas_antes": 6, "notificar_super_admin_expirado_24h": true, "bloquear_pagamento_nao_operacional": true}'::jsonb,
  'Configurações do ciclo de avaliação de outdoors'
)
ON CONFLICT (key) DO NOTHING;

-- Create a function to calculate verification status
CREATE OR REPLACE FUNCTION public.get_outdoor_verification_status(
  p_avaliacao_valida_ate TIMESTAMP WITH TIME ZONE,
  p_last_evaluation TIMESTAMP WITH TIME ZONE
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_last_evaluation IS NULL THEN
    RETURN 'nunca_avaliado';
  ELSIF p_avaliacao_valida_ate IS NULL THEN
    RETURN 'pendente_reavaliacao';
  ELSIF p_avaliacao_valida_ate > NOW() THEN
    RETURN 'avaliado';
  ELSE
    RETURN 'pendente_reavaliacao';
  END IF;
END;
$$;