

# Corrigir Crash do Mapa + Melhorar Rota Automática

## Problemas Identificados

### 1. Crash do mapa (Select.Item com value vazio)
O `CreateRouteDialog.tsx` linha 89 tem `<SelectItem value="">Nenhum</SelectItem>`. Radix UI não permite `value=""` no `SelectItem`, causando o erro que derruba o mapa inteiro (capturado pelo ErrorBoundary).

### 2. Rota Automática sem contexto
O botão "Rota Auto" pega o primeiro pacote da lista sem verificar se tem fornecedor vinculado. Deveria mostrar a lista de pacotes aprovados com fornecedor para o usuário escolher.

## Solução

### 1. Fix do crash — `CreateRouteDialog.tsx`
- Trocar `<SelectItem value="">Nenhum</SelectItem>` por `<SelectItem value="none">Nenhum</SelectItem>`
- Ajustar o `onValueChange` para converter `"none"` em string vazia no estado

### 2. Melhorar Rota Automática — `StrategicMapMapbox.tsx`
- Ao clicar em "Rota Auto", se não houver pacotes aprovados, mostrar toast informativo (já existe)
- Se houver 1 pacote, usar diretamente (já existe)
- **Novo**: Se houver múltiplos pacotes, abrir um dialog de seleção listando os pacotes disponíveis com nome, data e fornecedor
- Validar que o pacote tem itens com outdoors georeferenciados antes de gerar

### Arquivos
- **Editar**: `src/components/map/CreateRouteDialog.tsx` (fix SelectItem value)
- **Editar**: `src/pages/StrategicMapMapbox.tsx` (dialog de seleção de pacote para rota automática)

