# Fase 4 — Dashboard Real Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o Dashboard atual (`src/pages/Dashboard.tsx`, 12 linhas, só "Bem-vindo, {email}") por um dashboard real: 4 KPIs com dado de verdade, lista de pendências urgentes, atividades recentes (via `audit_logs`) e acesso rápido — seguindo a seção 7 do prompt de UX do usuário e a referência visual (`docs/design/referencia-visual-marketing-os-v3-wireframes.png`, painel 02).

**Architecture:** Nenhuma tabela nova, nenhuma RPC nova. Reaproveita 4 hooks de dado já existentes (`useAprovacaoItens`, `useCampanhas`, `useDemandasCriativas`, `useManutencoes`) para os KPIs e a lista de pendências, e adiciona 1 hook novo (`useAtividadesRecentes`) que lê `audit_logs` — tabela e GRANT já existentes desde o Core (Fase 1 do banco), só nunca consumida pelo frontend ainda. `KpiCard` (Fase 2 do redesenho) já suporta `icon`/`accent` — esta é a primeira tela a usar essas props de verdade.

**Tech Stack:** React Query v5, Supabase (`select` direto, sem RPC nova), lucide-react (ícones dos KPIs), `date-fns` (já é dependência do projeto, usar para "há 10 min"/formatação de prazo).

**Spec:** Seção 7 do prompt de UX do usuário (2026-09-18), `docs/design/DIAGNOSTICO-REDESIGN-FRONTEND.md` (Fase 4 do plano de implementação, seção H).

## Decisões de escopo já tomadas (não redecidir)

- **4 KPIs, decididos pelo usuário:** Aprovações pendentes (`aprovacao_itens.status = 'pending'`), Demandas Criativas em aberto (`demandas_criativas.status not in ('concluida', 'cancelada')`), Campanhas ativas (`campanhas.status = 'ativa'`), Manutenções pendentes (`manutencoes.status not in ('validada', 'cancelada')`).
- **"Pendências urgentes" não inclui Campanhas** — campanha ativa é informativo, não uma ação pendente. A lista mescla até 2 itens de cada uma das outras 3 categorias (Aprovações/Demandas/Manutenções), no máximo 6 no total, ordenados por `created_at` mais antigo primeiro dentro de cada categoria (o mais esperando primeiro).
- **Simplificação deliberada, registrada — não é lacuna:** o card de pendência de Manutenção mostra `urgência` + prazo (`prazo_atendimento`), não o código do outdoor — os hooks existentes (`useManutencoes`) não embutem `outdoors(codigo)`, e adicionar isso exigiria mudar um hook compartilhado por outras telas. Se o usuário quiser o código do outdoor na lista, é ajuste de escopo futuro, não desta fase.
- **Atividades recentes:** só ação humanizada (ex. "Aprovação atualizada") + tempo relativo + quem fez, **quando visível**. `usuario_id` de `audit_logs` é embutido via `usuarios(nome)` — a RLS de `usuarios` só libera ver o nome de terceiros para quem tem grant `core/usuarios/ler/*`; para quem não tem, o campo embutido volta `null` (comportamento padrão do PostgREST em RLS, não é erro) e a atividade aparece sem o "por fulano". Tratar isso como caso normal, não como bug.
- **Acesso rápido:** 6 links estáticos para rotas que já existem — Estúdio (`/estudio`), Nova demanda (`/demandas-criativas`), Templates (`/estudio/templates`), Biblioteca (`/biblioteca-marca`), Aprovações (`/aprovacoes`), Relatórios (`/analise-estrategica/relatorios`).

## Global Constraints

- Zero cor hardcoded — só tokens (inclusive os `accent` do `KpiCard`: `primary`/`success`/`warning`/`destructive`/`info`/`indigo`/`orange`/`gray`, já existentes desde a Fase 2).
- Skeleton (não spinner) em todo o dashboard durante loading — convenção do projeto (`CLAUDE.md`).
- Todo bloco de lista precisa de estado vazio com mensagem — nunca uma lista vazia sem explicação.
- Nenhuma tabela/RPC nova no banco — só leitura de `audit_logs` (já com `GRANT SELECT` para `authenticated` desde o Core) e reaproveitamento dos 4 hooks já existentes.
- Sem framework de teste — verificação por tarefa é `npx tsc --noEmit` + `npm run build`.
- Implementadores não comitam. O orquestrador comita depois que a revisão de cada tarefa aprovar.

---

### Task 1: Hook `useAtividadesRecentes`

**Files:**
- Create: `src/hooks/useAtividadesRecentes.ts`

**Interfaces:**
- Produces: `export function useAtividadesRecentes(limite = 8)` — `useQuery` retornando `AtividadeRecente[]`, cada uma com `{ id: string; label: string; usuarioNome: string | null; createdAt: string }`. Consumido pela Task 2.

**Especialista responsável:** `react-query-specialist`.

