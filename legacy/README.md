# legacy/ — sistema antigo (Lovable), referência histórica

> Conforme `docs/decisions/ADR-005-isolamento-sistema-novo-lovable.md`: o Marketing OS novo não reutiliza schema, RLS, migrations ou banco do sistema antigo. Este material fica aqui só como referência histórica, **nunca para ser aplicado** contra o projeto Supabase novo (`qlezexylaixllhakpezv`).

## `lovable-supabase-migrations/`

As 66 migrations originais do projeto Supabase antigo (`mgknzbjzwtkumdihzthd`, gerenciado pelo Lovable Cloud), movidas de `supabase/migrations/` para aqui em 2026-09-08 — antes que o schema do sistema novo começasse a ser escrito nessa mesma pasta. Sem essa separação, qualquer `supabase db push`/`migration up` futuro recriaria o banco antigo dentro do projeto novo.

`supabase/migrations/` volta a existir vazia, pronta para receber só as migrations do sistema novo.

**Não aplicar estes arquivos contra o projeto novo.** Consultar apenas como referência de requisito (o que a tabela X fazia, quais campos tinha), nunca copiar `CREATE TABLE`/policy diretamente — a arquitetura do sistema novo é outra (ver `docs/NOVO-MARKETING-OS-ESPECIFICACAO.md`).

## `frontend-lovable/`

O frontend antigo (Lovable), movido de `src/` para aqui em 2026-09-08, mesmo motivo do backend acima: o Marketing OS novo não reutiliza arquitetura, hooks, contexts nem lógica de negócio do sistema antigo — ele fala com um schema (`usuarios`/`papeis`/`permissoes_concedidas`/`has_permission`) incompatível com o que este código antigo espera.

Contém `src/pages/`, `src/hooks/`, `src/contexts/`, `src/integrations/` (client/types do Supabase antigo — projeto `mgknzbjzwtkumdihzthd`, nunca reutilizar), `src/types/`, `src/App.tsx`/`App.css`, os módulos de `src/lib/` com lógica de negócio ou específicos do domínio antigo (cálculo de custo, exportação Excel/PDF, Google Drive/Maps, storage, toast) e os componentes de domínio de `src/components/` (alerts, analise, auth, calendar, checklist, contracts, dashboard, dialogs, evaluations, layout, map, notifications, offline, settings, mais `AlertToastConnector.tsx` e `NavLink.tsx`).

Ficou fora do escopo movido — porque são primitivas de design system genéricas, sem lógica de negócio, e o frontend novo continua usando: `src/components/ui/` (shadcn/ui), `src/lib/utils.ts` (helper `cn()`) e `src/hooks/use-mobile.tsx`/`use-toast.ts` (dependência direta de `components/ui/sidebar.tsx` e `toaster.tsx` — mantidos em `src/hooks/`, não vieram para cá, apesar de "hooks inteiro" ter sido o critério original; são infra genérica de UI, não lógica de negócio).

**Não copiar código deste diretório para o sistema novo.** Consultar apenas como referência de requisito (o que a tela X fazia, quais campos o formulário Y tinha) — a implementação do sistema novo é escrita do zero contra o schema novo.
