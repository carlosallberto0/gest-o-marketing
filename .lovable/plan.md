

# Teste Fictício do Fluxo Fornecedor + Botão de Limpeza

## O que será feito

Inserir dados fictícios que simulem o fluxo completo (pacote aprovado pela diretoria → aba "Manutenção Aprovada" → envio para fornecedor → aba "Ordens Executadas") e adicionar um botão de exclusão para o Super Admin limpar esses dados de teste.

## Dados de teste a inserir

1. **Pacote de manutenção fictício** (`maintenance_approval_packages`)
   - Status: `approved`, `ready_for_service_order: true`
   - 3 itens (`maintenance_package_items`) com outdoors reais não-operacionais (OUT-42, OUT-47, OUT-37)
   - Status dos itens: `approved`

2. **Work order fictícia** (`supplier_work_orders`)
   - Vinculada ao pacote acima
   - Atribuída ao fornecedor "Digidoor"
   - Status: `completed` (simulando que o fornecedor já concluiu)
   - 3 itens (`supplier_work_order_items`) com `executed: true` e timestamps

## Alterações no código

### ServiceOrders.tsx
- Adicionar botão **"🧪 Inserir Teste"** visível apenas para Super Admin (insere os dados fictícios via chamada direta)
- Na aba "Ordens Executadas", adicionar botão **"🗑️ Excluir Teste"** em cada work order que permita ao Super Admin deletar o work order + items + pacote de teste

### useSupplierWorkOrders.ts
- Adicionar mutation `useDeleteWorkOrder` que deleta: items do work order → work order → itens do pacote → pacote (cascata limpa)

## Resultado esperado

1. Super Admin clica "Inserir Teste" → dados aparecem na aba "Manutenção Aprovada" (pacote com 3 outdoors) e na aba "Ordens Executadas" (work order completada)
2. Super Admin pode validar ou excluir os dados de teste sem impactar dados reais
3. Todos os dados fictícios são marcados com `notes: '[TESTE]'` para fácil identificação

