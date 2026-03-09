

# Gerar PDF de Solicitações de Manutenção Selecionadas

## O que será feito

Quando o usuário selecionar solicitações de manutenção (via "Selecionar todas" ou individualmente), aparecerá um botão "Gerar PDF" na barra de ações flutuante. O PDF gerado conterá, para cada solicitação:

- Nome do Posto (PDV)
- Número do Outdoor (código)
- Localização do outdoor
- Observação do gerente (campo `reason` + `observations`)
- Comparativo de fotos: foto do cadastro (`outdoor.photo_url`) lado a lado com a foto atual da solicitação (`current_photo_url` ou primeira foto do array `photos`)

O layout segue o padrão visual da imagem de referência (foto do cadastro à esquerda, foto atual à direita).

## Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/pdfGenerator.ts` | Adicionar função `generateMaintenanceRequestsPDF` com suporte a imagens lado a lado |
| `src/pages/MaintenanceRequests.tsx` | Adicionar botão "Gerar PDF" na barra flutuante, importar e chamar a nova função |

## Detalhes técnicos

### Nova função em `pdfGenerator.ts`

`generateMaintenanceRequestsPDF(requests: MaintenanceRequestPDFData[])`:
- Header com título "SOLICITAÇÕES DE MANUTENÇÃO"
- Para cada solicitação selecionada, uma seção com:
  - Dados textuais em tabela (Posto, Outdoor, Localização, Urgência, Tipo, Observação)
  - Comparativo de fotos (2 imagens lado a lado usando `loadImageAsBase64` já existente)
  - Separador entre solicitações
- Controle de paginação: se não couber na página, adiciona nova página
- Reutiliza `loadImageAsBase64`, `hexToRgb` e padrão de formatação já existentes

### Alteração em `MaintenanceRequests.tsx`

Na barra flutuante (linha 418-438), adicionar botão "Gerar PDF" entre a contagem e o botão de excluir. O botão filtra as solicitações selecionadas do array `allRequests` e passa para a função de geração.

