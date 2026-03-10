

# Painel do Fornecedor - Fluxo de Execução de Manutenção

## Análise de viabilidade

Sim, faz total sentido e é viável sem quebrar a estrutura atual. O sistema já possui:
- Role `supplier` no banco e no auth
- Tabelas de `service_orders`, `maintenance_approval_packages`, `maintenance_package_items`
- Fluxo de status nas ordens de serviço (`in_progress`, `completed`, `validated`)
- Cadastro de fornecedores com login via link de acesso

O que falta é o **painel dedicado do fornecedor** e a **ponte entre pacotes aprovados pelo Diretor e o fornecedor**.

## Fluxo completo proposto

```text
Diretor aprova pacote
       ↓
Super Admin visualiza pacotes aprovados
       ↓
Super Admin seleciona pacote + fornecedor → Envia para fornecedor
       ↓
Fornecedor recebe no painel "Serviços em Andamento"
       ↓
Fornecedor executa: upload foto + checkbox "Executado" (data/hora)
       ↓
Fornecedor seleciona itens concluídos → "Enviar Ordens Executadas"
       ↓
Super Admin recebe em "Ordens Executadas" → Valida
```

## Implementação

### 1. Nova tabela: `supplier_work_orders`
Liga pacotes de manutenção aprovados ao fornecedor designado.

```sql
CREATE TABLE supplier_work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES maintenance_approval_packages(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  assigned_by uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, validated
  completed_at timestamptz,
  validated_at timestamptz,
  validated_by uuid,
  notes text
);
```

### 2. Nova tabela: `supplier_work_order_items`
Cada outdoor dentro do work order, com campos para foto de execução e confirmação.

```sql
CREATE TABLE supplier_work_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES supplier_work_orders(id),
  outdoor_id uuid NOT NULL,
  package_item_id uuid REFERENCES maintenance_package_items(id),
  original_photo_url text,
  execution_photo_url text,
  executed boolean NOT NULL DEFAULT false,
  executed_at timestamptz,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 3. RLS para ambas as tabelas
- Super Admin/Admin: acesso total
- Fornecedor: SELECT e UPDATE apenas nos work orders atribuídos a ele (via `supplier_id` vinculado ao perfil)

### 4. Página do Fornecedor: `SupplierPanel.tsx`
Layout dedicado com duas abas:
- **Serviços em Andamento**: cards com imagem original do outdoor lado a lado com campo de upload da foto de execução, checkbox "Serviço Executado" (registra data/hora), botão "Enviar Ordens Executadas"
- **Relação de Outdoors**: lista de todos os outdoors atribuídos ao fornecedor com status

### 5. Tela do Super Admin: envio para fornecedor
Na página de Service Orders (aba "Manutenção Aprovada"), adicionar botão "Enviar para Fornecedor" que:
- Abre dialog para selecionar fornecedor
- Cria `supplier_work_order` + itens
- Notifica fornecedor

### 6. Tela do Super Admin: acompanhamento
Nova aba "Ordens Executadas" na página de Service Orders onde o Super Admin:
- Visualiza work orders enviados pelo fornecedor como concluídos
- Compara fotos antes/depois
- Valida a execução

### 7. Rotas e menu
- Rota `/supplier-panel` protegida por role `supplier`
- Menu lateral do fornecedor no módulo `media`: apenas "Serviços em Andamento" e "Relação de Outdoors"

## Arquivos envolvidos

- **Novos**: `src/pages/SupplierPanel.tsx`, `src/hooks/useSupplierWorkOrders.ts`
- **Editados**: `src/pages/ServiceOrders.tsx` (aba enviar + aba executadas), `src/components/layout/AppLayout.tsx` (menu supplier), `src/App.tsx` (rotas)
- **Migração**: 2 novas tabelas + RLS policies

## Impacto na estrutura existente

Nenhuma tabela existente é alterada. Apenas adicionamos novas tabelas e páginas. O fluxo atual (pacotes → diretor → aprovação) permanece intacto; este plano adiciona a camada seguinte (fornecedor executa → admin valida).

