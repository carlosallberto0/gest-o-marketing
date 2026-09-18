# Fase 3 — App Shell + Limpeza Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar a Fase 3 do redesenho de front-end: code-splitting por rota (hoje 1 chunk único de 1.18MB, achado #16 do diagnóstico) e remover o código morto do `framer-motion` (5 componentes shadcn órfãos, decisão D.4 já aprovada em 2026-09-15).

**Architecture:** Duas mudanças independentes, sem sobreposição de arquivo — rodam em paralelo. Nenhuma rota muda de path, nenhum componente de página muda de conteúdo — só a forma como são carregados (`React.lazy` em vez de import estático) e a remoção de arquivos comprovadamente sem uso.

**Tech Stack:** `React.lazy`/`Suspense` (nativo do React, já uma dependência — zero pacote novo). Remove `framer-motion` do `package.json` (única motivação da dependência no projeto inteiro).

**Spec:** `docs/design/DIAGNOSTICO-REDESIGN-FRONTEND.md` (achados #16, #17; Fase 3 na seção H).

## Global Constraints

- Nenhuma rota muda de path ou comportamento — só o mecanismo de carregamento.
- Sem framework de teste — verificação por tarefa é `npx tsc --noEmit` + `npm run build` (confirmar que o bundle principal encolheu e que aparecem chunks separados por rota).
- Implementadores não comitam. O orquestrador comita depois que cada tarefa for revisada.
- As duas tarefas abaixo têm `Files:` totalmente disjuntos e nenhuma depende da outra — regra de despacho paralelo do `CLAUDE.md` permite rodar as duas na mesma onda.

---

### Task 1: Code-splitting por rota em `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:** Nenhuma — só muda a forma de import dos componentes de página já existentes (`React.lazy(() => import("@/pages/X"))` em vez de `import X from "@/pages/X"`). Nenhum componente de página é alterado.

**Especialista responsável:** `frontend-specialist`.

- [ ] **Step 1: Trocar os 27 imports estáticos de página por `React.lazy`**

Confirmado antes de escrever este plano: são exatamente 27 imports de `@/pages/*` em `src/App.tsx` (`Login`, `Dashboard`, `Pdvs`, `Outdoors`, `Materiais`, `SolicitacoesMaterial`, `ChecklistConfig`, `Manutencoes`, `AvaliacoesPdv`, `PlanosAcao`, `Campanhas`, `Aprovacoes`, `AprovacaoPublica`, `DemandasCriativas`, `BibliotecaMarca`, `EstudioElementos`, `EstudioTemplates`, `EstudioColaborador`, `EstudioHistorico`, `AnaliseEstrategicaDashboard`, `AnaliseEstrategicaClustersConveniencia`, `AnaliseEstrategicaClustersOutdoors`, `AnaliseEstrategicaClustersComparativo`, `AnaliseEstrategicaInsights`, `AnaliseEstrategicaConfig`, `AnaliseEstrategicaRelatorios`). Troque TODOS os 27, sem exceção (inclusive `Login`/`AprovacaoPublica`, mesmo sendo telas públicas — reduzem o bundle inicial igual às outras):

```typescript
import { lazy, Suspense, type ReactNode } from "react";
// ... (demais imports que não são página continuam import estático: QueryClient, BrowserRouter, AuthProvider, AppSidebar, MobileNav, etc.)

const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Pdvs = lazy(() => import("@/pages/Pdvs"));
const Outdoors = lazy(() => import("@/pages/Outdoors"));
const Materiais = lazy(() => import("@/pages/Materiais"));
const SolicitacoesMaterial = lazy(() => import("@/pages/SolicitacoesMaterial"));
const ChecklistConfig = lazy(() => import("@/pages/ChecklistConfig"));
const Manutencoes = lazy(() => import("@/pages/Manutencoes"));
const AvaliacoesPdv = lazy(() => import("@/pages/AvaliacoesPdv"));
const PlanosAcao = lazy(() => import("@/pages/PlanosAcao"));
const Campanhas = lazy(() => import("@/pages/Campanhas"));
const Aprovacoes = lazy(() => import("@/pages/Aprovacoes"));
const AprovacaoPublica = lazy(() => import("@/pages/AprovacaoPublica"));
const DemandasCriativas = lazy(() => import("@/pages/DemandasCriativas"));
const BibliotecaMarca = lazy(() => import("@/pages/BibliotecaMarca"));
const EstudioElementos = lazy(() => import("@/pages/EstudioElementos"));
const EstudioTemplates = lazy(() => import("@/pages/EstudioTemplates"));
const EstudioColaborador = lazy(() => import("@/pages/EstudioColaborador"));
const EstudioHistorico = lazy(() => import("@/pages/EstudioHistorico"));
const AnaliseEstrategicaDashboard = lazy(() => import("@/pages/AnaliseEstrategicaDashboard"));
const AnaliseEstrategicaClustersConveniencia = lazy(() => import("@/pages/AnaliseEstrategicaClustersConveniencia"));
const AnaliseEstrategicaClustersOutdoors = lazy(() => import("@/pages/AnaliseEstrategicaClustersOutdoors"));
const AnaliseEstrategicaClustersComparativo = lazy(() => import("@/pages/AnaliseEstrategicaClustersComparativo"));
const AnaliseEstrategicaInsights = lazy(() => import("@/pages/AnaliseEstrategicaInsights"));
const AnaliseEstrategicaConfig = lazy(() => import("@/pages/AnaliseEstrategicaConfig"));
const AnaliseEstrategicaRelatorios = lazy(() => import("@/pages/AnaliseEstrategicaRelatorios"));
```

Cada página tem `export default function X() {...}` (confirme lendo 2-3 arquivos de página antes de começar, se tiver dúvida) — `React.lazy` exige exatamente esse formato (`export default`), que já é o padrão de todo `src/pages/*.tsx` neste projeto.

- [ ] **Step 2: Envolver o `<Routes>` inteiro em um único `<Suspense>`**

Trocar:
```tsx
        <BrowserRouter>
          <Routes>
            ...
          </Routes>
        </BrowserRouter>
```
Por:
```tsx
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center text-muted-foreground">
                Carregando…
              </div>
            }
          >
            <Routes>
              ...
            </Routes>
          </Suspense>
        </BrowserRouter>
```

Mesmo texto/classe já usado no fallback de `ProtectedRoute` (linhas ~41-47 do arquivo atual) — consistência, não invente um novo padrão visual de loading.

Um `<Suspense>` envolvendo todas as rotas é suficiente (mais simples que um por rota) — qualquer chunk de página ainda carregando mostra o mesmo fallback, nunca uma tela em branco.

- [ ] **Step 3: Nenhuma outra mudança**

`ProtectedRoute`, `AppShell`, `QueryClient`, todos os `<Route path=... element=...>` continuam exatamente iguais — só o que está DENTRO de `element={<Página />}` resolve agora via chunk separado.

- [ ] **Step 4: Verificar**

Rodar `npx tsc --noEmit` e `npm run build`. Confirmar no output do build que:
1. Não há mais o aviso de chunk único >500kB (ou o chunk principal ficou visivelmente menor que os ~1.18MB atuais).
2. Aparecem múltiplos arquivos `.js` em `dist/assets/` (um por página ou grupo de páginas), não só 1 arquivo grande.

- [ ] **Step 5: Reportar ao orquestrador**

Arquivo tocado: `src/App.tsx`. Cole no relatório o tamanho do chunk principal antes/depois (do output do `npm run build`) para o orquestrador confirmar o ganho real, não só que compilou. Não comitar.

---

### Task 2: Remover código morto do `framer-motion`

**Files:**
- Delete: `src/components/ui/alert-toast.tsx`
- Delete: `src/components/ui/alert-toast-container.tsx`
- Delete: `src/components/ui/image-slider.tsx`
- Delete: `src/components/ui/link-card.tsx`
- Delete: `src/components/ui/module-card.tsx`
- Modify: `package.json` (remover dependência `framer-motion`)

**Interfaces:** Nenhuma — os 5 arquivos não são importados por nenhum outro lugar do projeto (confirmado por grep antes de escrever este plano: `grep -rn "components/ui/<nome>\"" src/` não retorna nada fora do próprio arquivo, para os 5).

**Especialista responsável:** `frontend-specialist`.

- [ ] **Step 1: Confirmar de novo, você mesmo, que os 5 arquivos não têm import de fora**

Antes de apagar, rode:
```bash
grep -rn "alert-toast\|image-slider\|link-card\|module-card" src/ --include="*.tsx" --include="*.ts" | grep -v "src/components/ui/alert-toast.tsx\|src/components/ui/alert-toast-container.tsx\|src/components/ui/image-slider.tsx\|src/components/ui/link-card.tsx\|src/components/ui/module-card.tsx"
```
Se esse comando retornar QUALQUER linha, PARE e reporte BLOCKED — não apague nada, o pressuposto do plano (código órfão) estaria errado.

- [ ] **Step 2: Apagar os 5 arquivos**

```bash
rm src/components/ui/alert-toast.tsx src/components/ui/alert-toast-container.tsx src/components/ui/image-slider.tsx src/components/ui/link-card.tsx src/components/ui/module-card.tsx
```

- [ ] **Step 3: Remover `framer-motion` do `package.json` e reinstalar**

```bash
npm uninstall framer-motion
```

- [ ] **Step 4: Confirmar que nada mais usa `framer-motion`**

```bash
grep -rn "framer-motion" src/
```
Deve retornar vazio (já que os únicos 5 consumidores foram apagados no Step 2).

- [ ] **Step 5: Verificar**

Rodar `npx tsc --noEmit` e `npm run build`.

- [ ] **Step 6: Reportar ao orquestrador**

Arquivos tocados: os 5 deletados + `package.json` + `package-lock.json` (gerado pelo `npm uninstall`). Não comitar. Se o `npm uninstall` mudar alguma versão de pacote não relacionado no lockfile (já aconteceu numa fase anterior deste projeto), rode `git diff --stat package-lock.json` e cole no relatório — não é bloqueante por si só, mas o orquestrador precisa saber.

---

## Self-Review

**Cobertura:** achado #16 (bundle sem code-splitting) → Task 1. Achado #17 (código morto do `framer-motion`) → Task 2, mesma decisão D.4 já aprovada em 2026-09-15 (Fase 1), só nunca executada. Ambos os achados do diagnóstico atribuídos à Fase 3 estão cobertos — nenhum item da Fase 3 ficou de fora.

**Fora de escopo desta fase, de propósito:** qualquer redesenho de layout do `AppShell` em si (já foi feito na Fase 1) ou dos tokens visuais (já feito na Fase 2) — esta fase é só performance/limpeza, não repete trabalho já concluído.

**Consistência:** as duas tarefas não compartilham nenhum arquivo — Task 1 só toca `App.tsx`, Task 2 só toca os 5 arquivos de componente + `package.json`/`package-lock.json`. Rodam em paralelo sem risco de conflito de edição.
