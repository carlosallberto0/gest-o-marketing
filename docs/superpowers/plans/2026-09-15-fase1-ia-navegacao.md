# Fase 1 — IA + Navegação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o menu plano de 24 itens do Marketing OS por uma navegação agrupada em 9 seções, corrigir o bug P0 de navegação mobile (lista de 24 itens sem quebra de linha, botão "Sair" potencialmente inalcançável), e introduzir a infraestrutura de permissão agregada que permite esconder grupos inteiros do menu por papel.

**Architecture:** Uma fonte única de dados de navegação (`NAV_GROUPS`, dados puros) filtrada por uma nova RPC de permissão agregada (`minhas_permissoes()`, 1 chamada por sessão em vez de N por item), consumida por dois componentes de apresentação (`AppSidebar` para desktop/tablet, `MobileNav` como drawer para mobile) que compartilham a mesma lista renderizada (`NavGroupList`). Nenhuma rota muda de lugar nesta fase — os 27 caminhos existentes em `App.tsx` continuam exatamente os mesmos, só a forma como são apresentados no menu muda. Nenhum token visual novo é introduzido (isso é Fase 2/3) — a sidebar continua com as cores atuais.

**Tech Stack:** React 18 + TypeScript + React Router v6 + TanStack React Query v5 + shadcn/ui (`Sheet`, `Button`) + Supabase (Postgres RPC `SECURITY DEFINER`).

**Spec:** `docs/design/DIAGNOSTICO-REDESIGN-FRONTEND.md` (seções C, D.1/D.2, H — Fase 1), aprovado pelo usuário em 2026-09-15.

## Global Constraints

- Zero cor/gradiente/sombra hardcoded — só tokens semânticos Tailwind já existentes (`bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-accent`, etc.). Nenhum token novo nesta fase.
- `snake_case` em tabela/coluna/função de banco; toda função `SECURITY DEFINER` tem `set search_path = public` fixado; RLS + GRANT explícito, nunca RLS sozinha.
- Nenhuma função de banco aceita parâmetro de usuário livre — responde só sobre `auth.uid()` (mesmo padrão de `has_permission()`/`usuario_pdv_id()`), nunca vira oráculo de leitura via RPC pública.
- `PascalCase` para componente, `camelCase` para função/variável.
- Mobile-first, prefixos responsivos Tailwind obrigatórios.
- Sem framework de teste no repositório — verificação por tarefa é `npx tsc --noEmit` (sempre) e, na tarefa de integração final, `npm run dev` + checagem manual no navegador (desktop e mobile) + `npm run build`.
- Migrations são aplicadas manualmente pelo usuário via SQL Editor do Supabase — não há CLI linkada nesta máquina.
- Implementadores não comitam. Deixam a mudança na árvore de trabalho e reportam quais arquivos tocaram — o orquestrador comita, uma tarefa por vez.
- Toda mudança que toca `papeis`/`permissoes_concedidas`/isolamento passa por revisão obrigatória do `rls-security-reviewer` antes de ser considerada pronta para merge.

---

### Task 1: RPC `minhas_permissoes()`

**Files:**
- Create: `supabase/migrations/20260915180000_minhas_permissoes_rpc.sql`

**Interfaces:**
- Produces: RPC Postgres `public.minhas_permissoes()` → `table(modulo text, recurso text, acao text, escopo text)`, `SECURITY DEFINER`, sem parâmetro, responde só sobre `auth.uid()`. Chamada pelo frontend via `supabase.rpc("minhas_permissoes")` (Task 3).

**Especialista responsável:** `supabase-schema`, com revisão obrigatória de `rls-security-reviewer` antes de considerar a tarefa concluída (regra do `CLAUDE.md` para qualquer mudança que toque `papeis`/`permissoes_concedidas`).

- [ ] **Step 1: Escrever a migration**

