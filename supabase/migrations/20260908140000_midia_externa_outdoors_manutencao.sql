-- =============================================================================
-- Marketing OS (novo) — Fase 2: Mídia Externa
-- fornecedores, outdoors, contratos, avaliacoes_outdoor, manutencoes (fluxo
-- único), manutencao_fotos
-- =============================================================================
--
-- PRÉ-REQUISITO: Fase 1 (20260908103000_core_usuarios_papeis_permissoes.sql)
-- já aplicada. Esta migration só LÊ tabelas/funções do Core (usuarios, pdvs,
-- has_permission, usuario_pdv_id, update_updated_at_column) — nenhuma delas é
-- alterada aqui.
--
-- REQUISITO CENTRAL: um único fluxo de manutenção (`manutencoes`), não os três
-- fluxos paralelos e desconectados do sistema antigo (pacotes+work orders, OS
-- formal com dupla aprovação, atribuição direta — ver
-- docs/Modulo-Midia-Externa-Consolicado.md seções 7-10). O roteamento por
-- urgência/tipo vira lógica interna (cálculo de `prazo_atendimento`), nunca
-- uma tabela ou fluxo paralelo escolhido pelo usuário.
--
-- DECISÃO DE DESIGN — máquina de estado de `manutencoes` (10 estados):
--   solicitada → aprovada | rejeitada | em_espera | cancelada
--   em_espera  → aprovada | rejeitada | cancelada        (após reavaliação)
--   aprovada   → atribuida | cancelada
--   atribuida  → em_execucao | cancelada                 (fornecedor pode ser
--                                                          reatribuído sem
--                                                          trocar de estado)
--   em_execucao          → concluida_fornecedor | cancelada
--   concluida_fornecedor → validada | correcao_solicitada
--   correcao_solicitada  → em_execucao
--   validada / rejeitada / cancelada = estados terminais
--   Transições administrativas (aprovar/rejeitar/hold/atribuir/validar/
--   solicitar correção/cancelar por gestão) exigem
--   has_permission('midia_externa','manutencoes','editar','rede_toda').
--   Transições operacionais (em_execucao, concluida_fornecedor) exigem que o
--   ator seja o fornecedor atribuído com
--   has_permission('midia_externa','manutencoes','executar','proprio_fornecedor'),
--   ou um administrador (rede_toda) cobrindo o fornecedor.
--   Exceção adicional: o próprio solicitante pode cancelar (`cancelada`) o
--   próprio pedido enquanto ainda está em `solicitada` — sem precisar de
--   grant administrativo, porque ainda não impactou ninguém além dele mesmo.
--   `justificativa` é obrigatória para rejeitada/em_espera/
--   correcao_solicitada/cancelada; `data_reavaliacao` é obrigatória só para
--   em_espera. Tudo isso é aplicado por trigger BEFORE UPDATE
--   (`manutencoes_before_update`), não só por policy de RLS — motivo: uma
--   chamada feita com a service_role key (ex.: futura Edge Function) ignora
--   RLS inteiramente, mas não ignora trigger. RLS continua sendo a camada de
--   ISOLAMENTO (quem enxerga/toca qual linha, por pdv/fornecedor/rede); o
--   trigger é a camada de SEQUÊNCIA (quais transições são válidas e quem pode
--   fazer cada uma). As duas camadas se complementam, nenhuma substitui a
--   outra.
--
-- DECISÃO DE DESIGN — isolamento por fornecedor.
--   Não existe coluna `usuarios.fornecedor_id` no Core (Fase 1 não previu
--   fornecedor) e esta migration não altera tabela do Core. Em vez disso,
--   cria-se `fornecedor_usuarios` (N:1 na prática: um usuário pertence a no
--   máximo um fornecedor, garantido por UNIQUE em usuario_id) e a função
--   `usuario_fornecedor_id()` — mesmo padrão SECURITY DEFINER, STABLE, sem
--   parâmetro de usuário livre de `usuario_pdv_id()`/`has_permission()` do
--   Core (não repete o achado 2 da revisão de segurança do Core: aceitar um
--   `p_user_id` livre viraria oráculo de leitura via RPC pública).
--
-- DECISÃO DE DESIGN — `status_operacional` do outdoor: CHECK, não tabela.
--   É máquina de estado (3 valores fechados, resultado de avaliação, nunca
--   picklist que o usuário edita livremente), mesmo padrão de
--   `usuarios.status`/`pdvs.status` no Core. `system_options` não existe
--   ainda neste banco (pendência já sinalizada na Fase 1) — mesmo que
--   existisse, essa coluna não seria candidata: não é opção de cadastro, é
--   resultado computado de avaliação.
--
-- DECISÃO DE DESIGN — física de exclusão.
--   Nenhuma tabela nova ganha uma ação `excluir_fisica` distinta: segue-se o
--   padrão já estabelecido no Core (pdvs/papeis/usuarios) de usar a mesma
--   ação `excluir` para o DELETE físico via RLS, e restringir NO SEED quem
--   recebe esse grant (só `super_admin`). Soft delete (registro continua
--   existindo, só marcado inativo) usa `is_active`/`status_operacional` via
--   ação `editar`, disponível a mais papéis.
--
-- ASSUNÇÕES assumidas por falta de informação explícita (sinalizadas, não
-- decididas em silêncio):
--   1. `fornecedores.contato` foi modelado como duas colunas (telefone,
--      email) — a tarefa citava só "contato" no singular, sem definir forma.
--   2. `contratos.forma_pagamento` fica texto livre: `system_options` ainda
--      não existe neste banco (mesma pendência já registrada na Fase 1 para
--      `pdvs.tipo`). Vencido/vencendo não é coluna armazenada — computado em
--      query a partir de `vigencia_fim`, para não duplicar estado.
--   3. Quem fez qual transição de manutenção (aprovador, validador, datas)
--      não vira coluna própria em `manutencoes` — fica só em `audit_logs`
--      (entity_type='manutencoes'), para não duplicar trilha de histórico.
--   4. `rotas` (roteirização, citada na seção G da spec) está fora do escopo
--      desta tarefa — a lista de 6 entidades pedida não a incluía. Não criada
--      aqui.
--   5. Fotos de avaliação (`avaliacoes_outdoor.fotos`) viraram coluna jsonb,
--      não tabela própria — a tarefa só pediu tabela de suporte de fotos para
--      manutenção ("sem exagerar no escopo"), não para avaliação.
--   6. O trigger de transição de `manutencoes` resolve o ator via
--      `auth.uid()`/`has_permission()`. Uma chamada futura via service_role
--      (Edge Function) não carrega esse contexto de sessão — fica registrado
--      aqui como limitação a resolver quando o edge-function-specialist
--      construir essa automação, não decidido em silêncio.
--
-- PENDÊNCIAS CONHECIDAS (observação da revisão de segurança, não bloqueiam
-- esta migration — mesmo padrão das observações já registradas na Fase 1):
--   a. `contrato_outdoors_delete` aceita `editar` OU `excluir` em
--      'midia_externa'/'contratos' — mais permissivo que o padrão "excluir
--      físico só com super_admin" das demais tabelas, porque quem edita um
--      contrato hoje também reescreve a lista de outdoors vinculados (doc:
--      "a atualização substitui a lista completa"). Revisitar se o pivot
--      ganhar um caminho de exclusão independente da edição do contrato.
--   b. `manutencao_fotos.etapa` (solicitacao/execucao/validacao) é CHECK
--      livre — nada impede que um fornecedor insira uma foto marcada como
--      'validacao', por exemplo. Não há dado sensível em jogo (é só rótulo
--      de exibição), mas se isso passar a importar para lógica de negócio,
--      precisa de checagem de papel por etapa.
--   c. `supplier` não tem leitura direta de `outdoors` (só de `manutencoes`
--      atribuídas a ele). Se a UI do painel do fornecedor precisar mostrar
--      dado do outdoor (código, localização, foto) fora do que já vem
--      embutido em `manutencoes`, será necessário um grant
--      `midia_externa/outdoors/ler/proprio_fornecedor` novo — não concedido
--      aqui por não ter sido pedido (least privilege).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. fornecedores — prestador terceirizado
-- -----------------------------------------------------------------------------
create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.fornecedores is 'Prestador terceirizado de manutenção de outdoor. is_active é o soft delete (ativo/inativo).';

