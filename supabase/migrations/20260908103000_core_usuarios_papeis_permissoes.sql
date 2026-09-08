-- =============================================================================
-- Marketing OS (novo) — Fase 1: Core
-- usuarios, papeis, permissoes_concedidas, pdvs, audit_logs, notificacoes
-- =============================================================================
--
-- DECISÃO DE DESIGN — papéis: TABELA, não enum Postgres.
--   Motivo: (1) a especificação (seção G) declara relação N:N entre usuário e
--   papel — um enum não modela isso, precisaria de uma coluna array/tabela de
--   qualquer forma; (2) `permissoes_concedidas` referencia papel por chave
--   estável (papel_id uuid) para poder ser FK de verdade, com ON DELETE
--   controlado e soft delete — um enum não sustenta isso nem permite desativar
--   um papel sem migration; (3) novos papéis (ex.: approver_executive, já
--   sinalizado pelo Backlog v2) precisam poder ser cadastrados por dado, sem
--   ALTER TYPE. O custo de indireção (join extra) é aceitável porque
--   `has_permission` já é security definer e cacheável por STABLE.
--
-- DECISÃO DE DESIGN — has_permission evita recursão de RLS.
--   `permissoes_concedidas`, `usuario_papeis` e `usuarios` têm RLS habilitada.
--   Se a policy de uma tabela de negócio precisasse fazer SELECT direto nessas
--   tabelas dentro do próprio USING(), o Postgres reaplicaria RLS nessas
--   tabelas na subquery — mesmo problema que `has_app_role()` resolvia no
--   sistema antigo (técnica padrão de Postgres/Supabase, não é arquitetura
--   herdada). A saída é function SECURITY DEFINER: roda com o dono da função
--   (owner da migration, tipicamente bypassa RLS), então a checagem de
--   permissão nunca reentra na RLS da própria tabela de permissão. Duas
--   funções cobrem isso: `has_permission(...)` (existência de grant) e
--   `usuario_pdv_id(...)` (pdv do usuário chamador, para políticas de escopo
--   'proprio_pdv' em tabelas futuras).
--
-- CONVENÇÃO adotada nesta migration para soft delete:
--   entidades de identidade/ciclo de vida (usuarios, pdvs) usam `status text`
--   ('ativo'/'inativo') — deixa espaço para futuros estados sem quebrar o
--   modelo. Tabelas de vínculo/grant (papeis, usuario_papeis,
--   permissoes_concedidas, notificacoes) usam `is_active boolean` — é
--   estritamente ligado/desligado, não há estado intermediário.
--
-- FAIL-CLOSED (ADR-006): ausência de grant em `permissoes_concedidas` =
--   acesso NEGADO. Isto é o oposto do `role_permissions` do sistema antigo
--   (fail-open, decorativo). Aqui a policy de RLS consulta `has_permission`
--   de verdade — não é matriz de UI.
--
-- ESCOPO desta migration: só Core. `pdvs.tipo` fica como texto livre (NOT
-- NULL) nesta fase — a regra do projeto de que opção de campo vem de
-- `system_options` pressupõe essa tabela existir, e ela não faz parte do
-- escopo do Core (Fase 1). Criar `system_options` especulativamente aqui
-- seria antecipar uma tabela sem consumidor ainda. Sinalizado no relatório
-- final como pendência, não decidido em silêncio.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Função de trigger genérica para updated_at
-- -----------------------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 1. pdvs — unidade territorial (posto/PDV), estrutural nesta fase
-- -----------------------------------------------------------------------------
create table public.pdvs (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  tipo text not null,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pdvs is 'Unidade territorial (posto/loja de conveniência). Estrutural nesta fase, estendida por Mídia Externa/Merchandising.';
comment on column public.pdvs.tipo is 'Texto livre nesta fase (sem system_options ainda criado — fora do escopo do Core). Não é máquina de estado, por isso sem CHECK.';

create trigger set_updated_at
  before update on public.pdvs
  for each row execute function public.update_updated_at_column();

alter table public.pdvs enable row level security;


-- -----------------------------------------------------------------------------
-- 2. papeis — papel funcional (ver justificativa no topo do arquivo)
-- -----------------------------------------------------------------------------
create table public.papeis (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.papeis is 'Catálogo de papéis funcionais. Referenciado por permissoes_concedidas e usuario_papeis. Ver decisão tabela-vs-enum no topo do arquivo.';

create trigger set_updated_at
  before update on public.papeis
  for each row execute function public.update_updated_at_column();

alter table public.papeis enable row level security;

-- Seed dos papéis candidatos (spec seção E, "a confirmar" — necessário para
-- o sistema ser operável desde o dia 1; renomear/desativar depois é apenas
-- UPDATE, não migration).
insert into public.papeis (nome, descricao) values
  ('super_admin', 'Acesso irrestrito, único papel que pode fazer exclusão física'),
  ('admin', 'Administração operacional do sistema'),
  ('director', 'Diretoria, visão rede toda'),
  ('manager', 'Gerente de PDV, escopo próprio_pdv'),
  ('collaborator', 'Colaborador de PDV, escopo próprio_pdv'),
  ('supplier', 'Fornecedor externo'),
  ('coordenador_compras', 'Coordenação de compras'),
  ('convenience_coordinator', 'Coordenação de loja de conveniência'),
  ('approver_executive', 'Aprovador executivo, acesso restrito a decisão via token (Backlog v2)')
on conflict (nome) do nothing;


-- -----------------------------------------------------------------------------
-- 3. usuarios — perfil de aplicação vinculado a auth.users
-- -----------------------------------------------------------------------------
-- Exceção deliberada à convenção "id uuid default gen_random_uuid()": aqui o
-- id É o auth.users.id (padrão Supabase de tabela de perfil 1:1 com auth.users).
create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  pdv_id uuid references public.pdvs(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.usuarios is 'Perfil de aplicação. id = auth.users.id. pdv_id é o escopo territorial do usuário (nullable: papéis rede-toda não têm pdv fixo).';

create index usuarios_pdv_id_idx on public.usuarios (pdv_id);

create trigger set_updated_at
  before update on public.usuarios
  for each row execute function public.update_updated_at_column();

alter table public.usuarios enable row level security;


-- -----------------------------------------------------------------------------
-- 4. usuario_papeis — N:N usuário × papel (spec seção G)
-- -----------------------------------------------------------------------------
create table public.usuario_papeis (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  papel_id uuid not null references public.papeis(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (usuario_id, papel_id)
);

comment on table public.usuario_papeis is 'Atribuição de papel a usuário. N:N — um usuário pode acumular mais de um papel.';

create index usuario_papeis_usuario_id_idx on public.usuario_papeis (usuario_id);
create index usuario_papeis_papel_id_idx on public.usuario_papeis (papel_id);

create trigger set_updated_at
  before update on public.usuario_papeis
  for each row execute function public.update_updated_at_column();

alter table public.usuario_papeis enable row level security;


-- -----------------------------------------------------------------------------
-- 5. permissoes_concedidas — grant explícito papel × módulo × recurso × ação × escopo
-- -----------------------------------------------------------------------------
create table public.permissoes_concedidas (
  id uuid primary key default gen_random_uuid(),
  papel_id uuid not null references public.papeis(id) on delete cascade,
  modulo text not null,
  recurso text not null,
  acao text not null,
  escopo text not null check (escopo in ('proprio_pdv', 'propria_regional', 'rede_toda')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (papel_id, modulo, recurso, acao, escopo)
);

comment on table public.permissoes_concedidas is 'Fail-closed (ADR-006): ausência de linha ativa = acesso negado. Consultada pela RLS via has_permission(), nunca só pelo frontend. modulo/recurso/acao são texto livre (crescem por módulo, não são máquina de estado); escopo tem CHECK porque é um conjunto fechado que a lógica de RLS interpreta literalmente.';
comment on column public.permissoes_concedidas.escopo is 'has_permission() faz match exato — não há hierarquia implícita. Uma policy que aceita rede_toda OU proprio_pdv precisa chamar has_permission() duas vezes (uma por valor de escopo).';

create index permissoes_concedidas_papel_id_idx on public.permissoes_concedidas (papel_id);
create index permissoes_concedidas_lookup_idx on public.permissoes_concedidas (modulo, recurso, acao, escopo);

create trigger set_updated_at
  before update on public.permissoes_concedidas
  for each row execute function public.update_updated_at_column();

alter table public.permissoes_concedidas enable row level security;


-- -----------------------------------------------------------------------------
-- 6. Funções SECURITY DEFINER — quebram a recursão de RLS
-- -----------------------------------------------------------------------------
-- Sem parâmetro de usuário de propósito (revisão de segurança, achado 2): as
-- duas funções abaixo são SECURITY DEFINER, então o PostgREST as expõe como
-- RPC pública (`/rest/v1/rpc/has_permission`, `/rest/v1/rpc/usuario_pdv_id`).
-- Se aceitassem um `p_user_id` livre, qualquer autenticado poderia consultar
-- permissão/pdv de qualquer outro uuid, contornando `usuarios_select`. Elas só
-- podem responder sobre `auth.uid()` — o chamador da própria sessão.
create or replace function public.has_permission(
  p_modulo text,
  p_recurso text,
  p_acao text,
  p_escopo text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuario_papeis up
    join public.usuarios u on u.id = up.usuario_id
    join public.permissoes_concedidas pc on pc.papel_id = up.papel_id
    where up.usuario_id = auth.uid()
      and up.is_active = true
      and u.status = 'ativo'
      and pc.is_active = true
      and pc.modulo = p_modulo
      and pc.recurso = p_recurso
      and pc.acao = p_acao
      and pc.escopo = p_escopo
  );
$$;

comment on function public.has_permission is 'Fail-closed: true só se existir grant ativo para o papel de auth.uid(). Usuário inativo (usuarios.status <> ativo) nunca tem permissão, mesmo com grant vigente. Sem parâmetro de usuário (só responde sobre o próprio chamador) para não virar oráculo de leitura via RPC pública. SECURITY DEFINER para não recursar RLS de usuario_papeis/permissoes_concedidas/usuarios.';

grant execute on function public.has_permission(text, text, text, text) to authenticated;


create or replace function public.usuario_pdv_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pdv_id from public.usuarios where id = auth.uid() and status = 'ativo';
$$;

comment on function public.usuario_pdv_id is 'PDV do usuário chamador (auth.uid()), para policies de escopo proprio_pdv em tabelas de negócio futuras. Sem parâmetro de usuário pelo mesmo motivo de has_permission — nunca responde sobre outro uuid. SECURITY DEFINER pelo mesmo motivo de has_permission.';

grant execute on function public.usuario_pdv_id() to authenticated;


-- -----------------------------------------------------------------------------
-- 6b. Guarda contra auto-escalação em usuarios (revisão de segurança, achado 1)
-- -----------------------------------------------------------------------------
-- A policy usuarios_update permite auto-edição (id = auth.uid()), mas RLS não
-- restringe por coluna: sem esta trigger, o próprio usuário poderia trocar seu
-- pdv_id (escalar escopo territorial) ou seu status (se autorreativar depois
-- de desativado por um admin). A trigger só deixa mudar essas duas colunas
-- para quem já tem grant de edição elevado — o autor da requisição, não o
-- dono da linha.
create or replace function public.prevent_usuarios_self_escalation()
returns trigger
language plpgsql
as $$
begin
  if (new.pdv_id is distinct from old.pdv_id) or (new.status is distinct from old.status) then
    if not (
      public.has_permission('core', 'usuarios', 'editar', 'rede_toda')
      or (
        public.has_permission('core', 'usuarios', 'editar', 'proprio_pdv')
        and old.pdv_id = public.usuario_pdv_id()
      )
    ) then
      raise exception 'Alterar pdv_id ou status de usuario exige permissão core/usuarios/editar/rede_toda (ou proprio_pdv sobre o mesmo pdv)';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.prevent_usuarios_self_escalation is 'Bloqueia troca de pdv_id/status por quem só tem acesso via auto-edição (id = auth.uid()), fechando a via de auto-escalação que USING/WITH CHECK não cobrem por coluna.';

create trigger prevent_self_escalation
  before update on public.usuarios
  for each row execute function public.prevent_usuarios_self_escalation();


-- -----------------------------------------------------------------------------
-- 7. audit_logs — trilha imutável (INSERT-only, sem exceção de papel)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  usuario_id uuid references public.usuarios(id) on delete set null,
  dados_antes jsonb,
  dados_depois jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.audit_logs is 'Trilha imutável. UPDATE/DELETE bloqueados por policy para todos os papéis, sem exceção (nem super_admin). usuario_id usa ON DELETE SET NULL — a trilha sobrevive à exclusão física do usuário.';

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_usuario_id_idx on public.audit_logs (usuario_id);

-- Trigger de updated_at criado por consistência de convenção, mas é código
-- morto por construção: a policy abaixo bloqueia UPDATE para todo mundo, então
-- a coluna nunca muda depois do INSERT.
create trigger set_updated_at
  before update on public.audit_logs
  for each row execute function public.update_updated_at_column();

alter table public.audit_logs enable row level security;


-- -----------------------------------------------------------------------------
-- 8. notificacoes — notificação simples por usuário
-- -----------------------------------------------------------------------------
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  titulo text not null,
  mensagem text not null,
  lida boolean not null default false,
  entity_type text,
  entity_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notificacoes is 'Notificação por usuário. entity_type/entity_id referenciam a origem genericamente (sem FK, mesmo padrão de audit_logs — a origem pode ser qualquer tabela de negócio).';

create index notificacoes_usuario_id_idx on public.notificacoes (usuario_id, lida);

create trigger set_updated_at
  before update on public.notificacoes
  for each row execute function public.update_updated_at_column();

alter table public.notificacoes enable row level security;


-- -----------------------------------------------------------------------------
-- 9. handle_new_user — cria a linha em usuarios no signup (padrão Supabase)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', new.email),
    new.email,
    'ativo'
  );
  return new;
end;
$$;

comment on function public.handle_new_user is 'Trigger padrão Supabase: cria a linha em usuarios ao inserir em auth.users. SECURITY DEFINER bypassa RLS de usuarios (não há policy de INSERT para authenticated de propósito — só o trigger insere).';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 10. RLS — políticas por papel + GRANT explícito (obrigatório, CLAUDE.md)
-- -----------------------------------------------------------------------------

-- pdvs: catálogo territorial. Fail-closed de verdade (ADR-006 só abre exceção
-- fail-open para toggle de menu/UI, não para leitura de dado) — rede_toda lê
-- tudo, proprio_pdv só lê o próprio posto. Mutação fail-closed via grant.
grant select on public.pdvs to authenticated;
grant insert, update, delete on public.pdvs to authenticated;

create policy pdvs_select on public.pdvs
  for select to authenticated
  using (
    public.has_permission('core', 'pdvs', 'ler', 'rede_toda')
    or (
      public.has_permission('core', 'pdvs', 'ler', 'proprio_pdv')
      and id = public.usuario_pdv_id()
    )
  );

create policy pdvs_insert on public.pdvs
  for insert to authenticated
  with check (public.has_permission('core', 'pdvs', 'criar', 'rede_toda'));

create policy pdvs_update on public.pdvs
  for update to authenticated
  using (public.has_permission('core', 'pdvs', 'editar', 'rede_toda'))
  with check (public.has_permission('core', 'pdvs', 'editar', 'rede_toda'));

create policy pdvs_delete on public.pdvs
  for delete to authenticated
  using (public.has_permission('core', 'pdvs', 'excluir', 'rede_toda'));


-- papeis: catálogo de papéis. Fail-closed (ADR-006) — só quem tem grant de
-- leitura rede_toda vê o catálogo; não existe variante proprio_pdv aqui
-- porque papel não é escopado por posto. Mutação também fail-closed.
grant select on public.papeis to authenticated;
grant insert, update, delete on public.papeis to authenticated;

create policy papeis_select on public.papeis
  for select to authenticated
  using (public.has_permission('core', 'papeis', 'ler', 'rede_toda'));

create policy papeis_insert on public.papeis
  for insert to authenticated
  with check (public.has_permission('core', 'papeis', 'criar', 'rede_toda'));

create policy papeis_update on public.papeis
  for update to authenticated
  using (public.has_permission('core', 'papeis', 'editar', 'rede_toda'))
  with check (public.has_permission('core', 'papeis', 'editar', 'rede_toda'));

create policy papeis_delete on public.papeis
  for delete to authenticated
  using (public.has_permission('core', 'papeis', 'excluir', 'rede_toda'));


-- usuarios: fail-closed total, com carve-out de autoacesso (ver próprio perfil).
grant select, update on public.usuarios to authenticated;
grant delete on public.usuarios to authenticated;
-- Sem INSERT para authenticated de propósito: só handle_new_user (SECURITY
-- DEFINER) cria linha em usuarios.

create policy usuarios_select on public.usuarios
  for select to authenticated
  using (
    id = auth.uid()
    or public.has_permission('core', 'usuarios', 'ler', 'rede_toda')
    or (
      public.has_permission('core', 'usuarios', 'ler', 'proprio_pdv')
      and pdv_id = public.usuario_pdv_id()
    )
  );

create policy usuarios_update on public.usuarios
  for update to authenticated
  using (
    (id = auth.uid() and status = 'ativo')
    or public.has_permission('core', 'usuarios', 'editar', 'rede_toda')
    or (
      public.has_permission('core', 'usuarios', 'editar', 'proprio_pdv')
      and pdv_id = public.usuario_pdv_id()
    )
  )
  with check (
    id = auth.uid()
    or public.has_permission('core', 'usuarios', 'editar', 'rede_toda')
    or (
      public.has_permission('core', 'usuarios', 'editar', 'proprio_pdv')
      and pdv_id = public.usuario_pdv_id()
    )
  );

create policy usuarios_delete on public.usuarios
  for delete to authenticated
  using (public.has_permission('core', 'usuarios', 'excluir', 'rede_toda'));


-- usuario_papeis: atribuição de papel. Autoleitura + grant explícito para gestão.
grant select, insert, update, delete on public.usuario_papeis to authenticated;

create policy usuario_papeis_select on public.usuario_papeis
  for select to authenticated
  using (
    usuario_id = auth.uid()
    or public.has_permission('core', 'usuario_papeis', 'ler', 'rede_toda')
  );

create policy usuario_papeis_insert on public.usuario_papeis
  for insert to authenticated
  with check (public.has_permission('core', 'usuario_papeis', 'criar', 'rede_toda'));

create policy usuario_papeis_update on public.usuario_papeis
  for update to authenticated
  using (public.has_permission('core', 'usuario_papeis', 'editar', 'rede_toda'))
  with check (public.has_permission('core', 'usuario_papeis', 'editar', 'rede_toda'));

create policy usuario_papeis_delete on public.usuario_papeis
  for delete to authenticated
  using (public.has_permission('core', 'usuario_papeis', 'excluir', 'rede_toda'));


-- permissoes_concedidas: a própria matriz de grant. Só quem já tem grant de
-- gestão de permissão pode ler/mudar — inclusive para não vazar o desenho de
-- acesso da rede toda para qualquer usuário autenticado.
grant select, insert, update, delete on public.permissoes_concedidas to authenticated;

create policy permissoes_concedidas_select on public.permissoes_concedidas
  for select to authenticated
  using (public.has_permission('core', 'permissoes', 'ler', 'rede_toda'));

create policy permissoes_concedidas_insert on public.permissoes_concedidas
  for insert to authenticated
  with check (public.has_permission('core', 'permissoes', 'criar', 'rede_toda'));

create policy permissoes_concedidas_update on public.permissoes_concedidas
  for update to authenticated
  using (public.has_permission('core', 'permissoes', 'editar', 'rede_toda'))
  with check (public.has_permission('core', 'permissoes', 'editar', 'rede_toda'));

create policy permissoes_concedidas_delete on public.permissoes_concedidas
  for delete to authenticated
  using (public.has_permission('core', 'permissoes', 'excluir', 'rede_toda'));


-- audit_logs: INSERT liberado por grant; SELECT por grant; UPDATE/DELETE
-- bloqueados por policy para TODOS os papéis, sem exceção — não é "sem grant
-- = negado" (fail-closed comum), é ausência intencional de qualquer policy
-- permissiva, então toda tentativa de UPDATE/DELETE falha sempre.
grant select, insert on public.audit_logs to authenticated;
-- Não há GRANT de UPDATE/DELETE para authenticated: nem chega a avaliar RLS.

create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (public.has_permission('core', 'audit_logs', 'ler', 'rede_toda'));

create policy audit_logs_insert on public.audit_logs
  for insert to authenticated
  with check (public.has_permission('core', 'audit_logs', 'criar', 'rede_toda'));

-- Sem policy de UPDATE/DELETE por design: nenhum papel, nem super_admin,
-- pode alterar ou apagar uma linha de audit_logs.


-- notificacoes: cada usuário só vê e resolve as próprias; criação de
-- notificação para terceiros exige grant (o caso comum — sistema notificando
-- outro usuário — roda via Edge Function com service_role, que bypassa RLS).
grant select, insert, update, delete on public.notificacoes to authenticated;

create policy notificacoes_select on public.notificacoes
  for select to authenticated
  using (usuario_id = auth.uid());

create policy notificacoes_insert on public.notificacoes
  for insert to authenticated
  with check (
    usuario_id = auth.uid()
    or public.has_permission('core', 'notificacoes', 'criar', 'rede_toda')
  );

create policy notificacoes_update on public.notificacoes
  for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

create policy notificacoes_delete on public.notificacoes
  for delete to authenticated
  using (
    usuario_id = auth.uid()
    or public.has_permission('core', 'notificacoes', 'excluir', 'rede_toda')
  );


-- -----------------------------------------------------------------------------
-- 11. Seed de bootstrap — super_admin precisa nascer com acesso total ao Core
-- -----------------------------------------------------------------------------
-- Fail-closed sem seed = ninguém consegue nem conceder a primeira permissão
-- (custo explícito aceito no ADR-006). super_admin recebe criar/ler/editar/
-- excluir em rede_toda para todo recurso do módulo core.
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'core', recurso.nome, acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('usuarios'), ('usuario_papeis'), ('papeis'), ('permissoes'), ('pdvs'), ('audit_logs'), ('notificacoes')) as recurso(nome)
cross join (values ('criar'), ('ler'), ('editar'), ('excluir')) as acao(nome)
where p.nome = 'super_admin'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- Leitura de catálogo (pdvs/papeis, agora fail-closed — achado 3 da revisão
-- de segurança) para papéis administrativos/coordenação que precisam listar
-- a rede toda. manager/collaborator só precisam ver o próprio posto.
-- supplier e approver_executive não recebem nada por padrão (least privilege
-- — concede-se depois, se necessário, pela UI de administração).
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'core', recurso.nome, 'ler', 'rede_toda'
from public.papeis p
cross join (values ('pdvs'), ('papeis')) as recurso(nome)
where p.nome in ('admin', 'director', 'coordenador_compras', 'convenience_coordinator')
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'core', 'pdvs', 'ler', 'proprio_pdv'
from public.papeis p
where p.nome in ('manager', 'collaborator')
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;
