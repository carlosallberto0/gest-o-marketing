# Fase 2 — Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recalibrar os tokens de design já existentes (`src/index.css`, `tailwind.config.ts`) para a referência visual definitiva (`docs/design/referencia-visual-marketing-os.md` e as duas imagens de 2026-09-17), e extrair um `KpiCard` reutilizável. Não é criação de sistema novo — o próprio `src/index.css` já documenta os valores atuais como placeholder ("substituir por tokens de verdade quando a referência existir" — ela existe agora).

**Architecture:** Só recalibração de valor em arquivo já existente + 1 componente novo pequeno (`KpiCard`). Nenhuma rota, nenhuma tela nova, nenhuma mudança de comportamento — puramente visual/tokens. Cada task é independente o bastante para revisão isolada, mas todas tocam `src/index.css`/`tailwind.config.ts` em seções diferentes — por isso a execução é sequencial (task por task), nunca em paralelo, para não colidir edição no mesmo arquivo.

**Tech Stack:** Tailwind CSS v3 (tokens via CSS custom properties em HSL), `@fontsource/plus-jakarta-sans` (novo), shadcn/ui (`Badge`, `Card`).

**Spec:** `docs/design/DIAGNOSTICO-REDESIGN-FRONTEND.md` (seção F — Design System) e `docs/design/referencia-visual-marketing-os.md` (atualizado 2026-09-17 com tipografia nomeada e paleta de 6 swatches).

## Global Constraints

- Zero cor hardcoded fora dos arquivos de token (`src/index.css`, `tailwind.config.ts`) — todo componente continua consumindo só nomes de token (`bg-primary`, `text-sidebar-foreground`, etc.), nunca hex/rgba direto.
- Toda cor em `src/index.css` é HSL sem a função `hsl()` (formato `H S% L%`, consumido como `hsl(var(--x))` no Tailwind config) — seguir o padrão já existente no arquivo, não introduzir outro formato.
- `snake_case`/`kebab-case` em nome de variável CSS (`--category-indigo`, não `--categoryIndigo`).
- Reaproveitar token semântico já existente antes de criar um novo (regra do projeto — ver Task 4, que reaproveita `--success`/`--warning` em vez de duplicar hues já cobertos).
- Sem framework de teste no repositório — verificação por tarefa é `npx tsc --noEmit` (sempre) e, nas tarefas visuais, `npm run build` + descrição do que mudou visualmente para o orquestrador confirmar (nenhuma automação de screenshot disponível neste ambiente).
- Implementadores não comitam. O orquestrador comita depois que a revisão de cada tarefa aprovar.
- Execução estritamente sequencial (uma tarefa implementada e revisada por vez) — `src/index.css` e `tailwind.config.ts` são tocados por várias tarefas em seções diferentes; nunca dois implementadores no mesmo arquivo ao mesmo tempo.

---

### Task 1: Sidebar clara

**Files:**
- Modify: `src/index.css:65-72` (bloco `--sidebar-*` dentro de `:root`)

**Interfaces:**
- Produces: novos valores de `--sidebar-background`, `--sidebar-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border` — consumidos por `AppSidebar.tsx`/`MobileNav.tsx`/`NavGroupList.tsx` (Fase 1, já existentes, não precisam de nenhuma mudança de código — só o valor do token muda).

**Especialista responsável:** `frontend-specialist`.

- [ ] **Step 1: Editar o bloco `--sidebar-*` em `src/index.css` dentro de `:root`**

Trocar:
```css
    --sidebar-background: 240 6% 10%;
    --sidebar-foreground: 0 0% 98%;
    --sidebar-primary: 217 91% 60%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 4% 18%;
    --sidebar-accent-foreground: 0 0% 98%;
    --sidebar-border: 240 4% 18%;
    --sidebar-ring: 217 91% 60%;
```
Por:
```css
    --sidebar-background: 0 0% 100%;
    --sidebar-foreground: 240 10% 30%;
    --sidebar-primary: 217 91% 60%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 217 91% 95%;
    --sidebar-accent-foreground: 217 91% 40%;
    --sidebar-border: 240 6% 90%;
    --sidebar-ring: 217 91% 60%;
```

Justificativa de cada valor: `--sidebar-background` branco puro (referência: "sidebar clara/branca"). `--sidebar-foreground` cinza escuro (não preto puro, mesmo princípio de `--foreground` já usado no resto do app) para texto de item inativo. `--sidebar-accent` azul bem claro (item ativo, fundo) e `--sidebar-accent-foreground` azul mais escuro que `--primary` (texto do item ativo, precisa de contraste maior que um botão preenchido contra um fundo quase branco). `--sidebar-border` reaproveita o mesmo valor de `--border` do resto do app (consistência, não um cinza inventado). `--sidebar-primary`/`--sidebar-ring` não mudam (não usados por nenhum componente hoje, mas mantidos coerentes).