```sql
-- =============================================================================
-- Marketing OS (novo) — RPC de permissão agregada para navegação
-- minhas_permissoes()
-- =============================================================================
--
-- CONTEXTO — Fase 1 do redesenho de front-end
-- (docs/design/DIAGNOSTICO-REDESIGN-FRONTEND.md, decisão de 2026-09-15): o
-- novo AppShell precisa esconder grupos inteiros do menu por papel (ex.: um
-- manager não deveria ver "Administração"). Isso exigiria N chamadas de
-- has_permission() por carregamento de página — o hook useHasPermission.ts
-- documentava essa limitação de propósito ("sem cache de todas as permissões
-- do usuário — abstração especulativa não pedida"), decisão agora revisitada
-- porque deixou de ser especulativa (ver comentário atualizado nesse arquivo).
--
-- DECISÃO — mesma regra de segurança de has_permission()/usuario_pdv_id():
-- SECURITY DEFINER, SEM parâmetro de usuário livre, responde só sobre
-- auth.uid(). Não vira oráculo de leitura via RPC pública.
-- =============================================================================

create or replace function public.minhas_permissoes()
returns table(modulo text, recurso text, acao text, escopo text)
language sql
stable
security definer
set search_path = public
as $$
  select pc.modulo, pc.recurso, pc.acao, pc.escopo
  from public.usuario_papeis up
  join public.usuarios u on u.id = up.usuario_id
  join public.permissoes_concedidas pc on pc.papel_id = up.papel_id
  where up.usuario_id = auth.uid()
    and up.is_active = true
    and u.status = 'ativo'
    and pc.is_active = true;
$$;

comment on function public.minhas_permissoes is 'Retorna todos os grants ativos (modulo, recurso, acao, escopo) do papel de auth.uid() — mesma checagem fail-closed de has_permission() (usuario_papeis.is_active, usuarios.status, permissoes_concedidas.is_active), mas devolve o conjunto inteiro em 1 chamada em vez de checar 1 combinação por vez. Existe para o AppShell filtrar grupos de menu por papel sem 1 RPC por item. SECURITY DEFINER sem parâmetro de usuário (mesmo motivo de has_permission()/usuario_pdv_id(): nunca virar oráculo de leitura via RPC pública).';

grant execute on function public.minhas_permissoes() to authenticated;
```

- [ ] **Step 2: Pedir ao usuário para aplicar a migration no SQL Editor do Supabase (projeto `qlezexylaixllhakpezv`)**

Não há CLI linkada nesta máquina — a aplicação é manual, feita pelo usuário.

- [ ] **Step 3: Verificar que a função existe**

No SQL Editor, rodar:

```sql
select proname, prosecdef from pg_proc where proname = 'minhas_permissoes';
```

Esperado: 1 linha, `prosecdef = true` (confirma `SECURITY DEFINER`).

- [ ] **Step 4: Revisão de segurança obrigatória**

Despachar `rls-security-reviewer` para revisar a migration antes de seguir para a Task 3 (que depende desta função existir e estar correta). Critério: sem parâmetro de usuário livre, mesma lógica fail-closed de `has_permission()`, `search_path` fixado, `GRANT EXECUTE` só para `authenticated`.

- [ ] **Step 5: Reportar ao orquestrador**

Arquivo tocado: `supabase/migrations/20260915180000_minhas_permissoes_rpc.sql`. Não comitar — o orquestrador comita.

---

### Task 2: Dados de navegação (`NAV_GROUPS`)

**Files:**
- Create: `src/lib/navigation.ts`

**Interfaces:**
- Produces: `interface NavItem { to: string; label: string; end?: boolean; requiredPermission?: { modulo: string; recurso: string; acao: string; escopo: string } }`, `interface NavGroup { label: string; items: NavItem[] }`, `export const NAV_GROUPS: NavGroup[]`. Consumido por Task 4 (`useVisibleNavGroups`).

**Especialista responsável:** `react-query-specialist` (é dado consumido por hook de dado, mesmo sendo estático) ou `frontend-specialist` — qualquer um serve, é arquivo sem lógica de fetch.

- [ ] **Step 1: Criar o arquivo com os 9 grupos, usando exatamente as 27 rotas já existentes em `src/App.tsx`**

