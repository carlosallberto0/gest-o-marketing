

# Visibilidade de Avaliacao para Super Admin - Totais por Posto

## Problema Atual

A tela de "Avaliacao Mensal de Outdoor" mostra apenas os postos que possuem outdoors **pendentes**, exibindo somente a quantidade pendente. O Super Admin nao consegue ver de forma clara:
- Quantos outdoors cada posto possui no total
- Quantos ja foram avaliados
- Quantos ainda faltam

## Solucao

Modificar a pagina `OutdoorEvaluation.tsx` para que, quando o usuario for **super_admin** (ou admin/diretor), a listagem de postos exiba:

1. **Todos os postos** (nao apenas os com pendencias) -- para visao completa
2. Para cada posto, mostrar:
   - Total de outdoors do posto
   - Quantos ja foram avaliados (status `operational`)
   - Quantos estao pendentes (`pending_evaluation`, `non_operational`)
   - Uma barra de progresso visual (ex: 3/7 avaliados)
3. Manter o comportamento atual para **gerentes** (que so veem seus postos pendentes)

## Alteracoes Tecnicas

### Arquivo: `src/pages/OutdoorEvaluation.tsx`

**1. Novo `useMemo` para agrupar todos os outdoors por PDV (visao super_admin)**

Criar um segundo agrupamento que inclui TODOS os outdoors (nao so pendentes), calculando:
- `totalOutdoors`: quantidade total
- `evaluatedCount`: quantidade com status `operational` (avaliados/em dia)
- `pendingCount`: quantidade com status diferente de `operational`

**2. Condicionar a exibicao baseada no perfil**

- Se `profile.role === 'super_admin'` (ou `admin`, `director`): mostrar todos os postos com os contadores totais
- Se `profile.role === 'manager'`: manter comportamento atual (so pendentes)

**3. Redesign dos cards de PDV para super_admin**

Cada card mostrara:
- Nome do posto
- Badge com progresso: "X/Y avaliados"
- Barra de progresso (`Progress` component) mostrando percentual
- Badge de pendentes (se houver)
- Indicador visual: verde (100%), amarelo (parcial), vermelho (nenhum avaliado)

**4. Seção de resumo geral (topo, apenas super_admin)**

Adicionar um resumo com:
- Total de outdoors no sistema
- Total avaliados
- Total pendentes
- Percentual geral

### Exemplo visual do card (super_admin):

```text
+------------------------------------------+
| Posto Sao Roque Orizona                  |
| [=======-----] 5/10 avaliados (50%)      |
| 5 outdoor(s) pendente(s)                 |
+------------------------------------------+
```

## Arquivos Modificados

| Arquivo | Alteracao |
|---------|----------|
| `src/pages/OutdoorEvaluation.tsx` | Adicionar logica de agrupamento completo, cards com contadores, resumo geral |

Nenhuma alteracao de banco de dados necessaria -- os dados ja existem na query `useOutdoors`.

