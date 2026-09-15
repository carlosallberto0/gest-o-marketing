-- =============================================================================
-- Marketing OS (novo) — Fase 7: Análise Estratégica
-- analise_pesos_tipo, analise_clusters_config, analise_clusters_calculo,
-- analise_insights, função analise_recalcular(), analise_marcar_insight_lido()
-- =============================================================================
--
-- CONTEXTO: BI de clusterização de PDV combinando score de Mídia Externa
-- (outdoors) e Merchandising (avaliacoes_pdv). Só leitura de dado já
-- existente — sem tela nova, sem storage novo, sem tabela de configuração
-- chave-valor solta (analise_relatorios e analise_config do sistema antigo
-- eram tabela morta, sem UI nem job — não replicadas aqui).
--
-- BUG DE ARQUITETURA DO SISTEMA ANTIGO (PRD 2.4) — CORRIGIDO NA RAIZ, NÃO
-- REORDENADO:
--   O sistema antigo guardava peso mídia/merchandising E critério de corte
--   por LINHA de cluster. Como um tipo de PDV tem vários clusters (4 faixas),
--   e todos deveriam usar o mesmo peso, a aplicação sempre lia o peso do
--   PRIMEIRO cluster do tipo (ver memória do projeto,
--   `clusterizacao-usa-primeiro-cluster.md`) — se algum cluster divergisse,
--   a divergência era silenciosamente ignorada. Aqui:
--     - `analise_pesos_tipo` guarda o peso UMA VEZ por tipo_pdv (não por
--       cluster) — não existe "peso do cluster", então não existe "primeiro
--       cluster do tipo" para desambiguar.
--     - `analise_clusters_config` não tem NENHUMA coluna de peso/critério —
--       só identidade visual (nome, cor) e faixa de corte.
--     - Constraint `analise_clusters_config_sem_sobreposicao` (EXCLUDE USING
--       gist) é a segunda trava: rejeita, de forma atômica no próprio
--       Postgres, INSERT/UPDATE que crie sobreposição de faixa entre
--       clusters ATIVOS do mesmo tipo_pdv. É EXCLUDE, não trigger com
--       `exists(select ...)` — um trigger com SELECT-depois-INSERT tem
--       janela de corrida entre duas transações concorrentes (cada uma vê
--       "sem sobreposição" antes da outra commitar, e as duas passam),
--       reabrindo a mesma ambiguidade por outra porta. EXCLUDE é verificado
--       pelo índice da própria constraint, sem essa janela. Sem isso, a
--       ambiguidade "qual cluster vale pra pontuação X" reapareceria mesmo
--       com o peso já corrigido.
--
-- SCORE DE MÍDIA — pesos iguais (1/3 cada) entre conservação, visibilidade e
--   tamanho_m2 são um DEFAULT FIXO no código desta função, não um valor
--   herdado/validado de negócio. Fica explícito aqui e nos comentários da
--   função: quando existir uma fase de configuração de critério de score de
--   mídia, esses três pesos viram dado, não constante em SQL.
--
-- INTERPRETAÇÃO ADOTADA (ambíguo na especificação, decidido aqui) —
--   "outdoor ativo" em `visibilidade` = outdoors.is_active = true (outdoor
--   cadastrado e não excluído por soft delete), não status_operacional =
--   'operacional'. Motivo: `conservacao` já mede a proporção operacional;
--   se `visibilidade` também exigisse operacional, ela seria redundante com
--   `conservacao` sempre que nenhum outdoor estiver operacional. Como
--   dimensão distinta, `visibilidade` mede presença física de mídia no PDV
--   (o PDV tem outdoor cadastrado ali, ponto), independente da condição.
--   Mesma leitura de "ativo" (is_active) usada para excluir outdoor
--   soft-deletado do total e da área média.
--
-- ISOLAMENTO: nenhuma das 4 tabelas filtra por pdv_id — BI consolidado é
--   rede toda por natureza, não dado operacional de posto. RLS fail-closed
--   via has_permission(), GRANT explícito em toda tabela (convenção do
--   projeto: RLS sozinha não basta).
--
-- RECÁLCULO só por `super_admin` (não `director`) — decisão já registrada
--   para o sistema antigo em `docs/decisions/ADR-002-recalculo-diretor.md` e
--   reaplicada aqui: recálculo apaga e reinsere `analise_clusters_calculo`
--   inteira (operação destrutiva de escrita), não é leitura cara. O diretor
--   cobre "dado está atualizado?" lendo `data_calculo` da linha mais recente,
--   sem precisar do botão.
-- =============================================================================

