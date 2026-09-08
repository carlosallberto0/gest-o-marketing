# legacy/ — sistema antigo (Lovable), referência histórica

> Conforme `docs/decisions/ADR-005-isolamento-sistema-novo-lovable.md`: o Marketing OS novo não reutiliza schema, RLS, migrations ou banco do sistema antigo. Este material fica aqui só como referência histórica, **nunca para ser aplicado** contra o projeto Supabase novo (`qlezexylaixllhakpezv`).

## `lovable-supabase-migrations/`

As 66 migrations originais do projeto Supabase antigo (`mgknzbjzwtkumdihzthd`, gerenciado pelo Lovable Cloud), movidas de `supabase/migrations/` para aqui em 2026-09-08 — antes que o schema do sistema novo começasse a ser escrito nessa mesma pasta. Sem essa separação, qualquer `supabase db push`/`migration up` futuro recriaria o banco antigo dentro do projeto novo.

`supabase/migrations/` volta a existir vazia, pronta para receber só as migrations do sistema novo.

**Não aplicar estes arquivos contra o projeto novo.** Consultar apenas como referência de requisito (o que a tabela X fazia, quais campos tinha), nunca copiar `CREATE TABLE`/policy diretamente — a arquitetura do sistema novo é outra (ver `docs/NOVO-MARKETING-OS-ESPECIFICACAO.md`).
