

# Validação Individual de Itens em Ordens Executadas

## Problema

Hoje o botão "Validar" marca a ordem inteira como validada de uma vez, sem distinção entre itens executados e não executados. O usuário precisa:
1. Selecionar individualmente quais itens executados deseja validar (via checkbox)
2. Validar apenas os selecionados
3. Itens validados devem sumir da visualização
4. Quando todos os itens forem validados, a ordem inteira é marcada como validada e desaparece

## Alterações

### 1. Migração SQL — Adicionar campos de validação nos itens

Adicionar `validated` (boolean, default false) e `validated_at` (timestamp) na tabela `supplier_work_order_items`.

### 2. Hook `useSupplierWorkOrders.ts` — Novo hook de validação por itens

- Criar `useValidateWorkOrderItems(itemIds: string[])` que:
  - Marca os itens selecionados como `validated = true, validated_at = now()`
  - Verifica se todos os itens da ordem já foram validados
  - Se sim, marca a ordem inteira como `validated`

- Atualizar o query de `useSupplierWorkOrders` na aba "Ordens Executadas" para filtrar apenas ordens que tenham pelo menos um item `executed = true AND validated = false`

### 3. Página `ServiceOrders.tsx` — Aba "Ordens Executadas"

- Adicionar estado de seleção de itens (checkboxes) por ordem
- Mostrar checkbox apenas em itens executados e não validados
- Botão "Validar Selecionados" substitui o botão "Validar" atual
- Filtrar itens validados da visualização (não mostrar itens com `validated = true`)
- Se uma ordem não tiver mais itens pendentes de validação, ela some da lista

### Arquivos
- **Nova migração SQL**: `ALTER TABLE supplier_work_order_items ADD COLUMN validated boolean DEFAULT false, ADD COLUMN validated_at timestamptz`
- **Editar**: `src/hooks/useSupplierWorkOrders.ts` (novo hook + ajuste no query)
- **Editar**: `src/pages/ServiceOrders.tsx` (checkboxes + lógica de seleção na aba executadas)

