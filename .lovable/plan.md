

# Reestruturação do Fluxo de Manutenção

## Fluxo Desejado (resumo)

```text
Gerente avalia outdoor → "Não Operacional"
       ↓
Super Admin em Outdoors → seleciona não operacionais → "Aprovar Manutenção" (selo visual)
       ↓
Super Admin → seleciona os aprovados → "Enviar para Diretoria"
       ↓
Diretor → aprova/reprova cada outdoor → clica "Enviar para Ordem de Serviço"
       ↓
Super Admin em Ordens de Serviço → vê os outdoors aprovados → seleciona → Gera PDF
```

## O que já existe vs. o que precisa mudar

| Etapa | Status Atual | Mudança Necessária |
|-------|-------------|-------------------|
| Gerente avalia outdoor | Funciona | Nenhuma |
| Super Admin seleciona não operacionais | Funciona (bulk actions) | Adicionar botão "Aprovar Manutenção" separado do "Alterar Status" |
| Selo visual nos outdoors aprovados | Não existe | Novo campo `maintenance_approved` ou novo status de selo na listagem |
| Enviar para diretoria | Funciona (pacotes) | Filtrar apenas os que têm selo de manutenção aprovada |
| Diretor aprova/reprova | Funciona (MaintenanceApproval) | Nenhuma mudança na lógica |
| Botão "Enviar para OS" no perfil diretor | Não existe | Novo botão após decisão que muda status do pacote para `ready_for_so` |
| Super Admin recebe em OS | Não existe nessa forma | Nova aba/seção em ServiceOrders mostrando outdoors aprovados pela diretoria |
| Gerar PDF com info da diretoria | Não existe | Novo gerador de PDF incluindo decisão do diretor |

## Implementação Detalhada

### 1. Migração de Banco de Dados

Adicionar campo na tabela `maintenance_package_items` ou na própria `outdoors`:
- Opção recomendada: usar o status existente dos `maintenance_package_items` (`approved` pela diretoria) como fonte de verdade
- Adicionar coluna `ready_for_service_order boolean DEFAULT false` em `maintenance_approval_packages` para quando o diretor clicar "Enviar para OS"

### 2. Outdoors.tsx - Selo Visual + Botão "Aprovar Manutenção"

Na barra de ações em massa (quando filtro = não operacional):
- Adicionar botão **"Aprovar Manutenção"** que marca os outdoors selecionados e cria o pacote para diretoria em um passo
- Badge/selo visual nos cards dos outdoors que já estão em pacotes de manutenção pendentes

### 3. MaintenanceApproval.tsx - Botão "Enviar para Ordem de Serviço"

Após o diretor aprovar todos os itens:
- Trocar "Enviar Decisão" para funcionar em 2 etapas: primeiro decide, depois clica **"Enviar para Ordem de Serviço"**
- Ou: adicionar botão extra que aparece após a decisão ser enviada, marcando `ready_for_service_order = true` no pacote

### 4. ServiceOrders.tsx - Seção de Outdoors Aprovados pela Diretoria

- Nova seção/aba mostrando pacotes com status `approved` + `ready_for_service_order = true`
- Checkboxes para selecionar outdoors
- Botão "Gerar PDF" que usa o layout padronizado incluindo info de aprovação da diretoria

### 5. PDF Generator - Incluir Aprovação da Diretoria

Expandir o layout existente para incluir:
- Nome do diretor que aprovou
- Data da aprovação
- Observações do diretor (se houver)
- Manter fotos lado a lado e informações do outdoor

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Adicionar `ready_for_service_order` em `maintenance_approval_packages` |
| `src/pages/Outdoors.tsx` | Botão "Aprovar Manutenção" em massa + selo visual |
| `src/pages/MaintenanceApproval.tsx` | Botão "Enviar para Ordem de Serviço" |
| `src/hooks/useMaintenancePackages.ts` | Novo hook para marcar pacote como pronto para OS + query de pacotes prontos |
| `src/pages/ServiceOrders.tsx` | Nova seção com outdoors aprovados + seleção + gerar PDF |
| `src/lib/pdfGenerator.ts` | Nova função ou extensão do layout com dados da diretoria |

## Resposta à sua pergunta

Sim, conseguimos moldar o sistema para funcionar dessa forma. A estrutura atual (pacotes de manutenção, aprovação por diretor, ordens de serviço) já cobre ~70% do fluxo. As mudanças principais são:
1. Adicionar o selo visual nos outdoors aprovados para manutenção
2. Criar o botão "Enviar para OS" no perfil do diretor
3. Criar a visualização dos outdoors aprovados dentro de Ordens de Serviço
4. Incluir dados de aprovação da diretoria no PDF

A implementação será feita de forma incremental, mantendo compatibilidade com o fluxo existente.

