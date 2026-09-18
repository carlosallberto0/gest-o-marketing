# Polish — Craft Floor (Impeccable) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar os achados da auditoria "craft-floor" (skill `impeccable`, comando `polish`) sobre o Marketing OS v2 já construído (Fases 1-4): superfícies do navegador não tematizadas, números instáveis no `KpiCard`, e diálogos nativos (`window.confirm`/`window.alert`) quebrando a experiência em 12 pontos de ação.

**Architecture:** Duas mudanças independentes, sem sobreposição de arquivo. Nenhum componente novo — `alert-dialog.tsx` já existe em `src/components/ui/` (shadcn), zero dependência nova.

**Tech Stack:** CSS puro (pseudo-elementos/pseudo-classes nativos) + `AlertDialog` do shadcn (Radix), já instalado.

**Spec:** `.claude/skills/impeccable/reference/craft-floor.md` (comando `polish`), achados da auditoria de 2026-09-18.

## Global Constraints

- Zero cor nova — toda mudança de superfície do navegador usa `hsl(var(--x))` de tokens já existentes (`--primary`, `--ring`, `--border`, `--foreground`).
- Nenhum padrão de KPI card, paleta, radius, sombra ou tipografia é tocado — já decididos e aprovados nas Fases 1-2, fora de escopo desta rodada.
- Sem framework de teste — verificação por tarefa é `npx tsc --noEmit` + `npm run build`.
- Implementadores não comitam. O orquestrador comita depois que cada tarefa for revisada.
- As duas tarefas abaixo têm `Files:` totalmente disjuntos e nenhuma depende da outra — rodam em paralelo (regra de despacho paralelo do `CLAUDE.md`).

---

### Task 1: Superfícies do navegador + números estáveis

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/ui/kpi-card.tsx`

**Interfaces:** Nenhuma — só CSS global e uma classe a mais no `KpiCard`.

**Especialista responsável:** `frontend-specialist`.

- [ ] **Step 1: Adicionar as superfícies do navegador em `src/index.css`**, fora de qualquer `@layer` (regras globais, no fim do arquivo ou logo após os overrides do Mapbox já existentes no topo):

```css
::selection {
  background-color: hsl(var(--primary) / 0.25);
  color: hsl(var(--foreground));
}

:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

a {
  text-underline-offset: 3px;
}

* {
  scrollbar-color: hsl(var(--border)) transparent;
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: hsl(var(--border));
  border-radius: 9999px;
}
```

- [ ] **Step 2: `tabular-nums` no valor numérico do `KpiCard`**

Em `src/components/ui/kpi-card.tsx`, na linha do `<p>` que renderiza `{valor}` (classe atual `text-2xl font-semibold text-foreground`), acrescentar `tabular-nums` à string de classes — evita que o número "pule" de largura quando o dado chega (`8` → `12` → `34` têm larguras diferentes sem isso).

- [ ] **Step 3: Verificar**

Rodar `npx tsc --noEmit` e `npm run build`.

- [ ] **Step 4: Reportar ao orquestrador**

Arquivos tocados: `src/index.css`, `src/components/ui/kpi-card.tsx`. Não comitar.

---

### Task 2: Substituir `window.confirm`/`window.alert` por `AlertDialog`

**Files:**
- Modify: `src/pages/Pdvs.tsx`
- Modify: `src/pages/Materiais.tsx`
- Modify: `src/pages/ChecklistConfig.tsx`
- Modify: `src/pages/BibliotecaMarca.tsx`
- Modify: `src/pages/EstudioElementos.tsx`
- Modify: `src/pages/EstudioTemplates.tsx`
- Modify: `src/pages/AnaliseEstrategicaConfig.tsx`
- Modify: `src/pages/AvaliacoesPdv.tsx`

**Interfaces:** Nenhuma — troca de mecanismo de confirmação/erro dentro de cada página, sem mudar nenhuma mutação, hook ou rota.

**Especialista responsável:** `frontend-specialist`.

## Padrão a aplicar (11 sites em 7 arquivos, todos com a MESMA forma hoje)

Hoje, em 11 lugares, o padrão é:
```tsx
async function handleX(item: Tipo) {
  if (!window.confirm(`Mensagem com "${item.campo}"?`)) return;
  try {
    await mutation.mutateAsync(item.id);
  } catch (err) {
    window.alert(err instanceof Error ? err.message : "Mensagem de erro padrão.");
  }
}
```

Trocar por ESTE padrão em cada um dos 11 sites (adaptando nome de variável/mutação/mensagem conforme a tabela abaixo):

**1. Adicionar 2 `useState` no componente** (junto dos `useState` já existentes):
```tsx
const [confirmando, setConfirmando] = useState<Tipo | null>(null);
const [confirmError, setConfirmError] = useState<string | null>(null);
```
(Se o arquivo já tiver mais de 1 site nesta lista — caso de `ChecklistConfig.tsx` e `EstudioTemplates.tsx` — cada site precisa do SEU PRÓPRIO par de `useState`, com nomes distintos, ex. `confirmandoCategoria`/`confirmandoPergunta`, para não colidir.)

**2. Trocar a função `handleX` original por duas funções:**
```tsx
function handleX(item: Tipo) {
  setConfirmError(null);
  setConfirmando(item);
}

