# Marketing OS

> Memória de projeto para o Claude Code. Mantenha este arquivo curto e de alto sinal.
> Adaptado de `templates/CLAUDE.md.template` do vibe-coding-toolkit.
> Comandos canônicos do sistema **antigo** confirmados contra o repositório real em AUDIT-001 (2026-09-02) — ver `docs/AUDIT-001-RESULTADO.md`.
>
> **Reconstrução do zero em andamento (a partir de 2026-09-04).** O Marketing OS está sendo reconstruído com arquitetura, banco e frontend próprios — não reutiliza schema, RLS nem componentes do sistema antigo (Lovable). Ver `docs/NOVO-MARKETING-OS-ESPECIFICACAO.md` (especificação do sistema novo) e `docs/decisions/ADR-005-isolamento-sistema-novo-lovable.md` (estratégia de branch e isolamento do Lovable). **O Lovable não tem nenhuma conexão com este projeto** (repositório, banco ou deploy) — decisão do usuário, 2026-10-01. Não tratar o Lovable como restrição de branch/merge nem levantar isso como pendência. O restante deste documento descreve o sistema **antigo**, ainda vivo em `main`/`src/` — vale como referência de convenção até ser suplantado seção a seção conforme o sistema novo avança.

## Sistema novo (v2) — o que já é diferente do resto deste arquivo

- **Backend:** projeto Supabase próprio (`qlezexylaixllhakpezv`), sem ligação com o Lovable. Sem CLI do Supabase linkado nesta máquina ainda — migrations em `supabase/migrations/` (nome `<timestamp>_<descrição legível>.sql`, não o padrão UUID autogerado do Lovable) são aplicadas manualmente pelo usuário via SQL Editor do painel Supabase.
- **Permissão:** fail-closed em dado, fail-open só em toggle de menu/UI — nunca a matriz decorativa fail-open do sistema antigo (`role_permissions`). Ver `docs/decisions/ADR-006-modelo-permissao-fail-closed.md`. Papel/permissão/módulo/recurso/ação/escopo são conceitos separados (`papeis`, `permissoes_concedidas`), não um enum de papel só.
- **Isolamento por RLS de verdade:** toda tabela com escopo territorial filtra por `pdv_id` **na própria policy** (via função `usuario_pdv_id()`, SECURITY DEFINER, sem parâmetro de usuário livre — nunca vire oráculo de leitura via RPC pública, foi um achado real de segurança na Fase 1). Guarda de rota no frontend é UX, nunca a camada de segurança.
- **Migrations do sistema antigo** vivem em `legacy/lovable-supabase-migrations/` — referência histórica, nunca aplicar contra o projeto novo.
- **Frontend do sistema novo ainda não existe.** Os comandos `npm run dev/build/lint` abaixo rodam o **frontend antigo** (`src/`), intocado até agora. Quando o frontend do sistema novo começar, este documento precisa de uma revisão de convenção de frontend própria — não presumir que as regras do sistema antigo (ex.: design system "Nazox") se aplicam; a referência visual do sistema novo é `docs/design/referencia-visual-marketing-os.md`.
- **Fluxo único, não paralelo:** onde o sistema antigo tem múltiplos fluxos concorrentes para a mesma decisão de negócio (ex.: os três fluxos de manutenção de outdoor), o sistema novo modela **um único fluxo** com máquina de estado própria — nunca replicar a fragmentação.
- Especialistas usados até agora com sucesso neste projeto: `supabase-schema` (desenho de schema/RLS) → `rls-security-reviewer` (revisão obrigatória, já encontrou 2 falhas reais de segurança na Fase 1 antes do merge). Mesmo processo vale para toda fase nova.

## Diretrizes de comportamento

1. **Pensar antes de codar** — declare premissas em voz alta. Havendo mais de uma interpretação, apresente ambas em vez de escolher em silêncio. Diga quando existe caminho mais simples. Se algo estiver genuinamente ambíguo, pare e pergunte.
2. **Simplicidade primeiro** — o mínimo de código que resolve. Sem feature especulativa, sem abstração para uso único, sem configurabilidade não pedida, sem tratamento de erro para cenário impossível.
3. **Mudança cirúrgica** — toque só no que o pedido exige. Siga o estilo existente. Não refatore, não reformate e não "melhore" código vizinho que não fazia parte do pedido.
4. **Execução dirigida a objetivo** — transforme tarefa em objetivo verificável ("corrigir o bug" vira "escrever o teste que reproduz, depois fazer passar"). Trabalho multi-etapa recebe plano curto com verificação por etapa, e roda até toda etapa estar verificada.
5. **Orquestrador, não implementador** — a sessão principal planeja, decide e coordena; não implementa. Implementação e análise delegáveis vão para subagente especialista, despachado em paralelo quando os escopos não colidem.

