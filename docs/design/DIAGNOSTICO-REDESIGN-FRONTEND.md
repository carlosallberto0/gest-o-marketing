# Diagnóstico — Redesenho do front-end do Marketing OS (v2)

> Registro de diagnóstico de Product Design + UX/UI + Front-end Architecture — 2026-09-15.
> Auditoria somente leitura, nenhum código alterado. Produzida por 5 agentes especializados em paralelo (IA/UX, Visual, Arquitetura Front-end, Acessibilidade/Responsivo, Design System) mais verificação direta do orquestrador.
> Escopo: `src/` (frontend v2 — confirmado 100% isolado do sistema antigo, que vive em `legacy/frontend-lovable/`). Referência visual definitiva: `docs/design/referencia-visual-marketing-os.png`/`.md`.

**Status:** proposto, aguardando aprovação. Nenhuma implementação começa antes desta aprovação (processo `superpowers:brainstorming`, caminho arquitetural).

---

## A. Problemas encontrados

**Navegação/IA**
1. Menu com 24 itens de primeiro nível, todos no mesmo nível visual — sem agrupamento, sem hierarquia.
2. Análise Estratégica ocupa **6 itens de menu** (Dashboard, Clusters-Conveniência, Clusters-Outdoor, Clusters-Comparativo, Insights, Relatórios, Config) para o que é 1 área com abas internas. As 3 telas de cluster são **o mesmo componente `ClustersPorTipo` com uma prop diferente** — não são 3 telas.
3. Aprovações e Demandas Criativas duplicam **9 hooks idênticos** (`useCreateAprovacaoItemDraft`, `useUpdateAprovacaoItemDraft`, `useEnviarParaAprovacao`, `useFoto*`, `useUsuarios`, `useAprovacoes`) — a funcionalidade "criar item para aprovação" foi construída duas vezes, em duas páginas de primeiro nível diferentes.
4. Fluxo Estúdio → Aprovação não tem conexão de código nenhuma hoje: o usuário exporta a peça no Estúdio, baixa o arquivo, vai para Demandas Criativas OU Aprovações (duas portas para a mesma coisa), e faz reupload manual do mesmo arquivo. 5 telas com um passo manual desnecessário.
5. Avaliação de PDV e Planos de Ação são uma tela e meia (a criação já acontece junto, só o acompanhamento é separado) tratadas como dois módulos de navegação distintos.
6. **Avaliação de outdoor não tem tela.** Existe o hook (`useAvaliacoesOutdoor.ts`) e a tabela (`avaliacoes_outdoor`, Fase 2), mas nenhuma página em `src/pages/` o consome — é gap real de construção, não só de organização de menu.
7. Não existe hoje tela de administração de `papeis`/`permissoes_concedidas`, apesar do schema existir desde o Core (Fase 1).
8. `AuthContext` não expõe papel/permissão do usuário — a única forma de saber o que ele pode fazer é `useHasPermission()` por item, um RPC por chamada. Filtrar a nav inteira por papel exige um hook agregado novo (não existe hoje).

**Visual**
9. Sidebar renderiza **escura** (`--sidebar-background: 240 6% 10%`); a referência definitiva pede sidebar **clara**, com item ativo em azul claro — é a regra oposta, herdada do sistema antigo.
10. `--primary` (`217 91% 60%`) e `shadow-nazox`/`shadow-nazox-lg` (`tailwind.config.ts`) nunca foram recalibrados da paleta "Nazox" do sistema antigo para a referência nova.
11. Fonte declarada no Tailwind é Poppins, mas **nunca carrega de fato** — não há `@import`/`<link>` real, só `preconnect` hints órfãos em `index.html`. O app renderiza em fallback `system-ui`. `@fontsource/dm-sans` está instalado e nunca usado.
12. `--info` é idêntico a `--primary` — badge informativo e botão primário ficam visualmente indistinguíveis.
13. Não existe token de cor "categoria/KPI" (laranja/roxo/rosa) que a referência usa nos círculos de ícone dos KPI cards.
14. `Dashboard.tsx` tem **12 linhas**: título + "Bem-vindo, {email}". Nenhum dado, pendência ou atalho.
15. `KpiCard` já foi inventado uma vez, só que local e não reutilizável (`AnaliseEstrategicaDashboard.tsx:225`) — o próximo dashboard provavelmente reinventa.