- [ ] **Step 2: NÃO alterar o bloco `.dark` (linhas ~119-126)** — a referência visual é só do modo claro; dark mode não tem referência para recalibrar nesta fase, fica como está (herda o antigo escuro, que já fazia sentido para dark mode).

- [ ] **Step 3: Verificar**

Rodar: `npx tsc --noEmit` (não deve haver erro, é só CSS) e `npm run build` (confirma que o Tailwind processa sem erro).

- [ ] **Step 4: Reportar ao orquestrador**

Arquivo tocado: `src/index.css`. Descreva no relatório, em texto, como a sidebar deveria aparecer agora (branca, item ativo azul claro) para o orquestrador confirmar visualmente depois. Não comitar.

---

### Task 2: Tipografia — Plus Jakarta Sans

**Files:**
- Modify: `package.json` (remover `@fontsource/dm-sans`, adicionar `@fontsource/plus-jakarta-sans`)
- Modify: `src/main.tsx` (importar os pesos da fonte)
- Modify: `tailwind.config.ts:16-18` (`fontFamily.sans`)

**Interfaces:** Nenhuma — só configuração de build/CSS, sem interface de código consumida por outra task.

**Especialista responsável:** `frontend-specialist`.

- [ ] **Step 1: Trocar a dependência**

```bash
npm uninstall @fontsource/dm-sans
npm install @fontsource/plus-jakarta-sans
```

`@fontsource/dm-sans` está instalado desde a Fase 1 mas nunca foi usado (decisão D.3 da Fase 1 escolheu DM Sans provisoriamente; a referência mais completa de 2026-09-17 nomeia Plus Jakarta Sans explicitamente — ver `docs/design/referencia-visual-marketing-os.md`). Remover em vez de deixar as duas instaladas.

- [ ] **Step 2: Importar os pesos usados pelo app em `src/main.tsx`**

```typescript
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

Pesos escolhidos: 400 (texto corrido), 500 (labels/menu), 600 (títulos de card), 700 (títulos de página/KPI) — cobrem o que o app já usa hoje via classes Tailwind (`font-medium`=500, `font-semibold`=600, `font-bold`=700).

- [ ] **Step 3: Atualizar `tailwind.config.ts`**

Trocar:
```typescript
      fontFamily: {
        sans: ['"Poppins"', 'system-ui', 'sans-serif'],
      },
```
Por:
```typescript
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
```

(`Poppins` nunca chegou a carregar de verdade no app — não há `@import`/pacote correspondente hoje, é o achado #11 do diagnóstico — então esta troca não é uma regressão de nada que já funcionava.)

- [ ] **Step 4: Verificar**

Rodar: `npx tsc --noEmit` e `npm run build`. Confirmar que `node_modules/@fontsource/plus-jakarta-sans` existe após o install e que `@fontsource/dm-sans` não aparece mais em `package.json`.

- [ ] **Step 5: Reportar ao orquestrador**

Arquivos tocados: `package.json`, `package-lock.json` (gerado pelo npm), `src/main.tsx`, `tailwind.config.ts`. Não comitar.

---

### Task 3: Sombra — de `shadow-nazox` para tokens genéricos

**Files:**
- Modify: `tailwind.config.ts:88-91` (`boxShadow`)
- Modify: `src/index.css` (`:root`, adicionar `--shadow-color`)
- Modify: `src/components/ui/card.tsx:6` (única mudança de classe)
- Modify: `src/pages/EstudioColaborador.tsx:293` (única mudança de classe)

**Interfaces:** Produces: classes Tailwind `shadow-subtle`/`shadow-elevated`, substituindo `shadow-nazox`/`shadow-nazox-lg` (que não são usadas em nenhum outro lugar do repositório — confirmado por grep antes de escrever este plano).

**Especialista responsável:** `frontend-specialist`.

- [ ] **Step 1: Adicionar `--shadow-color` em `src/index.css`, dentro de `:root`** (qualquer lugar do bloco, sugestão: logo após `--radius`)

```css
    --shadow-color: 220 40% 20%;
```

Azul-acinzentado escuro, mesmo princípio de "profundidade sutil" que o Nazox já usava (`rgba(18, 38, 63, ...)` é aproximadamente esse mesmo tom em RGB) — não é uma cor nova inventada, é o mesmo tom convertido para token HSL reutilizável.

- [ ] **Step 2: Trocar `boxShadow` em `tailwind.config.ts`**

Trocar:
```typescript
      boxShadow: {
        'nazox': '0 0.75rem 1.5rem rgba(18, 38, 63, 0.03)',
        'nazox-lg': '0 1rem 3rem rgba(18, 38, 63, 0.08)',
      },
