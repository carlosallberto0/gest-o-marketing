---
name: edge-functions-legado-aprovacoes-nao-reaproveitar
description: supabase/functions/ mistura 3 Edge Functions legadas (token de profiles) com 3 novas do ADR-011 (token de aprovacao_revisores) — nomes parecidos, não confundir
metadata:
  type: architecture
---

`supabase/functions/` tem duas famílias de função de "acesso por token" que
NÃO são a mesma coisa, apesar do nome parecido:

- **Legado de verdade** (sistema antigo, pré-restart, 2026-09-02):
  `validate-access-token`, `generate-access-link`, `revoke-access-token`.
  Referenciam `profiles.access_token`/`profiles.role` e redirecionam para
  `retail-rise-guide.lovable.app`. Serão descontinuadas junto com o sistema
  antigo — nunca editar nem estender.
- **Novo, do ADR-011** (Aprovações Executivas, commit `c2a1b50`, 2026-09-10,
  **completo e já commitado**): `send-approval-request`, `get-approval-item`,
  `submit-approval-decision`. Operam sobre `aprovacao_revisores`/
  `aprovacao_itens`/`aprovacao_decisoes`, sempre via service role, com
  validação de token manual (nunca vira credencial Postgres — ver ADR-011).
  Frontend já integrado: rota pública `/aprovacao/:token` → `AprovacaoPublica.tsx`
  → `useAprovacaoPublica.ts`, fora de `ProtectedRoute` em `App.tsx`.

A auditoria de RLS da Fase 8 (2026-09-15) inicialmente relatou os 6 juntos como
"legado" e concluiu que a Edge Function nova "ainda não existe" — **isso estava
errado**, corrigido por leitura direta dos 3 arquivos novos na mesma sessão.
Antes de assumir que um módulo com nome de token/aprovação está pendente, ler
o conteúdo do arquivo (não só o nome do diretório) e checar `git log` — a data
de criação separa claramente as duas famílias.

Ver também [[rls-sem-isolamento-por-pdv]] para o padrão geral de não confundir
schema/código antigo com o novo.
