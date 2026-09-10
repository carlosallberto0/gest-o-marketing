-- =============================================================================
-- Marketing OS (novo) — Fase 4: Aprovações Executivas
-- aprovacao_itens, aprovacao_revisores, aprovacao_decisoes
-- =============================================================================
--
-- PRÉ-REQUISITO: Core (20260908103000) e Fase 3 (20260908180000) já aplicadas.
-- Esta migration só LÊ usuarios/has_permission/usuario_pdv_id/
-- update_updated_at_column/audit_logs do Core — nenhuma delas é alterada aqui.
--
-- DECISÃO DE ARQUITETURA CENTRAL — acesso do revisor externo é por TOKEN, não
--   por sessão Supabase (auth.uid()). Documentada em detalhe em
--   docs/decisions/ADR-011-aprovacoes-acesso-por-token.md — resumo: nenhuma
--   policy de SELECT/INSERT/UPDATE libera para `anon` nestas três tabelas.
--   A leitura do item pelo revisor (via link com token) e a gravação da
--   decisão acontecem só dentro de uma Edge Function futura (fora de escopo
--   desta migration — tarefa do edge-function-specialist) que usa a
--   service role key: ela bypassa RLS e GRANT de propósito, valida o token
--   manualmente (comparando contra aprovacao_revisores.token e checando
--   token_expira_em > now()) e nunca expõe o token como forma de autenticação
--   Postgres. O schema/RLS abaixo só garante que esse é o ÚNICO caminho de
--   escrita em aprovacao_decisoes e de escrita em aprovacao_revisores.
--
-- DECISÃO DE DESIGN — regra de agregação do status do item (pedida
--   explicitamente pela tarefa, "defina de forma explícita e documentada"):
--   qualquer decisão `rejected` de QUALQUER revisor já leva o item a
--   `rejected`, sem esperar os demais. Na ausência de `rejected`, qualquer
--   `revision_requested` leva o item a `revision_requested`, mesma lógica.
--   Só quando TODOS os revisores responderam `approved` o item vira
--   `approved`. Precedência entre os dois estados "ruins": `rejected` é pior
--   que `revision_requested` — se um revisor já rejeitou e outro pede revisão
--   depois, o item permanece `rejected` (mais grave já venceu). Implementada
--   em `aprovacao_decisoes_after_insert`.
--
-- DECISÃO DE DESIGN — `aprovacao_decisoes` é insert-only de verdade: sem
--   UPDATE/DELETE nem para super_admin (pedido explícito da tarefa — trilha
--   permanente). Por isso a função de agregação, ao detectar que
--   `aprovacao_itens.status` já não é `pending` no momento da decisão,
--   `RAISE EXCEPTION` — isso reverte a transação inteira (inclusive o INSERT
--   que disparou o trigger), então nunca existe uma linha de decisão gravada
--   contra um item fora do estado esperado. É a forma de "rejeitar" uma
--   decisão inválida sem nunca precisar de UPDATE/DELETE na tabela imutável.
--
-- DECISÃO DE DESIGN — validação de transição de `aprovacao_itens.status` e o
--   audit_logs da transição vivem em UM lugar só (`aprovacao_itens_before_update`,
--   mesmo padrão de `campanhas_before_update`/`planos_acao_before_update` da
--   Fase 3), não duplicado na função de agregação de `aprovacao_decisoes`. A
--   função de agregação só faz `UPDATE aprovacao_itens SET status = ...`
--   quando o resultado muda; esse UPDATE dispara `aprovacao_itens_before_update`
--   normalmente (trigger aninhado), que valida a transição e grava
--   audit_logs. Evita logar a mesma transição duas vezes.
--
-- DECISÃO DE DESIGN — `item_id` em `aprovacao_decisoes` é denormalizado de
--   `revisor_id` via trigger BEFORE INSERT (`aprovacao_decisoes_before_insert`),
--   nunca aceito de escrita direta do cliente — mesmo padrão de
--   `planos_acao.avaliacao_id`/`pdv_id` denormalizados de `resposta_id` na
--   Fase 3. Evita uma linha de decisão gravada com item_id inconsistente com
--   o revisor real.
--
-- ESCOPO desta rodada (decisões explicitamente FORA de escopo, não decididas
--   em silêncio):
--   1. `tipo` de `aprovacao_itens` fica livre, sem CHECK nem trigger de
--      validação contra `system_options` — decisão deliberada da tarefa,
--      pelo mesmo motivo já documentado na Fase 3 para materiais.tipo/
--      categoria/campanhas.tipo (bug real: campo ficou impossível de
--      preencher por falta de seed em system_options). Ver comentário da
--      coluna.
--   2. Fluxo sequencial de revisores (`ordem`) NÃO tem lógica de bloqueio
--      nesta rodada — o campo só é gravado. "Notificar o próximo somente
--      depois do anterior responder" é responsabilidade de uma Edge Function
--      futura, não implementada aqui.
--   3. Sem cron/trigger de expiração automática: um `aprovacao_revisores`
--      cujo `token_expira_em` passou continua com `status = 'pending'` até
--      alguém (Edge Function futura) gravar `status = 'expired'` — não há
--      hoje nenhum caminho de escrita liberado para isso além de service
--      role. Consequência aceita: um revisor "esquecido" sem decisão nunca
--      expira sozinho no banco, e por isso o item nunca fecha como
--      `approved` sozinho (a regra "só approved quando TODOS responderam
--      approved" trata um revisor pendente/expirado do mesmo jeito: bloqueia
--      unanimidade). Resolução manual (reatribuir revisor, ou uma ação
--      administrativa futura) fica para outra rodada.
--   4. Sem fluxo de "reabrir"/resubmeter depois de `rejected`/
--      `revision_requested`/`approved` — os três são terminais em
--      `aprovacao_itens_before_update` (mesma decisão de imutabilidade
--      pós-conclusão já usada em avaliacoes_pdv na Fase 3, adaptada aqui:
--      uma nova rodada de aprovação exigiria um novo `aprovacao_itens`,
--      não reabrir o existente — não implementado, é decisão de produto para
--      outra rodada).
--   5. Sem cancelamento de item (`status = 'cancelada'` ou soft delete
--      equivalente) — a tarefa listou o CHECK de status só com
--      ('draft','pending','approved','rejected','revision_requested');
--      adicionar um estado a mais seria decisão de escopo não pedida.
--      Sinalizado, não implementado.
--   6. `aprovacao_revisores` ganhou `updated_at` + trigger
--      `update_updated_at_column`, embora a lista de colunas da tarefa não
--      tenha mencionado essa coluna explicitamente (mencionou para
--      aprovacao_itens, e disse explicitamente "sem updated_at" só para
--      aprovacao_decisoes). Decisão: seguir a convenção padrão do projeto
--      (CLAUDE.md — "toda tabela nova nasce com... updated_at") já que a
--      linha é mutável (status/respondido_em/notificado_em mudam depois do
--      INSERT). Sinalizado para revisão, por via das dúvidas.
--   7. Ação `editar` do módulo `aprovacoes`/recurso `itens` NÃO é semeada em
--      permissoes_concedidas nesta rodada — nenhuma policy de UPDATE consome
--      esse grant (a única forma de editar um item é o próprio submitente
--      mexendo no próprio rascunho, via checagem de posse
--      `submetido_por = auth.uid() and status = 'draft'`, não via
--      has_permission). Evita seed de grant morto. Se uma tela administrativa
--      precisar editar rascunho de terceiro no futuro, é ajuste de policy +
--      seed nessa rodada, não agora.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. aprovacao_itens — peça/material submetido para aprovação executiva
-- -----------------------------------------------------------------------------
create table public.aprovacao_itens (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  tipo text,
  arquivo_url text,
  preview_url text,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected', 'revision_requested')),
  submetido_por uuid not null references public.usuarios(id),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.aprovacao_itens is 'Peça/material submetido para aprovação executiva (presidência/diretoria), via link com token — sem exigir login completo do revisor. draft é o único estado editável pelo próprio submetido_por; pending/approved/rejected/revision_requested só mudam via aprovacao_itens_before_update, disparado pela Edge Function de envio (service role, fora de escopo desta migration) ou pela agregação de aprovacao_decisoes. Sem cancelamento/soft delete nesta rodada — ver escopo no topo do arquivo.';
comment on column public.aprovacao_itens.tipo is 'Texto livre, deliberadamente SEM CHECK nem trigger de validação contra system_options nesta rodada (mesmo motivo documentado na Fase 3 para materiais.tipo/categoria: um bug real já deixou um campo assim impossível de preencher por falta de seed). Ver escopo no topo do arquivo.';
comment on column public.aprovacao_itens.arquivo_url is 'Path no bucket de Storage aprovacao-arquivos, formato {item_id}/{arquivo}.';
comment on column public.aprovacao_itens.preview_url is 'Path no mesmo bucket aprovacao-arquivos, nullable — nem toda submissão tem preview separado do arquivo original.';

create index aprovacao_itens_submetido_por_idx on public.aprovacao_itens (submetido_por);
create index aprovacao_itens_status_idx on public.aprovacao_itens (status);

create trigger set_updated_at
  before update on public.aprovacao_itens
  for each row execute function public.update_updated_at_column();

alter table public.aprovacao_itens enable row level security;


-- -----------------------------------------------------------------------------
-- 2. aprovacao_revisores — revisor de um item (interno com conta OU externo
--    só por nome/e-mail), com token próprio de acesso sem sessão Supabase
-- -----------------------------------------------------------------------------
create table public.aprovacao_revisores (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.aprovacao_itens(id) on delete cascade,
  usuario_id uuid references public.usuarios(id),
  email text not null,
  nome text not null,
  ordem integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'revision_requested', 'expired')),
  token uuid not null unique default gen_random_uuid(),
  token_expira_em timestamptz not null,
  notificado_em timestamptz,
  respondido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (token_expira_em <= created_at + interval '7 days')
);

