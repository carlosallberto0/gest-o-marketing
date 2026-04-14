
CREATE OR REPLACE FUNCTION public.update_outdoor_photo_from_supplier(
  p_outdoor_id uuid,
  p_photo_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Verificar se o outdoor pertence a alguma ordem do fornecedor
  IF NOT EXISTS (
    SELECT 1 FROM supplier_work_order_items swi
    JOIN supplier_work_orders swo ON swo.id = swi.work_order_id
    WHERE swi.outdoor_id = p_outdoor_id
    AND swo.supplier_id = get_user_supplier_id(auth.uid())
  ) THEN
    -- Se não é fornecedor vinculado, verificar se é admin
    IF get_user_role(auth.uid()) NOT IN ('super_admin', 'admin') THEN
      RAISE EXCEPTION 'Sem permissão para atualizar este outdoor';
    END IF;
  END IF;

  UPDATE outdoors
  SET photo_url = p_photo_url, updated_at = now()
  WHERE id = p_outdoor_id;
END;
$$;
