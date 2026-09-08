-- Recriar função update_outdoor_after_evaluation com owner postgres para garantir bypass de RLS
CREATE OR REPLACE FUNCTION public.update_outdoor_after_evaluation(
  p_outdoor_id UUID,
  p_status outdoor_status,
  p_non_operational_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se o usuário tem acesso ao módulo media
  IF NOT has_module_access(auth.uid(), 'media') THEN
    RAISE EXCEPTION 'Acesso negado ao módulo media';
  END IF;

  -- Atualizar o outdoor (SECURITY DEFINER com owner postgres bypassa RLS)
  UPDATE outdoors
  SET 
    status = p_status,
    non_operational_reason = CASE WHEN p_status = 'non_operational' THEN p_non_operational_reason ELSE NULL END,
    last_evaluation = now(),
    updated_at = now()
  WHERE id = p_outdoor_id;
END;
$$;

-- Definir owner como postgres para garantir bypass de RLS
ALTER FUNCTION public.update_outdoor_after_evaluation(UUID, outdoor_status, TEXT) OWNER TO postgres;

-- Garantir que as funções de notificação também tenham owner postgres
ALTER FUNCTION public.notificar_por_role(user_role, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) OWNER TO postgres;
ALTER FUNCTION public.enviar_notificacao(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) OWNER TO postgres;

-- Atualizar outdoors baseado nas avaliações existentes que não foram sincronizadas
UPDATE outdoors o
SET 
  status = me.status,
  non_operational_reason = me.non_operational_reason,
  last_evaluation = me.evaluated_at,
  updated_at = now()
FROM (
  SELECT DISTINCT ON (outdoor_id) 
    outdoor_id, status, non_operational_reason, evaluated_at
  FROM media_evaluations
  ORDER BY outdoor_id, evaluated_at DESC
) me
WHERE o.id = me.outdoor_id
AND (o.status != me.status OR o.last_evaluation IS NULL OR o.last_evaluation < me.evaluated_at);