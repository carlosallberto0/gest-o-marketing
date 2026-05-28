
## Objetivo

Atualizar o módulo **Mapa da Rede** com os dados da planilha `RELAÇÃO_POSTOS_CONSOLIDADA` (44 postos): telefone, bandeira, gerente, horário, link do Google Maps e os 9 serviços de cada posto.

## 1. Banco de dados (1 migration)

Adicionar 2 colunas em `pdvs`:
- `manager_name TEXT` — nome do gerente em texto livre (independente do `manager_id` que vincula usuário do sistema).
- `operating_hours TEXT` — horário (ex: "24h").

Garantir `GRANT SELECT` ao `anon` nessas colunas (já liberado para a tabela inteira pela política pública existente).

## 2. Script de importação (one-shot via `supabase--insert`)

Algoritmo executado pelo agente no build:

1. Ler `/tmp/postos.xlsx` (44 linhas válidas).
2. Buscar todos os `pdvs` atuais.
3. Para cada linha:
   - **Match por similaridade de nome** (normaliza removendo "POSTO", "SÃO ROQUE", acentos; usa `difflib` ≥ 0.55).
   - **Se match**: `UPDATE pdvs` com `bandeira`, `cnpj`, `phone`, `manager_name`, `operating_hours`, e `maps_url` (quando vazio).
   - **Se sem match**: `INSERT` novo PDV com `name`, `address`, `city`, `state` (extraídos do endereço), `bandeira`, `cnpj`, `phone`, `manager_name`, `operating_hours`, `maps_url`, `status='active'`. Coordenadas ficam `NULL` (ajustáveis depois pelo Mapa Estratégico).
4. Para cada linha: limpar `pdv_servicos` daquele posto e reinserir as chaves marcadas como "SIM" entre as 9: `troca_oleo`, `conveniencia`, `loja_acessorios`, `restaurante`, `lanchonete`, `lava_jato`, `banheiro_chuveiro`, `borracharia`, `calibrador_pneus`.
5. Garantir que as 9 entradas existam em `system_options` (`category='servico_posto'`) — inserir as faltantes.

Após executar, mostro um relatório: `X atualizados`, `Y criados`, `Z postos com serviços vinculados`, e a lista de matches para conferência.

## 3. Frontend (ajustes pequenos)

- **`usePublicNetwork.ts`**: incluir `manager_name` e `operating_hours` no SELECT e na interface `PublicPdv`.
- **`PdvDetailDialog.tsx`**: exibir Gerente (ícone User) e Horário (ícone Clock) quando preenchidos.
- **`NetworkGrid.tsx`**: badge discreto com horário no canto inferior.
- **`DashboardMapaRede.tsx`**: nova coluna "Gerente" na tabela admin.
- **`EditPdvServicesDialog.tsx`**: adicionar inputs para `manager_name` e `operating_hours` junto dos já existentes (bandeira, CNPJ, telefone).

## 4. O que NÃO será alterado

- `manager_id` (vínculo com `profiles`) — fica intacto.
- Coordenadas e endereços dos PDVs já existentes — não sobrescrevo.
- Estrutura de rotas, RLS pública já configurada, design system.

## Pré-visualização do matching (amostra)

```text
Planilha                     →  PDV no banco
CERRADÃO                     →  Posto São Roque Cerradão      (match)
SOF NORTE                    →  (sem match → cria novo)
POSTO SÃO ROQUE BRAZLÂNDIA   →  Posto São Roque Brazlândia    (match)
RODOTRUCK P. PRUDENTE        →  Posto Rodotruck Presidente …  (match)
TIGRE 163                    →  (sem match → cria novo)
POSTO 080                    →  Posto São Roque 080           (match)
```

Os matches definitivos serão listados no relatório final logo após a execução, antes de qualquer ação adicional.
