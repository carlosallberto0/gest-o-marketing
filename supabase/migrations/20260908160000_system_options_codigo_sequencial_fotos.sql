-- =============================================================================
-- Marketing OS (novo) — Fase 2b: catálogo de opções, código sequencial, fotos
-- system_options, sequencias_codigo, pdvs.foto_url, storage (pdv-fotos/outdoor-fotos)
-- =============================================================================
--
-- PRÉ-REQUISITO: Fase 1 (20260908103000_core_usuarios_papeis_permissoes.sql) e
-- Fase 2 (20260908140000_midia_externa_outdoors_manutencao.sql) já aplicadas.
--
-- MOTIVAÇÃO: usuário testou as telas de PDVs/Outdoors e pediu 3 mudanças de
-- produto (ver ADR-009 para a decisão de arquitetura do catálogo genérico):
--   1. system_options — catálogo reutilizável de opção de campo (hoje só
--      pdvs.tipo), substituindo texto livre por valor validado no banco.
--   2. codigo gerado automaticamente no INSERT (PDV: prefixo = próprio tipo;
--      Outdoor: prefixo fixo OUT), com contador atômico seguro sob concorrência.
--   3. pdvs.foto_url + buckets de Storage para foto de PDV e de Outdoor.
--
-- DECISÃO DE DESIGN — validação de pdvs.tipo é TRIGGER, não CHECK.
--   CHECK constraint não pode referenciar outra tabela (a expressão precisa
--   ser IMMUTABLE por linha, sem subquery). system_options é uma tabela — logo
--   o mecanismo tem que ser trigger BEFORE INSERT OR UPDATE OF tipo, mesmo
--   padrão de validação cross-tabela já usado em manutencoes_before_update
--   (Fase 2). SECURITY DEFINER: quem cria/edita pdv não necessariamente tem
--   grant de leitura em system_options (o grant de leitura de system_options
--   segue outra regra, ver seção 2 abaixo) — a validação não pode depender
--   disso.
--
-- DECISÃO DE DESIGN — dado existente que violaria a nova restrição.
--   Antes de criar o trigger de validação, esta migration verifica (seção 1c)
--   se algum pdvs.tipo hoje gravado cai fora do catálogo recém-semeado
--   (POS/CONV) e ABORTA com exceção nomeando os valores encontrados, em vez
--   de deixar dado inconsistente sob um trigger que só valida daqui pra
--   frente. Registro existente nunca é descartado ou corrigido em silêncio —
--   quem aplica a migration decide o UPDATE de correção manualmente e roda de
--   novo.
--
-- DECISÃO DE DESIGN — contador de código sequencial: tabela pequena +
--   INSERT ... ON CONFLICT DO UPDATE ... RETURNING, sem lock explícito de
--   aplicação.
--   Esse upsert é uma única instrução atômica do Postgres: duas transações
--   concorrentes tentando incrementar o mesmo prefixo serializam pelo lock de
--   linha da constraint única (a segunda espera a primeira commitar, então lê
--   o valor já incrementado) — não existe janela de leitura-depois-escreve
--   como haveria em "SELECT ultimo_numero ... depois UPDATE". Padrão
--   documentado do próprio Postgres para contador concorrente, não precisa de
--   advisory lock nem de SELECT ... FOR UPDATE.
--   `sequencias_codigo` tem PK natural (`prefixo`), não `id uuid` — desvio
--   deliberado da convenção padrão do projeto: é uma tabela de controle
--   interna (uma linha por prefixo, nunca referenciada por FK de outra
--   tabela), o prefixo já é o identificador estável; um uuid substituto não
--   agregaria nada. RLS habilitada sem nenhuma policy e sem GRANT para
--   `authenticated` — só a função SECURITY DEFINER `gerar_codigo_sequencial`
--   (dona da tabela) acessa; nenhum papel de aplicação toca essa tabela
--   diretamente, por design.
--
-- DECISÃO DE DESIGN — Storage: dois buckets (pdv-fotos, outdoor-fotos), não
--   um único bucket com pastas por módulo.
--   Cada bucket mapeia 1:1 a um recurso de permissão já existente
--   (core/pdvs, midia_externa/outdoors) — a policy de storage.objects testa
--   só `bucket_id`, sem precisar inspecionar o path para decidir qual módulo
--   está em jogo. Convenção de path DENTRO de cada bucket: `{entidade_id}/
--   {nome_do_arquivo}` (ex.: `pdv-fotos/<pdv_id>/foto.jpg`,
--   `outdoor-fotos/<outdoor_id>/foto.jpg`) — o primeiro segmento do path
--   (via `storage.foldername(name)`) é o id da linha de negócio, usado nas
--   policies de leitura com escopo proprio_pdv. Buckets privados
--   (`public = false`): leitura também passa por RLS, espelhando quem lê a
--   linha da tabela (rede_toda ou proprio_pdv), não é público na internet.
--   Upload/edição/exclusão de arquivo: mesmo grant de criar/editar rede_toda
--   da tabela correspondente (é o que a tarefa pediu explicitamente para
--   upload; editar/excluir arquivo segue o mesmo grant de editar, por
--   simetria — quem pode editar o cadastro pode trocar/remover a foto dele).
--
-- PENDÊNCIA CONHECIDA (sinalizada, não decidida em silêncio): a policy de
-- leitura de `system_options` (seção 2) está atrelada literalmente a
-- has_permission('core','pdvs','criar'|'editar','rede_toda') — é a réplica
-- exata pedida para o consumidor de hoje (tela de PDV). Quando outro módulo
-- adotar system_options para outro campo, a policy de SELECT desta tabela
-- precisa ganhar mais um OR (ou ser substituída por algo mais amplo) —
-- decisão para quando esse consumidor existir, não antecipada aqui.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1a. system_options — catálogo genérico de opção de campo
-- -----------------------------------------------------------------------------
create table public.system_options (
  id uuid primary key default gen_random_uuid(),
  modulo text not null,
  campo text not null,
  valor text not null,
  rotulo text not null,
  ordem integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (modulo, campo, valor)
);