comment on table public.aprovacao_revisores is 'Revisor convidado para decidir sobre um aprovacao_itens. usuario_id nullable: revisor pode ser um usuario já cadastrado OU uma pessoa externa (presidência/diretoria sem conta completa), identificada por email/nome sempre preenchidos. token é a credencial de acesso ao link — NUNCA usada como forma de autenticação Postgres (RLS não confia em token, ver ADR-011). ordem só é gravado nesta rodada, sem lógica de bloqueio sequencial (ver escopo no topo do arquivo). Criação/atualização de linha aqui só acontece via service role (Edge Function futura) — ver política de RLS abaixo, sem INSERT/UPDATE liberado para authenticated comum.';
comment on column public.aprovacao_revisores.token_expira_em is 'Forçado para now() + 48h no INSERT quando vem nulo, pelo trigger aprovacao_revisores_before_insert — não é a aplicação/Edge Function que calcula isso. CHECK na tabela (token_expira_em <= created_at + 7 dias) é o backstop contra um valor absurdo vindo de uma Edge Function futura com bug — service_role bypassa RLS mas não bypassa CHECK. Margem de 7 dias é deliberadamente maior que o padrão de 48h, para permitir reenvio manual futuro sem recriar o revisor.';
comment on column public.aprovacao_revisores.status is 'Gravado automaticamente por aprovacao_decisoes_after_insert quando o revisor registra uma decisão. expired não tem escrita automática nesta rodada (sem cron de expiração) — ver escopo no topo do arquivo.';