## Stack

React 18 · Vite 5 · TypeScript 5 · Tailwind CSS v3 + shadcn/ui (design system "Nazox") · TanStack React Query v5 · Framer Motion · Mapbox GL + Google Maps API · jsPDF + jspdf-autotable + XLSX · Lovable Cloud (Postgres, Auth, RLS, Edge Functions em Deno, Storage) · npm

## Comandos canônicos

Use exatamente estes comandos — não adivinhe.

- **Install:** `npm install`
- **Lint:** `npm run lint` (confirmado — `package.json`: `"lint": "eslint ."`. Atenção: `@typescript-eslint/no-unused-vars` está desligado em `eslint.config.js:23`, e `noUnusedLocals`/`noUnusedParameters` estão `false` em `tsconfig.json`/`tsconfig.app.json` — lint e typecheck não pegam import/variável não usada neste repo.)
- **Typecheck:** `npx tsc --noEmit`
- **Test:** não existe. Confirmado em AUDIT-001 (2026-09-02): sem script `test` no `package.json`, sem `vitest`/`jest` em dependências, sem arquivos `*.test.*`/`*.spec.*` no repositório.
- **Build:** `npm run build`
- **Run/Dev:** `npm run dev`
- **Migration:** não existe fluxo de CLI versionado. Confirmado em AUDIT-001: `supabase/migrations/` tem 66 arquivos `<timestamp>_<uuid>.sql`, padrão de autogeração do Lovable Cloud — não há comando `supabase migration new`/`up` documentado nem `supabase/config.toml` configurado para isso (só `project_id` e flags `verify_jwt` por função). Mudança de schema hoje passa pelo Lovable, não por CLI local.

## Tabela de roteamento de especialistas

Despache o especialista que casa com a tarefa, nunca um agente genérico. O tier de modelo é decidido **por despacho**, nunca herdado da sessão principal.

| Agente | Quando usar | Tier |
|---|---|---|
| `orchestrator` | Trabalho que cruza domínios ou precisa de execução paralela. Primeiro a acionar quando a tarefa atravessa camadas. | opus |
| `project-planner` | Quebrar épico ou sprint em tarefas ordenadas com `Files:` e `Depends-on:` marcados. | sonnet |
| `supabase-schema` | Tabela, migration, política RLS, GRANT, trigger, RPC, CHECK constraint. | sonnet |
| `rls-security-reviewer` | Toda mudança que toca isolamento por `pdv_id`, papéis, `profiles.access_token` ou visibilidade de dado entre postos. Obrigatório antes de merge nessas áreas. | sonnet |
| `edge-function-specialist` | Edge function em Deno: validação de papel do chamador, integração externa, contrato de erro. | sonnet |
| `react-query-specialist` | Hooks de CRUD, chaves de cache, invalidação, estados de erro e loading no padrão TanStack. | sonnet |
| `frontend-specialist` | Componente, tela, layout, responsividade, composição shadcn/ui. | sonnet |
| `design-system-enforcer` | Varredura de cor/gradiente/sombra hardcoded, ausência de empty state, spinner onde deveria ter skeleton, `alt`/`label` faltando. Trabalho mecânico e verificável. | haiku |
| `code-archaeologist` | Entender fluxo legado ou tela órfã antes de mexer — especialmente os três fluxos de manutenção de outdoor. | sonnet |
| `debugger` | Causa raiz de bug, crash ou teste instável, **antes** de qualquer proposta de correção. | sonnet |
| `code-reviewer` | Após editar qualquer arquivo de código-fonte. | sonnet |
| `test-engineer` | Teste unitário e de integração após lógica nova, escrito test-first. | sonnet |
| `documentation-writer` | README, runbook, documentação de fluxo — sob pedido. | haiku |

## Convenções