-- Extensão necessária pra constraint EXCLUDE USING gist de
-- analise_clusters_config (índice GiST sobre tipo_pdv + numrange precisa do
-- operator class de igualdade de btree_gist pra combinar `=` com `&&`).
create extension if not exists btree_gist;


-- -----------------------------------------------------------------------------
-- 0. Função de validação de tipo_pdv compartilhada — mesma técnica de
--    `pdvs_validar_tipo` (CHECK não referencia outra tabela, então a
--    validação cross-tabela contra system_options precisa ser trigger).
--    Compartilhada entre analise_pesos_tipo e analise_clusters_config porque
--    as duas usam a mesma coluna `tipo_pdv` com a mesma regra.
-- -----------------------------------------------------------------------------
create or replace function public.analise_validar_tipo_pdv()
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
      and so.valor = new.tipo_pdv
      and so.is_active = true
  ) then
    raise exception 'tipo_pdv "%" inválido — precisa ser um valor ativo em system_options (modulo=core, campo=pdv_tipo)', new.tipo_pdv;
  end if;
  return new;
end;
$$;

comment on function public.analise_validar_tipo_pdv is 'Validação cross-tabela de tipo_pdv contra system_options (core/pdv_tipo), compartilhada por analise_pesos_tipo e analise_clusters_config. Mesmo padrão de pdvs_validar_tipo. SECURITY DEFINER para não depender do grant de leitura de system_options de quem está editando a config.';


-- -----------------------------------------------------------------------------
-- 1. analise_pesos_tipo — peso mídia/merchandising POR TIPO (não por cluster)
-- -----------------------------------------------------------------------------
create table public.analise_pesos_tipo (
  id uuid primary key default gen_random_uuid(),
  tipo_pdv text not null unique,
  peso_midia numeric(3,2) not null,
  peso_merchandising numeric(3,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (peso_midia >= 0 and peso_midia <= 1),
  check (peso_merchandising >= 0 and peso_merchandising <= 1),
  check (abs((peso_midia + peso_merchandising) - 1) < 0.001)
);

comment on table public.analise_pesos_tipo is 'Peso mídia/merchandising por tipo_pdv, uma linha por tipo — corrige o bug do sistema antigo de guardar peso por linha de cluster (ver nota de topo do arquivo). Só super_admin edita.';

create trigger set_updated_at
  before update on public.analise_pesos_tipo
  for each row execute function public.update_updated_at_column();

create trigger before_insert_update_validar_tipo
  before insert or update of tipo_pdv on public.analise_pesos_tipo
  for each row execute function public.analise_validar_tipo_pdv();

alter table public.analise_pesos_tipo enable row level security;

-- Seed: pesos do sistema antigo (POS 0.7/0.3, CONV 0.4/0.6).
insert into public.analise_pesos_tipo (tipo_pdv, peso_midia, peso_merchandising) values
  ('POS', 0.7, 0.3),
  ('CONV', 0.4, 0.6)
on conflict (tipo_pdv) do nothing;


-- -----------------------------------------------------------------------------
-- 2. analise_clusters_config — SEM peso/critério (ver nota de topo do arquivo)
-- -----------------------------------------------------------------------------
create table public.analise_clusters_config (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo_pdv text not null,
  cor_hex text not null,
  faixa_min numeric(5,2) not null,
  faixa_max numeric(5,2) not null,
  ordem integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tipo_pdv, nome),
  check (cor_hex ~ '^#[0-9a-fA-F]{6}$'),
  check (faixa_min >= 0 and faixa_max <= 100 and faixa_min < faixa_max)
);

