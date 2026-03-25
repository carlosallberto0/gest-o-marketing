
Diagnóstico

- Hoje o código do outdoor é gerado no cliente em dois pontos: `NewOutdoorDialog` e `useBulkImport`.
- No cadastro manual, a lógica usa ordenação textual (`order('code', { ascending: false })`). Como a base está com formatos mistos (`OUT-99`, `OUT-100`, `OUT-0100`, `OUT-0164`), o “maior código” em texto não é o maior número.
- No importador em massa, ainda existe geração com `padStart(2)`, o que ajudou a criar formatos inconsistentes e números duplicados na prática.
- O insert ainda confia no `code` vindo do frontend, então qualquer cálculo errado vira erro de chave única.

Plano

1. Centralizar a numeração no backend
- Criar uma migration para gerar códigos de outdoor no banco, de forma autoritativa e sequencial.
- Inicializar essa sequência com o maior número numérico já existente na tabela.
- Padronizar o formato de novos códigos como `OUT-XXXX`.
- Garantir que o código seja definido no insert pelo backend, e não pelo cliente.

2. Atualizar o fluxo de criação manual
- `src/hooks/useCreateOutdoor.ts`: parar de enviar `code` no insert e usar o código retornado pelo backend.
- `src/components/dialogs/NewOutdoorDialog.tsx`: remover a lógica atual de cálculo final do código e trocar o campo para “gerado automaticamente ao salvar” ou uma prévia apenas visual.

3. Corrigir a importação em massa
- `src/hooks/useBulkImport.ts`: remover `outdoorCounter` e a geração local com `padStart(2)`.
- Inserir outdoors sem `code` e usar o valor devolvido pelo banco para logs, resultados e identificadores derivados.

4. Revisar a ordenação das listagens
- `src/hooks/useOutdoorData.ts` e `src/hooks/usePDVDetails.ts`: revisar a ordenação por `code`, porque a base já tem códigos em formatos mistos e a ordenação textual fica errada.
- Aplicar ordenação numérica no app para manter a sequência visual correta sem mexer nos códigos antigos agora.

5. Tratar legado com segurança
- Não renumerar automaticamente os outdoors antigos nesta correção.
- Deixar como etapa opcional uma limpeza controlada dos casos já conflitados (ex.: `OUT-100` e `OUT-0100`), porque isso pode impactar fluxos que dependem do código literal.

Arquivos principais

- Nova migration SQL para sequência/função/trigger de geração de código
- `src/hooks/useCreateOutdoor.ts`
- `src/components/dialogs/NewOutdoorDialog.tsx`
- `src/hooks/useBulkImport.ts`
- `src/hooks/useOutdoorData.ts`
- `src/hooks/usePDVDetails.ts`

Resultado esperado

- Todo novo outdoor passa a receber o próximo número válido da sequência, sem colisão.
- Cadastro manual e importação usam a mesma regra.
- A sequência visual dos outdoors deixa de ficar inconsistente por causa da ordenação textual.