create trigger set_updated_at
  before update on public.fornecedores
  for each row execute function public.update_updated_at_column();

alter table public.fornecedores enable row level security;


-- -----------------------------------------------------------------------------
-- 2. fornecedor_usuarios — vínculo usuario (papel supplier) × fornecedor
-- -----------------------------------------------------------------------------
create table public.fornecedor_usuarios (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (usuario_id)
);

comment on table public.fornecedor_usuarios is 'Vínculo entre usuário (tipicamente papel supplier) e o fornecedor que ele representa. UNIQUE(usuario_id): um usuário pertence a no máximo um fornecedor. Existe para não alterar public.usuarios do Core.';

create index fornecedor_usuarios_fornecedor_id_idx on public.fornecedor_usuarios (fornecedor_id);

create trigger set_updated_at
  before update on public.fornecedor_usuarios
  for each row execute function public.update_updated_at_column();

alter table public.fornecedor_usuarios enable row level security;


-- -----------------------------------------------------------------------------
-- 2b. Alarga o CHECK de permissoes_concedidas.escopo (Core) para aceitar
--     'proprio_fornecedor'. ÚNICO toque nesta migration em tabela do Core, e
--     é aditivo, não restritivo: nenhuma linha existente usa esse valor, então
--     não há dado a migrar (a ressalva de "levantar dados que violariam a
--     restrição" do CLAUDE.md vale para ALTER que RESTRINGE valores — este
--     amplia o conjunto aceito). Sem isso, o seed da seção 11 (escopo
--     proprio_fornecedor para o papel supplier) quebraria o CHECK herdado da
--     Fase 1. Nome da constraint resolvido em runtime (não hardcoded) para
--     não presumir o nome autogerado pelo Postgres na Fase 1.
-- -----------------------------------------------------------------------------
do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'permissoes_concedidas'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%escopo%';

  if v_constraint_name is not null then
    execute format('alter table public.permissoes_concedidas drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.permissoes_concedidas
  add constraint permissoes_concedidas_escopo_check
  check (escopo in ('proprio_pdv', 'propria_regional', 'rede_toda', 'proprio_fornecedor'));


-- -----------------------------------------------------------------------------
-- 3. usuario_fornecedor_id() — SECURITY DEFINER, mesmo padrão de usuario_pdv_id()
-- -----------------------------------------------------------------------------
create or replace function public.usuario_fornecedor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select fu.fornecedor_id
  from public.fornecedor_usuarios fu
  join public.usuarios u on u.id = fu.usuario_id
  where fu.usuario_id = auth.uid()
    and fu.is_active = true
    and u.status = 'ativo';
$$;

comment on function public.usuario_fornecedor_id is 'Fornecedor do usuário chamador (auth.uid()), para policies de escopo proprio_fornecedor em manutencoes. Sem parâmetro de usuário livre — mesmo motivo de usuario_pdv_id()/has_permission() do Core (achado 2 da revisão de segurança): não pode virar oráculo de leitura via RPC pública. SECURITY DEFINER para não recursar RLS de fornecedor_usuarios/usuarios.';

grant execute on function public.usuario_fornecedor_id() to authenticated;


-- -----------------------------------------------------------------------------
-- 4. outdoors — painel físico vinculado a um pdv
-- -----------------------------------------------------------------------------
create table public.outdoors (
  id uuid primary key default gen_random_uuid(),
  pdv_id uuid not null references public.pdvs(id),
  codigo text not null unique,
  localizacao text not null,
  largura_m numeric(6,2),
  altura_m numeric(6,2),
  area_m2 numeric(8,2) generated always as (round(largura_m * altura_m, 2)) stored,
  status_operacional text not null default 'pendente_avaliacao'
    check (status_operacional in ('operacional', 'nao_operacional', 'pendente_avaliacao')),
  motivo_nao_operacional text,
  foto_url text,
  supplier_id uuid references public.fornecedores(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status_operacional <> 'nao_operacional' or motivo_nao_operacional is not null)
);

comment on table public.outdoors is 'Painel físico de mídia externa, vinculado a um pdv. is_active é o soft delete de cadastro; status_operacional é o estado funcional do painel (resultado de avaliação, não picklist de usuário — por isso CHECK, não system_options).';
comment on column public.outdoors.area_m2 is 'Coluna gerada (largura_m * altura_m) — Postgres calcula, não precisa ser mantida por trigger/aplicação.';
comment on column public.outdoors.supplier_id is 'Fornecedor de referência do outdoor (ex.: instalação original). Nullable — nem todo outdoor tem fornecedor fixo; a atribuição por manutenção é independente (manutencoes.fornecedor_id).';

create index outdoors_pdv_id_idx on public.outdoors (pdv_id);
create index outdoors_supplier_id_idx on public.outdoors (supplier_id);

create trigger set_updated_at
  before update on public.outdoors
  for each row execute function public.update_updated_at_column();

alter table public.outdoors enable row level security;


-- -----------------------------------------------------------------------------
-- 5. contratos — vínculo comercial com proprietário de terreno
-- -----------------------------------------------------------------------------
create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  proprietario_nome text not null,
  proprietario_contato text,
  vigencia_inicio date not null,
  vigencia_fim date not null,
  valor_mensal numeric(12,2) not null,
  forma_pagamento text,
  status text not null default 'ativo' check (status in ('ativo', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (vigencia_fim >= vigencia_inicio)
);

comment on table public.contratos is 'Vínculo comercial com proprietário de terreno onde há outdoor(s). N:N com outdoors via contrato_outdoors. "vencido"/"vencendo" não são estado armazenado — calculados em query a partir de vigencia_fim, para não duplicar verdade.';
comment on column public.contratos.forma_pagamento is 'Texto livre nesta fase — system_options ainda não existe neste banco (mesma pendência já registrada na Fase 1 para pdvs.tipo).';

create index contratos_vigencia_fim_idx on public.contratos (vigencia_fim);

create trigger set_updated_at
  before update on public.contratos
  for each row execute function public.update_updated_at_column();

alter table public.contratos enable row level security;


-- -----------------------------------------------------------------------------
-- 6. contrato_outdoors — pivot N:N contrato × outdoor
-- -----------------------------------------------------------------------------
create table public.contrato_outdoors (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  outdoor_id uuid not null references public.outdoors(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contrato_id, outdoor_id)
);

comment on table public.contrato_outdoors is 'Pivot N:N. Relação com múltiplas FKs para tabelas distintas (contratos, outdoors) — não há ambiguidade de nome de constraint aqui porque não há duas FKs para a mesma tabela.';

create index contrato_outdoors_contrato_id_idx on public.contrato_outdoors (contrato_id);
create index contrato_outdoors_outdoor_id_idx on public.contrato_outdoors (outdoor_id);

create trigger set_updated_at
  before update on public.contrato_outdoors
  for each row execute function public.update_updated_at_column();

alter table public.contrato_outdoors enable row level security;


-- -----------------------------------------------------------------------------
-- 7. avaliacoes_outdoor — vistoria de campo
-- -----------------------------------------------------------------------------
create table public.avaliacoes_outdoor (
  id uuid primary key default gen_random_uuid(),
  outdoor_id uuid not null references public.outdoors(id),
  avaliador_id uuid not null references public.usuarios(id),
  data_avaliacao timestamptz not null default now(),
  status_resultante text not null
    check (status_resultante in ('operacional', 'nao_operacional', 'pendente_avaliacao')),
  motivo text,
  fotos jsonb not null default '[]'::jsonb,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status_resultante <> 'nao_operacional' or motivo is not null)
);

comment on table public.avaliacoes_outdoor is 'Registro de vistoria de campo. fotos é jsonb (array de URLs) — não virou tabela própria porque a tarefa não pediu tabela de suporte para foto de avaliação, só para manutenção.';

create index avaliacoes_outdoor_outdoor_id_idx on public.avaliacoes_outdoor (outdoor_id, data_avaliacao desc);

create trigger set_updated_at
  before update on public.avaliacoes_outdoor
  for each row execute function public.update_updated_at_column();

alter table public.avaliacoes_outdoor enable row level security;


-- -----------------------------------------------------------------------------
-- 7b. Sincroniza outdoors a partir da avaliação mais recente (equivalente à
--     RPC update_outdoor_after_evaluation do sistema antigo, aqui como
--     trigger — mesmo princípio de audit_logs: quem cria a avaliação
--     (manager/collaborator, via ação 'criar' em avaliacoes) normalmente não
--     tem grant de 'editar' em outdoors, então a sincronização precisa
--     bypassar a RLS/grant de outdoors via SECURITY DEFINER.
-- -----------------------------------------------------------------------------
create or replace function public.sincronizar_outdoor_apos_avaliacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.outdoors
  set
    status_operacional = new.status_resultante,
    motivo_nao_operacional = case when new.status_resultante = 'nao_operacional' then new.motivo else null end,
    foto_url = coalesce(new.fotos ->> 0, foto_url)
  where id = new.outdoor_id;

  return new;
end;
$$;

comment on function public.sincronizar_outdoor_apos_avaliacao is 'AFTER INSERT em avaliacoes_outdoor: propaga o resultado da vistoria para outdoors.status_operacional/motivo_nao_operacional/foto_url. SECURITY DEFINER porque quem registra avaliação nem sempre tem grant de editar outdoors diretamente.';

create trigger sincronizar_outdoor
  after insert on public.avaliacoes_outdoor
  for each row execute function public.sincronizar_outdoor_apos_avaliacao();


-- -----------------------------------------------------------------------------
-- 8. manutencoes — fluxo único de solicitação/execução de manutenção
-- -----------------------------------------------------------------------------
create table public.manutencoes (
  id uuid primary key default gen_random_uuid(),
  outdoor_id uuid not null references public.outdoors(id),
  pdv_id uuid not null references public.pdvs(id),
  avaliacao_origem_id uuid references public.avaliacoes_outdoor(id),
  fornecedor_id uuid references public.fornecedores(id),
  solicitante_id uuid not null references public.usuarios(id),
  urgencia text not null check (urgencia in ('baixa', 'normal', 'alta', 'emergencial')),
  tipo text not null check (tipo in ('preventiva', 'corretiva')),
  status text not null default 'solicitada' check (status in (
    'solicitada', 'em_espera', 'aprovada', 'rejeitada',
    'atribuida', 'em_execucao', 'concluida_fornecedor',
    'correcao_solicitada', 'validada', 'cancelada'
  )),
  descricao text,
  justificativa text,
  data_reavaliacao date,
  prazo_atendimento timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'em_espera' or (justificativa is not null and data_reavaliacao is not null)),
  check (status not in ('rejeitada', 'correcao_solicitada', 'cancelada') or justificativa is not null),
  check (status not in ('atribuida', 'em_execucao', 'concluida_fornecedor', 'validada') or fornecedor_id is not null)
);

comment on table public.manutencoes is 'Entidade única do ciclo solicitação→triagem→aprovação→atribuição→execução→validação. Substitui os 3 fluxos paralelos do sistema antigo (pacotes+work orders, OS formal, atribuição direta). Ver comentário de topo do arquivo para a máquina de estado completa e por que a validação de transição mora em trigger, não só em RLS. Quem fez qual transição fica em audit_logs, não em coluna própria aqui — evita duplicar trilha de histórico.';
comment on column public.manutencoes.pdv_id is 'Denormalizado de outdoors.pdv_id (setado pelo trigger de INSERT, não editável pelo cliente) para permitir isolamento por pdv em RLS sem subquery/join em toda policy — mesmo espírito de "isolamento por pdv_id testável no banco".';
comment on column public.manutencoes.prazo_atendimento is 'SLA calculado a partir de urgencia/tipo no INSERT — é aqui que mora o "roteamento por urgência/tipo" da spec: lógica interna da máquina de estado, nunca escolha de fluxo exposta ao usuário.';

create index manutencoes_pdv_id_idx on public.manutencoes (pdv_id);
create index manutencoes_outdoor_id_idx on public.manutencoes (outdoor_id);
create index manutencoes_fornecedor_id_idx on public.manutencoes (fornecedor_id);
create index manutencoes_status_idx on public.manutencoes (status);

create trigger set_updated_at
  before update on public.manutencoes
  for each row execute function public.update_updated_at_column();

alter table public.manutencoes enable row level security;


-- -----------------------------------------------------------------------------
-- 8b. BEFORE INSERT — deriva pdv_id, solicitante_id e prazo_atendimento
-- -----------------------------------------------------------------------------
create or replace function public.manutencoes_before_insert()
returns trigger
language plpgsql
as $$
declare
  v_pdv_id uuid;
  v_base interval;
begin
  select pdv_id into v_pdv_id from public.outdoors where id = new.outdoor_id;
  if v_pdv_id is null then
    raise exception 'outdoor_id % não existe', new.outdoor_id;
  end if;
  new.pdv_id := v_pdv_id;

  if new.solicitante_id is null then
    new.solicitante_id := auth.uid();
  end if;

  if new.status is null then
    new.status := 'solicitada';
  end if;
  if new.status <> 'solicitada' then
    raise exception 'manutencao precisa nascer com status solicitada';
  end if;

  -- Roteamento interno por urgência/tipo (nunca escolha exposta ao usuário):
  -- SLA base por urgência, corretiva mantém o prazo, preventiva dobra (é
  -- menos urgente por natureza).
  v_base := case new.urgencia
    when 'emergencial' then interval '4 hours'
    when 'alta' then interval '24 hours'
    when 'normal' then interval '72 hours'
    else interval '7 days'
  end;
  if new.tipo = 'preventiva' then
    v_base := v_base * 2;
  end if;
  new.prazo_atendimento := now() + v_base;

  return new;
end;
$$;

comment on function public.manutencoes_before_insert is 'Deriva pdv_id (denormalizado de outdoors), solicitante_id (default auth.uid()) e prazo_atendimento (SLA por urgencia/tipo — o roteamento interno da máquina de estado). Toda manutencao nasce em status solicitada.';

create trigger before_insert_derivar_campos
  before insert on public.manutencoes
  for each row execute function public.manutencoes_before_insert();


-- -----------------------------------------------------------------------------
-- 8c. BEFORE UPDATE — valida transição de estado + autor + grava audit_logs
-- -----------------------------------------------------------------------------
create or replace function public.manutencoes_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed text[];
  v_perm_admin boolean;
  v_perm_fornecedor boolean;
  v_cancelamento_proprio boolean;
begin
  v_perm_admin := public.has_permission('midia_externa', 'manutencoes', 'editar', 'rede_toda');

  -- Campos de identidade são imutáveis após a criação, para qualquer ator.
  if new.outdoor_id <> old.outdoor_id
    or new.solicitante_id <> old.solicitante_id
    or new.avaliacao_origem_id is distinct from old.avaliacao_origem_id
  then
    raise exception 'outdoor_id, solicitante_id e avaliacao_origem_id são imutáveis após a criação';
  end if;

  -- Campos de negócio (fornecedor/urgencia/tipo/SLA) só podem ser alterados
  -- por quem tem editar/rede_toda — achado da revisão de segurança: sem
  -- isso, um solicitante cancelando o próprio pedido (ou um fornecedor
  -- marcando execução) podia usar o mesmo UPDATE para trocar fornecedor_id,
  -- urgencia, tipo ou prazo_atendimento de carona.
  if not v_perm_admin then
    if new.fornecedor_id is distinct from old.fornecedor_id
      or new.urgencia is distinct from old.urgencia
      or new.tipo is distinct from old.tipo
      or new.prazo_atendimento is distinct from old.prazo_atendimento
    then
      raise exception 'fornecedor_id, urgencia, tipo e prazo_atendimento só podem ser alterados com midia_externa/manutencoes/editar/rede_toda';
    end if;
  end if;

  -- pdv_id é sempre derivado de outdoor_id, nunca editável diretamente.
  new.pdv_id := old.pdv_id;

  if new.status = old.status then
    -- Edição de campo (descrição/justificativa/data_reavaliacao) sem
    -- transição de estado: exige o mesmo grant administrativo de quem
    -- gerencia a linha (fornecedor_id/urgencia/tipo/prazo_atendimento já
    -- foram travados acima para quem não é admin).
    if not v_perm_admin then
      raise exception 'editar manutencao sem trocar status exige midia_externa/manutencoes/editar/rede_toda';
    end if;

    -- Reatribuição de fornecedor (ou qualquer outro campo) sem troca de
    -- status é ação crítica e também precisa ficar em audit_logs — mesma
    -- convenção do CLAUDE.md, achado 2 da revisão de segurança. Só grava se
    -- algo de fato mudou.
    if new.fornecedor_id is distinct from old.fornecedor_id
      or new.descricao is distinct from old.descricao
      or new.justificativa is distinct from old.justificativa
      or new.data_reavaliacao is distinct from old.data_reavaliacao
      or new.urgencia is distinct from old.urgencia
      or new.tipo is distinct from old.tipo
      or new.prazo_atendimento is distinct from old.prazo_atendimento
    then
      insert into public.audit_logs (action, entity_type, entity_id, usuario_id, dados_antes, dados_depois)
      values (
        'manutencao_editada_sem_transicao',
        'manutencoes',
        new.id,
        auth.uid(),
        jsonb_build_object(
          'fornecedor_id', old.fornecedor_id, 'descricao', old.descricao,
          'justificativa', old.justificativa, 'data_reavaliacao', old.data_reavaliacao,
          'urgencia', old.urgencia, 'tipo', old.tipo, 'prazo_atendimento', old.prazo_atendimento
        ),
        jsonb_build_object(
          'fornecedor_id', new.fornecedor_id, 'descricao', new.descricao,
          'justificativa', new.justificativa, 'data_reavaliacao', new.data_reavaliacao,
          'urgencia', new.urgencia, 'tipo', new.tipo, 'prazo_atendimento', new.prazo_atendimento
        )
      );
    end if;

    return new;
  end if;

  v_allowed := case old.status
    when 'solicitada' then array['em_espera', 'aprovada', 'rejeitada', 'cancelada']
    when 'em_espera' then array['aprovada', 'rejeitada', 'cancelada']
    when 'aprovada' then array['atribuida', 'cancelada']
    when 'atribuida' then array['em_execucao', 'cancelada']
    when 'em_execucao' then array['concluida_fornecedor', 'cancelada']
    when 'concluida_fornecedor' then array['validada', 'correcao_solicitada']
    when 'correcao_solicitada' then array['em_execucao']
    else array[]::text[]
  end;

  if not (new.status = any (v_allowed)) then
    raise exception 'transição de % para % não é permitida', old.status, new.status;
  end if;

  v_perm_fornecedor := (
    old.fornecedor_id is not null
    and old.fornecedor_id = public.usuario_fornecedor_id()
    and public.has_permission('midia_externa', 'manutencoes', 'executar', 'proprio_fornecedor')
  );
  v_cancelamento_proprio := (
    new.status = 'cancelada'
    and old.status = 'solicitada'
    and old.solicitante_id = auth.uid()
  );

  if new.status in ('em_execucao', 'concluida_fornecedor') then
    if not (v_perm_fornecedor or v_perm_admin) then
      raise exception 'transição para % exige ser o fornecedor atribuído (executar/proprio_fornecedor) ou midia_externa/manutencoes/editar/rede_toda', new.status;
    end if;
  elsif v_cancelamento_proprio then
    null; -- solicitante cancela o próprio pedido ainda não aprovado
  else
    if not v_perm_admin then
      raise exception 'transição para % exige midia_externa/manutencoes/editar/rede_toda', new.status;
    end if;
  end if;

  insert into public.audit_logs (action, entity_type, entity_id, usuario_id, dados_antes, dados_depois)
  values (
    'manutencao_transicao_status',
    'manutencoes',
    new.id,
    auth.uid(),
    jsonb_build_object('status', old.status, 'justificativa', old.justificativa, 'fornecedor_id', old.fornecedor_id),
    jsonb_build_object('status', new.status, 'justificativa', new.justificativa, 'fornecedor_id', new.fornecedor_id)
  );

  return new;
end;
$$;

comment on function public.manutencoes_before_update is 'Valida a máquina de estado de manutencoes (transição permitida, justificativa/data_reavaliacao/fornecedor obrigatórios conforme CHECK da tabela, autor autorizado), trava fornecedor_id/urgencia/tipo/prazo_atendimento para quem não tem editar/rede_toda (mesmo com ou sem troca de status) e grava em audit_logs tanto a transição de status quanto a edição de campo de negócio sem transição (ex.: reatribuição de fornecedor). SECURITY DEFINER porque o INSERT em audit_logs exige grant que a maioria dos papéis não tem — mesma observação já registrada na Fase 1. Roda mesmo para chamadas que bypassam RLS (ex.: service_role), por isso a sequência de estados não pode depender só de policy.';

create trigger before_update_validar_transicao
  before update on public.manutencoes
  for each row execute function public.manutencoes_before_update();


-- -----------------------------------------------------------------------------
-- 9. manutencao_fotos — fotos/documentos de manutenção
-- -----------------------------------------------------------------------------
create table public.manutencao_fotos (
  id uuid primary key default gen_random_uuid(),
  manutencao_id uuid not null references public.manutencoes(id) on delete cascade,
  url text not null,
  etapa text not null check (etapa in ('solicitacao', 'execucao', 'validacao')),
  enviada_por uuid not null references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.manutencao_fotos is 'Fotos/documentos de apoio a uma manutencao, por etapa do ciclo. Tabela de suporte deliberadamente enxuta — sem is_active: é registro de anexo, físico ou nada (excluir exige super_admin, mesmo padrão das demais tabelas).';

create index manutencao_fotos_manutencao_id_idx on public.manutencao_fotos (manutencao_id);

create trigger set_updated_at
  before update on public.manutencao_fotos
  for each row execute function public.update_updated_at_column();

alter table public.manutencao_fotos enable row level security;


-- =============================================================================
-- 10. RLS — políticas por papel + GRANT explícito (obrigatório, CLAUDE.md)
-- Módulo: 'midia_externa'. Fail-closed (ADR-006): ausência de grant em
-- permissoes_concedidas = acesso negado, mesmo padrão do Core.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- fornecedores: gestão rede_toda (admin/super_admin), leitura rede_toda para
-- director (visão de rede). manager/collaborator/supplier não enxergam o
-- cadastro de fornecedor diretamente — só as manutencoes atribuídas.
-- ---------------------------------------------------------------------------
grant select on public.fornecedores to authenticated;
grant insert, update, delete on public.fornecedores to authenticated;

create policy fornecedores_select on public.fornecedores
  for select to authenticated
  using (public.has_permission('midia_externa', 'fornecedores', 'ler', 'rede_toda'));

create policy fornecedores_insert on public.fornecedores
  for insert to authenticated
  with check (public.has_permission('midia_externa', 'fornecedores', 'criar', 'rede_toda'));

create policy fornecedores_update on public.fornecedores
  for update to authenticated
  using (public.has_permission('midia_externa', 'fornecedores', 'editar', 'rede_toda'))
  with check (public.has_permission('midia_externa', 'fornecedores', 'editar', 'rede_toda'));

create policy fornecedores_delete on public.fornecedores
  for delete to authenticated
  using (public.has_permission('midia_externa', 'fornecedores', 'excluir', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- fornecedor_usuarios: gestão rede_toda; o próprio usuário fornecedor pode
-- ler o próprio vínculo (para a UI do painel do fornecedor saber quem ele é).
-- ---------------------------------------------------------------------------
grant select on public.fornecedor_usuarios to authenticated;
grant insert, update, delete on public.fornecedor_usuarios to authenticated;

create policy fornecedor_usuarios_select on public.fornecedor_usuarios
  for select to authenticated
  using (
    usuario_id = auth.uid()
    or public.has_permission('midia_externa', 'fornecedores', 'ler', 'rede_toda')
  );

create policy fornecedor_usuarios_insert on public.fornecedor_usuarios
  for insert to authenticated
  with check (public.has_permission('midia_externa', 'fornecedores', 'editar', 'rede_toda'));

create policy fornecedor_usuarios_update on public.fornecedor_usuarios
  for update to authenticated
  using (public.has_permission('midia_externa', 'fornecedores', 'editar', 'rede_toda'))
  with check (public.has_permission('midia_externa', 'fornecedores', 'editar', 'rede_toda'));

create policy fornecedor_usuarios_delete on public.fornecedor_usuarios
  for delete to authenticated
  using (public.has_permission('midia_externa', 'fornecedores', 'excluir', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- outdoors: rede_toda lê/edita tudo; proprio_pdv só o próprio posto. Sem
-- 'editar' para manager/collaborator no seed — eles avaliam (avaliacoes_outdoor),
-- não editam o cadastro do painel diretamente (doc: "Avaliar Outdoor" é a
-- ação deles, não "Editar").
-- ---------------------------------------------------------------------------
grant select on public.outdoors to authenticated;
grant insert, update, delete on public.outdoors to authenticated;

create policy outdoors_select on public.outdoors
  for select to authenticated
  using (
    public.has_permission('midia_externa', 'outdoors', 'ler', 'rede_toda')
    or (
      public.has_permission('midia_externa', 'outdoors', 'ler', 'proprio_pdv')
      and pdv_id = public.usuario_pdv_id()
    )
  );

create policy outdoors_insert on public.outdoors
  for insert to authenticated
  with check (public.has_permission('midia_externa', 'outdoors', 'criar', 'rede_toda'));

create policy outdoors_update on public.outdoors
  for update to authenticated
  using (
    public.has_permission('midia_externa', 'outdoors', 'editar', 'rede_toda')
    or (
      public.has_permission('midia_externa', 'outdoors', 'editar', 'proprio_pdv')
      and pdv_id = public.usuario_pdv_id()
    )
  )
  with check (
    public.has_permission('midia_externa', 'outdoors', 'editar', 'rede_toda')
    or (
      public.has_permission('midia_externa', 'outdoors', 'editar', 'proprio_pdv')
      and pdv_id = public.usuario_pdv_id()
    )
  );

create policy outdoors_delete on public.outdoors
  for delete to authenticated
  using (public.has_permission('midia_externa', 'outdoors', 'excluir', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- contratos: rede_toda gerencia; proprio_pdv só lê contratos que cobrem
-- outdoor(s) do próprio posto (via contrato_outdoors).
-- ---------------------------------------------------------------------------
grant select on public.contratos to authenticated;
grant insert, update, delete on public.contratos to authenticated;

create policy contratos_select on public.contratos
  for select to authenticated
  using (
    public.has_permission('midia_externa', 'contratos', 'ler', 'rede_toda')
    or (
      public.has_permission('midia_externa', 'contratos', 'ler', 'proprio_pdv')
      and exists (
        select 1
        from public.contrato_outdoors co
        join public.outdoors o on o.id = co.outdoor_id
        where co.contrato_id = contratos.id
          and o.pdv_id = public.usuario_pdv_id()
      )
    )
  );

create policy contratos_insert on public.contratos
  for insert to authenticated
  with check (public.has_permission('midia_externa', 'contratos', 'criar', 'rede_toda'));

create policy contratos_update on public.contratos
  for update to authenticated
  using (public.has_permission('midia_externa', 'contratos', 'editar', 'rede_toda'))
  with check (public.has_permission('midia_externa', 'contratos', 'editar', 'rede_toda'));

create policy contratos_delete on public.contratos
  for delete to authenticated
  using (public.has_permission('midia_externa', 'contratos', 'excluir', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- contrato_outdoors: reaproveita a ação/recurso 'contratos' (pivot não tem
-- recurso próprio na matriz de permissão — quem edita contrato edita o
-- vínculo dele com outdoor).
-- ---------------------------------------------------------------------------
grant select on public.contrato_outdoors to authenticated;
grant insert, update, delete on public.contrato_outdoors to authenticated;

create policy contrato_outdoors_select on public.contrato_outdoors
  for select to authenticated
  using (
    public.has_permission('midia_externa', 'contratos', 'ler', 'rede_toda')
    or (
      public.has_permission('midia_externa', 'contratos', 'ler', 'proprio_pdv')
      and exists (select 1 from public.outdoors o where o.id = contrato_outdoors.outdoor_id and o.pdv_id = public.usuario_pdv_id())
    )
  );

create policy contrato_outdoors_insert on public.contrato_outdoors
  for insert to authenticated
  with check (public.has_permission('midia_externa', 'contratos', 'editar', 'rede_toda'));

create policy contrato_outdoors_update on public.contrato_outdoors
  for update to authenticated
  using (public.has_permission('midia_externa', 'contratos', 'editar', 'rede_toda'))
  with check (public.has_permission('midia_externa', 'contratos', 'editar', 'rede_toda'));

create policy contrato_outdoors_delete on public.contrato_outdoors
  for delete to authenticated
  using (
    public.has_permission('midia_externa', 'contratos', 'editar', 'rede_toda')
    or public.has_permission('midia_externa', 'contratos', 'excluir', 'rede_toda')
  );


-- ---------------------------------------------------------------------------
-- avaliacoes_outdoor: rede_toda lê/cria tudo; proprio_pdv cria/lê só para
-- outdoor do próprio posto. avaliador_id sempre = auth.uid() (sem
-- impersonação).
-- ---------------------------------------------------------------------------
grant select on public.avaliacoes_outdoor to authenticated;
grant insert, update, delete on public.avaliacoes_outdoor to authenticated;

create policy avaliacoes_outdoor_select on public.avaliacoes_outdoor
  for select to authenticated
  using (
    public.has_permission('midia_externa', 'avaliacoes', 'ler', 'rede_toda')
    or (
      public.has_permission('midia_externa', 'avaliacoes', 'ler', 'proprio_pdv')
      and exists (select 1 from public.outdoors o where o.id = avaliacoes_outdoor.outdoor_id and o.pdv_id = public.usuario_pdv_id())
    )
  );

create policy avaliacoes_outdoor_insert on public.avaliacoes_outdoor
  for insert to authenticated
  with check (
    avaliador_id = auth.uid()
    and (
      public.has_permission('midia_externa', 'avaliacoes', 'criar', 'rede_toda')
      or (
        public.has_permission('midia_externa', 'avaliacoes', 'criar', 'proprio_pdv')
        and exists (select 1 from public.outdoors o where o.id = avaliacoes_outdoor.outdoor_id and o.pdv_id = public.usuario_pdv_id())
      )
    )
  );

create policy avaliacoes_outdoor_update on public.avaliacoes_outdoor
  for update to authenticated
  using (public.has_permission('midia_externa', 'avaliacoes', 'editar', 'rede_toda'))
  with check (public.has_permission('midia_externa', 'avaliacoes', 'editar', 'rede_toda'));

create policy avaliacoes_outdoor_delete on public.avaliacoes_outdoor
  for delete to authenticated
  using (public.has_permission('midia_externa', 'avaliacoes', 'excluir', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- manutencoes: rede_toda enxerga/gerencia tudo; proprio_pdv cria/lê só do
-- próprio posto (não gerencia — aprovar/rejeitar/atribuir/validar é
-- rede_toda); proprio_fornecedor só lê/executa as atribuídas a ele.
-- Transição de estado é validada pelo trigger (seção 8c); RLS aqui cobre
-- isolamento (quem toca a linha), não sequência.
-- ---------------------------------------------------------------------------
grant select on public.manutencoes to authenticated;
grant insert, update, delete on public.manutencoes to authenticated;

create policy manutencoes_select on public.manutencoes
  for select to authenticated
  using (
    public.has_permission('midia_externa', 'manutencoes', 'ler', 'rede_toda')
    or (
      public.has_permission('midia_externa', 'manutencoes', 'ler', 'proprio_pdv')
      and pdv_id = public.usuario_pdv_id()
    )
    or (
      public.has_permission('midia_externa', 'manutencoes', 'ler', 'proprio_fornecedor')
      and fornecedor_id = public.usuario_fornecedor_id()
    )
  );

create policy manutencoes_insert on public.manutencoes
  for insert to authenticated
  with check (
    solicitante_id = auth.uid()
    and (
      public.has_permission('midia_externa', 'manutencoes', 'criar', 'rede_toda')
      or (
        public.has_permission('midia_externa', 'manutencoes', 'criar', 'proprio_pdv')
        and exists (select 1 from public.outdoors o where o.id = manutencoes.outdoor_id and o.pdv_id = public.usuario_pdv_id())
      )
    )
  );

-- UPDATE: RLS abre a porta para quem pode, em tese, mexer na linha; o
-- trigger before_update_validar_transicao decide se a transição específica é
-- válida e se o ator tem o grant certo para ELA. Sem isso aqui, um fornecedor
-- nunca passaria da porta de entrada da RLS para tentar marcar execução.
create policy manutencoes_update on public.manutencoes
  for update to authenticated
  using (
    public.has_permission('midia_externa', 'manutencoes', 'editar', 'rede_toda')
    or (
      fornecedor_id = public.usuario_fornecedor_id()
      and public.has_permission('midia_externa', 'manutencoes', 'executar', 'proprio_fornecedor')
    )
    or (solicitante_id = auth.uid() and status = 'solicitada')
  )
  with check (
    public.has_permission('midia_externa', 'manutencoes', 'editar', 'rede_toda')
    or (
      fornecedor_id = public.usuario_fornecedor_id()
      and public.has_permission('midia_externa', 'manutencoes', 'executar', 'proprio_fornecedor')
    )
    or (solicitante_id = auth.uid() and status = 'cancelada')
  );

create policy manutencoes_delete on public.manutencoes
  for delete to authenticated
  using (public.has_permission('midia_externa', 'manutencoes', 'excluir', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- manutencao_fotos: leitura/inserção seguem o mesmo escopo de quem enxerga a
-- manutencao pai (reaproveita recurso 'manutencoes' — não há recurso próprio
-- para fotos). enviada_por sempre = auth.uid().
-- ---------------------------------------------------------------------------
grant select on public.manutencao_fotos to authenticated;
grant insert, delete on public.manutencao_fotos to authenticated;

create policy manutencao_fotos_select on public.manutencao_fotos
  for select to authenticated
  using (
    exists (
      select 1 from public.manutencoes m
      where m.id = manutencao_fotos.manutencao_id
        and (
          public.has_permission('midia_externa', 'manutencoes', 'ler', 'rede_toda')
          or (public.has_permission('midia_externa', 'manutencoes', 'ler', 'proprio_pdv') and m.pdv_id = public.usuario_pdv_id())
          or (public.has_permission('midia_externa', 'manutencoes', 'ler', 'proprio_fornecedor') and m.fornecedor_id = public.usuario_fornecedor_id())
        )
    )
  );

create policy manutencao_fotos_insert on public.manutencao_fotos
  for insert to authenticated
  with check (
    enviada_por = auth.uid()
    and exists (
      select 1 from public.manutencoes m
      where m.id = manutencao_fotos.manutencao_id
        and (
          public.has_permission('midia_externa', 'manutencoes', 'editar', 'rede_toda')
          or (public.has_permission('midia_externa', 'manutencoes', 'criar', 'proprio_pdv') and m.pdv_id = public.usuario_pdv_id())
          or (m.fornecedor_id = public.usuario_fornecedor_id() and public.has_permission('midia_externa', 'manutencoes', 'executar', 'proprio_fornecedor'))
        )
    )
  );

create policy manutencao_fotos_delete on public.manutencao_fotos
  for delete to authenticated
  using (public.has_permission('midia_externa', 'manutencoes', 'excluir', 'rede_toda'));


-- =============================================================================
-- 11. Seed de permissão — módulo 'midia_externa' (fail-closed: sem isso,
-- ninguém além de quem já tenha grant equivalente por engano consegue operar)
-- =============================================================================

-- super_admin: acesso total, todos os recursos, todas as ações, rede_toda.
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'midia_externa', recurso.nome, acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('outdoors'), ('contratos'), ('fornecedores'), ('avaliacoes'), ('manutencoes')) as recurso(nome)
cross join (values ('criar'), ('ler'), ('editar'), ('excluir')) as acao(nome)
where p.nome = 'super_admin'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- (não precisa de grant extra 'executar'/proprio_fornecedor para super_admin:
-- o trigger de transição já aceita v_perm_admin — editar/rede_toda — para as
-- mesmas transições que o fornecedor faz via executar/proprio_fornecedor.)

-- admin: criar/ler/editar rede_toda em tudo (excluir físico fica só com
-- super_admin, por design — ver decisão de topo do arquivo).
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'midia_externa', recurso.nome, acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('outdoors'), ('contratos'), ('fornecedores'), ('avaliacoes'), ('manutencoes')) as recurso(nome)
cross join (values ('criar'), ('ler'), ('editar')) as acao(nome)
where p.nome = 'admin'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- director: leitura rede_toda em tudo + editar em manutencoes (aprovar/
-- rejeitar/atribuir/validar) e em avaliacoes (registrar observação
-- estratégica sobre uma vistoria já lançada).
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'midia_externa', recurso.nome, 'ler', 'rede_toda'
from public.papeis p
cross join (values ('outdoors'), ('contratos'), ('fornecedores'), ('avaliacoes'), ('manutencoes')) as recurso(nome)
where p.nome = 'director'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'midia_externa', 'manutencoes', 'editar', 'rede_toda'
from public.papeis p
where p.nome = 'director'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- manager/collaborator: escopo proprio_pdv — avaliam outdoor e solicitam
-- manutenção do próprio posto; manager também lê outdoors/contratos do
-- próprio posto (doc: /contracts lista manager no acesso).
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'midia_externa', recurso.nome, 'ler', 'proprio_pdv'
from public.papeis p
cross join (values ('outdoors'), ('avaliacoes'), ('manutencoes')) as recurso(nome)
where p.nome in ('manager', 'collaborator')
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'midia_externa', recurso.nome, 'criar', 'proprio_pdv'
from public.papeis p
cross join (values ('avaliacoes'), ('manutencoes')) as recurso(nome)
where p.nome in ('manager', 'collaborator')
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'midia_externa', 'contratos', 'ler', 'proprio_pdv'
from public.papeis p
where p.nome = 'manager'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- supplier: só as próprias manutencoes atribuídas — ler e executar.
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'midia_externa', 'manutencoes', acao.nome, 'proprio_fornecedor'
from public.papeis p
cross join (values ('ler'), ('executar')) as acao(nome)
where p.nome = 'supplier'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- coordenador_compras / convenience_coordinator: nenhum grant por padrão
-- (least privilege, mesmo critério do Core) — concede-se depois, se
-- necessário, pela UI de administração.
