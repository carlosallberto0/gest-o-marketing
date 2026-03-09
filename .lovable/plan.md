

# Ajustar PDF de Outdoors para o mesmo padrão do PDF de Manutenção

## Problema

O PDF de Outdoors usa layout antigo (1 foto, sem observações, sem comparativo). Precisa seguir o mesmo padrão do PDF de Solicitações de Manutenção: layout compacto com 2-3 itens por página, informações em 2 colunas, observações do gerente, e fotos lado a lado (cadastro vs. atual da avaliação).

## O que será feito

### 1. Atualizar `OutdoorPDFData` (pdfGenerator.ts)
Adicionar campos:
- `observations?: string` — observações da última avaliação do gerente
- `currentPhotoUrl?: string` — foto mais recente da avaliação (da tabela `media_evaluation_photos`)
- `nonOperationalReason?: string` — motivo de não operacional

### 2. Reescrever `generateOutdoorListPDF` (pdfGenerator.ts)
Novo layout idêntico ao de manutenção:
- Header bar com número + código + nome do posto
- Informações em 2 colunas (Posto/Status, Tamanho/Cidade, Local/Data avaliação)
- Linha de observação (full width, max 2 linhas)
- Fotos lado a lado: "Foto de Cadastro" e "Foto Atual" (55x38mm cada)
- Separador entre itens
- Altura estimada por item: ~92mm → 2-3 por página

### 3. Atualizar `Outdoors.tsx`
No `handleGeneratePDF`, antes de gerar o PDF:
- Buscar a última avaliação de cada outdoor selecionado via query em `media_evaluations` + `media_evaluation_photos`
- Passar observações e foto atual para o `OutdoorPDFData`

## Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/pdfGenerator.ts` | Atualizar interface `OutdoorPDFData`, reescrever `generateOutdoorListPDF` com layout compacto de 2 colunas + fotos lado a lado |
| `src/pages/Outdoors.tsx` | Buscar dados de avaliação (observações + foto atual) antes de gerar PDF |

## Detalhes técnicos

Query para buscar dados de avaliação no `handleGeneratePDF`:
```typescript
const { data: evaluations } = await supabase
  .from('media_evaluations')
  .select('outdoor_id, observations, non_operational_reason, id')
  .in('outdoor_id', outdoorIds)
  .order('evaluated_at', { ascending: false });

// Para cada evaluation, buscar primeira foto
const { data: photos } = await supabase
  .from('media_evaluation_photos')
  .select('evaluation_id, photo_url')
  .in('evaluation_id', evalIds);
```

Isso permite montar o comparativo: foto do cadastro (`outdoor.photo_url`) vs foto da última avaliação (`media_evaluation_photos.photo_url`).