**Arquitetura front-end**
16. Zero code-splitting: as 26 páginas são importadas estaticamente em `App.tsx`, gerando 1 chunk de 1.15MB (306KB gzip) carregado inteiro em qualquer login, mesmo que o usuário use 1 módulo só.
17. 5 componentes shadcn de scaffold (`alert-toast(-container)`, `image-slider`, `link-card`, `module-card`) nunca são importados por nada — ~2.9MB de código morto, único consumidor real de `framer-motion` no projeto.
18. `QueryClient` sem `staleTime`/`gcTime` configurado — refetch a cada foco de janela/remount, notável em telas com múltiplos hooks simultâneos (ex. dashboard de Análise Estratégica).
19. `EstudioColaborador.tsx` (1193 linhas) e `EstudioTemplates.tsx` (1239 linhas) são grandes o bastante para acumular inconsistência de estilo sem pressão de revisão.

**Acessibilidade/Responsivo**
20. **P0 — nav mobile quebrada.** Abaixo do breakpoint `md`, a lista de 24 itens é `flex` horizontal sem `flex-wrap` nem `overflow-x-auto` — mais larga que qualquer viewport de celular. O botão "Sair" pode ficar empurrado para fora da tela: **logout pode ficar inalcançável no mobile hoje**.
21. Itens de nav com `h-9` (36px) abaixo do alvo de toque confortável (44px).
22. Ações destrutivas usam `window.confirm`/`window.alert` nativos em vez do `Dialog` do design system (funciona, mas quebra consistência visual).

**Pontos fortes confirmados (não mexer)** — vale registrar porque orienta o que preservar: badges de status sempre com texto + cor (nunca só cor); todo input com `<Label htmlFor>` associado; estado vazio sempre com mensagem + ação; skeleton (não spinner) em toda lista/dashboard; botão de ação crítica sempre com proteção contra clique duplo; `AprovacaoPublica.tsx` com `fieldset`/`legend`/`aria-required` corretos; nenhum gradiente decorativo em nenhuma página; nenhuma cor de estilo hardcoded (os 2 hex encontrados são dado de usuário/Canvas API, não estilo); tabelas 100% padronizadas em `components/ui/table`; nenhum resíduo do sistema antigo dentro de `src/`.

---

## B. Classificação por prioridade

| # | Problema | Prioridade |
|---|---|---|
| 20 | Nav mobile quebrada, logout pode ficar inalcançável | **P0** |
| 1, 2 | Menu flat de 24 itens, Análise Estratégica fragmentada em 6 | **P0** |
| 3, 4 | Duplicação Aprovações×Demandas + fluxo Estúdio→Aprovação manual | **P0** |
| 6 | Avaliação de outdoor sem tela | **P1** |
| 9, 10, 11 | Sidebar escura, cor/sombra não recalibradas, fonte não carrega | **P1** |
| 14, 15 | Dashboard vazio, KpiCard não reutilizável | **P1** |
| 16 | Bundle sem code-splitting | **P1** |
| 5, 7, 8 | Planos de Ação separado, sem tela de Usuários/Permissões, nav sem filtro por papel real | **P2** |
| 12, 13 | Token `--info` clonado, sem cor de categoria/KPI | **P2** |
| 17, 18 | Código morto do `framer-motion`, QueryClient sem `staleTime` | **P2** |
| 21, 22 | Touch target pequeno, confirm nativo | **P3** |
| 19 | Arquivos grandes demais (Estúdio) | **P3** |

---

## C. Nova Information Architecture

### C.1 — Menu atual (24 itens, flat) → classificação proposta

| Item atual | Vira |
|---|---|
| Dashboard | Visão Geral (mantém, mas com conteúdo real — ver seção E) |
| PDVs | Operação — cadastro raiz |
| Outdoors | Mídia Externa |
| Materiais | Merchandising, aba "Materiais" |
| Solicitações de Material | Merchandising, aba "Solicitações" (dentro de Materiais) |
| Config. Checklist | Administração |
| Avaliação de PDV | Merchandising, aba "Avaliações" |
| Planos de Ação | Merchandising, aba "Planos de Ação" (dentro de Avaliações) |
| Manutenções | Mídia Externa, aba "Manutenções" (junto de Outdoors) |
| *(sem tela hoje)* | Mídia Externa, aba "Avaliações" — **nova tela**, ver problema #6 |
| Campanhas | Marketing |
| Aprovações | Marketing — fundida com Demandas Criativas numa única tela com estados (D.1) |
| Demandas Criativas | Marketing — fundida com Aprovações numa única tela com estados (D.1) |
| Biblioteca de Marca | Marca (grupo próprio, sem massa para mais split) |
| Estúdio | Estúdio (tela do colaborador é a principal) |
| Elementos do Estúdio | Estúdio, aba "Elementos" (configuração) |
| Templates do Estúdio | Estúdio, aba "Templates" (configuração) |
| Histórico de Peças | Estúdio, aba "Histórico" |
| Análise Estratégica (dashboard) | Inteligência, aba "Dashboard" |
| Clusters — Conveniência/Outdoor/Comparativo | Inteligência, aba "Clusters" com seletor de tipo interno (1 tela, não 3) |
| Insights | Inteligência, aba "Insights" |
| Relatórios da Análise | Inteligência, aba "Relatórios" |
| Configuração da Análise | Administração |
| *(não existe)* | Administração — **nova tela** "Usuários e Permissões" |

