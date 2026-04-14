

# Atualizar Fotos de Outdoors com Imagens Já Enviadas pelos Fornecedores

## Problema

A função RPC `update_outdoor_photo_from_supplier` foi criada agora, mas os itens que já foram executados anteriormente não tiveram suas fotos propagadas para a tabela `outdoors`. As fotos existem em `supplier_work_order_items.execution_photo_url`, mas `outdoors.photo_url` não foi atualizado.

## Solução

Executar uma migração SQL que faz o backfill: para cada item já executado (`executed = true`) que possui `execution_photo_url`, atualizar o `photo_url` do outdoor correspondente. Priorizamos a foto mais recente caso haja múltiplas execuções para o mesmo outdoor.

### Migração SQL

```sql
UPDATE outdoors o
SET 
  photo_url = sub.execution_photo_url,
  updated_at = now()
FROM (
  SELECT DISTINCT ON (outdoor_id) 
    outdoor_id, 
    execution_photo_url
  FROM supplier_work_order_items
  WHERE executed = true 
    AND execution_photo_url IS NOT NULL
  ORDER BY outdoor_id, executed_at DESC
) sub
WHERE o.id = sub.outdoor_id;
```

Isso pega a foto de execução mais recente de cada outdoor e atualiza o cadastro. Uma única migração, sem alteração de código.

### Arquivos
- **Nova migração SQL**: backfill de `outdoors.photo_url` a partir de `supplier_work_order_items`