```
Por:
```typescript
      boxShadow: {
        subtle: '0 1px 2px 0 hsl(var(--shadow-color) / 0.06), 0 1px 3px 0 hsl(var(--shadow-color) / 0.04)',
        elevated: '0 4px 12px -2px hsl(var(--shadow-color) / 0.10), 0 2px 6px -2px hsl(var(--shadow-color) / 0.06)',
      },
```

`subtle` para cards em repouso (equivalente ao antigo `nazox`), `elevated` para elementos que precisam se destacar mais (modais, dropdowns, equivalente ao antigo `nazox-lg` — hoje sem uso real, mas mantido disponível).

- [ ] **Step 3: Atualizar os 2 usos**

`src/components/ui/card.tsx:6`: trocar `shadow-nazox` por `shadow-subtle` na string de classes.
`src/pages/EstudioColaborador.tsx:293`: trocar `shadow-nazox` por `shadow-subtle` na string de classes.

- [ ] **Step 4: Verificar**

Rodar: `npx tsc --noEmit` e `npm run build`. Rodar `grep -rn "shadow-nazox" src/` e confirmar que não retorna nada (nenhum uso órfão do nome antigo).

- [ ] **Step 5: Reportar ao orquestrador**

Arquivos tocados: `src/index.css`, `tailwind.config.ts`, `src/components/ui/card.tsx`, `src/pages/EstudioColaborador.tsx`. Não comitar.

---

### Task 4: `--info` distinto + tokens de categoria (indigo, laranja)

**Files:**
- Modify: `src/index.css` (`:root`, bloco de cores)
- Modify: `tailwind.config.ts:37-56` (bloco `colors`)

**Interfaces:**
- Produces: token `--info` recalibrado (deixa de ser idêntico a `--primary`); novos tokens `--category-indigo`, `--category-orange` e as classes Tailwind correspondentes `bg-category-indigo`/`text-category-indigo`/`bg-category-orange`/`text-category-orange`. Consumido pela Task 6 (`KpiCard`).

**Especialista responsável:** `frontend-specialist`.

- [ ] **Step 1: Recalibrar `--info` em `src/index.css`, dentro de `:root`**

Trocar:
```css
    --info: 217 91% 60%;
```
Por:
```css
    --info: 199 89% 48%;
```
(ciano/azul-claro, distinto do azul de marca — hoje os dois são idênticos, badge "informativo" e botão primário ficam visualmente indistinguíveis, achado #12 do diagnóstico)

**Não mexer no bloco `.dark`** (linha ~112, `--info: 217 80% 55%`) — fora do escopo desta fase (só modo claro tem referência).

- [ ] **Step 2: Adicionar os 2 tokens de categoria novos, no mesmo bloco `:root`** (sugestão: logo após `--chart-5`)

```css
    --category-indigo: 243 75% 59%;
    --category-orange: 20 90% 56%;
```

Só 2 tokens novos, não 6: a leitura do painel de Design System da referência (`docs/design/referencia-visual-marketing-os.md`) mostra 6 swatches, mas 4 deles já têm equivalente semântico no projeto — verde (`--success`), amarelo/âmbar (`--warning`), azul (`--primary`), cinza (`--muted-foreground`) — reaproveitar em vez de duplicar hue já coberto (regra do projeto). Só o índigo escuro (tom do logo/marca) e o laranja-avermelhado (mais quente que o `--destructive` vermelho puro) não têm token existente.

- [ ] **Step 3: Expor os 2 tokens novos no Tailwind — adicionar em `tailwind.config.ts`, dentro de `colors` (após o bloco `chart`)**

```typescript
        category: {
          indigo: "hsl(var(--category-indigo))",
          orange: "hsl(var(--category-orange))",
        },
```

- [ ] **Step 4: Verificar**

Rodar: `npx tsc --noEmit` e `npm run build`.

- [ ] **Step 5: Reportar ao orquestrador**

Arquivos tocados: `src/index.css`, `tailwind.config.ts`. Não comitar.

---

### Task 5: Badge — forma de pílula

**Files:**
- Modify: `src/components/ui/badge.tsx:7`

**Interfaces:** Nenhuma mudança de props/API — só a classe base muda, todos os usos existentes de `<Badge variant="...">` continuam funcionando idênticos, só a forma visual muda.

**Especialista responsável:** `frontend-specialist`.

- [ ] **Step 1: Trocar `rounded` por `rounded-full` na string de classes base de `badgeVariants`**

Trocar:
```typescript
  "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