create index aprovacao_revisores_item_id_idx on public.aprovacao_revisores (item_id);
create unique index aprovacao_revisores_token_idx on public.aprovacao_revisores (token);

create trigger set_updated_at
  before update on public.aprovacao_revisores
  for each row execute function public.update_updated_at_column();

alter table public.aprovacao_revisores enable row level security;

create or replace function public.aprovacao_revisores_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.token_expira_em is null then
    new.token_expira_em := now() + interval '48 hours';
  end if;
  return new;
end;
$$;

comment on function public.aprovacao_revisores_before_insert is 'BEFORE INSERT: força token_expira_em = now() + 48h quando NEW vem nulo. O cliente/Edge Function não calcula esse prazo na aplicação. SECURITY DEFINER por consistência com o restante do arquivo, embora esta função não precise ler outra tabela.';

create trigger before_insert_expiracao
  before insert on public.aprovacao_revisores
  for each row execute function public.aprovacao_revisores_before_insert();


-- -----------------------------------------------------------------------------
-- 3. aprovacao_decisoes — decisão IMUTÁVEL de um revisor (insert-only)
-- -----------------------------------------------------------------------------
create table public.aprovacao_decisoes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.aprovacao_itens(id) on delete cascade,
  revisor_id uuid not null references public.aprovacao_revisores(id),
  decisao text not null check (decisao in ('approved', 'rejected', 'revision_requested')),
  comentario text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  check (decisao = 'approved' or (comentario is not null and btrim(comentario) <> '')),
  unique (revisor_id)
);