- [ ] **Step 1: Criar o hook**

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Rótulo humanizado por action de audit_logs — cobre as 8 actions de
// transição de status já gravadas pelas fases anteriores (Core até
// Estúdio). Ação não mapeada cai no fallback (mostra a action crua) em
// vez de sumir da lista — nunca esconder atividade real por falta de
// tradução.
const ACTION_LABELS: Record<string, string> = {
  aprovacao_item_transicao_status: "Item de aprovação atualizado",
  avaliacao_pdv_transicao_status: "Avaliação de PDV atualizada",
  campanha_transicao_status: "Campanha atualizada",
  demanda_criativa_transicao_status: "Demanda criativa atualizada",
  estudio_composicao_transicao_status: "Peça do Estúdio atualizada",
  manutencao_editada_sem_transicao: "Manutenção editada",
  manutencao_transicao_status: "Manutenção atualizada",
  plano_acao_transicao_status: "Plano de ação atualizado",
  solicitacao_material_transicao_status: "Solicitação de material atualizada",
};

interface AtividadeRecente {
  id: string;
  label: string;
  usuarioNome: string | null;
  createdAt: string;
}

export function useAtividadesRecentes(limite = 8) {
  return useQuery({
    queryKey: ["atividades_recentes", limite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, created_at, usuarios(nome)")
        .order("created_at", { ascending: false })
        .limit(limite);

      if (error) throw error;

      return (data ?? []).map((log): AtividadeRecente => ({
        id: log.id,
        label: ACTION_LABELS[log.action] ?? log.action,
        usuarioNome: (log.usuarios as { nome: string } | null)?.nome ?? null,
        createdAt: log.created_at,
      }));
    },
  });
}
```

- [ ] **Step 2: Verificar**

Rodar: `npx tsc --noEmit`. Atenção: `src/integrations/supabase/client.ts` não tem generic `Database` (decisão registrada no próprio arquivo — sem CLI pra gerar tipos ainda), então `log.usuarios` provavelmente não tem tipo forte; o `as` no código acima já cobre isso. Se o `tsc` reclamar de outra coisa relacionada a tipo do Supabase, ajuste o cast, não mude a query.

- [ ] **Step 3: Reportar ao orquestrador**

Arquivo tocado: `src/hooks/useAtividadesRecentes.ts` (novo). Não comitar.

---

### Task 2: Dashboard real

**Files:**
- Modify: `src/pages/Dashboard.tsx` (reescrita completa do conteúdo, mesmo arquivo)

**Interfaces:**
- Consumes: `useAtividadesRecentes` (Task 1), `useAprovacaoItens` (`src/hooks/useAprovacoes.ts`, já existente), `useCampanhas` (já existente), `useDemandasCriativas` (já existente), `useManutencoes` (já existente), `KpiCard` (`src/components/ui/kpi-card.tsx`, Fase 2 — usar `icon`/`accent` pela primeira vez), `useAuth` (`src/contexts/AuthContext.tsx`, para saudação com nome/e-mail do usuário).

**Especialista responsável:** `frontend-specialist`.

- [ ] **Step 1: Buscar os dados**

No topo do componente, chamar os 4 hooks:
```typescript
const aprovacoesPendentes = useAprovacaoItens("pending");
const campanhasAtivas = useCampanhas("ativa");
const demandas = useDemandasCriativas();
const manutencoes = useManutencoes();
const atividades = useAtividadesRecentes();
```

Estados derivados (não vêm direto da query — calcule com `useMemo` ou direto no corpo do componente, já que as listas são pequenas):
```typescript
const demandasAbertas = (demandas.data ?? []).filter(
  (d) => d.status !== "concluida" && d.status !== "cancelada",
);
const manutencoesPendentes = (manutencoes.data ?? []).filter(
  (m) => m.status !== "validada" && m.status !== "cancelada",
);
```

- [ ] **Step 2: Linha de KPIs (4 `KpiCard`)**

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <KpiCard
    titulo="Aprovações pendentes"
    valor={String(aprovacoesPendentes.data?.length ?? 0)}
    icon={CheckCircle2}
    accent="warning"
  />
  <KpiCard
    titulo="Demandas em aberto"
    valor={String(demandasAbertas.length)}
    icon={ClipboardList}
    accent="info"
  />
  <KpiCard
    titulo="Campanhas ativas"
    valor={String(campanhasAtivas.data?.length ?? 0)}
    icon={Megaphone}
    accent="success"
  />
  <KpiCard
    titulo="Manutenções pendentes"
    valor={String(manutencoesPendentes.length)}
    icon={Wrench}
    accent="orange"
  />
</div>
```

Ícones de `lucide-react` (`CheckCircle2`, `ClipboardList`, `Megaphone`, `Wrench` — já é dependência do projeto). Enquanto qualquer uma das 4 queries estiver em `isLoading`, renderizar 4 `<Skeleton className="h-[104px] w-full" />` no lugar da grid inteira (não card a card — é mais simples e o layout não pula).

- [ ] **Step 3: "Pendências urgentes"**