async function confirmX() {
  if (!confirmando) return;
  try {
    await mutation.mutateAsync(confirmando.id);
    setConfirmando(null);
  } catch (err) {
    setConfirmError(err instanceof Error ? err.message : "Mensagem de erro padrão.");
  }
}
```

**3. Importar `AlertDialog`/`AlertDialogContent`/`AlertDialogHeader`/`AlertDialogTitle`/`AlertDialogDescription`/`AlertDialogFooter`/`AlertDialogCancel`/`AlertDialogAction` de `@/components/ui/alert-dialog`** (componente já existe, não precisa criar).

**4. Renderizar o `AlertDialog` uma vez por site**, em qualquer lugar do JSX do componente (ex.: perto dos outros diálogos já existentes na página, se houver):
```tsx
<AlertDialog
  open={!!confirmando}
  onOpenChange={(open) => {
    if (!open) {
      setConfirmando(null);
      setConfirmError(null);
    }
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Título curto da ação</AlertDialogTitle>
      <AlertDialogDescription>
        Mensagem com "{confirmando?.campo}"?
      </AlertDialogDescription>
    </AlertDialogHeader>
    {confirmError && (
      <p role="alert" className="text-sm text-destructive">
        {confirmError}
      </p>
    )}
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        onClick={(event) => {
          event.preventDefault();
          confirmX();
        }}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? "Aguarde…" : "Confirmar"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

`event.preventDefault()` no `AlertDialogAction` é obrigatório — sem isso o Radix fecha o diálogo assim que o botão é clicado, mesmo se a mutação falhar, escondendo a mensagem de erro. O fechamento em caso de sucesso já acontece via `setConfirmando(null)` dentro de `confirmX`.

## Tabela dos 11 sites (arquivo, função original, tipo do item, mutação, título, mensagem)

| Arquivo:linha | Função original | Tipo | Mutação | Título | Mensagem |
|---|---|---|---|---|---|
| `Pdvs.tsx:189-196` | `handleDeactivate` | `Pdv` | `deactivatePdv` | "Desativar PDV" | `Desativar o PDV "${confirmando?.nome}"?` |
| `Materiais.tsx:305-312` | `handleDeactivate` | `Material` | `deactivateMaterial` | "Desativar material" | `Desativar o material "${confirmando?.nome}"?` |
| `ChecklistConfig.tsx:398-404` | `handleDeactivateCategoria` | `CategoriaChecklist` | `deactivateCategoria` | "Desativar categoria" | `Desativar a categoria "${confirmando?.nome}"?` |
| `ChecklistConfig.tsx:443-449` | `handleDeactivatePergunta` | `PerguntaChecklist` | `deactivatePergunta` | "Desativar pergunta" | `"Desativar esta pergunta?"` (sem campo variável) |
| `BibliotecaMarca.tsx:416-422` | `handleDesativar` | `BrandLibraryItem` | `desativarItem` | "Desativar item" | `Desativar o item "${confirmando?.nome}"?` |
| `EstudioElementos.tsx:397-403` | `handleDesativar` | `EstudioElemento` | `desativarElemento` | "Desativar elemento" | `Desativar o elemento "${confirmando?.nome}"?` |
| `EstudioTemplates.tsx:887-893` | `handleDesativarCategoria` | `EstudioCategoria` | `desativarCategoria` | "Desativar categoria" | `Desativar a categoria "${confirmando?.nome}"?` |
| `EstudioTemplates.tsx:978-984` | `handleDesativarTemplate` | `EstudioTemplateComCategoria` | `desativarTemplate` | "Desativar template" | `Desativar o template "${confirmando?.nome}"?` |
| `EstudioTemplates.tsx:987-997` | `handleExcluirTemplate` | `EstudioTemplateComCategoria` | `excluirTemplate` | "Excluir template" | Leia a mensagem original (é multilinha, `window.confirm(...)` com parênteses abrindo em outra linha) e preserve o texto exato, só trocando o mecanismo |
| `EstudioTemplates.tsx:1039-1045` | `handleExcluirArea` | `EstudioTemplateArea` | `excluirArea` (atenção: mutação espera `{ id, template_id }`, não só `id` — confira a assinatura antes de escrever `confirmX`) | "Excluir área" | `Excluir a área "${confirmando?.nome}"?` |
| `AnaliseEstrategicaConfig.tsx:429-435` | `handleDesativarCluster` | `AnaliseClusterConfig` | `desativarCluster` | "Desativar cluster" | `Desativar o cluster "${confirmando?.nome}"?` |

Para cada linha da tabela, leia o arquivo real antes de editar — os números de linha podem ter mudado ligeiramente desde que este plano foi escrito; use a função pelo NOME (ex. `handleDeactivate`) para localizar, não confie cegamente no número da linha.

## Caso à parte: `AvaliacoesPdv.tsx:566` (não é confirmação, é erro de criação)

Este site é diferente dos outros 11 — não tem `window.confirm` antes, só um `window.alert` de erro depois de tentar `createAvaliacao.mutateAsync(...)` falhar. NÃO envolva isso num `AlertDialog` (não é uma ação destrutiva pedindo confirmação, é feedback de erro de uma ação já disparada). Em vez disso:

1. Adicione `const [erroNovaAvaliacao, setErroNovaAvaliacao] = useState<string | null>(null);`.
2. Em `handleNovaAvaliacao`, troque `window.alert(...)` por `setErroNovaAvaliacao(error instanceof Error ? error.message : "Erro ao criar avaliação.");` (e `setErroNovaAvaliacao(null)` no início da função, antes do `try`, para limpar erro de tentativa anterior).
3. Renderize `{erroNovaAvaliacao && <p role="alert" className="text-sm text-destructive">{erroNovaAvaliacao}</p>}` perto do botão que dispara `handleNovaAvaliacao` (mesmo padrão de erro inline já usado em outras telas do projeto, ex. `Login.tsx`).

## Verificação final da task

- [ ] Rodar `grep -rn "window.confirm\|window.alert" src/pages/` a partir da raiz do projeto — deve voltar **vazio**. Se sobrar qualquer ocorrência, ou você perdeu um site da tabela, ou um site novo apareceu que não estava mapeado (neste caso, aplique o mesmo padrão e reporte a diferença).
- [ ] `npx tsc --noEmit` e `npm run build` passam.
- [ ] Reportar ao orquestrador: arquivos tocados (8 no total), confirmação do grep vazio. Não comitar.

---

## Self-Review

**Cobertura:** os 3 achados da auditoria (superfícies do navegador, `tabular-nums`, diálogos nativos) estão cobertos — Task 1 pelos 2 primeiros, Task 2 pelo terceiro (12 sites: 11 confirm+alert + 1 alert-only).

**Fora de escopo desta rodada, de propósito:** padrão de KPI card, paleta, radius, sombra, tipografia (Fases 1-2, já aprovados); cards "ícone+título+texto" fora do Dashboard (achado não verificável só por grep, precisaria de inspeção visual que não foi feita); toast/sonner como mecanismo de feedback (existe instalado mas nunca usado no projeto — introduzir agora seria escopo novo, não corrigir o que já existe).

**Consistência:** o padrão de 4 passos (state, funções, import, JSX) é o mesmo nos 11 sites da Task 2 — nenhuma variação de mecanismo entre eles, só o texto/tipo/mutação mudam conforme a tabela.