comment on table public.aprovacao_decisoes is 'Decisão de um revisor sobre um aprovacao_itens. Trilha IMUTÁVEL — sem UPDATE nem DELETE nunca, nem para super_admin (sem policy nem grant para nenhum dos dois, para nenhum papel; ver seção de RLS). Sem updated_at/trigger de update de propósito: é insert-only, nunca muda. comentario é obrigatório (CHECK de verdade) sempre que decisao != approved. item_id é denormalizado de revisor_id via aprovacao_decisoes_before_insert, nunca aceito de escrita direta do cliente. unique(revisor_id) impede mais de uma decisão do mesmo revisor sobre o mesmo item (o fluxo de "revisor decide de novo" não existe nesta rodada — se precisar, é um novo aprovacao_revisores, não uma segunda linha aqui).';
comment on column public.aprovacao_decisoes.ip_address is 'Capturado pela Edge Function no momento da decisão (fora de escopo desta migration) — a partir do request que carrega o token.';
comment on column public.aprovacao_decisoes.user_agent is 'Idem ip_address — capturado pela Edge Function, não pela aplicação cliente.';

create index aprovacao_decisoes_item_id_idx on public.aprovacao_decisoes (item_id);

alter table public.aprovacao_decisoes enable row level security;

create or replace function public.aprovacao_decisoes_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id uuid;
begin
  select item_id into v_item_id from public.aprovacao_revisores where id = new.revisor_id;

  if v_item_id is null then
    raise exception 'revisor_id % não existe', new.revisor_id;
  end if;

  new.item_id := v_item_id;

  return new;
end;
$$;

comment on function public.aprovacao_decisoes_before_insert is 'Deriva item_id a partir de revisor_id — nunca aceito de escrita direta do cliente. Mesmo padrão de planos_acao_before_insert (Fase 3). SECURITY DEFINER para ler aprovacao_revisores independente do grant do chamador (aqui, sempre service role).';

create trigger before_insert_derivar_item_id
  before insert on public.aprovacao_decisoes
  for each row execute function public.aprovacao_decisoes_before_insert();


create or replace function public.aprovacao_decisoes_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status_item text;
  v_total integer;
  v_aprovados integer;
  v_rejeitados integer;
  v_revisao integer;
  v_novo_status text;
begin
  -- Trava a linha do item: garante que duas decisões concorrentes sobre o
  -- mesmo item não computem a agregação em paralelo com dado desatualizado.
  select status into v_status_item from public.aprovacao_itens where id = new.item_id for update;

  if v_status_item is distinct from 'pending' then
    -- Reverte a transação inteira (inclusive o INSERT que disparou este
    -- trigger) — é assim que se "rejeita" uma decisão inválida sem nunca
    -- precisar de UPDATE/DELETE em aprovacao_decisoes (tabela imutável).
    raise exception 'decisão só pode ser registrada enquanto aprovacao_itens.status = pending (atual: %)', coalesce(v_status_item, '<item inexistente>');
  end if;

  update public.aprovacao_revisores
  set status = new.decisao, respondido_em = new.created_at
  where id = new.revisor_id;

  select
    count(*),
    count(*) filter (where status = 'approved'),
    count(*) filter (where status = 'rejected'),
    count(*) filter (where status = 'revision_requested')
  into v_total, v_aprovados, v_rejeitados, v_revisao
  from public.aprovacao_revisores
  where item_id = new.item_id;

  -- Regra de agregação (documentada no topo do arquivo): qualquer rejected
  -- vence; senão qualquer revision_requested vence; só approved quando TODOS
  -- responderam approved; senão o item continua pending (v_novo_status nulo
  -- = não mexe, ainda falta gente responder).
  if v_rejeitados > 0 then
    v_novo_status := 'rejected';
  elsif v_revisao > 0 then
    v_novo_status := 'revision_requested';
  elsif v_aprovados = v_total then
    v_novo_status := 'approved';
  else
    v_novo_status := null;
  end if;

  if v_novo_status is not null then
    -- Dispara aprovacao_itens_before_update (trigger aninhado), que valida a
    -- transição e grava audit_logs — não duplicado aqui.
    update public.aprovacao_itens set status = v_novo_status where id = new.item_id;
  end if;

  return new;
end;
$$;