Monte uma lista unificada, no máximo 2 itens de cada categoria (Aprovações/Demandas/Manutenções), máximo 6 no total:

```typescript
interface PendenciaItem {
  id: string;
  titulo: string;
  detalhe: string;
  href: string;
}

const pendencias: PendenciaItem[] = [
  ...(aprovacoesPendentes.data ?? []).slice(0, 2).map((item) => ({
    id: item.id,
    titulo: item.titulo,
    detalhe: "Aguardando aprovação",
    href: "/aprovacoes",
  })),
  ...demandasAbertas.slice(0, 2).map((d) => ({
    id: d.id,
    titulo: d.titulo,
    detalhe: d.prazo ? `Prazo: ${new Date(d.prazo).toLocaleDateString("pt-BR")}` : "Sem prazo definido",
    href: "/demandas-criativas",
  })),
  ...manutencoesPendentes.slice(0, 2).map((m) => ({
    id: m.id,
    titulo: `Manutenção ${m.urgencia}`,
    detalhe: m.prazo_atendimento
      ? `Prazo: ${new Date(m.prazo_atendimento).toLocaleDateString("pt-BR")}`
      : "Sem prazo definido",
    href: "/manutencoes",
  })),
];
```

Renderize num `Card` com `CardTitle` "Pendências urgentes": cada item é um link (`Link to={item.href}`) mostrando `titulo` + `detalhe`. **Estado vazio obrigatório** (convenção do projeto): se `pendencias.length === 0` (e nenhuma das 3 queries estiver em loading), mostrar `<p className="text-sm text-muted-foreground">Nenhuma pendência no momento.</p>` em vez de um card vazio.

- [ ] **Step 4: "Atividades recentes"**

`Card` com `CardTitle` "Atividades recentes", listando `atividades.data` (até 8 itens): cada linha mostra `label`, e se `usuarioNome` não for `null`, um texto tipo `"— por {usuarioNome}"`; sempre mostrar o tempo relativo de `createdAt` (usar `date-fns`, `formatDistanceToNow` com `{ locale: ptBR, addSuffix: true }` — importar `ptBR` de `date-fns/locale`). Estado vazio: `"Nenhuma atividade recente."`. Enquanto `atividades.isLoading`, mostrar 3 `<Skeleton className="h-5 w-full" />`.

- [ ] **Step 5: "Acesso rápido"**

Grid de 6 botões/links (usar `Button asChild variant="outline"` envolvendo `Link`, mesmo padrão já usado em outras telas do projeto — confira um exemplo em `AnaliseEstrategicaDashboard.tsx` antes de escrever, para manter o mesmo componente/variant):
- "Criar peça" → `/estudio`
- "Nova demanda" → `/demandas-criativas`
- "Templates" → `/estudio/templates`
- "Biblioteca" → `/biblioteca-marca`
- "Aprovações" → `/aprovacoes`
- "Relatórios" → `/analise-estrategica/relatorios`

- [ ] **Step 6: Saudação no topo**

Usar `useAuth()` para pegar o usuário logado (`session.user.email` já é usado em outro lugar do projeto — confira `AuthContext.tsx` pra ver se há um nome disponível além do e-mail; se só houver e-mail, use isso mesmo, sem inventar nome). Título: `Olá, {nome ou email}!` + subtítulo `"Veja o que precisa da sua atenção hoje."`.

- [ ] **Step 7: Verificar**

Rodar `npx tsc --noEmit` e `npm run build`.

- [ ] **Step 8: Reportar ao orquestrador**

Arquivo tocado: `src/pages/Dashboard.tsx`. Não comitar. Descreva no relatório, em texto, os 4 números de KPI que você viu (mesmo que sejam 0 — isso é esperado num banco de teste) para o orquestrador confirmar que a query rodou de verdade, não só que compilou.

---

## Self-Review

**Cobertura:** os 4 KPIs escolhidos pelo usuário (Task 2, Step 2), "Pendências urgentes" sem Campanhas (Task 2, Step 3, decisão registrada), "Atividades recentes" via `audit_logs` (Task 1 + Task 2 Step 4), "Acesso rápido" com 6 rotas reais (Task 2, Step 5) — todos os itens da seção 7 do prompt do usuário cobertos, com as simplificações explicitamente registradas (sem código do outdoor na pendência de manutenção; sem "por fulano" quando RLS de `usuarios` não libera o nome).

**Fora de escopo desta fase, de propósito:** qualquer alerta de contrato próximo do vencimento (não há tabela de contrato nesta base ainda — não inventar dado); personalização do dashboard por papel (todo usuário vê os mesmos 4 KPIs, filtrados só pelo que a RLS de cada tabela já permite ver).

**Consistência de tipos:** `AtividadeRecente` (Task 1) é consumido em `useAtividadesRecentes` (Task 2) com os mesmos 4 campos (`id`, `label`, `usuarioNome`, `createdAt`) — sem redefinição divergente.