comment on table public.system_options is 'Catálogo genérico de opção de campo, reutilizável por qualquer módulo (hoje só core/pdv_tipo). Opção de campo do sistema vem daqui, nunca de enum/CHECK hardcoded no frontend — ver ADR-009.';
comment on column public.system_options.valor is 'Valor curto e estável, é o que fica gravado na tabela de negócio (ex.: POS, CONV). Nunca renomear um valor em uso — cria nova linha e desativa a antiga (is_active = false), senão quebra histórico gravado.';
comment on column public.system_options.rotulo is 'Texto amigável de exibição (ex.: Posto, Conveniência). Pode mudar livremente, não é o dado gravado na entidade.';

create index system_options_lookup_idx on public.system_options (modulo, campo, is_active);

create trigger set_updated_at
  before update on public.system_options
  for each row execute function public.update_updated_at_column();

alter table public.system_options enable row level security;

-- Seed: core/pdv_tipo — únicos dois valores pedidos agora; mais valores no
-- futuro são INSERT, não migration nova (é exatamente o propósito da tabela).
insert into public.system_options (modulo, campo, valor, rotulo, ordem) values
  ('core', 'pdv_tipo', 'POS', 'Posto', 1),
  ('core', 'pdv_tipo', 'CONV', 'Conveniência', 2)
on conflict (modulo, campo, valor) do nothing;


-- -----------------------------------------------------------------------------
-- 1b. RLS de system_options — leitura replica o grant de criar/editar pdvs
--     rede_toda (ver pendência no topo do arquivo); escrita restrita a
--     super_admin/admin via recurso próprio 'system_options', mesmo padrão de
--     papeis (catálogo similar) na migration do Core — a policy consulta
--     has_permission(), nunca hardcoda nome de papel.
-- -----------------------------------------------------------------------------
grant select on public.system_options to authenticated;
grant insert, update, delete on public.system_options to authenticated;

