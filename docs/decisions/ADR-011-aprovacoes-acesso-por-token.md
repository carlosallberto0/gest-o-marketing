# ADR-011 — Aprovações Executivas: acesso do revisor externo por token, não por sessão Supabase

> Registro de decisões arquiteturais e de produto — 2026-09-10.

**Status:** aceito

**Contexto.** A Fase 4 (Aprovações Executivas) precisa que presidência/diretoria aprove ou rejeite uma peça de marketing via link com token, **sem login completo no sistema**. O revisor pode ser um usuário interno já cadastrado (`usuario_id` preenchido) ou uma pessoa externa identificada só por nome/e-mail (`usuario_id` nulo) — nos dois casos, o acesso ao item e a gravação da decisão acontecem a partir de um link, não de uma sessão autenticada normal. Isso quebra a premissa de toda RLS do projeto até aqui: `has_permission()`/`usuario_pdv_id()` e toda policy dependem de `auth.uid()`, que só existe para quem passou pelo login do Supabase Auth. Um revisor via token não tem `auth.uid()` — ele é, do ponto de vista do Postgres, **anônimo** (`anon`) ou, na melhor das hipóses, um `authenticated` genérico sem relação com o `usuario_id` do convite.

**Decisão — três tabelas (`aprovacao_itens`, `aprovacao_revisores`, `aprovacao_decisoes`) continuam com RLS habilitada e fail-closed para todo acesso via PostgREST (`authenticated` e `anon`). O caminho do revisor por token é uma Edge Function separada, com service role key, que nunca é implementada nesta migration.**

Consequências concretas do desenho:

1. **Nenhuma policy de SELECT/INSERT/UPDATE libera acesso para `anon`** nas três tabelas. Se abríssemos, por exemplo, `aprovacao_revisores_select for anon using (true)` para permitir que a tela pública do link consulte o convite pelo token, qualquer pessoa não autenticada poderia enumerar/adivinhar `token` (mesmo sendo um `uuid` — segurança por obscuridade de um valor exposto via RLS pública não é segurança) ou, pior, fazer `select * from aprovacao_revisores` sem filtro nenhum se a policy fosse mal escrita, vazando e-mail/nome de todos os revisores de todos os itens da rede. RLS pública para `anon` nunca é o mecanismo certo para "acesso por segredo compartilhado" (token) — é o mecanismo certo para "acesso público mesmo", que não é o caso aqui.

2. **`aprovacao_decisoes` não tem NENHUMA policy de INSERT/UPDATE/DELETE, para nenhum papel, e nenhum GRANT dessas operações para `authenticated`/`anon`.** Isso significa que, hoje, a única forma de gravar uma decisão é via `service_role` (que no Supabase tem `BYPASSRLS` e não depende de GRANT em `public`), que só existe dentro de uma Edge Function server-side. O schema/RLS desta migration deixa esse caminho **possível e correto**, mas não o implementa — a Edge Function (`respond-approval` ou nome equivalente) é tarefa separada do `edge-function-specialist`, listada como pendência abaixo.

3. **O token nunca é usado como credencial Postgres.** Ele é uma coluna comum (`uuid unique`) validada manualmente dentro da Edge Function (comparar `token` recebido no link contra `aprovacao_revisores.token`, checar `token_expira_em > now()` e `status = 'pending'`). A Edge Function, depois de validar, grava a decisão **usando a service role key**, que bypassa RLS e GRANT de propósito — o token nunca vira um `set_config`/claim JWT que uma policy RLS interpretaria como identidade. Isso evita a categoria inteira de bug "token virou segundo sistema de autenticação, com suas próprias falhas de RLS" — só existe UM sistema de autenticação no banco (Supabase Auth/`auth.uid()`), e o token é só um segredo de aplicação verificado fora do Postgres.

4. **A Edge Function é responsável por três checagens que a RLS não cobre nem pode cobrir:** (a) `token` existe e corresponde ao `revisor_id`/`item_id` do link; (b) `token_expira_em > now()` — token vencido é rejeitado antes de qualquer leitura/escrita; (c) `aprovacao_revisores.status = 'pending'` — um revisor que já decidiu não decide de novo (reforçado no banco por `unique(revisor_id)` em `aprovacao_decisoes`, que impede logicamente uma segunda linha mesmo se a Edge Function tivesse um bug). Nenhuma dessas checagens é decorativa: elas substituem, para o fluxo de token, o papel que `has_permission()`/RLS cumprem para o resto do sistema.

5. **A leitura do item pelo revisor (para renderizar a tela do link) também passa pela Edge Function**, não por uma policy de SELECT liberada por token. A Edge Function, depois de validar o token, faz a leitura com service role e devolve ao frontend só os campos necessários (título, descrição, arquivo, preview) — nunca um `select *` genérico que vazaria `submetido_por`, `notas` internas ou os `email`/`nome` de outros revisores do mesmo item.

**O que esta migration entrega, e o que fica pendente:**

- Entregue: as três tabelas, com RLS fail-closed e sem brecha para `anon`; os triggers de máquina de estado e agregação de decisão (que funcionam corretamente independente de quem grava — service role ou, no caso de `aprovacao_itens_update`, o próprio marketing autenticado editando um rascunho); os comentários de coluna/tabela deixando explícito onde cada peça do fluxo de token precisa encaixar.
- Pendente (fora de escopo desta migration, tarefa futura do `edge-function-specialist`): a Edge Function `send-approval-request` (cria `aprovacao_revisores`, gera notificação) e a Edge Function de resposta do revisor (valida token, lê o item, grava `aprovacao_decisoes`). Nenhuma das duas existe ainda — o schema só deixa o caminho pronto.
- Pendente (fora de escopo, sinalizado na migration): expiração automática de token vencido (`status = 'expired'`) não tem cron/trigger — hoje só uma escrita futura via service role marcaria isso.

**Alternativa descartada 1 — RLS pública para `anon` filtrada por token via `current_setting`/header customizado.**

Rejeitada porque exigiria a Edge Function (ou o próprio PostgREST) repassar o token como uma claim/`GUC` de sessão para a policy RLS conseguir comparar — na prática, reimplementar um sistema de autenticação paralelo ao Supabase Auth dentro de RLS, com uma superfície de bug muito maior (esquecer de resetar o GUC entre requisições, um `SELECT` sem o filtro de token aplicado, etc.) do que simplesmente fazer a leitura/escrita inteira dentro de uma função server-side que já conhece o token da requisição.

**Alternativa descartada 2 — dar ao revisor externo uma conta Supabase Auth "fantasma" (magic link) em vez de token próprio.**

Rejeitada porque o requisito funcional explícito é "sem precisar fazer login completo no sistema" — um magic link do Supabase Auth ainda cria uma sessão JWT completa, expõe o revisor externo ao restante da superfície autenticada do sistema (ainda que sem grants) e exige gestão de conta (redefinição de senha, convite, etc.) para alguém que só precisa decidir sim/não uma vez. O modelo de token de uso único com expiração de 48h é mais simples e mais alinhado ao caso de uso real (presidência decide, não administra o sistema).
