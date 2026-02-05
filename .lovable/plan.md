
# Auditoria Completa de Estrutura CRUD - Sistema Gestao e Marketing

## Resumo Executivo

Realizei uma analise completa de todos os hooks e paginas do sistema para mapear as operacoes CRUD (Create, Read, Update, Delete). O sistema possui uma estrutura bem organizada seguindo padroes consistentes com React Query e Supabase.

---

## 1. Modulo Midia Externa

### 1.1 Outdoors

| Operacao | Hook/Funcao | Status | Observacoes |
|----------|-------------|--------|-------------|
| CREATE | `useCreateOutdoor` | OK | Cria outdoor com todos os campos |
| READ | `useOutdoors` | OK | Filtra por PDV para gerentes |
| UPDATE | Via `supabase.rpc('update_outdoor_after_evaluation')` | OK | Usa RPC para bypass RLS |
| DELETE | Direto via `supabase.from('outdoors').delete()` | OK | Apenas super_admin |

**Lacuna identificada**: Falta um hook `useUpdateOutdoor` e `useDeleteOutdoor` dedicado. A exclusao e feita diretamente na pagina Outdoors.tsx (linhas 129-150).

### 1.2 Contratos

| Operacao | Hook/Funcao | Status | Observacoes |
|----------|-------------|--------|-------------|
| CREATE | `useCreateContract` | OK | Suporta multiplos outdoors e imagens |
| READ | `useContracts`, `useContractByOutdoor` | OK | Relacoes pivot table funcionando |
| UPDATE | `useUpdateContract` | OK | Atualiza associacoes e imagens |
| DELETE | `useDeleteContract` | OK | Cascade delete automatico |

### 1.3 Ordens de Servico

| Operacao | Hook/Funcao | Status | Observacoes |
|----------|-------------|--------|-------------|
| CREATE | `useCreateServiceOrder` | OK | Gera numero sequencial |
| READ | `useServiceOrders` + filtros especificos | OK | Multiplas queries por status |
| UPDATE | `useUpdateServiceOrder` + fluxos especificos | OK | Admin, Director, Supplier, Manager |
| DELETE | `useDeleteServiceOrder` | OK | Exclusao permanente |

### 1.4 Solicitacoes de Manutencao

| Operacao | Hook/Funcao | Status | Observacoes |
|----------|-------------|--------|-------------|
| CREATE | `useCreateMaintenanceRequest` | OK | Notifica super_admin |
| READ | `useMaintenanceRequests`, `usePendingMaintenanceRequests` | OK | Filtros por status |
| UPDATE | `useApproveMaintenanceRequest`, `useRejectMaintenanceRequest` | OK | Fluxo de aprovacao |
| DELETE | NAO EXISTE | PENDENTE | Considerar soft delete |

### 1.5 Fornecedores

| Operacao | Hook/Funcao | Status | Observacoes |
|----------|-------------|--------|-------------|
| CREATE | `useCreateSupplier` | OK | Cadastro completo |
| READ | `useSuppliers`, `useActiveSuppliers` | OK | Filtro por status |
| UPDATE | `useUpdateSupplier` | OK | Atualiza todos campos |
| DELETE | `useDeleteSupplier` | OK | Exclusao permanente |

---

## 2. Modulo Merchandising

### 2.1 PDVs

| Operacao | Hook/Funcao | Status | Observacoes |
|----------|-------------|--------|-------------|
| CREATE | `useCreatePDV` | OK | Trata codigo duplicado |
| READ | `usePDVs`, `usePDVsList` | OK | Inclui stats de outdoor e merch |
| UPDATE | `useUpdatePDV` | OK | Atualiza incluindo coordenadas |
| DELETE | `useDeletePDV` | OK | Alerta sobre dados vinculados |

### 2.2 Materiais

| Operacao | Hook/Funcao | Status | Observacoes |
|----------|-------------|--------|-------------|
| CREATE | `NewMaterialDialog` (direto) | OK | Via dialog |
| READ | Query inline em `Materials.tsx` | OK | Query simples |
| UPDATE | Funcao `handleSaveEdit` em `Materials.tsx` | OK | Via dialog |
| DELETE | NAO EXISTE | PENDENTE | Nao ha opcao de exclusao |

