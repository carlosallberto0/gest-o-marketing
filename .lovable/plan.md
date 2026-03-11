

# Dois Caminhos para Solicitações de Manutenção — Super Admin

## Contexto

Hoje, o Super Admin precisa primeiro "Aprovar" uma solicitação pendente, e só depois pode atribuir fornecedor. O fluxo via diretoria exige ir manualmente para outra página (Outdoors) para criar um pacote. Isso é ineficiente e desconectado.

A proposta cria **dois caminhos claros diretamente na tela de Solicitações de Manutenção**:

## Fluxo Proposto

```text
Solicitação Pendente
       │
       ├──→ [Atribuir Fornecedor Direto] → Aprova + Atribui → Vai pro Painel do Fornecedor
       │     (caso individual, urgência, sem necessidade de validação)
       │
       └──→ [Selecionar + Enviar para Diretoria] → Cria pacote de aprovação → Diretoria decide
              (batch, casos que precisam de validação estratégica)
```

## Alterações

### 1. Dialog de Detalhes — Novo botão para pendentes (`MaintenanceRequests.tsx`)

Quando o Super Admin abre uma solicitação **pendente**, além de Aprovar/Rejeitar, adicionar um terceiro botão:
- **"Atribuir Fornecedor Direto"** — Aprova automaticamente a solicitação E abre o AssignSupplierDialog em sequência. Isso permite pular a etapa da diretoria para casos urgentes ou simples.

### 2. Barra de ações em lote — Novo botão "Enviar para Diretoria" (`MaintenanceRequests.tsx`)

Na barra flutuante que aparece quando itens estão selecionados, adicionar:
- **"Enviar para Diretoria"** — Seleciona as solicitações pendentes marcadas, busca os `outdoor_id` correspondentes, cria um `maintenance_approval_package` com os itens, e notifica os diretores aprovadores. Usa o hook `useCreateMaintenancePackage` já existente.

### 3. Nenhuma alteração de banco de dados necessária

O fluxo direto usa `useApproveMaintenanceRequest` (já existe) + `AssignSupplierDialog` (já existe). O fluxo via diretoria usa `useCreateMaintenancePackage` (já existe). Apenas a orquestração na UI precisa ser conectada.

### Arquivos a editar
- **`src/pages/MaintenanceRequests.tsx`** — adicionar botão "Atribuir Fornecedor Direto" no dialog de detalhes para pendentes; adicionar botão "Enviar para Diretoria" na barra de ações em lote

