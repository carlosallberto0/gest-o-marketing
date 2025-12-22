-- Criar função RPC para atualizar outdoor após avaliação (SECURITY DEFINER)
-- Isso permite que gerentes atualizem o status do outdoor mesmo com RLS restritiva
CREATE OR REPLACE FUNCTION public.update_outdoor_after_evaluation(
  p_outdoor_id UUID,
  p_status outdoor_status,
  p_non_operational_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Atualizar o outdoor
  UPDATE outdoors
  SET 
    status = p_status,
    non_operational_reason = CASE WHEN p_status = 'non_operational' THEN p_non_operational_reason ELSE NULL END,
    last_evaluation = now(),
    updated_at = now()
  WHERE id = p_outdoor_id;
END;
$$;

-- Permitir execução da função para usuários autenticados
GRANT EXECUTE ON FUNCTION public.update_outdoor_after_evaluation TO authenticated;