### C.2 — Estrutura proposta (24 itens → 9 grupos)

```
VISÃO GERAL       Dashboard
OPERAÇÃO          PDVs
MÍDIA EXTERNA     Outdoors · Avaliações · Manutenções
MERCHANDISING     Materiais (+ Solicitações) · Avaliações (+ Planos de Ação)
MARKETING         Campanhas · Demanda/Aprovação (tela única com estados, D.1)
ESTÚDIO           Colaborador (principal) · Templates · Elementos · Histórico
MARCA             Biblioteca de Marca
INTELIGÊNCIA      Dashboard · Clusters · Insights · Relatórios
ADMINISTRAÇÃO     Config. Checklist · Config. Análise · Usuários e Permissões
```

Por que cada grupo existe:
- **Visão Geral** isolado porque é o único destino "não-modular" — ponto de entrada, não pertence a nenhum módulo de negócio.
- **Operação** e **Mídia Externa/Merchandising** separados porque PDV é cadastro raiz consumido pelos outros dois, não uma operação diária em si (decisão sinalizada como incerta — ver D.2).
- **Marketing**, **Estúdio** e **Marca** separados (não fundidos em um "Marketing" genérico) porque têm ciclos de trabalho diferentes: Marketing é aprovação/campanha (fluxo de decisão), Estúdio é produção (fluxo de criação), Marca é acervo (consulta).
- **Inteligência** isolada porque consome dado dos outros grupos, nunca gera dado — é sempre destino, nunca origem, de qualquer fluxo.
- **Administração** agrupa tudo que é configuração de baixa frequência e não deve competir visualmente com tarefa operacional (regra explícita do pedido original).

Isso bate com o padrão já confirmado na referência visual: o papel "Marketing" (usuária "Mariana Costa") vê só 9 itens — a nav real por papel já é mais curta do que a nav técnica completa.

---

## D. Decisões de produto

