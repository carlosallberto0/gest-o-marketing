

# Atualizar foto do outdoor ao fornecedor executar manutenção

## Análise

Faz total sentido. O fluxo já funciona assim para avaliações de gerentes — ao avaliar, a foto do outdoor é atualizada via RPC `update_outdoor_after_evaluation`. A mesma lógica deve ser aplicada quando o fornecedor marca "Serviço Executado" e sobe a foto de execução.

Isso garante que:
- A foto do outdoor sempre reflete o estado mais recente
- O gerente, ao fazer a próxima avaliação, verá a foto pós-manutenção como referência
- O Mapa Estratégico e os relatórios mostram a realidade atual

## Alteração

### `src/hooks/useSupplierWorkOrders.ts` — `useMarkItemExecuted`

Após marcar o item como executado com foto, atualizar o `photo_url` do outdoor correspondente:

1. Buscar o `outdoor_id` do item executado
2. Se houver `execution_photo_url`, atualizar `outdoors.photo_url` com essa foto

Lógica adicional (3 linhas):
```typescript
// Após o update do item, se tem foto de execução:
if (executionPhotoUrl) {
  await supabase.from('outdoors')
    .update({ photo_url: executionPhotoUrl })
    .eq('id', outdoorId);
}
```

Será necessário também receber o `outdoorId` no input da mutation (já disponível no componente `SupplierPanel.tsx` onde o item possui `outdoor_id`).

### `src/pages/SupplierPanel.tsx`

Passar o `outdoor_id` do item ao chamar `markExecuted`, para que a mutation saiba qual outdoor atualizar.

### Arquivos a editar
- **`src/hooks/useSupplierWorkOrders.ts`** — adicionar update do `photo_url` do outdoor na mutation `useMarkItemExecuted`
- **`src/pages/SupplierPanel.tsx`** — passar `outdoorId` na chamada da mutation

