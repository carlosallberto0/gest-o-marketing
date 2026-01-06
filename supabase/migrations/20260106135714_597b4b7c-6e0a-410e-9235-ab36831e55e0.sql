-- Atualizar a função RPC para incluir a foto e calcular avaliacao_valida_ate
CREATE OR REPLACE FUNCTION public.update_outdoor_after_evaluation(
  p_outdoor_id uuid,
  p_status outdoor_status,
  p_non_operational_reason text DEFAULT NULL,
  p_photo_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_validade_horas integer;
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se o usuário tem acesso ao módulo media
  IF NOT has_module_access(auth.uid(), 'media') THEN
    RAISE EXCEPTION 'Acesso negado ao módulo media';
  END IF;

  -- Buscar a configuração de validade em horas (default 24)
  SELECT COALESCE((value->>'validade_horas')::integer, 24)
  INTO v_validade_horas
  FROM system_settings
  WHERE key = 'outdoor_cycle_config';

  -- Se não encontrou configuração, usar 24 horas
  IF v_validade_horas IS NULL THEN
    v_validade_horas := 24;
  END IF;

  -- Atualizar o outdoor (SECURITY DEFINER com owner postgres bypassa RLS)
  UPDATE outdoors
  SET 
    status = p_status,
    non_operational_reason = CASE WHEN p_status = 'non_operational' THEN p_non_operational_reason ELSE NULL END,
    last_evaluation = now(),
    avaliacao_valida_ate = now() + (v_validade_horas || ' hours')::interval,
    photo_url = COALESCE(p_photo_url, photo_url),
    updated_at = now()
  WHERE id = p_outdoor_id;
END;
$function$;