**D.1 — Aprovações × Demandas Criativas. DECIDIDO (2026-09-15): Demanda gera Aprovação.** Fluxo sequencial — demanda interna → produção → aprovação executiva. Vira **uma tela com estados diferentes**, não duas telas com navegação separada. Impacto: Fase 6 do plano de implementação (seção H) precisa desenhar a máquina de estado única antes de tocar nas duas páginas atuais; a duplicação dos 9 hooks (achado #3) se resolve por consequência, não como refactor isolado.

**D.2 — PDVs: Operação ou Administração? DECIDIDO: Operação.** Confirma o que já estava na estrutura proposta em C.2 — gerentes/colaboradores interagem com o próprio posto no dia a dia.

**D.3 — Fonte tipográfica. DECIDIDO: DM Sans.** `@fontsource/dm-sans`, já instalado, zero dependência nova.

**D.4 — Código morto do `framer-motion`. DECIDIDO: apagar agora.** Os 5 componentes shadcn órfãos (`alert-toast(-container)`, `image-slider`, `link-card`, `module-card`) e a dependência `framer-motion` do `package.json` saem na Fase 3 (App Shell + limpeza) — ou antes, como tarefa avulsa, já que é mudança isolada e de baixo risco. Recuperável via histórico do git se algum dia for necessário.

**D.5 — Dashboard: quais números são "os principais"? EM ABERTO.** Curadoria de KPI por papel é decisão de produto, não só de layout — fica para ser respondida quando a Fase 4 (Dashboard) começar, não bloqueia a aprovação deste diagnóstico nem o início da Fase 1.

---

## E. Fluxos principais mapeados

**1. Demanda Criativa → Aprovação → Peça no Estúdio (hoje: 5 telas, 1 passo manual desnecessário)**
Estúdio (criar+exportar) → download do arquivo exportado → Demandas Criativas OU Aprovações → reupload manual do mesmo arquivo → envio. A exportação do Estúdio já grava no Storage — a submissão para aprovação deveria referenciar esse arquivo direto, sem sair do fluxo do Estúdio nem exigir download+reupload.

**2. Avaliação de PDV → Plano de Ação → Acompanhamento (hoje: 2 telas para 1 fluxo conceitual)**
A criação já é 1 tela (`AvaliacoesPdv.tsx` cria o plano junto). Acompanhar depois exige sair para `PlanosAcao.tsx`. Vira aba de acompanhamento dentro do mesmo módulo, não elimina um passo mas remove a sensação de "outro módulo".

**3. Avaliação de Outdoor → Manutenção → Validação (hoje: quebrado — falta a primeira etapa)**
Schema e hook existem (`avaliacoes_outdoor`, `useAvaliacoesOutdoor.ts`), mas não há tela. O fluxo ponta-a-ponta da Fase 2 está incompleto na UI — isto é trabalho de construção, não de reorganização.

---

## F. Design System — fundação de tokens

| Token | Valor atual | Proposta | Já existe? |
|---|---|---|---|
| `--primary` | `217 91% 60%` | Manter (já é azul saturado, na direção da referência) | Existe, ok |
| `--radius` | `0.5rem` | Manter (já é "moderado", contraste correto com o antigo `0.25rem`) | Existe, ok |
| `--sidebar-background` | `240 6% 10%` (escura) | Clara (`~0 0% 100%`), item ativo com fundo azul claro + texto `--primary` | **Inverter — maior mudança estrutural** |
| `shadow-nazox`/`-lg` | `rgba()` literal, valores do sistema antigo | 2 níveis (`sutil`/`elevada`) amarrados a `--shadow-color` em HSL | Recalibrar |
| `--info` | Idêntico a `--primary` | Cor distinta (ex. ciano `199 89% 55%`) | Recalibrar |
| Cor de categoria/KPI | Não existe | Novos tokens (`--accent-orange/purple/pink` + azul existente) para os círculos de ícone dos KPI cards | Novo |
| Badge de status | Já correto por cor+texto | Ajustar variant para forma pílula (`rounded-full`) | Componente, não token |
| Tipografia | Poppins declarada, nunca carrega (fallback `system-ui`) | Ativar DM Sans (`@fontsource/dm-sans`, já instalado) — ver D.3 | Ativar o que já está instalado |
| Espaçamento | Escala padrão Tailwind | Manter | Existe, ok |

Veredito: isto não é "desfazer decisões visuais ruins" — é aplicar tokens que nunca foram recalibrados da paleta antiga e construir o que nunca existiu (KPI card reutilizável, dashboard real).

---

## G. Responsividade

- **P0 imediato:** nav mobile quebrada (achado #20) — precisa virar um padrão de navegação mobile de verdade (drawer/bottom-nav) antes de qualquer outra mudança visual, porque hoje pode estar bloqueando logout em tela pequena.
- Estratégia proposta por breakpoint:
  - **Mobile:** navegação por drawer (menu hambúrguer) ou bottom-nav com "Mais" para itens secundários — mesmo padrão já esboçado na referência visual ("Navegação mobile": Início/Estúdio/+/Aprovações/Mais).
  - **Tablet:** sidebar colapsável (ícone-only), expande sob demanda.
  - **Desktop:** sidebar fixa com grupos, como já é hoje estruturalmente — só precisa de agrupamento visual.
- Formulários, tabelas, estados vazios e skeletons **já estão em bom estado** (achados positivos da auditoria) — não precisam de retrabalho, só de aplicar os novos tokens visuais por cima.

---

## H. Plano de implementação (proposto, fases sequenciais, cada uma testada antes da próxima)

| Fase | Escopo | Depende de |
|---|---|---|
| **1 — IA + Navegação** | Novo `AppShell` com 9 grupos, abas internas, correção do P0 mobile, hook agregado de permissão para nav por papel | Decisões D.1, D.2 |
| **2 — Design System** | Tokens novos (sidebar clara, sombra, `--info`, cores de categoria), ativar DM Sans, `Badge` variant pílula, `KpiCard` reutilizável em `components/ui/` | Decisão D.3 |
| **3 — App Shell + limpeza** | Aplicar Fase 1+2 no shell real; code-splitting por rota (`React.lazy`); remover código morto do `framer-motion` | Decisão D.4 |
| **4 — Dashboard** | Dashboard real (KPIs, pendências, atividades, ações rápidas) por papel | Decisão D.5 |
| **5 — Operação/Mídia Externa/Merchandising** | Abas consolidadas; **nova tela de Avaliação de Outdoor** (gap #6) | Fase 1-4 |
| **6 — Marketing/Estúdio** | Fundir Demandas Criativas + Aprovações em uma tela com máquina de estado única (D.1); conectar exportação do Estúdio direto à submissão de aprovação, sem download+reupload (fluxo #1) | Decisão D.1 |
| **7 — Inteligência** | Consolidar 6 itens em 1 com abas | Fase 1-4 |
| **8 — Administração** | Config. Checklist, Config. Análise, nova tela de Usuários e Permissões (gap #7) | Fase 1-4 |
| **9 — Responsive/A11y/Polish** | Touch target, `Dialog` no lugar de `confirm()` nativo, `staleTime` no QueryClient | Todas anteriores |

Cada fase: implementar → rodar `npm run dev` e testar rotas → checar responsividade → checar regressão → só então avançar.