```typescript
export interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  requiredPermission?: {
    modulo: string;
    recurso: string;
    acao: string;
    escopo: string;
  };
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// Fase 1 do redesenho (docs/design/DIAGNOSTICO-REDESIGN-FRONTEND.md, seção
// C.2) — 24 itens flat viram 9 grupos. Nenhuma rota nova aqui: só reagrupa as
// 27 rotas que já existem em App.tsx. Páginas que ainda não existem
// (Avaliação de Outdoor, Usuários e Permissões) entram quando forem
// construídas em fases futuras, não como placeholder aqui.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão Geral",
    items: [{ to: "/", label: "Dashboard", end: true }],
  },
  {
    label: "Operação",
    items: [{ to: "/pdvs", label: "PDVs" }],
  },
  {
    label: "Mídia Externa",
    items: [
      { to: "/outdoors", label: "Outdoors" },
      { to: "/manutencoes", label: "Manutenções" },
    ],
  },
  {
    label: "Merchandising",
    items: [
      { to: "/materiais", label: "Materiais" },
      { to: "/solicitacoes-material", label: "Solicitações de Material" },
      { to: "/avaliacoes-pdv", label: "Avaliação de PDV" },
      { to: "/planos-acao", label: "Planos de Ação" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/campanhas", label: "Campanhas" },
      { to: "/aprovacoes", label: "Aprovações" },
      { to: "/demandas-criativas", label: "Demandas Criativas" },
    ],
  },
  {
    label: "Estúdio",
    items: [
      { to: "/estudio", label: "Estúdio" },
      { to: "/estudio/templates", label: "Templates" },
      { to: "/estudio/elementos", label: "Elementos" },
      { to: "/estudio/historico", label: "Histórico de Peças" },
    ],
  },
  {
    label: "Marca",
    items: [{ to: "/biblioteca-marca", label: "Biblioteca de Marca" }],
  },
  {
    label: "Inteligência",
    items: [
      { to: "/analise-estrategica/dashboard", label: "Dashboard" },
      { to: "/analise-estrategica/clusters/conveniencia", label: "Clusters — Conveniência" },
      { to: "/analise-estrategica/clusters/outdoors", label: "Clusters — Outdoor" },
      { to: "/analise-estrategica/clusters/comparativo", label: "Clusters — Comparativo" },
      { to: "/analise-estrategica/insights", label: "Insights" },
      { to: "/analise-estrategica/relatorios", label: "Relatórios" },
    ],
  },
  {
    label: "Administração",
    items: [
      { to: "/checklist-config", label: "Config. Checklist" },
      {
        to: "/analise-estrategica/config",
        label: "Configuração da Análise",
        requiredPermission: { modulo: "analise", recurso: "config", acao: "editar", escopo: "rede_toda" },
      },
    ],
  },
];
```

- [ ] **Step 2: Verificar**

Rodar: `npx tsc --noEmit`
Esperado: sem erro novo.

- [ ] **Step 3: Reportar ao orquestrador**

Arquivo tocado: `src/lib/navigation.ts` (novo). Não comitar.

---

### Task 3: Hook `useMinhasPermissoes` + atualizar comentário de `useHasPermission`

**Files:**
- Create: `src/hooks/useMinhasPermissoes.ts`
- Modify: `src/hooks/useHasPermission.ts:4-10` (só o comentário — nenhuma linha de código muda)

**Interfaces:**
- Consumes: RPC `minhas_permissoes()` (Task 1).
- Produces: `export function useMinhasPermissoes()` retornando `{ ...resultadoDoUseQuery, podeAcessar(modulo: string, recurso: string, acao: string, escopo: string): boolean }`. Consumido por Task 4.

**Especialista responsável:** `react-query-specialist`.

- [ ] **Step 1: Criar o hook**

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Permissao {
  modulo: string;
  recurso: string;
  acao: string;
  escopo: string;
}

function chave(p: Permissao) {
  return `${p.modulo}:${p.recurso}:${p.acao}:${p.escopo}`;
}

