# ADR-008 — Frontend mínimo antes de continuar o backend

> Registro de decisões arquiteturais e de produto — 2026-09-08.

**Status:** aceito

**Contexto.** Depois de duas fases de backend aplicadas (Core e Mídia Externa, ver `docs/decisions/ADR-005`..`007`), o usuário observou que não havia nenhuma forma de ver ou criar dado pelo sistema — só schema, sem tela nenhuma. O roadmap original (`docs/NOVO-MARKETING-OS-ESPECIFICACAO.md`, seção "Roadmap de construção") empilhava todas as fases de backend antes de qualquer frontend, o que adiaria essa validação por muitas fases.

**Decisão.** Pausar a expansão de backend (Fase 3 — Merchandising — e seguintes) e construir um frontend mínimo funcional cobrindo o que já existe (Core + Mídia Externa) antes de continuar. Ordem revisada:

1. Reorganizar `src/` — mover o frontend antigo (Lovable) para `legacy/frontend-lovable/`, mesmo padrão já aplicado às migrations antigas (`ADR-005`). Mantidos apenas componentes genéricos sem lógica de negócio do sistema antigo (`components/ui/` shadcn, helper `cn()`, `use-mobile`/`use-toast` por dependência direta desses componentes).
2. Base do frontend novo: autenticação, roteamento, shell — sem telas de CRUD ainda.
3. Hooks de dado (TanStack Query) para `pdvs`/`outdoors`/`avaliacoes_outdoor`/`manutencoes`.
4. Telas de CRUD mínimas para essas entidades.
5. Só então retomar backend (Fase 3 em diante).

**Consequência.** Adia a conclusão do desenho de dados de todos os módulos, mas permite validar cedo se as decisões de schema/permissão fazem sentido na prática (via uso real, não só leitura de SQL), e dá ao usuário uma forma de interagir com o sistema sem esperar o backend inteiro. Nesse intervalo, o Table Editor do painel Supabase serve de stopgap para inspecionar/editar dado diretamente, sem depender de tela.
