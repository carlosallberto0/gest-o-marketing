

# Corrigir foto de cadastro vs foto atual no PDF de Outdoors

## Problema identificado

O campo `photo_url` do outdoor é **sobrescrito automaticamente** a cada avaliação (via `update_outdoor_after_evaluation`). Por isso, `outdoor.photo_url` e a foto da última avaliação (`media_evaluation_photos`) são a mesma imagem.

## Solução

Buscar a foto da **primeira avaliação** (mais antiga) como "Foto de Cadastro" e a foto da **última avaliação** como "Foto Atual".

## Alteração em `src/pages/Outdoors.tsx` (função `handleGeneratePDF`)

Ajustar a query para buscar **duas** avaliações por outdoor: a mais antiga (cadastro) e a mais recente (atual).

```text
Para cada outdoor:
  - Foto de Cadastro = foto da avaliação mais ANTIGA (order evaluated_at ASC)
  - Foto Atual       = foto da avaliação mais RECENTE (order evaluated_at DESC)
```

Lógica:
1. Buscar avaliações ordenadas por `evaluated_at ASC` para pegar a primeira de cada outdoor (foto de cadastro)
2. Manter a query existente com `DESC` para a última avaliação (foto atual + observações)
3. Buscar fotos de ambas as avaliações
4. Mapear no `pdfData`: `photoUrl` = foto da primeira avaliação, `currentPhotoUrl` = foto da última avaliação

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Outdoors.tsx` | Adicionar query para a avaliação mais antiga; mapear `photoUrl` para a primeira foto encontrada |

Nenhuma alteração em `pdfGenerator.ts` é necessária — a estrutura `OutdoorPDFData` já suporta ambos os campos.