create policy system_options_select on public.system_options
  for select to authenticated
  using (
    public.has_permission('core', 'pdvs', 'criar', 'rede_toda')
    or public.has_permission('core', 'pdvs', 'editar', 'rede_toda')
    -- Revisão de segurança pós-schema: admin recebe grant de escrever no
    -- catálogo (abaixo) mas não tinha nenhum dos dois has_permission acima —
    -- sem este OR, o RETURNING do próprio INSERT/UPDATE de admin ficava
    -- invisível pra ele mesmo (policy de SELECT também filtra RETURNING).
    or public.has_permission('core', 'system_options', 'criar', 'rede_toda')
    or public.has_permission('core', 'system_options', 'editar', 'rede_toda')
  );

create policy system_options_insert on public.system_options
  for insert to authenticated
  with check (public.has_permission('core', 'system_options', 'criar', 'rede_toda'));

create policy system_options_update on public.system_options
  for update to authenticated
  using (public.has_permission('core', 'system_options', 'editar', 'rede_toda'))
  with check (public.has_permission('core', 'system_options', 'editar', 'rede_toda'));

create policy system_options_delete on public.system_options
  for delete to authenticated
  using (public.has_permission('core', 'system_options', 'excluir', 'rede_toda'));

-- Seed de permissão: super_admin (tudo) e admin (sem excluir, mesmo padrão
-- "exclusão física só super_admin" já usado em pdvs/papeis/usuarios).
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'core', 'system_options', acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('criar'), ('editar'), ('excluir')) as acao(nome)
where p.nome = 'super_admin'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'core', 'system_options', acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('criar'), ('editar')) as acao(nome)
where p.nome = 'admin'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;


-- -----------------------------------------------------------------------------
-- 1c. Verificação de dado existente ANTES de restringir pdvs.tipo (CLAUDE.md:
--     nunca descartar registro em silêncio). Aborta a migration inteira, com
--     os valores ofensores nomeados, se algum pdvs.tipo hoje gravado não
--     estiver no catálogo recém-semeado.
-- -----------------------------------------------------------------------------
do $$
declare
  v_tipos_invalidos text;
begin
  select string_agg(distinct tipo, ', ') into v_tipos_invalidos
  from public.pdvs
  where tipo not in (
    select valor from public.system_options
    where modulo = 'core' and campo = 'pdv_tipo' and is_active = true
  );

  if v_tipos_invalidos is not null then
    raise exception 'pdvs.tipo tem valor(es) fora do catálogo system_options (core/pdv_tipo): %. Corrija esses registros (UPDATE para POS/CONV, ou adicione o valor ao catálogo) antes de reaplicar esta migration.', v_tipos_invalidos;
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- 1d. Trigger de validação — pdvs.tipo só aceita valor ativo do catálogo
-- -----------------------------------------------------------------------------
create or replace function public.pdvs_validar_tipo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.system_options so
    where so.modulo = 'core'
      and so.campo = 'pdv_tipo'
      and so.valor = new.tipo
      and so.is_active = true
  ) then
    raise exception 'tipo de pdv "%" inválido — precisa ser um valor ativo em system_options (modulo=core, campo=pdv_tipo)', new.tipo;
  end if;
  return new;
end;
$$;

comment on function public.pdvs_validar_tipo is 'Substitui CHECK hardcoded (impossível aqui: CHECK não referencia outra tabela) por validação cross-tabela contra system_options. SECURITY DEFINER: a checagem não pode depender do grant de leitura de system_options de quem está criando/editando o pdv.';

create trigger before_insert_update_validar_tipo
  before insert or update of tipo on public.pdvs
  for each row execute function public.pdvs_validar_tipo();

comment on column public.pdvs.tipo is 'Valor validado contra system_options (modulo=core, campo=pdv_tipo) pelo trigger before_insert_update_validar_tipo — não é mais texto livre (substitui o comentário da Fase 1).';