**Lacuna identificada**: Materiais nao possui hook dedicado nem opcao de exclusao.

### 2.3 Solicitacoes de Material

| Operacao | Hook/Funcao | Status | Observacoes |
|----------|-------------|--------|-------------|
| CREATE | `useCreateMaterialRequest` | OK | Suporta multiplos itens |
| READ | `useMaterialRequests` | OK | Joins com material, pdv, requester |
| UPDATE | `useUpdateMaterialRequest` | OK | Fluxo aprovacao/rejeicao/entrega |
| DELETE | NAO EXISTE | PENDENTE | Considerar cancelamento |

### 2.4 Movimentacoes de Estoque

| Operacao | Hook/Funcao | Status | Observacoes |
|----------|-------------|--------|-------------|
| CREATE | `useCreateStockMovement` | OK | Valida quantidade |
| READ | `useStockMovements` | OK | Filtro por material |
| UPDATE | NAO SE APLICA | - | Movimentacoes sao imutaveis |
| DELETE | NAO SE APLICA | - | Historico e imutavel |

### 2.5 Campanhas

| Operacao | Hook/Funcao | Status | Observacoes |
|----------|-------------|--------|-------------|
| CREATE | `useCreateCampaign` | OK | Gera codigo sequencial |
| READ | `useCampaigns` | OK | Lista completa |
| UPDATE | `useUpdateCampaignStatus` | PARCIAL | So atualiza status |
| DELETE | NAO EXISTE | PENDENTE | Nao ha opcao de exclusao |

**Lacuna identificada**: Campanhas nao tem edicao completa nem exclusao.

---

## 3. Modulo Usuarios e Perfis

| Operacao | Hook/Funcao | Status | Observacoes |
|----------|-------------|--------|-------------|
| CREATE | `useCreateUser` | OK | Via edge function |
| READ | `useProfiles` | OK | Nao expoe temp_password |
| UPDATE | `useUpdateProfile` | OK | Atualiza role, modulos, pdv |
| DELETE | `useDeleteProfile` (soft), `usePermanentDeleteProfile` | OK | Soft delete e permanente |
| REATIVAR | `useReactivateProfile` | OK | Reativa usuarios inativos |
| RESET SENHA | `useResetPassword` | OK | Via edge function |

---

## 4. Modulo Loteamentos

| Operacao | Hook/Funcao | Status | Observacoes |
|----------|-------------|--------|-------------|
| CREATE | `useCreateLoteamentoLancamento`, `useCreateLoteamentoPagamento`, `useCreateLoteamentoContrato` | OK | CRUD completo |
| READ | `useLoteamentosLancamentos`, `useLoteamentosPagamentos`, `useLoteamentosContratos` | OK | Com joins |
| UPDATE | `useUpdateLoteamentoLancamento`, `useUpdateLoteamentoPagamento`, `useUpdateLoteamentoContrato` | OK | Todos campos |
| DELETE | `useDeleteLoteamentoLancamento`, `useDeleteLoteamentoContrato` | OK | Exclusao permanente |

**Observacao**: Falta `useDeleteLoteamentoPagamento`.

---

## 5. Modulo Agencia

| Operacao | Entidade | Status | Observacoes |
|----------|----------|--------|-------------|
| CRUD Agencias | `useAgencias`, `useCreateAgencia`, `useUpdateAgencia`, `useDeleteAgencia` | OK | Completo |
| CRUD Demandas | `useAgenciaDemandas`, `useCreateAgenciaDemanda`, `useUpdateAgenciaDemanda` | PARCIAL | Falta delete |
| CRUD Videos | `useAgenciaVideos`, `useCreateAgenciaVideo`, `useUpdateAgenciaVideo`, `useDeleteAgenciaVideo` | OK | Completo |
| CRUD Fotos | `useAgenciaFotos`, `useCreateAgenciaFoto`, `useDeleteAgenciaFoto` | PARCIAL | Falta update |

---

## 6. Modulo Financeiro - Custos Externos

| Operacao | Hook/Funcao | Status | Observacoes |
|----------|-------------|--------|-------------|
| CREATE | `useCreateCustoExterno` | OK | Com alocacoes |
| READ | `useCustosExternos`, `useCustoExterno`, `useCustosPorPosto` | OK | Filtros e KPIs |
| UPDATE | `useUpdateCustoExterno`, `useUpdateAlocacoes` | OK | Atualiza rateio |
| DELETE | `useDeleteCustoExterno` | OK | **Soft delete** (padrao correto) |