comment on function public.aprovacao_decisoes_after_insert is 'Grava status/respondido_em no aprovacao_revisores correspondente e recalcula o status agregado de aprovacao_itens (regra documentada no topo do arquivo). Trava a linha do item com FOR UPDATE para serializar decisões concorrentes sobre o mesmo item. Rejeita (RAISE EXCEPTION, reverte a transação) qualquer decisão registrada quando o item não está pending — mantém a imutabilidade de aprovacao_decisoes sem nunca precisar de UPDATE/DELETE. SECURITY DEFINER para escrever em aprovacao_revisores/aprovacao_itens independente do grant do chamador (aqui, sempre service role).';

create trigger after_insert_agregar_status
  after insert on public.aprovacao_decisoes
  for each row execute function public.aprovacao_decisoes_after_insert();


-- -----------------------------------------------------------------------------
-- 4. aprovacao_itens_before_update — máquina de estado + audit_logs
-- -----------------------------------------------------------------------------
create or replace function public.aprovacao_itens_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed text[];
begin
  if new.status = old.status then
    return new;
  end if;

  v_allowed := case old.status
    when 'draft' then array['pending']
    when 'pending' then array['approved', 'rejected', 'revision_requested']
    else array[]::text[]
  end;

  if not (new.status = any (v_allowed)) then
    raise exception 'transição de % para % não é permitida', old.status, new.status;
  end if;

  insert into public.audit_logs (action, entity_type, entity_id, usuario_id, dados_antes, dados_depois)
  values (
    'aprovacao_item_transicao_status',
    'aprovacao_itens',
    new.id,
    auth.uid(), -- null quando a transição vem de service role (Edge Function ou trigger de agregação)
    jsonb_build_object('status', old.status),
    jsonb_build_object('status', new.status)
  );

  return new;
end;
$$;

comment on function public.aprovacao_itens_before_update is 'Máquina de estado: draft->pending (submissão, feita pela Edge Function futura via service role — RLS de aprovacao_itens_update não permite essa transição para authenticated comum), pending->approved|rejected|revision_requested (feita por aprovacao_decisoes_after_insert). Terminais: approved/rejected/revision_requested não transicionam mais nesta rodada (sem fluxo de reabertura/resubmissão — ver escopo no topo do arquivo). Registra a transição em audit_logs — ação crítica, CLAUDE.md. SECURITY DEFINER porque o INSERT em audit_logs exige core/audit_logs/criar/rede_toda, grant que nem todo papel com acesso a aprovacoes tem.';

create trigger before_update_validar_transicao
  before update on public.aprovacao_itens
  for each row execute function public.aprovacao_itens_before_update();


-- =============================================================================
-- 5. RLS — políticas por papel + GRANT explícito (obrigatório, CLAUDE.md)
-- Módulo: 'aprovacoes', recurso 'itens' (único recurso — as três tabelas
-- compartilham o mesmo grant de leitura, ver decisão da tarefa). Escopo
-- SEMPRE rede_toda: é fluxo de gestão executiva, sem isolamento por pdv_id.
--
-- Fail-closed (ADR-006), reforçado pelo ADR-011: NENHUMA policy libera SELECT/
-- INSERT/UPDATE para `anon` nestas três tabelas — o acesso do revisor externo
-- via token passa só pela Edge Function futura (service role, bypassa RLS e
-- GRANT por completo, não precisa de policy aqui).
-- =============================================================================

-- aprovacao_itens: SELECT/INSERT por grant; UPDATE só o próprio submetido_por
-- enquanto status = draft (transição de status não passa por aqui — ver
-- aprovacao_itens_before_update). Sem DELETE (nem soft delete — ver escopo).
grant select, insert, update on public.aprovacao_itens to authenticated;

create policy aprovacao_itens_select on public.aprovacao_itens
  for select to authenticated
  using (public.has_permission('aprovacoes', 'itens', 'ler', 'rede_toda'));

create policy aprovacao_itens_insert on public.aprovacao_itens
  for insert to authenticated
  with check (
    submetido_por = auth.uid()
    and status = 'draft'
    and public.has_permission('aprovacoes', 'itens', 'criar', 'rede_toda')
  );

create policy aprovacao_itens_update on public.aprovacao_itens
  for update to authenticated
  using (submetido_por = auth.uid() and status = 'draft')
  with check (submetido_por = auth.uid() and status = 'draft');