-- =============================================================================
-- 2. Código sequencial automático — sequencias_codigo + gerar_codigo_sequencial
-- =============================================================================
create table public.sequencias_codigo (
  prefixo text primary key,
  ultimo_numero integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sequencias_codigo is 'Contador atômico por prefixo (POS, CONV, OUT, ...), acessado só por gerar_codigo_sequencial(). PK natural (prefixo), não uuid — desvio deliberado da convenção padrão, ver nota de topo do arquivo. RLS habilitada sem nenhuma policy e sem GRANT a authenticated: inacessível por qualquer papel de aplicação, só a função SECURITY DEFINER (dona da tabela) escreve nela.';

alter table public.sequencias_codigo enable row level security;
-- Sem policy e sem GRANT a authenticated de propósito: bloqueio total por
-- fora da função SECURITY DEFINER abaixo.

create or replace function public.gerar_codigo_sequencial(p_prefixo text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero integer;
begin
  insert into public.sequencias_codigo (prefixo, ultimo_numero, updated_at)
  values (p_prefixo, 1, now())
  on conflict (prefixo) do update
    set ultimo_numero = public.sequencias_codigo.ultimo_numero + 1,
        updated_at = now()
  returning ultimo_numero into v_numero;

  return p_prefixo || '-' || lpad(v_numero::text, 4, '0');
end;
$$;

comment on function public.gerar_codigo_sequencial is 'Gera "<PREFIXO>-NNNN" (4 dígitos, zero à esquerda), contador independente por prefixo. Atômico sob concorrência via INSERT ... ON CONFLICT DO UPDATE ... RETURNING: duas transações incrementando o mesmo prefixo serializam pelo lock de linha da PK, sem janela de leitura-depois-escreve. SECURITY DEFINER para poder escrever em sequencias_codigo independente do grant do chamador.';

-- Revisão de segurança pós-schema: por padrão do Postgres, EXECUTE em função
-- nova fica liberado a PUBLIC a menos que seja revogado explicitamente — sem
-- este revoke, qualquer authenticated chamaria rpc/gerar_codigo_sequencial
-- direto (prefixo arbitrário), incrementando sequencias_codigo fora do fluxo
-- real de criação de pdv/outdoor. As triggers pdvs_gerar_codigo/
-- outdoors_gerar_codigo continuam funcionando: dono de função sempre pode
-- executar a própria função, independente de grant.
revoke execute on function public.gerar_codigo_sequencial(text) from public;


-- -----------------------------------------------------------------------------
-- 2a. pdvs — gera código no INSERT a partir do próprio tipo (POS-0001,
--     CONV-0001, contadores independentes). Só quando NEW.codigo vier nulo/
--     vazio — coluna continua aceitando código explícito; editar tipo depois
--     NUNCA regera código, porque este trigger só roda em BEFORE INSERT.
-- -----------------------------------------------------------------------------
create or replace function public.pdvs_gerar_codigo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.codigo is null or btrim(new.codigo) = '' then
    new.codigo := public.gerar_codigo_sequencial(new.tipo);
  end if;
  return new;
end;
$$;

comment on function public.pdvs_gerar_codigo is 'BEFORE INSERT: gera codigo = "<tipo>-NNNN" quando NEW.codigo vem nulo/vazio. Roda depois de before_insert_update_validar_tipo (ordem alfabética de nome de trigger: before_insert_gerar_codigo < before_insert_update_validar_tipo — mas a ordem entre as duas não afeta corretude, pois esta função só lê new.tipo, não depende do resultado da validação; se tipo for inválido, a validação aborta a transação inteira e o incremento do contador é desfeito no rollback).';

create trigger before_insert_gerar_codigo
  before insert on public.pdvs
  for each row execute function public.pdvs_gerar_codigo();


-- -----------------------------------------------------------------------------
-- 2b. outdoors — gera código no INSERT com prefixo fixo OUT (OUT-0001, ...),
--     sem relação com tipo de pdv. Mesma regra de "só se vier nulo/vazio".
-- -----------------------------------------------------------------------------
create or replace function public.outdoors_gerar_codigo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.codigo is null or btrim(new.codigo) = '' then
    new.codigo := public.gerar_codigo_sequencial('OUT');
  end if;
  return new;
end;
$$;

comment on function public.outdoors_gerar_codigo is 'BEFORE INSERT: gera codigo = "OUT-NNNN" quando NEW.codigo vem nulo/vazio. Prefixo fixo, contador próprio (independente de POS/CONV).';

create trigger before_insert_gerar_codigo
  before insert on public.outdoors
  for each row execute function public.outdoors_gerar_codigo();


-- =============================================================================
-- 3. pdvs.foto_url — mesmo padrão de outdoors.foto_url (nullable, sem
--    alterar outdoors.foto_url, que já existe)
-- =============================================================================
alter table public.pdvs add column foto_url text;

comment on column public.pdvs.foto_url is 'URL pública assinada/objeto do bucket de Storage pdv-fotos. Nullable — nem todo pdv tem foto cadastrada. Mesmo padrão de outdoors.foto_url (Fase 2).';


-- =============================================================================
-- 4. Storage — buckets pdv-fotos e outdoor-fotos + RLS de storage.objects
-- Ver decisão de design no topo do arquivo (bucket por recurso, path
-- {entidade_id}/{arquivo}, buckets privados).
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('pdv-fotos', 'pdv-fotos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('outdoor-fotos', 'outdoor-fotos', false)
on conflict (id) do nothing;

-- storage.objects já vem com RLS habilitada por padrão na plataforma
-- Supabase, e authenticated já tem os GRANTs base configurados pela
-- plataforma (modelo padrão de Storage: grant amplo + RLS decide) — esta
-- migration só acrescenta as policies especificas dos dois buckets novos,
-- sem repetir ALTER/GRANT de schema interno.

-- pdv-fotos: upload/edição/exclusão = mesmo grant de criar/editar rede_toda
-- de pdvs; leitura espelha pdvs_select (rede_toda ou proprio_pdv, via
-- primeiro segmento do path = pdv_id).
create policy pdv_fotos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'pdv-fotos'
    and (
      public.has_permission('core', 'pdvs', 'ler', 'rede_toda')
      or (
        public.has_permission('core', 'pdvs', 'ler', 'proprio_pdv')
        and (storage.foldername(name))[1] = public.usuario_pdv_id()::text
      )
    )
  );

create policy pdv_fotos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pdv-fotos'
    and (
      public.has_permission('core', 'pdvs', 'criar', 'rede_toda')
      or public.has_permission('core', 'pdvs', 'editar', 'rede_toda')
    )
  );

create policy pdv_fotos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'pdv-fotos' and public.has_permission('core', 'pdvs', 'editar', 'rede_toda'))
  with check (bucket_id = 'pdv-fotos' and public.has_permission('core', 'pdvs', 'editar', 'rede_toda'));