// Complementa useHasPermission.ts: aquele é 1 checagem por chamada (bom para
// pontos de uso isolados dentro de uma tela); este busca TODOS os grants do
// usuário em 1 RPC só, para o AppShell filtrar o menu inteiro sem 1 RPC por
// item de navegação. Ver comentário atualizado em useHasPermission.ts.
export function useMinhasPermissoes() {
  const query = useQuery({
    queryKey: ["minhas_permissoes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("minhas_permissoes");
      if (error) throw error;
      return new Set((data as Permissao[]).map(chave));
    },
  });

  function podeAcessar(modulo: string, recurso: string, acao: string, escopo: string) {
    return query.data?.has(chave({ modulo, recurso, acao, escopo })) ?? false;
  }

  return { ...query, podeAcessar };
}
```

- [ ] **Step 2: Atualizar o comentário de `src/hooks/useHasPermission.ts`**

Trocar o comentário atual (linhas 4-10, que diz "sem cache de todas as permissões do usuário — abstração especulativa não pedida") por:

```typescript
// Infraestrutura do Core, não de um módulo específico — has_permission() é a
// mesma RPC que qualquer fase pode precisar checar no frontend para 1 ponto
// de uso isolado dentro de uma tela (ex.: mostrar/esconder 1 botão). Para
// filtrar o menu inteiro por papel, use useMinhasPermissoes() em vez deste —
// ele busca todos os grants em 1 RPC só, evitando 1 chamada de
// has_permission() por item de navegação.
```

- [ ] **Step 3: Verificar**

Rodar: `npx tsc --noEmit`
Esperado: sem erro novo.

- [ ] **Step 4: Reportar ao orquestrador**

Arquivos tocados: `src/hooks/useMinhasPermissoes.ts` (novo), `src/hooks/useHasPermission.ts` (só comentário). Não comitar.

---

### Task 4: Hook `useVisibleNavGroups`

**Files:**
- Create: `src/hooks/useVisibleNavGroups.ts`

**Interfaces:**
- Consumes: `NAV_GROUPS` de `src/lib/navigation.ts` (Task 2), `useMinhasPermissoes()` (Task 3).
- Produces: `export function useVisibleNavGroups(): NavGroup[]` — mesma forma de `NAV_GROUPS`, mas com itens sem permissão suficiente removidos e grupos vazios removidos. Consumido por Task 6 (`AppSidebar`, `MobileNav`).

**Especialista responsável:** `react-query-specialist`.

- [ ] **Step 1: Criar o hook**

```typescript
import { NAV_GROUPS, type NavGroup } from "@/lib/navigation";
import { useMinhasPermissoes } from "@/hooks/useMinhasPermissoes";

export function useVisibleNavGroups(): NavGroup[] {
  const { podeAcessar } = useMinhasPermissoes();

  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        !item.requiredPermission ||
        podeAcessar(
          item.requiredPermission.modulo,
          item.requiredPermission.recurso,
          item.requiredPermission.acao,
          item.requiredPermission.escopo,
        ),
    ),
  })).filter((group) => group.items.length > 0);
}
```

- [ ] **Step 2: Verificar**

Rodar: `npx tsc --noEmit`
Esperado: sem erro novo.

- [ ] **Step 3: Reportar ao orquestrador**

Arquivo tocado: `src/hooks/useVisibleNavGroups.ts` (novo). Não comitar.

---

### Task 5: Componente `NavGroupList` (lista compartilhada desktop/mobile)

**Files:**
- Create: `src/components/layout/NavGroupList.tsx`

**Interfaces:**
- Consumes: `type NavGroup` de `src/lib/navigation.ts` (Task 2).
- Produces: `export function NavGroupList({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void })`. Consumido por Task 6 (`AppSidebar`, `MobileNav`).

**Especialista responsável:** `frontend-specialist`.

- [ ] **Step 1: Criar o componente**

Reaproveita exatamente as classes Tailwind do `AppShell` atual (`src/App.tsx:96-121`) — mesma aparência visual, só reorganizada em grupos com cabeçalho. Nenhum token novo.

```typescript
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { NavGroup } from "@/lib/navigation";

interface NavGroupListProps {
  groups: NavGroup[];
  onNavigate?: () => void;
}