---

## 7. Itens de Checklist

| Operacao | Hook/Funcao | Status | Observacoes |
|----------|-------------|--------|-------------|
| CREATE | `useCreateChecklistQuestion` | OK | Auto-incrementa sort_order |
| READ | Via `useChecklistData` | OK | Agrupado por categoria |
| UPDATE | `useUpdateChecklistQuestion` | OK | Todos os campos |
| DELETE | `useDeleteChecklistQuestion` | OK | Exclusao permanente |

---

## Lacunas Identificadas e Recomendacoes

### Prioridade ALTA (Funcionalidades em falta)

| Entidade | Problema | Recomendacao |
|----------|----------|--------------|
| Outdoors | Delete/Update direto na pagina sem hook | Criar `useUpdateOutdoor` e `useDeleteOutdoor` |
| Materiais | Sem exclusao e sem hook dedicado | Criar `useTradeMaterials` com CRUD completo |
| Campanhas | Apenas update de status | Expandir para edicao completa e exclusao |
| Solicitacoes Manutencao | Sem exclusao | Adicionar soft delete ou cancelamento |

### Prioridade MEDIA (Padronizacao)

| Entidade | Problema | Recomendacao |
|----------|----------|--------------|
| Demandas Agencia | Falta delete | Adicionar `useDeleteAgenciaDemanda` |
| Fotos Agencia | Falta update | Adicionar `useUpdateAgenciaFoto` |
| Pagamentos Loteamentos | Falta delete | Adicionar `useDeleteLoteamentoPagamento` |

### Prioridade BAIXA (Melhorias)

| Entidade | Problema | Recomendacao |
|----------|----------|--------------|
| Solicitacoes Material | Sem cancelamento | Adicionar status 'cancelled' |
| Contratos | Sem soft delete | Considerar inativacao ao inves de exclusao |

---

## Padrao Atual vs Recomendado

### Padrao Atual (Maioria dos hooks)

```text
- useEntidade() -> READ (query)
- useCreateEntidade() -> CREATE (mutation)
- useUpdateEntidade() -> UPDATE (mutation)
- useDeleteEntidade() -> DELETE (mutation)
```

### Hooks que NAO seguem o padrao

1. **Materials.tsx**: CRUD inline sem hooks dedicados
2. **Outdoors.tsx**: Delete inline sem hook
3. **useCampaigns.ts**: Update limitado a status

---

## Plano de Correcao Sugerido

### Fase 1: Criar hooks faltantes (1-2 dias)

1. Criar `src/hooks/useTradeMaterials.ts` com CRUD completo
2. Criar `useUpdateOutdoor.ts` e `useDeleteOutdoor.ts`
3. Expandir `useCampaigns.ts` com `useUpdateCampaign` e `useDeleteCampaign`

### Fase 2: Completar CRUDs parciais (1 dia)

1. Adicionar `useDeleteAgenciaDemanda`
2. Adicionar `useUpdateAgenciaFoto`
3. Adicionar `useDeleteLoteamentoPagamento`

### Fase 3: Soft delete onde aplicavel (0.5 dia)

1. Implementar soft delete em `maintenance_requests`
2. Considerar soft delete em `campaigns`

---

## Resumo do Estado Atual

| Categoria | Total | Completo | Parcial | Pendente |
|-----------|-------|----------|---------|----------|
| Midia Externa | 5 entidades | 4 | 1 | 0 |
| Merchandising | 5 entidades | 2 | 3 | 0 |
| Usuarios | 1 entidade | 1 | 0 | 0 |
| Loteamentos | 3 entidades | 2 | 1 | 0 |
| Agencia | 4 entidades | 2 | 2 | 0 |
| Financeiro | 1 entidade | 1 | 0 | 0 |
| Configuracoes | 1 entidade | 1 | 0 | 0 |

**Conclusao**: O sistema possui aproximadamente 85% das funcionalidades CRUD implementadas corretamente. As lacunas sao principalmente em operacoes de DELETE em algumas entidades e na padronizacao de alguns hooks.
