

# Vincular Gerentes aos PDVs — Cadastro e Preenchimento Automático

## Contexto

Hoje o campo `manager_id` existe na tabela `pdvs`, mas os formulários de criação e edição de PDV **não oferecem** a opção de selecionar um gerente. O resultado é que a maioria dos postos aparece como "Sem gerente" no painel de progresso.

Além disso, os perfis de gerentes já possuem `pdv_id` preenchido (vínculo inverso), e as avaliações de mídia (`media_evaluations`) registram o `evaluator_id` por PDV. Podemos usar essas duas fontes para preencher automaticamente os `manager_id` dos PDVs que estão sem gerente.

## Alterações

### 1. Adicionar campo "Gerente" nos formulários de PDV

**`src/components/dialogs/NewPDVDialog.tsx`** e **`src/components/dialogs/EditPDVDialog.tsx`**

- Adicionar um `Select` com a lista de perfis com role `manager` (buscar de `profiles` onde `role = 'manager'` e `status = 'active'`)
- O campo é opcional na criação mas recomendado
- Na edição, exibir o gerente atual e permitir alteração
- Passar `manager_id` para os hooks de criação/atualização

**`src/hooks/useCreatePDV.ts`** — Adicionar `managerId?: string` ao `CreatePDVInput` e incluir `manager_id` no insert.

**`src/hooks/usePDVMutations.ts`** — Adicionar `manager_id?: string | null` ao `UpdatePDVData`.

### 2. Script de preenchimento automático (one-time backfill)

Criar uma função no backend que:
1. Busca todos os PDVs com `manager_id IS NULL`
2. Para cada PDV, verifica se existe um perfil com `pdv_id = pdv.id` e `role = 'manager'` — se sim, atribui
3. Caso contrário, busca o `evaluator_id` mais frequente em `media_evaluations` para aquele PDV e verifica se é um gerente — se sim, atribui
4. Atualiza o `manager_id` dos PDVs encontrados

Isso será implementado como uma **edge function** (`backfill-pdv-managers`) que o Super Admin pode executar uma vez via botão na tela de PDVs.

### 3. Botão de sincronização na tela de PDVs

**`src/pages/PDVs.tsx`** — Para Super Admin, adicionar um botão "Sincronizar Gerentes" que chama a edge function. Exibe um toast com o resultado (X postos atualizados).

### Arquivos a editar/criar
- **Editar**: `src/components/dialogs/NewPDVDialog.tsx` — campo select de gerente
- **Editar**: `src/components/dialogs/EditPDVDialog.tsx` — campo select de gerente
- **Editar**: `src/hooks/useCreatePDV.ts` — aceitar `managerId`
- **Editar**: `src/hooks/usePDVMutations.ts` — aceitar `manager_id`
- **Criar**: `supabase/functions/backfill-pdv-managers/index.ts` — lógica de preenchimento automático
- **Editar**: `src/pages/PDVs.tsx` — botão "Sincronizar Gerentes"