export function NavGroupList({ groups, onNavigate }: NavGroupListProps) {
  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/60">
            {group.label}
          </p>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex h-9 w-full items-center rounded-md px-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verificar**

Rodar: `npx tsc --noEmit`
Esperado: sem erro novo (componente ainda não é importado por ninguém — normal não haver verificação visual nesta tarefa).

- [ ] **Step 3: Reportar ao orquestrador**

Arquivo tocado: `src/components/layout/NavGroupList.tsx` (novo). Não comitar.

---

### Task 6: `AppSidebar` (desktop/tablet) e `MobileNav` (drawer mobile — corrige o P0)

**Files:**
- Create: `src/components/layout/AppSidebar.tsx`
- Create: `src/components/layout/MobileNav.tsx`

**Interfaces:**
- Consumes: `useVisibleNavGroups()` (Task 4), `NavGroupList` (Task 5), `useAuth()` (`src/contexts/AuthContext.tsx`, já existente — `signOut`).
- Produces: `export function AppSidebar()`, `export function MobileNav()`. Consumidos por Task 7 (`App.tsx`).

**Especialista responsável:** `frontend-specialist`.

- [ ] **Step 1: Criar `AppSidebar.tsx` (visível só a partir de `md`, mesma aparência do nav atual)**

```typescript
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useVisibleNavGroups } from "@/hooks/useVisibleNavGroups";
import { NavGroupList } from "@/components/layout/NavGroupList";

export function AppSidebar() {
  const { signOut } = useAuth();
  const groups = useVisibleNavGroups();

  return (
    <nav
      aria-label="Navegação principal"
      className="hidden shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:flex md:w-56"
    >
      <p className="text-lg font-semibold">Marketing OS</p>
      <NavGroupList groups={groups} />
      <Button variant="outline" size="sm" onClick={signOut}>
        Sair
      </Button>
    </nav>
  );
}
```

- [ ] **Step 2: Criar `MobileNav.tsx` — drawer via `Sheet` (corrige o P0: "Sair" sempre dentro do painel rolável, nunca espremido por uma fileira horizontal de 24 itens)**

```typescript
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useVisibleNavGroups } from "@/hooks/useVisibleNavGroups";
import { NavGroupList } from "@/components/layout/NavGroupList";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const groups = useVisibleNavGroups();

  return (
    <div className="flex items-center justify-between border-b border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:hidden">
      <p className="text-lg font-semibold">Marketing OS</p>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex w-72 flex-col gap-6 overflow-y-auto bg-sidebar text-sidebar-foreground"
        >
          <SheetHeader>
            <SheetTitle className="text-left text-sidebar-foreground">Marketing OS</SheetTitle>
          </SheetHeader>
          <NavGroupList groups={groups} onNavigate={() => setOpen(false)} />
          <Button variant="outline" size="sm" onClick={signOut}>
            Sair
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 3: Verificar**

Rodar: `npx tsc --noEmit`
Esperado: sem erro novo.

- [ ] **Step 4: Reportar ao orquestrador**

Arquivos tocados: `src/components/layout/AppSidebar.tsx` (novo), `src/components/layout/MobileNav.tsx` (novo). Não comitar.

---

### Task 7: Ligar tudo em `App.tsx` + QA manual completa

**Files:**
- Modify: `src/App.tsx:1-130` (remover `NAV_ITEMS`, `NAV_ITEM_CONFIG_ANALISE`, o corpo antigo de `AppShell` e os imports que ficam sem uso; importar e usar `AppSidebar`/`MobileNav`)

**Interfaces:**
- Consumes: `AppSidebar`, `MobileNav` (Task 6).

**Especialista responsável:** `frontend-specialist` para a edição; QA manual final é do orquestrador/usuário; `code-reviewer` depois, por tocar arquivo de código-fonte (regra do `CLAUDE.md`).

- [ ] **Step 1: Editar `src/App.tsx`**

Remover:
- O array `NAV_ITEMS` (linhas ~35-60).
- A constante `NAV_ITEM_CONFIG_ANALISE` (linhas ~62-65).
- O import de `useHasPermission` (não é mais usado diretamente em `App.tsx` — a lógica foi para `useVisibleNavGroups`).
- O import de `NavLink` e de `cn` (não são mais usados diretamente em `App.tsx` — foram para `NavGroupList.tsx`).
- O import de `Button` (não é mais usado diretamente em `App.tsx` — foi para `AppSidebar.tsx`/`MobileNav.tsx`).
- O corpo atual da função `AppShell` (linhas ~89-130).

Adicionar:
```typescript
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
```

Nova função `AppShell`:
```typescript
function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <MobileNav />
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
```

Manter sem alteração: `ProtectedRoute`, `queryClient`, todos os `<Route>` (as 27 rotas continuam exatamente como estão).

- [ ] **Step 2: Verificar tipos**

Rodar: `npx tsc --noEmit`
Esperado: sem erro.

- [ ] **Step 3: Verificar build**

Rodar: `npm run build`
Esperado: build passa (mesmo aviso de chunk grande de sempre — code-splitting é Fase 3, fora de escopo aqui).

- [ ] **Step 4: QA manual no navegador — desktop**

Rodar `npm run dev`, abrir `http://localhost:8080`, logar. Verificar:
- Sidebar mostra 9 grupos com cabeçalho, não 24 itens soltos.
- "Configuração da Análise" só aparece para usuário com o grant `analise/config/editar/rede_toda` (mesmo comportamento de hoje, agora via `useVisibleNavGroups`).
- Clicar em pelo menos 1 item de cada grupo navega para a rota certa e marca o item ativo.
- Botão "Sair" funciona.

- [ ] **Step 5: QA manual no navegador — mobile**

Com as DevTools em modo responsivo (< 768px, ou redimensionar a janela):
- Nav vira uma barra com título + ícone de menu (hambúrguer), não mais uma fileira de 24 links cortada.
- Clicar no ícone abre o drawer (`Sheet`) da esquerda, com os mesmos 9 grupos.
- Clicar em um item navega e fecha o drawer automaticamente.
- Botão "Sair" está visível e clicável dentro do drawer, sem ficar cortado — **esta é a verificação do P0 original**.

- [ ] **Step 6: Revisão de código**

Despachar `code-reviewer` para revisar o diff desta fase inteira (todas as 7 tarefas) antes do commit final.

- [ ] **Step 7: Reportar ao orquestrador**

Arquivo tocado: `src/App.tsx`. Não comitar — o orquestrador comita cada tarefa da onda, na ordem, capturando o `HEAD` fresco antes de cada commit (regra de despacho paralelo do `CLAUDE.md` — aqui as tarefas são majoritariamente sequenciais por dependência de interface, não paralelas).

---

## Self-Review

**Cobertura do diagnóstico (Fase 1, seção H):** "Novo AppShell com 9 grupos" → Tasks 2, 5, 6, 7. "Correção do P0 mobile" → Task 6 (drawer) + Task 7 Step 5 (QA específico). "Hook agregado de permissão para nav por papel" → Tasks 1, 3, 4. Decisão D.2 (PDVs em Operação) → refletida em `NAV_GROUPS` (Task 2). Nenhum requisito da Fase 1 ficou sem tarefa.

**Fora de escopo desta fase, de propósito:** merge Aprovações+Demandas Criativas (D.1, é Fase 6), consolidação de Clusters/Análise Estratégica em abas (Fase 7), recalibração de tokens visuais/sidebar clara (Fase 2/3), code-splitting e remoção do `framer-motion` morto (Fase 3), tela de Avaliação de Outdoor e de Usuários/Permissões (Fases 5/8).

**Consistência de tipos:** `NavItem`/`NavGroup` (Task 2) são o mesmo tipo em todas as tarefas que os consomem (3, 4, 5, 6) — não há redefinição divergente. `podeAcessar(modulo, recurso, acao, escopo)` tem a mesma assinatura em `useMinhasPermissoes` (Task 3) e no uso em `useVisibleNavGroups` (Task 4).
