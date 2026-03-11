

# Desfazer Execução de Item pelo Super Admin

## Problema
Um item da ordem de serviço foi marcado como "Executado" incorretamente. O Super Admin precisa reverter esse status para "aguardando execução".

## Solução

### 1. Nova mutation `useRevertItemExecution` em `useSupplierWorkOrders.ts`
- Atualiza o item: `executed = false`, `executed_at = null`, `execution_photo_url = null`
- Se todos os itens da work order ficarem não-executados, reverte o status da work order de `completed` para `pending`

### 2. Botão "Desfazer Execução" na aba "Ordens Executadas" (`ServiceOrders.tsx`)
- Ao lado de cada item com badge "Executado", adicionar um botão/ícone para o Super Admin reverter
- Confirmação antes de executar a ação
- Após reverter, a work order volta a aparecer no painel do fornecedor para re-execução

### Arquivos a editar
- **`src/hooks/useSupplierWorkOrders.ts`** — nova mutation `useRevertItemExecution`
- **`src/pages/ServiceOrders.tsx`** — botão de desfazer em cada item executado

