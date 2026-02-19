

# Correcao da Contagem de Avaliacao e Lista de Cobranca

## Problema 1: Contagem errada de "avaliados"

O sistema atual conta como "avaliado" apenas outdoors com status `operational`. Porem, um outdoor avaliado como `non_operational` tambem foi avaliado -- o gerente fez a avaliacao, so que o resultado foi "nao operacional". A logica correta e:

- **Avaliado** = qualquer status diferente de `pending_evaluation` (inclui `operational` E `non_operational`)
- **Pendente** = apenas `pending_evaluation`

### Onde corrigir

No arquivo `src/pages/OutdoorEvaluation.tsx`, existem 3 pontos que usam a logica errada:

1. **Linha 139** (`allPdvsWithStats`): `const isEvaluated = outdoor.status === 'operational'` deve mudar para `outdoor.status !== 'pending_evaluation'`
2. **Linha 169** (`globalSummary`): `outdoors.filter(o => o.status === 'operational')` deve mudar para `outdoors.filter(o => o.status !== 'pending_evaluation')`

Isso corrige tanto os cards de cada posto quanto o resumo global no topo.

---

## Problema 2: Gerar lista de postos pendentes para cobranca

Adicionar para o Super Admin:
- Um botao "Gerar Lista de Pendentes" visivel na tela principal (quando nenhum posto esta selecionado)
- Ao clicar, gera uma lista (pode ser exportada ou copiada) contendo:
  - Nome do posto
  - Quantidade total de outdoors
  - Quantidade pendente
  - Nome do gerente responsavel (se houver)
- Opcao de selecionar/desselecionar postos individuais antes de gerar

### Implementacao

No mesmo arquivo `OutdoorEvaluation.tsx`:
- Adicionar estado `selectedForReport` (Set de pdvIds)
- Adicionar checkboxes nos cards de postos pendentes
- Adicionar botao "Selecionar todos pendentes" e "Gerar Lista"
- Funcao de exportar para Excel (usando a lib `xlsx` ja instalada) ou copiar como texto

### Dados do gerente

Para mostrar o nome do gerente de cada posto na lista, sera necessario buscar essa informacao. O hook `useOutdoors` ja retorna `pdvName` mas nao o gerente. Opcoes:
- Fazer uma query separada para buscar gerentes dos PDVs (via `pdvs.manager_id` -> `profiles.name`)
- Ou usar o hook `usePDVsList` que ja pode ter essa info

Vou verificar e usar a forma mais simples.

---

## Arquivos modificados

| Arquivo | Alteracao |
|---------|----------|
| `src/pages/OutdoorEvaluation.tsx` | Corrigir logica de contagem; adicionar selecao de postos e geracao de lista |

Nenhuma alteracao de banco necessaria.