comment on table public.analise_clusters_config is 'Faixa de classificação de cluster por tipo_pdv. Sem coluna de peso/critério de propósito — isso é o que o sistema antigo errava (ver nota de topo do arquivo). Só super_admin edita.';
comment on column public.analise_clusters_config.faixa_min is 'Faixa fechada nos dois extremos ([faixa_min, faixa_max]). Sobreposição entre clusters ativos do mesmo tipo_pdv é rejeitada de forma atômica pela constraint analise_clusters_config_sem_sobreposicao (EXCLUDE USING gist).';

create index analise_clusters_config_tipo_pdv_idx on public.analise_clusters_config (tipo_pdv, is_active);

create trigger set_updated_at
  before update on public.analise_clusters_config
  for each row execute function public.update_updated_at_column();

create trigger before_insert_update_validar_tipo
  before insert or update of tipo_pdv on public.analise_clusters_config
  for each row execute function public.analise_validar_tipo_pdv();

alter table public.analise_clusters_config enable row level security;

-- Constraint de causa raiz nº 2: rejeita sobreposição de faixa entre
-- clusters ATIVOS do mesmo tipo_pdv, de forma atômica (verificada pelo
-- índice GiST da própria constraint, sem SELECT-depois-INSERT). Só compara
-- contra outras linhas ativas via `where (is_active)` — desativar um cluster
-- nunca dispara conflito, e reativar volta a comparar. Achado do
-- rls-security-reviewer: a versão anterior era um trigger com
-- `exists(select ...)` antes do insert/update, que tinha janela de corrida
-- entre duas transações concorrentes (cada uma via "sem sobreposição" antes
-- da outra commitar, e as duas passavam) — reabria a mesma ambiguidade que
-- esta trava existe pra eliminar. EXCLUDE não tem essa janela.
alter table public.analise_clusters_config
  add constraint analise_clusters_config_sem_sobreposicao
  exclude using gist (
    tipo_pdv with =,
    numrange(faixa_min, faixa_max, '[]') with &&
  ) where (is_active);

-- Seed: 8 clusters padrão do sistema antigo (4 por tipo, faixas do PRD).
insert into public.analise_clusters_config (nome, tipo_pdv, cor_hex, faixa_min, faixa_max, ordem) values
  ('Necessita Merchandising', 'CONV', '#f97316', 50, 69, 2),
  ('Oportunidade Visível', 'CONV', '#eab308', 70, 84, 1),
  ('Premium Plus', 'CONV', '#22c55e', 85, 100, 0),
  ('Crítico', 'CONV', '#ef4444', 0, 49, 3),
  ('Parada Funcional', 'POS', '#f97316', 50, 69, 2),
  ('Viário Prioritário', 'POS', '#eab308', 70, 84, 1),
  ('Estratégico Total', 'POS', '#22c55e', 85, 100, 0),
  ('Necessita Atenção', 'POS', '#ef4444', 0, 49, 3)
on conflict (tipo_pdv, nome) do nothing;