**Banco**
- `snake_case` em tabela e coluna; FK como `entidade_id`; toda tabela com `id uuid default gen_random_uuid()`, `created_at`, `updated_at` + trigger `update_updated_at_column`.
- RLS habilitada **e** políticas por papel **e** GRANT explícito. RLS sozinha não basta.
- Soft delete é o padrão; exclusão física exige `super_admin` e ação explícita.
- Opção de campo vem de `system_options`, nunca enum hardcoded no frontend.
- Relação com múltiplas FKs para a mesma tabela exige nome explícito da constraint na query Supabase.
- Ação crítica registra em `audit_logs` e, quando aplicável, `notificacoes_sistema`.

**Frontend**
- `PascalCase` para componente, `camelCase` para função e variável, `UPPER_SNAKE_CASE` para constante.
- **Zero cor, gradiente ou sombra hardcoded.** Apenas tokens semânticos do design system.
- Subcomponente definido fora do corpo do componente pai — dentro, perde estado de input.
- `src/integrations/supabase/client.ts` e `types.ts` são gerados: nunca editar à mão.
- Mobile-first, prefixos responsivos Tailwind obrigatórios. Acessibilidade nível A.
- Botão de ação crítica com estado de loading; nenhuma ação disparável duas vezes por clique duplo.
- Empty state com mensagem e ação sugerida — tabela vazia sem mensagem é proibida.
- Skeleton em lista e dashboard; spinner genérico só para ação pontual abaixo de 2s.
- `ReturnType<typeof setTimeout>` para tipar timers.

**Edge functions**
- Nunca `window.location.origin` para URL canônica — o domínio canônico dos links é configurado no sistema.
- Validar papel do chamador antes de qualquer operação de dados.
- Erro retorna `{ error: string }` com status HTTP correto (400, 401, 403, 404, 500).

**Não alterar**
- `src/integrations/supabase/client.ts`, `types.ts`
- `.env` e variáveis de configuração do backend
- `supabase/config.toml` (configuração de projeto)
- Schemas internos do backend: `auth`, `storage`, `realtime`, `vault`

## Regra de despacho paralelo

Duas tarefas entram na mesma onda somente se **ambas** valerem: nenhuma depende da outra, nem transitivamente; e os conjuntos de `Files:` são totalmente disjuntos. Incerteza sobre escopo vira `Depends-on: tudo já listado` — degradar para serial é o erro seguro.

Implementadores **não comitam**. Deixam a mudança na árvore de trabalho e reportam quais arquivos tocaram. O orquestrador comita, uma tarefa por vez, na ordem da onda, capturando o `HEAD` fresco imediatamente antes de cada commit. Revisores da onda são despachados juntos depois que todos os commits existem, porque revisão é somente leitura. Um único registro de progresso por onda, nunca um por tarefa.

Regra completa em `.claude/rules/parallel-subagent-driven-development.md`.

## Fonte da verdade

**Sistema novo (v2):**
1. Código-fonte e schema do banco do projeto novo (`qlezexylaixllhakpezv`).
2. `docs/NOVO-MARKETING-OS-ESPECIFICACAO.md` — arquitetura e escopo do sistema novo.
3. `docs/decisions/ADR-005` em diante — decisões de kickoff da reconstrução.

**Sistema antigo (referência histórica de requisito funcional — nunca de arquitetura):**
4. `docs/PRD-Gestao-Marketing.md` — estado as-is do sistema antigo.
5. `docs/Modulo-Midia-Externa-Consolidado.md` — as-is detalhado do módulo maior do sistema antigo.
6. `docs/Marketing_OS_Backlog_v2.md` — backlog aprovado **para o sistema antigo evoluir incrementalmente**; usado no sistema novo só como inventário de funcionalidade esperada, nunca como plano de sprint literal (ver ADR-005).

Divergência entre documentação e implementação: o comportamento efetivo no código e no banco representa o estado atual — do sistema a que a mudança se refere (novo ou antigo, nunca misturar os dois).

## Memória

`.claude/memory/MEMORY.md` é carregado no início de toda sessão. Antes de gravar entrada nova, aplique o teste: uma sessão futura ficaria surpresa e grata de saber disso antes de começar? `type` tem quatro valores fixos: `feedback`, `architecture`, `business-rule`, `reference`.

@.claude/memory/MEMORY.md
