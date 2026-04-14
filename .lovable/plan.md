

# Corrigir Atualização de Foto do Outdoor após Execução pelo Fornecedor

## Problema

Quando o fornecedor marca um item como executado e faz upload da foto, o sistema tenta atualizar `outdoors.photo_url` diretamente. Porém, a política RLS da tabela `outdoors` só permite UPDATE para `super_admin` e `admin`. O fornecedor não tem permissão, então a atualização falha silenciosamente — a foto fica salva no item da ordem de serviço, mas não reflete no cadastro do outdoor.

## Solução

Criar uma função RPC `SECURITY DEFINER` que atualiza a foto do outdoor de forma segura, verificando que o usuário é um fornecedor vinculado àquela ordem de serviço. Depois, substituir o `update` direto no hook `useMarkItemExecuted` pela chamada RPC.

## Alterações

### 1. Migração SQL — Criar função RPC

```sql
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
```

### 2. Editar `src/hooks/useSupplierWorkOrders.ts`

Substituir o trecho que faz `supabase.from('outdoors').update(...)` pela chamada RPC:

```typescript
if (executionPhotoUrl && outdoorId) {
  await supabase.rpc('update_outdoor_photo_from_supplier', {
    p_outdoor_id: outdoorId,
    p_photo_url: executionPhotoUrl,
  });
}
```

### Arquivos
- **Nova migração SQL**: função RPC `update_outdoor_photo_from_supplier`
- **Editar**: `src/hooks/useSupplierWorkOrders.ts` (função `useMarkItemExecuted`, ~linha 191-195)

### Resultado
A foto enviada pelo fornecedor ao executar o serviço passará a atualizar automaticamente a foto principal do outdoor, visível no cadastro, mapa estratégico e listagens.