-- -----------------------------------------------------------------------------
-- 3. analise_clusters_calculo — snapshot, apagado e reinserido a cada
--    recálculo (sem histórico temporal, decisão preexistente do domínio).
--    Só a função analise_recalcular() (SECURITY DEFINER) escreve — sem GRANT
--    de INSERT/UPDATE/DELETE pra nenhum papel de aplicação.
-- -----------------------------------------------------------------------------
create table public.analise_clusters_calculo (
  id uuid primary key default gen_random_uuid(),
  pdv_id uuid not null references public.pdvs(id),
  tipo_pdv text not null,
  cluster_id uuid references public.analise_clusters_config(id),
  score_midia numeric(5,2) not null,
  score_merch numeric(5,2),
  pontuacao_total numeric(5,2) not null,
  gap_midia_merch numeric(6,2) not null,
  potencial_aproveitamento numeric(5,2) not null,
  data_calculo timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.analise_clusters_calculo is 'Snapshot do último recálculo, apagado e reinserido inteiro por analise_recalcular() — sem histórico temporal (decisão preexistente do domínio, ver clusterizacao-usa-primeiro-cluster na memória do projeto). Escrita exclusiva da função SECURITY DEFINER: sem GRANT de insert/update/delete a nenhum papel.';
comment on column public.analise_clusters_calculo.tipo_pdv is 'Cópia do pdvs.tipo no momento do cálculo (snapshot) — não FK, de propósito: o tipo do pdv pode mudar depois sem invalidar retroativamente um cálculo já gravado.';
comment on column public.analise_clusters_calculo.score_merch is 'Null quando o pdv não tem avaliação concluída — sinaliza pdv sem avaliação sem travar o cálculo dos demais. Entra como 0 em pontuacao_total/gap_midia_merch (ver função analise_recalcular).';
comment on column public.analise_clusters_calculo.cluster_id is 'Nullable: só fica null se não existir NENHUM cluster ativo cadastrado para aquele tipo_pdv (ausência total de config, não apenas um buraco de faixa — buraco de faixa cai no fallback de faixa_min mais baixo, ver analise_recalcular).';

create index analise_clusters_calculo_pdv_id_idx on public.analise_clusters_calculo (pdv_id);
create index analise_clusters_calculo_cluster_id_idx on public.analise_clusters_calculo (cluster_id);

-- Trigger criado por consistência de convenção, mas é código morto por
-- construção: a tabela é sempre apagada e reinserida (nunca UPDATE), igual
-- observação já feita em audit_logs.
create trigger set_updated_at
  before update on public.analise_clusters_calculo
  for each row execute function public.update_updated_at_column();

alter table public.analise_clusters_calculo enable row level security;


-- -----------------------------------------------------------------------------
-- 4. analise_insights — retenção de 30 dias (diferente do snapshot acima).
--    Cliente só altera `lido`, e só via analise_marcar_insight_lido().
-- -----------------------------------------------------------------------------
create table public.analise_insights (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null,
  tipo text not null check (tipo in ('alerta', 'oportunidade', 'tendencia')),
  tipo_pdv text,
  dados jsonb not null default '{}'::jsonb,
  lido boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.analise_insights is 'Insight agregado (não uma linha por pdv), recalculado junto com analise_clusters_calculo. Retenção de 30 dias: analise_recalcular() apaga insight com mais de 30 dias antes de inserir os novos. Cliente só pode alterar `lido`, via função analise_marcar_insight_lido — sem UPDATE geral de linha liberado por GRANT.';
comment on column public.analise_insights.tipo_pdv is 'Nullable: insight de rede toda (regras 1, 2 e 4) não tem tipo_pdv; insight por tipo (regra 3, cluster crítico) preenche.';
comment on column public.analise_insights.dados is 'Resumo agregado (contagem + lista dos piores/casos), nunca uma linha de insight por pdv — ver função analise_recalcular.';

create index analise_insights_tipo_idx on public.analise_insights (tipo, created_at desc);
create index analise_insights_lido_idx on public.analise_insights (lido);

create trigger set_updated_at
  before update on public.analise_insights
  for each row execute function public.update_updated_at_column();

alter table public.analise_insights enable row level security;


-- =============================================================================
-- 5. RLS + GRANT — fail-closed via has_permission(), sem isolamento por
--    pdv_id (BI consolidado é rede toda por natureza, não dado operacional
--    de posto).
-- =============================================================================

-- analise_pesos_tipo / analise_clusters_config: 'ler' e 'editar' são ações
-- separadas (mesmo padrão ler/editar do módulo Estúdio) — 'editar' cobre
-- leitura e escrita (super_admin não precisa de grant extra de 'ler'),
-- 'ler' é só leitura (director, que monta o dashboard com nome/cor/faixa do
-- cluster via join, mas não edita config). Sem GRANT de DELETE: hard delete
-- não foi pedido pra este módulo; desativar cluster é UPDATE de is_active
-- (soft delete já coberto pela própria coluna).
grant select, insert, update on public.analise_pesos_tipo to authenticated;

create policy analise_pesos_tipo_select on public.analise_pesos_tipo
  for select to authenticated
  using (
    public.has_permission('analise', 'config', 'ler', 'rede_toda')
    or public.has_permission('analise', 'config', 'editar', 'rede_toda')
  );

create policy analise_pesos_tipo_insert on public.analise_pesos_tipo
  for insert to authenticated
  with check (public.has_permission('analise', 'config', 'editar', 'rede_toda'));

create policy analise_pesos_tipo_update on public.analise_pesos_tipo
  for update to authenticated
  using (public.has_permission('analise', 'config', 'editar', 'rede_toda'))
  with check (public.has_permission('analise', 'config', 'editar', 'rede_toda'));


grant select, insert, update on public.analise_clusters_config to authenticated;

create policy analise_clusters_config_select on public.analise_clusters_config
  for select to authenticated
  using (
    public.has_permission('analise', 'config', 'ler', 'rede_toda')
    or public.has_permission('analise', 'config', 'editar', 'rede_toda')
  );

create policy analise_clusters_config_insert on public.analise_clusters_config
  for insert to authenticated
  with check (public.has_permission('analise', 'config', 'editar', 'rede_toda'));

create policy analise_clusters_config_update on public.analise_clusters_config
  for update to authenticated
  using (public.has_permission('analise', 'config', 'editar', 'rede_toda'))
  with check (public.has_permission('analise', 'config', 'editar', 'rede_toda'));


-- analise_clusters_calculo: só SELECT liberado a authenticated. Sem GRANT de
-- insert/update/delete pra nenhum papel — só analise_recalcular() (dona da
-- tabela, SECURITY DEFINER) escreve, independente de GRANT.
grant select on public.analise_clusters_calculo to authenticated;

create policy analise_clusters_calculo_select on public.analise_clusters_calculo
  for select to authenticated
  using (public.has_permission('analise', 'clusters', 'ler', 'rede_toda'));


-- analise_insights: só SELECT liberado a authenticated pelo mesmo motivo —
-- `lido` só muda via analise_marcar_insight_lido() (SECURITY DEFINER).
grant select on public.analise_insights to authenticated;

create policy analise_insights_select on public.analise_insights
  for select to authenticated
  using (public.has_permission('analise', 'insights', 'ler', 'rede_toda'));


-- =============================================================================
-- 6. analise_recalcular() — cálculo + snapshot + insights, tudo em uma
--    transação (corpo de função plpgsql é uma transação implícita).
-- =============================================================================
create or replace function public.analise_recalcular()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_linhas_antes integer;
  v_linhas_depois integer;
  v_gap_count integer;
  v_gap_lista jsonb;
  v_oportunidade_count integer;
  v_oportunidade_lista jsonb;
  v_media_midia numeric;
  v_media_merch numeric;
begin
  if not public.has_permission('analise', 'clusters', 'recalcular', 'rede_toda') then
    raise exception 'sem permissão para recalcular a análise estratégica';
  end if;

  select count(*) into v_linhas_antes from public.analise_clusters_calculo;

  -- Tabela temporária de trabalho: computa uma vez, reusa nas 4 regras de
  -- insight abaixo sem repetir a CTE inteira a cada INSERT. `drop if exists`
  -- é guarda contra chamada dupla dentro da mesma transação/sessão (on
  -- commit drop só limpa no commit da transação chamadora).
  drop table if exists tmp_analise_calculo;

  create temporary table tmp_analise_calculo on commit drop as
  with outdoors_agg as (
    select
      o.pdv_id,
      count(*) filter (where o.is_active) as total_outdoors,
      count(*) filter (where o.is_active and o.status_operacional = 'operacional') as operacionais,
      avg(o.area_m2) filter (where o.is_active) as area_media
    from public.outdoors o
    group by o.pdv_id
  ),
  -- Score de mídia: pesos iguais (1/3 cada) entre conservação, visibilidade e
  -- tamanho_m2 — DEFAULT FIXO nesta função, não critério configurável ainda
  -- (ver nota de topo do arquivo). "outdoor ativo" = is_active = true.
  -- `where p.status = 'ativo'` — PRD 2.4 ("Lógica de clusterização", item 1)
  -- é explícito: clusterização parte de PDVs ativos. Sem esse filtro, um
  -- pdv soft-deletado (status = 'inativo') entraria no snapshot e nos
  -- insights como se fosse operação corrente. O filtro é só aqui: todas as
  -- CTEs seguintes (score_merch_calc, o select final, tmp_analise_final) só
  -- fazem join a partir de score_midia_calc/tmp_analise_calculo, então a
  -- exclusão de pdv inativo propaga pro cálculo, snapshot e insights inteiros.
  score_midia_calc as (
    select
      p.id as pdv_id,
      p.tipo as tipo_pdv,
      -- score_midia_raw computado uma vez aqui (não repetido 3x no select
      -- final) — média simples de conservacao/visibilidade/tamanho_m2.
      (
        (case when coalesce(oa.total_outdoors, 0) > 0
          then (oa.operacionais::numeric / oa.total_outdoors) * 100
          else 0
        end)
        + (case when coalesce(oa.total_outdoors, 0) > 0 then 100 else 0 end)
        + (least(coalesce(oa.area_media, 0) / 50, 1) * 100)
      ) / 3 as score_midia_raw
    from public.pdvs p
    left join outdoors_agg oa on oa.pdv_id = p.id
    where p.status = 'ativo'
  ),
  -- Score de merchandising: percentual_total da avaliação concluída mais
  -- recente por pdv, sem decompor/recompor por critério (ver nota de topo).
  score_merch_calc as (
    select distinct on (a.pdv_id)
      a.pdv_id,
      a.percentual_total
    from public.avaliacoes_pdv a
    where a.status = 'concluida'
    order by a.pdv_id, a.concluida_em desc nulls last, a.data_avaliacao desc
  )
  select
    smc.pdv_id,
    smc.tipo_pdv,
    round(smc.score_midia_raw, 2) as score_midia,
    sm.percentual_total as score_merch,
    round(
      smc.score_midia_raw * pw.peso_midia
      + coalesce(sm.percentual_total, 0) * pw.peso_merchandising,
      2
    ) as pontuacao_total,
    round(smc.score_midia_raw - coalesce(sm.percentual_total, 0), 2) as gap_midia_merch
  from score_midia_calc smc
  left join score_merch_calc sm on sm.pdv_id = smc.pdv_id
  -- inner join de propósito: pdv cujo tipo não tem peso cadastrado em
  -- analise_pesos_tipo fica de fora do cálculo (config incompleta, não um
  -- pdv pra travar o recálculo inteiro). Seed cobre POS/CONV.
  join public.analise_pesos_tipo pw on pw.tipo_pdv = smc.tipo_pdv;

  drop table if exists tmp_analise_final;

  create temporary table tmp_analise_final on commit drop as
  select
    t.*,
    round(100 - t.pontuacao_total, 2) as potencial_aproveitamento,
    coalesce(
      -- caso normal: cluster ativo cuja faixa contém a pontuação
      (
        select c.id from public.analise_clusters_config c
        where c.tipo_pdv = t.tipo_pdv
          and c.is_active = true
          and t.pontuacao_total >= c.faixa_min
          and t.pontuacao_total <= c.faixa_max
        order by c.faixa_min asc
        limit 1
      ),
      -- buraco de configuração: nenhuma faixa ativa cobre a pontuação —
      -- usa o cluster de faixa_min mais baixa daquele tipo.
      (
        select c.id from public.analise_clusters_config c
        where c.tipo_pdv = t.tipo_pdv
          and c.is_active = true
        order by c.faixa_min asc
        limit 1
      )
    ) as cluster_id
  from tmp_analise_calculo t;

  select count(*) into v_linhas_depois from tmp_analise_final;

  delete from public.analise_clusters_calculo;

  insert into public.analise_clusters_calculo
    (pdv_id, tipo_pdv, cluster_id, score_midia, score_merch, pontuacao_total, gap_midia_merch, potencial_aproveitamento, data_calculo)
  select
    pdv_id, tipo_pdv, cluster_id, score_midia, score_merch, pontuacao_total, gap_midia_merch, potencial_aproveitamento, now()
  from tmp_analise_final;

  -- Ação destrutiva (apaga e reinsere o snapshot inteiro): registra em
  -- audit_logs. entity_id null — a ação é sobre a tabela inteira, não uma
  -- linha específica (mesmo padrão de transição em lote já usado em outras
  -- fases).
  insert into public.audit_logs (action, entity_type, entity_id, usuario_id, dados_antes, dados_depois)
  values (
    'analise_recalcular',
    'analise_clusters_calculo',
    null,
    auth.uid(),
    jsonb_build_object('linhas_antes', v_linhas_antes),
    jsonb_build_object('linhas_depois', v_linhas_depois)
  );

  -- Retenção de 30 dias dos insights (diferente do snapshot acima, que não
  -- tem histórico nenhum).
  delete from public.analise_insights where created_at < now() - interval '30 days';

  -- Regra 1: alerta se existir pdv com abs(gap) > 25. Agregado: contagem +
  -- lista dos 10 piores por abs(gap), não uma linha por pdv.
  select
    count(*),
    (
      select jsonb_agg(x) from (
        select pdv_id, tipo_pdv, score_midia, score_merch, gap_midia_merch
        from tmp_analise_final
        where abs(gap_midia_merch) > 25
        order by abs(gap_midia_merch) desc
        limit 10
      ) x
    )
  into v_gap_count, v_gap_lista
  from tmp_analise_final
  where abs(gap_midia_merch) > 25;

  if v_gap_count > 0 then
    insert into public.analise_insights (titulo, descricao, tipo, tipo_pdv, dados)
    values (
      'Gap entre mídia e merchandising',
      format('%s pdv(s) com diferença acima de 25 pontos entre score de mídia e merchandising.', v_gap_count),
      'alerta',
      null,
      jsonb_build_object('quantidade', v_gap_count, 'piores', coalesce(v_gap_lista, '[]'::jsonb))
    );
  end if;

  -- Regra 2: oportunidade se existir pdv com potencial_aproveitamento > 40.
  select
    count(*),
    (
      select jsonb_agg(x) from (
        select pdv_id, tipo_pdv, pontuacao_total, potencial_aproveitamento
        from tmp_analise_final
        where potencial_aproveitamento > 40
        order by potencial_aproveitamento desc
        limit 10
      ) x
    )
  into v_oportunidade_count, v_oportunidade_lista
  from tmp_analise_final
  where potencial_aproveitamento > 40;

  if v_oportunidade_count > 0 then
    insert into public.analise_insights (titulo, descricao, tipo, tipo_pdv, dados)
    values (
      'Potencial de aproveitamento acima da média',
      format('%s pdv(s) com potencial de aproveitamento acima de 40 pontos.', v_oportunidade_count),
      'oportunidade',
      null,
      jsonb_build_object('quantidade', v_oportunidade_count, 'melhores', coalesce(v_oportunidade_lista, '[]'::jsonb))
    );
  end if;

  -- Regra 3: um alerta por tipo_pdv que tenha algum pdv em cluster crítico
  -- (faixa_max <= 50).
  insert into public.analise_insights (titulo, descricao, tipo, tipo_pdv, dados)
  select
    'Clusters críticos em ' || t.tipo_pdv,
    format('%s pdv(s) do tipo %s estão em cluster crítico.', count(*), t.tipo_pdv),
    'alerta',
    t.tipo_pdv,
    jsonb_build_object(
      'quantidade', count(*),
      'pdvs', jsonb_agg(jsonb_build_object('pdv_id', t.pdv_id, 'pontuacao_total', t.pontuacao_total))
    )
  from tmp_analise_final t
  join public.analise_clusters_config c on c.id = t.cluster_id
  where c.faixa_max <= 50
  group by t.tipo_pdv;

  -- Regra 4: tendência se abs(média(score_merch) - média(score_midia)) > 10
  -- entre todos os pdvs calculados. score_merch null entra como 0 (mesma
  -- regra de "entra no cálculo como 0" da pontuação ponderada).
  select avg(score_midia), avg(coalesce(score_merch, 0))
  into v_media_midia, v_media_merch
  from tmp_analise_final;

  if v_media_midia is not null and abs(v_media_merch - v_media_midia) > 10 then
    insert into public.analise_insights (titulo, descricao, tipo, tipo_pdv, dados)
    values (
      'Tendência entre mídia e merchandising',
      format(
        'Média de score de %s está %s pontos acima da média de %s na rede.',
        case when v_media_midia > v_media_merch then 'mídia' else 'merchandising' end,
        round(abs(v_media_midia - v_media_merch), 2),
        case when v_media_midia > v_media_merch then 'merchandising' else 'mídia' end
      ),
      'tendencia',
      null,
      jsonb_build_object('media_midia', round(v_media_midia, 2), 'media_merch', round(v_media_merch, 2))
    );
  end if;

  drop table if exists tmp_analise_calculo;
  drop table if exists tmp_analise_final;
end;
$$;

comment on function public.analise_recalcular is 'Recalcula clusterização + insights em uma transação: apaga e reinsere analise_clusters_calculo inteira, limpa insights com mais de 30 dias, insere os novos. Fail-closed por has_permission(analise, clusters, recalcular, rede_toda) — só super_admin tem esse grant (ver ADR-002, decisão equivalente do sistema antigo: diretor só visualiza). Registra em audit_logs por ser escrita destrutiva.';

grant execute on function public.analise_recalcular() to authenticated;


-- =============================================================================
-- 7. analise_marcar_insight_lido() — única forma de alterar `lido`
-- =============================================================================
create or replace function public.analise_marcar_insight_lido(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('analise', 'insights', 'marcar_lido', 'rede_toda') then
    raise exception 'sem permissão para marcar insight como lido';
  end if;

  update public.analise_insights set lido = true where id = p_id;
end;
$$;

comment on function public.analise_marcar_insight_lido is 'Única forma de alterar analise_insights.lido — RLS não libera UPDATE geral da linha pro cliente (ver GRANT da tabela). Fail-closed por has_permission(analise, insights, marcar_lido, rede_toda).';

grant execute on function public.analise_marcar_insight_lido(uuid) to authenticated;


-- =============================================================================
-- 8. Seed de permissoes_concedidas
-- =============================================================================
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'analise', recurso.nome, acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('clusters'), ('insights')) as recurso(nome)
cross join (values ('ler')) as acao(nome)
where p.nome in ('super_admin', 'director')
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'analise', 'insights', 'marcar_lido', 'rede_toda'
from public.papeis p
where p.nome in ('super_admin', 'director')
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'analise', 'clusters', 'recalcular', 'rede_toda'
from public.papeis p
where p.nome = 'super_admin'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'analise', 'config', 'editar', 'rede_toda'
from public.papeis p
where p.nome = 'super_admin'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- director: só leitura de config (nome/cor/faixa do cluster, pro join do
-- dashboard) — nunca 'editar', que é exclusiva de super_admin (ADR-002).
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'analise', 'config', 'ler', 'rede_toda'
from public.papeis p
where p.nome = 'director'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;