-- aprovacao_revisores: SELECT por grant (ver quem foi convidado e status).
-- Sem INSERT/UPDATE/DELETE liberado para authenticated de propósito — a
-- criação de revisor com token é tarefa da Edge Function send-approval-request
-- (fora de escopo desta migration), via service role. Tensão documentada na
-- tarefa: isso significa que hoje, sem a Edge Function construída, não existe
-- NENHUM caminho para popular esta tabela a partir do cliente — aceito, é o
-- comportamento pretendido (RLS não deve abrir brecha para o cliente inserir
-- revisor por conta própria, burlando o fluxo de geração de token/expiração).
grant select on public.aprovacao_revisores to authenticated;

create policy aprovacao_revisores_select on public.aprovacao_revisores
  for select to authenticated
  using (public.has_permission('aprovacoes', 'itens', 'ler', 'rede_toda'));


-- aprovacao_decisoes: SELECT por grant (auditoria/histórico). NENHUMA policy
-- nem GRANT de INSERT/UPDATE/DELETE para authenticated/anon — só a Edge
-- Function (service role) escreve aqui, exatamente como pedido pela tarefa.
grant select on public.aprovacao_decisoes to authenticated;

create policy aprovacao_decisoes_select on public.aprovacao_decisoes
  for select to authenticated
  using (public.has_permission('aprovacoes', 'itens', 'ler', 'rede_toda'));


-- =============================================================================
-- 6. Storage — bucket aprovacao-arquivos + RLS de storage.objects. Mesmo
-- padrão das fases anteriores: bucket privado, path {item_id}/{arquivo}.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('aprovacao-arquivos', 'aprovacao-arquivos', false)
on conflict (id) do nothing;

create policy aprovacao_arquivos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'aprovacao-arquivos'
    and exists (
      select 1 from public.aprovacao_itens i
      where i.id::text = (storage.foldername(name))[1]
        and public.has_permission('aprovacoes', 'itens', 'ler', 'rede_toda')
    )
  );

create policy aprovacao_arquivos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'aprovacao-arquivos'
    and exists (
      select 1 from public.aprovacao_itens i
      where i.id::text = (storage.foldername(name))[1]
        and i.submetido_por = auth.uid()
        and i.status = 'draft'
        and public.has_permission('aprovacoes', 'itens', 'criar', 'rede_toda')
    )
  );

create policy aprovacao_arquivos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'aprovacao-arquivos'
    and exists (
      select 1 from public.aprovacao_itens i
      where i.id::text = (storage.foldername(name))[1]
        and i.submetido_por = auth.uid()
        and i.status = 'draft'
    )
  )
  with check (
    bucket_id = 'aprovacao-arquivos'
    and exists (
      select 1 from public.aprovacao_itens i
      where i.id::text = (storage.foldername(name))[1]
        and i.submetido_por = auth.uid()
        and i.status = 'draft'
    )
  );

create policy aprovacao_arquivos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'aprovacao-arquivos'
    and exists (
      select 1 from public.aprovacao_itens i
      where i.id::text = (storage.foldername(name))[1]
        and i.submetido_por = auth.uid()
        and i.status = 'draft'
    )
  );


-- =============================================================================
-- 7. Seed de permissão — módulo 'aprovacoes' (fail-closed: sem isso, ninguém
-- opera este módulo). Só criar+ler são semeados nesta rodada (pedido literal
-- da tarefa) — editar não tem policy que o consuma, ver escopo no topo do
-- arquivo.
-- =============================================================================

-- super_admin/admin/director: perfil de gestão que já recebeu recursos
-- rede_toda-only em fases anteriores (mesmo critério de merchandising/
-- campanhas — só super_admin/admin/director, nunca manager/collaborator, que
-- são papéis territoriais sem lugar num fluxo de aprovação executiva).
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'aprovacoes', 'itens', acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('criar'), ('ler')) as acao(nome)
where p.nome in ('super_admin', 'admin', 'director')
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- manager/collaborator/coordenador_compras/convenience_coordinator/supplier/
-- approver_executive: nenhum grant por padrão (least privilege, mesmo
-- critério das fases anteriores). approver_executive em particular não
-- precisa de grant aqui — ele nunca acessa via sessão Supabase normal, só via
-- token/Edge Function (ver ADR-011), que bypassa RLS e GRANT por completo.