```
Por:
```typescript
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
```

(`px-2` vira `px-2.5` — pílula precisa de um pouco mais de respiro horizontal que um retângulo de canto reto para não parecer apertada; ajuste mínimo, não redesenho do componente.)

Nenhum outro trecho do arquivo muda — os 12 `variant`s existentes (`default`, `secondary`, `destructive`, `success`, `warning`, `info`, `outline`, `soft-*`) continuam exatamente como estão, só herdam a forma nova.

- [ ] **Step 2: Verificar**

Rodar: `npx tsc --noEmit` e `npm run build`.

- [ ] **Step 3: Reportar ao orquestrador**

Arquivo tocado: `src/components/ui/badge.tsx`. Não comitar.

---

### Task 6: `KpiCard` reutilizável

**Files:**
- Create: `src/components/ui/kpi-card.tsx`
- Modify: `src/pages/AnaliseEstrategicaDashboard.tsx` (remove a definição local de `KpiCard`, linhas ~225-236, e importa a nova)

**Interfaces:**
- Consumes: tokens `--category-indigo`/`--category-orange` (Task 4, já deve estar completa e revisada antes desta task começar).
- Produces: `export function KpiCard({ titulo, valor, detalhe, icon, accent }: KpiCardProps)`, onde `icon` e `accent` são **opcionais** (mantém compatibilidade com os 6 usos existentes em `AnaliseEstrategicaDashboard.tsx`, que não passam nenhum dos dois hoje). Consumido pela Fase 4 (Dashboard real), fora do escopo desta task.

**Especialista responsável:** `frontend-specialist`.

- [ ] **Step 1: Criar `src/components/ui/kpi-card.tsx`**

```typescript
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  titulo: string;
  valor: string;
  detalhe?: string;
  icon?: LucideIcon;
  accent?: "primary" | "success" | "warning" | "destructive" | "info" | "indigo" | "orange" | "gray";
}

const ACCENT_CLASSES: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  indigo: "bg-category-indigo/10 text-category-indigo",
  orange: "bg-category-orange/10 text-category-orange",
  gray: "bg-muted text-muted-foreground",
};

export function KpiCard({ titulo, valor, detalhe, icon: Icon, accent = "primary" }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        {Icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", ACCENT_CLASSES[accent])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{valor}</p>
        {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
      </CardContent>
    </Card>
  );
}
```

`icon`/`accent` opcionais de propósito: os 6 usos de hoje em `AnaliseEstrategicaDashboard.tsx` não passam nenhum dos dois — o card continua idêntico visualmente a como é hoje para eles (sem o círculo de ícone). Só quem passar `icon` ganha o círculo colorido da referência (ex.: o Dashboard novo da Fase 4).

- [ ] **Step 2: Editar `src/pages/AnaliseEstrategicaDashboard.tsx`**

Adicionar import: `import { KpiCard } from "@/components/ui/kpi-card";`

Remover a função local `KpiCard` (linhas ~225-236, o bloco `function KpiCard({ titulo, valor, detalhe }: ...) { ... }` no final do arquivo).

Os 6 usos de `<KpiCard .../>` dentro do componente (linhas ~175-184) não precisam mudar nenhuma prop — só passam a resolver para o import em vez da função local.

- [ ] **Step 3: Verificar**

Rodar: `npx tsc --noEmit` (confirma que os 6 usos existentes continuam type-checking contra a nova interface) e `npm run build`.

- [ ] **Step 4: Reportar ao orquestrador**

Arquivos tocados: `src/components/ui/kpi-card.tsx` (novo), `src/pages/AnaliseEstrategicaDashboard.tsx`. Não comitar.

---

## Self-Review

**Cobertura da seção F do diagnóstico:** sidebar clara → Task 1. `--info` recalibrado → Task 4. Cores de categoria → Task 4 (reduzido de "5 novas" para "2 novas + 4 reaproveitadas", justificado). Sombra recalibrada → Task 3. Tipografia ativada → Task 2 (Plus Jakarta Sans, atualizado da recomendação original DM Sans da Fase 1 por causa da referência mais completa de 2026-09-17). Badge pílula → Task 5. `KpiCard` reutilizável → Task 6. `--primary`/`--radius` mantidos sem mudança, conforme a auditoria da Fase 1 já ter confirmado que estão na direção certa — nenhuma task necessária para eles.

**Fora de escopo desta fase, de propósito:** dark mode (sem referência visual para recalibrar); Dashboard real usando o `KpiCard` com ícone/accent (Fase 4); qualquer mudança de rota, texto ou comportamento.

**Consistência:** `KpiCardProps` (Task 6) usa exatamente os nomes de token `category-indigo`/`category-orange` definidos na Task 4 — sem redefinição divergente. `shadow-subtle` (Task 3) é o único nome novo de sombra usado nos 2 arquivos que a Task 3 também edita — sem sobra do nome antigo `shadow-nazox` em nenhum lugar do diff combinado das 6 tasks.