create policy pdv_fotos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'pdv-fotos' and public.has_permission('core', 'pdvs', 'editar', 'rede_toda'));


-- outdoor-fotos: upload/edição/exclusão = mesmo grant de criar/editar
-- rede_toda de outdoors; leitura espelha outdoors_select (rede_toda ou
-- proprio_pdv, via join com outdoors para achar o pdv_id do outdoor no path).
create policy outdoor_fotos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'outdoor-fotos'
    and exists (
      select 1 from public.outdoors o
      where o.id::text = (storage.foldername(name))[1]
        and (
          public.has_permission('midia_externa', 'outdoors', 'ler', 'rede_toda')
          or (
            public.has_permission('midia_externa', 'outdoors', 'ler', 'proprio_pdv')
            and o.pdv_id = public.usuario_pdv_id()
          )
        )
    )
  );

create policy outdoor_fotos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'outdoor-fotos'
    and (
      public.has_permission('midia_externa', 'outdoors', 'criar', 'rede_toda')
      or public.has_permission('midia_externa', 'outdoors', 'editar', 'rede_toda')
    )
  );

create policy outdoor_fotos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'outdoor-fotos' and public.has_permission('midia_externa', 'outdoors', 'editar', 'rede_toda'))
  with check (bucket_id = 'outdoor-fotos' and public.has_permission('midia_externa', 'outdoors', 'editar', 'rede_toda'));

create policy outdoor_fotos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'outdoor-fotos' and public.has_permission('midia_externa', 'outdoors', 'editar', 'rede_toda'));
