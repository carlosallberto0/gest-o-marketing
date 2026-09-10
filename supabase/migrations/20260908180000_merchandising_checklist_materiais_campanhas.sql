-- =============================================================================
-- Marketing OS (novo) — Fase 3: Merchandising
-- categorias_checklist, perguntas_checklist, materiais, avaliacoes_pdv,
-- respostas_checklist, planos_acao, solicitacoes_material, campanhas
-- =============================================================================
--
-- PRÉ-REQUISITO: Fase 1 (20260908103000), Fase 2 (20260908140000) e Fase 2b
-- (20260908160000) já aplicadas. Esta migration só LÊ tabelas/funções do Core
-- (usuarios, pdvs, has_permission, usuario_pdv_id, update_updated_at_column,
-- system_options, gerar_codigo_sequencial) — nenhuma delas é alterada aqui,
-- exceto o ajuste pontual e aditivo à policy system_options_select (seção 9),
-- já previsto e documentado como consequência esperada pelo ADR-009.
--
-- REQUISITO CENTRAL: um único fluxo "Checklist → Score → Plano de ação" (spec
-- seção J.2), com o score sempre calculado pelo banco — nunca aceito do
-- cliente, mesmo espírito de "isolamento por pdv_id testado no banco, não
-- presumido pela query do frontend" que já rege o resto do projeto.
--
-- DECISÃO DE DESIGN — score é calculado no momento da conclusão, não a cada
--   resposta. `avaliacoes_pdv` nasce em `rascunho`; a transição para
--   `concluida` (única transição possível, terminal) roda em
--   `avaliacoes_pdv_before_update`, que soma os pontos de
--   `respostas_checklist` (1 ponto se valor sim/na, 0 se nao — regra do PRD
--   antigo), grava `pontos_total`/`pontos_possiveis_total`/`percentual_total`
--   e o breakdown por categoria em `scores_categoria` (jsonb). Evita
--   recalcular a cada INSERT/UPDATE/DELETE de resposta (uma avaliação pode
--   ter dezenas de respostas sendo digitadas em sequência) e ainda garante
--   que nenhum campo de score chega gravado por escrita direta do cliente:
--   `pontos_total`/`pontos_possiveis_total`/`percentual_total`/
--   `scores_categoria` só são setados por este trigger, nunca aceitos de
--   `NEW` na aplicação (a policy de UPDATE não distingue isso por coluna, mas
--   o trigger sobrescreve os quatro campos sempre que roda a transição —
--   qualquer valor enviado pelo cliente nesses campos é substituído).
--
-- DECISÃO DE DESIGN — avaliação concluída é imutável (decisão pedida
--   explicitamente pela tarefa, documentada aqui): `avaliacoes_pdv_before_update`
--   rejeita qualquer UPDATE em linha com `status = 'concluida'` (nem outro
--   campo, nem tentativa de reabrir). `respostas_checklist` ganha o mesmo
--   travamento via trigger própria (`respostas_checklist_bloquear_apos_conclusao`),
--   porque senão o cliente poderia editar a resposta diretamente sem tocar o
--   status da avaliação pai, driblando o score já calculado. Consequência:
--   corrigir uma resposta errada depois de concluída exige nova avaliação —
--   não há fluxo de "reabrir". Se isso for um problema de produto, é decisão
--   de UX para outra rodada (ex.: ação administrativa que force um novo
--   rascunho copiando respostas), não implementado aqui.
--
-- DECISÃO DE DESIGN — obrigatoriedade de foto/comentário/material validada no
--   banco, não só no frontend: ao concluir a avaliação, o trigger verifica
--   que toda resposta já registrada com `exige_foto`/`exige_comentario`/
--   `exige_material` (da pergunta correspondente) tem `foto_url`/`comentario`/
--   `material_id` preenchido. Não força responder TODA pergunta do catálogo
--   para poder concluir (uma pergunta sem resposta simplesmente não entra no
--   denominador do score — é assim que "percentual = pontos ÷ respondidas"
--   já funciona no PRD antigo); só valida obrigatoriedade nas respostas que
--   de fato existem.
--
-- DECISÃO DE DESIGN — is_critica é filtro de apresentação, não de RLS (regra
--   explícita da tarefa): `perguntas_checklist` não tem policy que esconda
--   linha por papel. A tela do `collaborator` decide o que exibir; o banco
--   entrega a mesma pergunta para todo mundo com grant de leitura.
--
-- DECISÃO DE DESIGN — enum real de `solicitacoes_material.status`, corrigindo
--   o bug confirmado do sistema antigo (`[SEPARADO]`/`[CANCELADO]` como
--   prefixo de texto em `admin_notes`, nunca enum — ver
--   `.claude/memory/pseudo-status-material-em-admin-notes.md`). Aqui o CHECK
--   cobre todos os estados reais observados no antigo:
--   pendente → aprovada | rejeitada | cancelada
--   aprovada → separada | cancelada
--   separada → entregue | cancelada
--   rejeitada / entregue / cancelada = terminais.
--   `notas_admin` continua existindo como texto livre (é onde o admin anota
--   motivo de rejeição, etc.), mas nunca mais carrega um pseudo-status — o
--   estado de verdade está só na coluna `status`.
--
-- DECISÃO DE DESIGN — "quem solicita só vê/edita a própria enquanto pendente"
--   (texto da tarefa): interpretado como SELECT sem essa restrição de status
--   (o solicitante pode acompanhar o histórico da própria solicitação em
--   qualquer estado — bloquear isso tornaria o rastreio de status inútil, e
--   nenhuma das fases anteriores tratou "ver a própria linha" como algo que
--   se perde depois de aprovado) e UPDATE restrito a `status = 'pendente'`
--   (o solicitante só edita/cancela enquanto ninguém agiu sobre o pedido —
--   depois de aprovado/separado, só quem tem `editar`/`rede_toda` mexe).
--   Decisão documentada, não decidida em silêncio.
--
-- DECISÃO DE DESIGN — estoque decrementado direto em `materiais.estoque_atual`
--   no UPDATE que leva `solicitacoes_material.status` a `entregue`, sem
--   tabela de movimento (fora de escopo desta rodada, por pedido explícito).
--   Trigger SECURITY DEFINER lê `estoque_atual` com `FOR UPDATE` (trava a
--   linha) antes de decrementar, bloqueando estoque negativo (mesma regra do
--   PRD antigo) sob concorrência — sem isso, duas entregas simultâneas do
--   mesmo material poderiam ambas passar da checagem antes de qualquer uma
--   escrever. Limitação aceita e documentada: sem tabela de log, não há como
--   auditar/reverter um decremento indevido depois do fato, além do que
--   `audit_logs` já registra (a transição de status, não o delta de estoque
--   em si).
--
-- DECISÃO DE DESIGN — restrição "materiais de trade só para PDV tipo
--   conveniência" (regra de negócio confirmada no PRD antigo) validada em
--   `solicitacoes_material_before_insert`, comparando `pdvs.tipo` contra o
--   literal `'CONV'` — acoplamento aceito porque `'CONV'` é valor já semeado
--   em `system_options` (`core`/`pdv_tipo`) desde a Fase 2b, não um enum
--   inventado aqui.
--
-- DECISÃO DE DESIGN — validação de opção de campo (`system_options`)
--   generalizada em UMA função de trigger parametrizada
--   (`validar_system_option(modulo, campo, coluna)`), não uma função dedicada
--   por coluna como `pdvs_validar_tipo` na Fase 2b. Diferença de contexto: a
--   Fase 2b tinha um único consumidor (`pdvs.tipo`); esta fase tem quatro
--   colunas candidatas (`materiais.tipo`, `materiais.categoria`,
--   `perguntas_checklist.tipo_material`, `campanhas.tipo`) — generalizar
--   evita repetir a mesma função quatro vezes. Lê o valor da coluna via
--   `to_jsonb(NEW) ->> TG_ARGV[2]` (nome da coluna passado como argumento do
--   trigger) para não hardcodar acesso a `NEW.<coluna>` por tipo de linha.
--   Todas as quatro colunas são nullable e a função retorna cedo quando o
--   valor é nulo — v. pendência abaixo sobre ausência de seed.
--
-- PENDÊNCIA CONHECIDA (sinalizada, não decidida em silêncio): ao contrário de
--   `core/pdv_tipo` (semeado com POS/CONV desde a Fase 2b, valores de negócio
--   reais e conhecidos), esta migration NÃO semeia
--   `merchandising/material_tipo`, `merchandising/material_categoria` nem
--   `merchandising/campanha_tipo` em `system_options` — não há fonte
--   confiável para inventar esses valores (nenhum documento fornecido lista o
--   catálogo real de tipo/categoria de material de trade ou tipo de
--   campanha), e "opção de campo vem de system_options" não obriga que a
--   tabela já nasça povoada. Por isso as quatro colunas ficam nullable: o
--   catálogo é populável pela UI de administração antes de qualquer usuário
--   conseguir gravar um valor não nulo nesses campos. Sinalizado para quem
--   construir a tela de administração de `system_options` desta fase.
--
-- ASSUNÇÕES assumidas por falta de informação explícita (sinalizadas, não
-- decididas em silêncio):
--   1. `campanhas.pdvs_alvo` é `uuid[]` nativo (mesmo formato do
--      `target_pdv_ids[]` do sistema antigo), não uma tabela pivot — a tarefa
--      não pediu tabela de suporte para isso, e não há integridade referencial
--      por elemento do array (Postgres não valida FK dentro de array). Se
--      precisar de integridade forte, migrar para pivot é decisão futura.
--   2. `campanhas.materiais_necessarios` é `jsonb`, mesmo espírito de
--      `outdoors.foto_url`/`avaliacoes_outdoor.fotos` (Fase 2): estrutura
--      livre por ora, sem tabela de suporte, mesmo motivo do item 1.
--   3. Responsável de plano de ação (`planos_acao.responsavel_id`) não ganha
--      nenhum grant especial de edição da própria linha — só quem tem
--      `editar` no escopo certo (rede_toda ou proprio_pdv) atualiza status. Se
--      o responsável for um `collaborator` sem grant de editar, ele não
--      consegue mudar o próprio plano — mesma limitação que já existe hoje
--      para criar plano (`collaborator` não cria, por tabela de permissão do
--      PRD antigo).
--   4. `coordenador_compras`/`convenience_coordinator`/`supplier`/
--      `approver_executive` não recebem nenhum grant do módulo
--      `merchandising` no seed (least privilege, mesmo critério das fases
--      anteriores) — concede-se depois, pela UI de administração, se
--      necessário.
--   5. `planos_acao_insert` não exige que a `avaliacoes_pdv` pai já esteja
--      `concluida` — pode-se abrir plano de ação para uma resposta de
--      avaliação ainda em rascunho (a tarefa não define isso e parece
--      razoável agir assim que uma resposta problemática é registrada, sem
--      esperar o fim do checklist inteiro). Consequência aceita: nada impede
--      o avaliador de mudar `respostas_checklist.valor` de 'nao' para 'sim'
--      depois de já existir um plano de ação aberto para aquela resposta —
--      `planos_acao.resposta_id` não tem `ON DELETE`/`ON UPDATE` especial
--      (fica NO ACTION, o padrão), e nada revalida a coerência entre o plano
--      e a resposta atual. Não implementado nesta rodada.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. categorias_checklist — categoria de agrupamento de perguntas
-- -----------------------------------------------------------------------------
create table public.categorias_checklist (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  icone text,
  ordem integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.categorias_checklist is 'Categoria de agrupamento das perguntas do checklist de avaliação de PDV (ex.: "Interior da Loja", "Frente de Caixa"). Catálogo — is_active é o soft delete.';

create trigger set_updated_at
  before update on public.categorias_checklist
  for each row execute function public.update_updated_at_column();

alter table public.categorias_checklist enable row level security;


-- -----------------------------------------------------------------------------
-- 2. perguntas_checklist — pergunta do checklist, com flags de obrigatoriedade
-- -----------------------------------------------------------------------------
create table public.perguntas_checklist (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias_checklist(id),
  texto text not null,
  dica text,
  ordem integer not null default 0,
  exige_foto boolean not null default false,
  exige_comentario boolean not null default false,
  is_critica boolean not null default false,
  exige_material boolean not null default false,
  tipo_material text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.perguntas_checklist is 'Pergunta do checklist. is_critica é filtro de APRESENTAÇÃO (o colaborador não vê pergunta crítica na tela dele) — nunca filtro de RLS, mesma pergunta é lida por todo mundo com grant. is_active é o soft delete.';
comment on column public.perguntas_checklist.tipo_material is 'Tipo de material esperado quando exige_material=true (ex.: referência para o catálogo de materiais). Nullable, validado contra system_options (merchandising/material_tipo) quando preenchido — ver pendência de ausência de seed no topo do arquivo.';

create index perguntas_checklist_categoria_id_idx on public.perguntas_checklist (categoria_id);

create trigger set_updated_at
  before update on public.perguntas_checklist
  for each row execute function public.update_updated_at_column();

alter table public.perguntas_checklist enable row level security;


-- -----------------------------------------------------------------------------
-- 3. materiais — catálogo de trade marketing
-- -----------------------------------------------------------------------------
create table public.materiais (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  tipo text,
  categoria text,
  custo_unitario numeric(12,2) not null default 0 check (custo_unitario >= 0),
  estoque_atual integer not null default 0 check (estoque_atual >= 0),
  estoque_minimo integer not null default 0 check (estoque_minimo >= 0),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  imagem_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.materiais is 'Catálogo de material de trade marketing. status é o soft delete (ativo/inativo), mesmo padrão de pdvs/usuarios. estoque_atual é saldo direto, sem tabela de movimento nesta fase (fora de escopo, decisão explícita) — decrementado só pelo trigger de entrega de solicitacoes_material, incrementado/ajustado por UPDATE direto (ação restrita a super_admin/admin).';
comment on column public.materiais.tipo is 'Validado contra system_options (merchandising/material_tipo) quando preenchido. Nullable — sem seed nesta migration, ver pendência no topo do arquivo.';
comment on column public.materiais.categoria is 'Validado contra system_options (merchandising/material_categoria) quando preenchido. Nullable — mesma pendência de tipo.';

create trigger set_updated_at
  before update on public.materiais
  for each row execute function public.update_updated_at_column();

alter table public.materiais enable row level security;

create or replace function public.materiais_gerar_codigo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.codigo is null or btrim(new.codigo) = '' then
    new.codigo := public.gerar_codigo_sequencial('MAT');
  end if;
  return new;
end;
$$;

comment on function public.materiais_gerar_codigo is 'BEFORE INSERT: gera codigo = "MAT-NNNN" quando NEW.codigo vem nulo/vazio. Mesmo padrão de pdvs_gerar_codigo/outdoors_gerar_codigo (Fase 2b).';

create trigger before_insert_gerar_codigo
  before insert on public.materiais
  for each row execute function public.materiais_gerar_codigo();


-- -----------------------------------------------------------------------------
-- 4. avaliacoes_pdv — vistoria de qualidade de PDV (cabeçalho)
-- -----------------------------------------------------------------------------
create table public.avaliacoes_pdv (
  id uuid primary key default gen_random_uuid(),
  pdv_id uuid not null references public.pdvs(id),
  avaliador_id uuid not null references public.usuarios(id),
  status text not null default 'rascunho' check (status in ('rascunho', 'concluida')),
  data_avaliacao timestamptz not null default now(),
  concluida_em timestamptz,
  pontos_total integer,
  pontos_possiveis_total integer,
  percentual_total numeric(5,2),
  scores_categoria jsonb not null default '[]'::jsonb,
  assinatura_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.avaliacoes_pdv is 'Cabeçalho de vistoria de qualidade de PDV. rascunho é o único estado editável; concluida é terminal e imutável (ver decisão de topo do arquivo). pontos_total/pontos_possiveis_total/percentual_total/scores_categoria só são gravados pelo trigger avaliacoes_pdv_before_update na transição rascunho→concluida — nunca aceitos de escrita direta do cliente.';
comment on column public.avaliacoes_pdv.pontos_possiveis_total is 'Número de respostas de fato registradas (não o total de perguntas do catálogo) — é o "respondidas" da fórmula percentual = pontos ÷ respondidas × 100 do PRD antigo.';
comment on column public.avaliacoes_pdv.assinatura_url is 'URL da assinatura digital do responsável (coluna preparada, fluxo de captura não implementado nesta fase — decisão explícita da tarefa).';

create index avaliacoes_pdv_pdv_id_idx on public.avaliacoes_pdv (pdv_id, data_avaliacao desc);

create trigger set_updated_at
  before update on public.avaliacoes_pdv
  for each row execute function public.update_updated_at_column();

alter table public.avaliacoes_pdv enable row level security;


-- -----------------------------------------------------------------------------
-- 5. respostas_checklist — resposta por pergunta de uma avaliação
-- -----------------------------------------------------------------------------
create table public.respostas_checklist (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes_pdv(id) on delete cascade,
  pergunta_id uuid not null references public.perguntas_checklist(id),
  valor text not null check (valor in ('sim', 'nao', 'na')),
  comentario text,
  foto_url text,
  material_id uuid references public.materiais(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (avaliacao_id, pergunta_id)
);

comment on table public.respostas_checklist is 'Resposta a uma pergunta dentro de uma avaliacoes_pdv. valor sim/na vale 1 ponto, nao vale 0 (regra do PRD antigo). Bloqueada para INSERT/UPDATE/DELETE assim que a avaliação pai está concluida (trigger respostas_checklist_bloquear_apos_conclusao) — decisão de "avaliação concluída é imutável" documentada no topo do arquivo.';

create index respostas_checklist_avaliacao_id_idx on public.respostas_checklist (avaliacao_id);
create index respostas_checklist_pergunta_id_idx on public.respostas_checklist (pergunta_id);

create trigger set_updated_at
  before update on public.respostas_checklist
  for each row execute function public.update_updated_at_column();

alter table public.respostas_checklist enable row level security;

create or replace function public.respostas_checklist_bloquear_apos_conclusao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from public.avaliacoes_pdv where id = coalesce(new.avaliacao_id, old.avaliacao_id) for share;
  if v_status = 'concluida' then
    raise exception 'avaliacao concluida é imutável — não é possível inserir, editar ou excluir resposta';
  end if;
  return coalesce(new, old);
end;
$$;

comment on function public.respostas_checklist_bloquear_apos_conclusao is 'Bloqueia qualquer mutação em respostas_checklist quando a avaliacoes_pdv pai já está concluida — sem isso, o cliente poderia driblar o score já calculado editando uma resposta sem tocar o status da avaliação. SECURITY DEFINER porque quem responde checklist nem sempre tem grant de leitura direta em avaliacoes_pdv fora do próprio escopo.';

create trigger before_change_bloquear_apos_conclusao
  before insert or update or delete on public.respostas_checklist
  for each row execute function public.respostas_checklist_bloquear_apos_conclusao();


-- -----------------------------------------------------------------------------
-- 4b. avaliacoes_pdv_before_update — calcula score na conclusão, trava edição
--     pós-conclusão, valida obrigatoriedade de foto/comentário/material
-- -----------------------------------------------------------------------------
create or replace function public.avaliacoes_pdv_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incompletas integer;
  v_pontos_total integer;
  v_possiveis_total integer;
  v_categorias jsonb;
begin
  if old.status = 'concluida' then
    raise exception 'avaliacao concluida é imutável — não é possível editar nem reabrir';
  end if;

  if new.pdv_id <> old.pdv_id or new.avaliador_id <> old.avaliador_id then
    raise exception 'pdv_id e avaliador_id são imutáveis após a criação';
  end if;

  if new.status = old.status then
    -- não é a transição de conclusão: os campos de score nunca vêm de escrita
    -- direta do cliente, mesmo quando o UPDATE não mexe em status.
    new.pontos_total := old.pontos_total;
    new.pontos_possiveis_total := old.pontos_possiveis_total;
    new.percentual_total := old.percentual_total;
    new.scores_categoria := old.scores_categoria;
    new.concluida_em := old.concluida_em;
    return new;
  end if;

  if new.status <> 'concluida' then
    raise exception 'transição de % para % não é permitida', old.status, new.status;
  end if;

  select count(*) into v_incompletas
  from public.respostas_checklist rc
  join public.perguntas_checklist pc on pc.id = rc.pergunta_id
  where rc.avaliacao_id = new.id
    and (
      (pc.exige_foto and rc.foto_url is null)
      or (pc.exige_comentario and rc.comentario is null)
      or (pc.exige_material and rc.material_id is null)
    );

  if v_incompletas > 0 then
    raise exception 'existem % resposta(s) sem foto, comentário ou material obrigatório — não é possível concluir', v_incompletas;
  end if;

  select
    count(*) filter (where rc.valor in ('sim', 'na')),
    count(*)
  into v_pontos_total, v_possiveis_total
  from public.respostas_checklist rc
  where rc.avaliacao_id = new.id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'categoria_id', cat.categoria_id,
      'pontos', cat.pontos,
      'possiveis', cat.possiveis,
      'percentual', round(cat.pontos::numeric / nullif(cat.possiveis, 0) * 100)
    )), '[]'::jsonb)
  into v_categorias
  from (
    select
      pc.categoria_id,
      count(*) filter (where rc.valor in ('sim', 'na')) as pontos,
      count(*) as possiveis
    from public.respostas_checklist rc
    join public.perguntas_checklist pc on pc.id = rc.pergunta_id
    where rc.avaliacao_id = new.id
    group by pc.categoria_id
  ) cat;

  new.pontos_total := v_pontos_total;
  new.pontos_possiveis_total := v_possiveis_total;
  new.percentual_total := round(v_pontos_total::numeric / nullif(v_possiveis_total, 0) * 100, 2);
  new.scores_categoria := v_categorias;
  new.concluida_em := now();

  insert into public.audit_logs (action, entity_type, entity_id, usuario_id, dados_antes, dados_depois)
  values (
    'avaliacao_pdv_transicao_status',
    'avaliacoes_pdv',
    new.id,
    auth.uid(),
    jsonb_build_object('status', old.status),
    jsonb_build_object('status', new.status, 'percentual_total', new.percentual_total)
  );

  return new;
end;
$$;

comment on function public.avaliacoes_pdv_before_update is 'Única transição possível é rascunho→concluida (terminal). Calcula pontos_total/pontos_possiveis_total/percentual_total/scores_categoria a partir de respostas_checklist — nunca aceita esses valores de NEW vindo do cliente, sempre sobrescreve (mesmo quando o UPDATE não muda status). Valida obrigatoriedade de foto/comentário/material nas respostas já registradas antes de permitir concluir. Registra a transição em audit_logs — ação crítica, CLAUDE.md. SECURITY DEFINER para poder ler respostas_checklist/perguntas_checklist e gravar em audit_logs independente do grant do chamador.';

create trigger before_update_calcular_score
  before update on public.avaliacoes_pdv
  for each row execute function public.avaliacoes_pdv_before_update();


-- -----------------------------------------------------------------------------
-- 6. planos_acao — plano de ação por resposta problemática de uma avaliação
-- -----------------------------------------------------------------------------
create table public.planos_acao (
  id uuid primary key default gen_random_uuid(),
  resposta_id uuid not null references public.respostas_checklist(id),
  avaliacao_id uuid not null references public.avaliacoes_pdv(id),
  pdv_id uuid not null references public.pdvs(id),
  descricao text not null,
  responsavel_id uuid not null references public.usuarios(id),
  prazo date not null,
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluido', 'cancelado')),
  notas text,
  concluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.planos_acao is 'Plano de ação vinculado a UMA resposta problemática (não à avaliação inteira) — fluxo "Checklist → Score → Plano de ação" da spec (seção J.2). avaliacao_id e pdv_id são denormalizados de resposta_id (via trigger BEFORE INSERT), mesmo padrão de manutencoes.pdv_id denormalizado de outdoor_id, para permitir RLS por pdv_id sem subquery em toda policy.';

create index planos_acao_avaliacao_id_idx on public.planos_acao (avaliacao_id);
create index planos_acao_pdv_id_idx on public.planos_acao (pdv_id);
create index planos_acao_status_idx on public.planos_acao (status);

create trigger set_updated_at
  before update on public.planos_acao
  for each row execute function public.update_updated_at_column();

alter table public.planos_acao enable row level security;

create or replace function public.planos_acao_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avaliacao_id uuid;
  v_pdv_id uuid;
begin
  select rc.avaliacao_id, a.pdv_id into v_avaliacao_id, v_pdv_id
  from public.respostas_checklist rc
  join public.avaliacoes_pdv a on a.id = rc.avaliacao_id
  where rc.id = new.resposta_id;

  if v_avaliacao_id is null then
    raise exception 'resposta_id % não existe', new.resposta_id;
  end if;

  new.avaliacao_id := v_avaliacao_id;
  new.pdv_id := v_pdv_id;

  if new.status is null then
    new.status := 'pendente';
  end if;
  if new.status <> 'pendente' then
    raise exception 'plano de acao precisa nascer com status pendente';
  end if;

  return new;
end;
$$;

comment on function public.planos_acao_before_insert is 'Deriva avaliacao_id/pdv_id a partir de resposta_id — nunca aceitos de escrita direta do cliente. SECURITY DEFINER para ler respostas_checklist/avaliacoes_pdv independente do grant do chamador.';

create trigger before_insert_derivar_campos
  before insert on public.planos_acao
  for each row execute function public.planos_acao_before_insert();

create or replace function public.planos_acao_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed text[];
begin
  if new.resposta_id <> old.resposta_id or new.avaliacao_id <> old.avaliacao_id or new.pdv_id <> old.pdv_id then
    raise exception 'resposta_id, avaliacao_id e pdv_id são imutáveis após a criação';
  end if;

  if new.status = old.status then
    return new;
  end if;

  v_allowed := case old.status
    when 'pendente' then array['em_andamento', 'cancelado']
    when 'em_andamento' then array['concluido', 'cancelado']
    else array[]::text[]
  end;

  if not (new.status = any (v_allowed)) then
    raise exception 'transição de % para % não é permitida', old.status, new.status;
  end if;

  if new.status = 'concluido' then
    new.concluido_em := now();
  end if;

  insert into public.audit_logs (action, entity_type, entity_id, usuario_id, dados_antes, dados_depois)
  values (
    'plano_acao_transicao_status',
    'planos_acao',
    new.id,
    auth.uid(),
    jsonb_build_object('status', old.status),
    jsonb_build_object('status', new.status, 'notas', new.notas)
  );

  return new;
end;
$$;

comment on function public.planos_acao_before_update is 'Máquina de estado simples: pendente→em_andamento|cancelado, em_andamento→concluido|cancelado, demais terminais. Sem checagem de ator própria (diferente de manutencoes/solicitacoes_material): quem chega a passar pela RLS de UPDATE já tem o grant certo (editar rede_toda ou proprio_pdv) — não há um segundo tipo de ator (ex.: fornecedor) a distinguir aqui. Registra a transição em audit_logs — ação crítica, CLAUDE.md. SECURITY DEFINER porque o INSERT em audit_logs exige core/audit_logs/criar/rede_toda, grant que manager/director (que editam plano de ação) não têm.';

create trigger before_update_validar_transicao
  before update on public.planos_acao
  for each row execute function public.planos_acao_before_update();


-- -----------------------------------------------------------------------------
-- 7. solicitacoes_material — solicitação de material com enum real de status
-- -----------------------------------------------------------------------------
create table public.solicitacoes_material (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materiais(id),
  solicitante_id uuid not null references public.usuarios(id),
  pdv_id uuid not null references public.pdvs(id),
  quantidade integer not null check (quantidade > 0),
  justificativa text not null,
  status text not null default 'pendente' check (status in (
    'pendente', 'aprovada', 'rejeitada', 'separada', 'entregue', 'cancelada'
  )),
  aprovado_por uuid references public.usuarios(id),
  aprovado_em timestamptz,
  entregue_em timestamptz,
  notas_admin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.solicitacoes_material is 'Correção deliberada do bug confirmado do sistema antigo: lá, [SEPARADO]/[CANCELADO] são prefixo de texto em admin_notes, nunca enum (ver .claude/memory/pseudo-status-material-em-admin-notes.md). Aqui todo o ciclo pendente→aprovada|rejeitada→separada→entregue, mais cancelada em qualquer ponto antes de entregue, é CHECK de verdade. notas_admin é só anotação livre do admin, nunca carrega estado.';

create index solicitacoes_material_pdv_id_idx on public.solicitacoes_material (pdv_id);
create index solicitacoes_material_solicitante_id_idx on public.solicitacoes_material (solicitante_id);
create index solicitacoes_material_status_idx on public.solicitacoes_material (status);

create trigger set_updated_at
  before update on public.solicitacoes_material
  for each row execute function public.update_updated_at_column();

alter table public.solicitacoes_material enable row level security;

create or replace function public.solicitacoes_material_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo_pdv text;
begin
  if new.solicitante_id is null then
    new.solicitante_id := auth.uid();
  end if;

  select tipo into v_tipo_pdv from public.pdvs where id = new.pdv_id;
  if v_tipo_pdv is distinct from 'CONV' then
    raise exception 'materiais de trade só podem ser solicitados para PDV do tipo conveniência (CONV) — pdv_id % é do tipo %', new.pdv_id, coalesce(v_tipo_pdv, '<nulo>');
  end if;

  if new.status is null then
    new.status := 'pendente';
  end if;
  if new.status <> 'pendente' then
    raise exception 'solicitacao de material precisa nascer com status pendente';
  end if;

  return new;
end;
$$;

comment on function public.solicitacoes_material_before_insert is 'Deriva solicitante_id (default auth.uid()) e valida a restrição de negócio do PRD antigo: material de trade só para PDV tipo conveniência (CONV, valor já semeado em system_options core/pdv_tipo desde a Fase 2b). SECURITY DEFINER para ler pdvs.tipo independente do grant do chamador.';

create trigger before_insert_derivar_e_validar
  before insert on public.solicitacoes_material
  for each row execute function public.solicitacoes_material_before_insert();

create or replace function public.solicitacoes_material_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed text[];
  v_perm_admin boolean;
  v_estoque_atual integer;
begin
  v_perm_admin := public.has_permission('merchandising', 'solicitacoes_material', 'editar', 'rede_toda');

  if new.material_id <> old.material_id
    or new.solicitante_id <> old.solicitante_id
    or new.pdv_id <> old.pdv_id
    or new.quantidade <> old.quantidade
  then
    if not v_perm_admin then
      raise exception 'material_id, solicitante_id, pdv_id e quantidade só podem ser alterados com merchandising/solicitacoes_material/editar/rede_toda';
    end if;
  end if;

  if new.status = old.status then
    if not v_perm_admin then
      raise exception 'editar solicitacao sem trocar status exige merchandising/solicitacoes_material/editar/rede_toda';
    end if;
    return new;
  end if;

  v_allowed := case old.status
    when 'pendente' then array['aprovada', 'rejeitada', 'cancelada']
    when 'aprovada' then array['separada', 'cancelada']
    when 'separada' then array['entregue', 'cancelada']
    else array[]::text[]
  end;

  if not (new.status = any (v_allowed)) then
    raise exception 'transição de % para % não é permitida', old.status, new.status;
  end if;

  if new.status = 'cancelada' and old.status = 'pendente' and old.solicitante_id = auth.uid() then
    null; -- solicitante cancela o próprio pedido ainda pendente
  elsif not v_perm_admin then
    raise exception 'transição para % exige merchandising/solicitacoes_material/editar/rede_toda', new.status;
  end if;

  if new.status = 'aprovada' then
    new.aprovado_por := auth.uid();
    new.aprovado_em := now();
  end if;

  if new.status = 'entregue' then
    select estoque_atual into v_estoque_atual from public.materiais where id = new.material_id for update;
    if v_estoque_atual - new.quantidade < 0 then
      raise exception 'estoque insuficiente para entregar (disponível: %, solicitado: %)', v_estoque_atual, new.quantidade;
    end if;
    update public.materiais set estoque_atual = estoque_atual - new.quantidade where id = new.material_id;
    new.entregue_em := now();
  end if;

  insert into public.audit_logs (action, entity_type, entity_id, usuario_id, dados_antes, dados_depois)
  values (
    'solicitacao_material_transicao_status',
    'solicitacoes_material',
    new.id,
    auth.uid(),
    jsonb_build_object('status', old.status),
    jsonb_build_object('status', new.status, 'notas_admin', new.notas_admin)
  );

  return new;
end;
$$;

comment on function public.solicitacoes_material_before_update is 'Valida a máquina de estado (transição permitida, autor autorizado — admin ou o próprio solicitante cancelando pendente), grava aprovado_por/aprovado_em na transição para aprovada, decrementa materiais.estoque_atual (com FOR UPDATE, bloqueando estoque negativo) e grava entregue_em na transição para entregue, e registra a transição em audit_logs — ação crítica, CLAUDE.md. SECURITY DEFINER porque o INSERT em audit_logs e o UPDATE em materiais exigem grant que o solicitante comum não tem.';

create trigger before_update_validar_transicao
  before update on public.solicitacoes_material
  for each row execute function public.solicitacoes_material_before_update();


-- -----------------------------------------------------------------------------
-- 8. campanhas — campanha promocional
-- -----------------------------------------------------------------------------
create table public.campanhas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  tipo text,
  status text not null default 'planejada' check (status in ('planejada', 'ativa', 'encerrada', 'cancelada')),
  data_inicio date not null,
  data_fim date not null,
  pdvs_alvo uuid[] not null default '{}',
  materiais_necessarios jsonb not null default '[]'::jsonb,
  metas_kpi jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (data_fim >= data_inicio)
);

comment on table public.campanhas is 'Campanha promocional. pdvs_alvo é uuid[] nativo (sem pivot — ver assunção 1 no topo do arquivo, sem integridade referencial por elemento). materiais_necessarios/metas_kpi são jsonb, estrutura livre nesta fase.';
comment on column public.campanhas.tipo is 'Validado contra system_options (merchandising/campanha_tipo) quando preenchido. Nullable — sem seed nesta migration, ver pendência no topo do arquivo.';

create index campanhas_status_idx on public.campanhas (status);

create trigger set_updated_at
  before update on public.campanhas
  for each row execute function public.update_updated_at_column();

alter table public.campanhas enable row level security;

create or replace function public.campanhas_gerar_codigo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.codigo is null or btrim(new.codigo) = '' then
    new.codigo := public.gerar_codigo_sequencial('CAMP');
  end if;
  return new;
end;
$$;

comment on function public.campanhas_gerar_codigo is 'BEFORE INSERT: gera codigo = "CAMP-NNNN" quando NEW.codigo vem nulo/vazio.';

create trigger before_insert_gerar_codigo
  before insert on public.campanhas
  for each row execute function public.campanhas_gerar_codigo();

create or replace function public.campanhas_before_update()
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
    when 'planejada' then array['ativa', 'cancelada']
    when 'ativa' then array['encerrada', 'cancelada']
    else array[]::text[]
  end;

  if not (new.status = any (v_allowed)) then
    raise exception 'transição de % para % não é permitida', old.status, new.status;
  end if;

  insert into public.audit_logs (action, entity_type, entity_id, usuario_id, dados_antes, dados_depois)
  values (
    'campanha_transicao_status',
    'campanhas',
    new.id,
    auth.uid(),
    jsonb_build_object('status', old.status),
    jsonb_build_object('status', new.status)
  );

  return new;
end;
$$;

comment on function public.campanhas_before_update is 'Máquina de estado simples: planejada→ativa|cancelada, ativa→encerrada|cancelada, demais terminais. Sem checagem de ator própria: só quem já tem editar/rede_toda passa pela RLS de UPDATE. Registra a transição em audit_logs — ação crítica, CLAUDE.md. SECURITY DEFINER porque o INSERT em audit_logs exige core/audit_logs/criar/rede_toda, grant que director (que edita campanha) não tem.';

create trigger before_update_validar_transicao
  before update on public.campanhas
  for each row execute function public.campanhas_before_update();


-- =============================================================================
-- 9. validar_system_option — função de trigger genérica e parametrizada
-- Substitui uma função dedicada por coluna (padrão da Fase 2b, pdvs_validar_tipo)
-- porque esta fase tem 4 colunas candidatas — ver decisão de topo do arquivo.
-- =============================================================================
create or replace function public.validar_system_option()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_modulo text := TG_ARGV[0];
  v_campo text := TG_ARGV[1];
  v_coluna text := TG_ARGV[2];
  v_valor text;
begin
  v_valor := to_jsonb(new) ->> v_coluna;

  if v_valor is null then
    return new; -- coluna nullable, nada a validar
  end if;

  if not exists (
    select 1 from public.system_options so
    where so.modulo = v_modulo
      and so.campo = v_campo
      and so.valor = v_valor
      and so.is_active = true
  ) then
    raise exception 'valor "%" inválido para %.% — precisa ser um valor ativo em system_options (modulo=%, campo=%)',
      v_valor, TG_TABLE_NAME, v_coluna, v_modulo, v_campo;
  end if;

  return new;
end;
$$;

comment on function public.validar_system_option is 'Trigger genérica e parametrizada (TG_ARGV: modulo, campo, coluna) para validar coluna de opção de campo contra system_options — substitui uma função dedicada por coluna quando há múltiplos consumidores no mesmo módulo. Lê o valor via to_jsonb(NEW) ->> coluna para não hardcodar acesso a NEW.<coluna> por tipo de linha. Retorna cedo (sem validar) quando a coluna vem nula. SECURITY DEFINER pelo mesmo motivo de pdvs_validar_tipo (Fase 2b): a checagem não pode depender do grant de leitura de system_options de quem grava a linha de negócio.';

create trigger before_change_validar_tipo
  before insert or update of tipo on public.materiais
  for each row execute function public.validar_system_option('merchandising', 'material_tipo', 'tipo');

create trigger before_change_validar_categoria
  before insert or update of categoria on public.materiais
  for each row execute function public.validar_system_option('merchandising', 'material_categoria', 'categoria');

create trigger before_change_validar_tipo_material
  before insert or update of tipo_material on public.perguntas_checklist
  for each row execute function public.validar_system_option('merchandising', 'material_tipo', 'tipo_material');

create trigger before_change_validar_tipo
  before insert or update of tipo on public.campanhas
  for each row execute function public.validar_system_option('merchandising', 'campanha_tipo', 'tipo');

-- Ajuste aditivo à policy system_options_select (Fase 2b) — consequência já
-- prevista pelo ADR-009 ("cada novo módulo... acrescenta sua própria
-- condição de leitura"). Só os papéis que já têm grant de criar/editar em
-- checklist/materiais/campanhas (admin/director/super_admin) precisam ler o
-- catálogo — manager/collaborator não criam essas linhas, não precisam do OR.
drop policy system_options_select on public.system_options;

create policy system_options_select on public.system_options
  for select to authenticated
  using (
    public.has_permission('core', 'pdvs', 'criar', 'rede_toda')
    or public.has_permission('core', 'pdvs', 'editar', 'rede_toda')
    or public.has_permission('core', 'system_options', 'criar', 'rede_toda')
    or public.has_permission('core', 'system_options', 'editar', 'rede_toda')
    or public.has_permission('merchandising', 'checklist', 'criar', 'rede_toda')
    or public.has_permission('merchandising', 'checklist', 'editar', 'rede_toda')
    or public.has_permission('merchandising', 'materiais', 'criar', 'rede_toda')
    or public.has_permission('merchandising', 'materiais', 'editar', 'rede_toda')
    or public.has_permission('merchandising', 'campanhas', 'criar', 'rede_toda')
    or public.has_permission('merchandising', 'campanhas', 'editar', 'rede_toda')
  );


-- =============================================================================
-- 10. RLS — políticas por papel + GRANT explícito (obrigatório, CLAUDE.md)
-- Módulo: 'merchandising'. Fail-closed (ADR-006): ausência de grant em
-- permissoes_concedidas = acesso negado, mesmo padrão do Core/Mídia Externa.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- categorias_checklist / perguntas_checklist: recurso 'checklist'. Catálogo
-- compartilhado (não territorial) — só rede_toda, sem variante proprio_pdv.
-- is_critica NÃO filtra linha aqui (ver decisão de topo do arquivo).
-- ---------------------------------------------------------------------------
grant select on public.categorias_checklist to authenticated;
grant insert, update, delete on public.categorias_checklist to authenticated;

create policy categorias_checklist_select on public.categorias_checklist
  for select to authenticated
  using (public.has_permission('merchandising', 'checklist', 'ler', 'rede_toda'));

create policy categorias_checklist_insert on public.categorias_checklist
  for insert to authenticated
  with check (public.has_permission('merchandising', 'checklist', 'criar', 'rede_toda'));

create policy categorias_checklist_update on public.categorias_checklist
  for update to authenticated
  using (public.has_permission('merchandising', 'checklist', 'editar', 'rede_toda'))
  with check (public.has_permission('merchandising', 'checklist', 'editar', 'rede_toda'));

create policy categorias_checklist_delete on public.categorias_checklist
  for delete to authenticated
  using (public.has_permission('merchandising', 'checklist', 'excluir', 'rede_toda'));


grant select on public.perguntas_checklist to authenticated;
grant insert, update, delete on public.perguntas_checklist to authenticated;

create policy perguntas_checklist_select on public.perguntas_checklist
  for select to authenticated
  using (public.has_permission('merchandising', 'checklist', 'ler', 'rede_toda'));

create policy perguntas_checklist_insert on public.perguntas_checklist
  for insert to authenticated
  with check (public.has_permission('merchandising', 'checklist', 'criar', 'rede_toda'));

create policy perguntas_checklist_update on public.perguntas_checklist
  for update to authenticated
  using (public.has_permission('merchandising', 'checklist', 'editar', 'rede_toda'))
  with check (public.has_permission('merchandising', 'checklist', 'editar', 'rede_toda'));

create policy perguntas_checklist_delete on public.perguntas_checklist
  for delete to authenticated
  using (public.has_permission('merchandising', 'checklist', 'excluir', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- materiais: recurso 'materiais'. Catálogo não territorial — só rede_toda.
-- ---------------------------------------------------------------------------
grant select on public.materiais to authenticated;
grant insert, update, delete on public.materiais to authenticated;

create policy materiais_select on public.materiais
  for select to authenticated
  using (public.has_permission('merchandising', 'materiais', 'ler', 'rede_toda'));

create policy materiais_insert on public.materiais
  for insert to authenticated
  with check (public.has_permission('merchandising', 'materiais', 'criar', 'rede_toda'));

create policy materiais_update on public.materiais
  for update to authenticated
  using (public.has_permission('merchandising', 'materiais', 'editar', 'rede_toda'))
  with check (public.has_permission('merchandising', 'materiais', 'editar', 'rede_toda'));

create policy materiais_delete on public.materiais
  for delete to authenticated
  using (public.has_permission('merchandising', 'materiais', 'excluir', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- avaliacoes_pdv: rede_toda enxerga/gerencia tudo; proprio_pdv cria/lê/edita
-- (o próprio rascunho) só do próprio posto. avaliador_id sempre = auth.uid()
-- no INSERT (sem impersonação). UPDATE: trigger valida a transição/imutabilidade
-- pós-conclusão; RLS aqui cobre isolamento (quem toca a linha).
-- ---------------------------------------------------------------------------
grant select on public.avaliacoes_pdv to authenticated;
grant insert, update, delete on public.avaliacoes_pdv to authenticated;

create policy avaliacoes_pdv_select on public.avaliacoes_pdv
  for select to authenticated
  using (
    public.has_permission('merchandising', 'avaliacoes_pdv', 'ler', 'rede_toda')
    or (
      public.has_permission('merchandising', 'avaliacoes_pdv', 'ler', 'proprio_pdv')
      and pdv_id = public.usuario_pdv_id()
    )
  );

create policy avaliacoes_pdv_insert on public.avaliacoes_pdv
  for insert to authenticated
  with check (
    avaliador_id = auth.uid()
    and (
      public.has_permission('merchandising', 'avaliacoes_pdv', 'criar', 'rede_toda')
      or (
        public.has_permission('merchandising', 'avaliacoes_pdv', 'criar', 'proprio_pdv')
        and pdv_id = public.usuario_pdv_id()
      )
    )
  );

create policy avaliacoes_pdv_update on public.avaliacoes_pdv
  for update to authenticated
  using (
    public.has_permission('merchandising', 'avaliacoes_pdv', 'editar', 'rede_toda')
    or (avaliador_id = auth.uid() and status = 'rascunho')
  )
  with check (
    public.has_permission('merchandising', 'avaliacoes_pdv', 'editar', 'rede_toda')
    or avaliador_id = auth.uid()
  );

create policy avaliacoes_pdv_delete on public.avaliacoes_pdv
  for delete to authenticated
  using (public.has_permission('merchandising', 'avaliacoes_pdv', 'excluir', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- respostas_checklist: reaproveita o escopo de quem enxerga/edita a
-- avaliacoes_pdv pai (recurso 'avaliacoes_pdv' — não há recurso próprio para
-- resposta). INSERT/UPDATE/DELETE exigem que a avaliação pai ainda esteja em
-- rascunho e que o ator seja o avaliador (ou tenha editar/rede_toda).
-- ---------------------------------------------------------------------------
grant select on public.respostas_checklist to authenticated;
grant insert, update, delete on public.respostas_checklist to authenticated;

create policy respostas_checklist_select on public.respostas_checklist
  for select to authenticated
  using (
    exists (
      select 1 from public.avaliacoes_pdv a
      where a.id = respostas_checklist.avaliacao_id
        and (
          public.has_permission('merchandising', 'avaliacoes_pdv', 'ler', 'rede_toda')
          or (public.has_permission('merchandising', 'avaliacoes_pdv', 'ler', 'proprio_pdv') and a.pdv_id = public.usuario_pdv_id())
        )
    )
  );

create policy respostas_checklist_insert on public.respostas_checklist
  for insert to authenticated
  with check (
    exists (
      select 1 from public.avaliacoes_pdv a
      where a.id = respostas_checklist.avaliacao_id
        and a.status = 'rascunho'
        and (
          a.avaliador_id = auth.uid()
          or public.has_permission('merchandising', 'avaliacoes_pdv', 'editar', 'rede_toda')
        )
    )
  );

create policy respostas_checklist_update on public.respostas_checklist
  for update to authenticated
  using (
    exists (
      select 1 from public.avaliacoes_pdv a
      where a.id = respostas_checklist.avaliacao_id
        and a.status = 'rascunho'
        and (
          a.avaliador_id = auth.uid()
          or public.has_permission('merchandising', 'avaliacoes_pdv', 'editar', 'rede_toda')
        )
    )
  )
  with check (
    exists (
      select 1 from public.avaliacoes_pdv a
      where a.id = respostas_checklist.avaliacao_id
        and a.status = 'rascunho'
        and (
          a.avaliador_id = auth.uid()
          or public.has_permission('merchandising', 'avaliacoes_pdv', 'editar', 'rede_toda')
        )
    )
  );

create policy respostas_checklist_delete on public.respostas_checklist
  for delete to authenticated
  using (
    exists (
      select 1 from public.avaliacoes_pdv a
      where a.id = respostas_checklist.avaliacao_id
        and a.status = 'rascunho'
        and (
          a.avaliador_id = auth.uid()
          or public.has_permission('merchandising', 'avaliacoes_pdv', 'editar', 'rede_toda')
        )
    )
  );


-- ---------------------------------------------------------------------------
-- planos_acao: rede_toda gerencia tudo; proprio_pdv cria/lê/edita só do
-- próprio posto (mesma granularidade de manutencoes na Fase 2).
-- ---------------------------------------------------------------------------
grant select on public.planos_acao to authenticated;
grant insert, update, delete on public.planos_acao to authenticated;

create policy planos_acao_select on public.planos_acao
  for select to authenticated
  using (
    public.has_permission('merchandising', 'planos_acao', 'ler', 'rede_toda')
    or (
      public.has_permission('merchandising', 'planos_acao', 'ler', 'proprio_pdv')
      and pdv_id = public.usuario_pdv_id()
    )
  );

create policy planos_acao_insert on public.planos_acao
  for insert to authenticated
  with check (
    public.has_permission('merchandising', 'planos_acao', 'criar', 'rede_toda')
    or (
      public.has_permission('merchandising', 'planos_acao', 'criar', 'proprio_pdv')
      and exists (
        select 1 from public.respostas_checklist rc
        join public.avaliacoes_pdv a on a.id = rc.avaliacao_id
        where rc.id = planos_acao.resposta_id and a.pdv_id = public.usuario_pdv_id()
      )
    )
  );

create policy planos_acao_update on public.planos_acao
  for update to authenticated
  using (
    public.has_permission('merchandising', 'planos_acao', 'editar', 'rede_toda')
    or (
      public.has_permission('merchandising', 'planos_acao', 'editar', 'proprio_pdv')
      and pdv_id = public.usuario_pdv_id()
    )
  )
  with check (
    public.has_permission('merchandising', 'planos_acao', 'editar', 'rede_toda')
    or (
      public.has_permission('merchandising', 'planos_acao', 'editar', 'proprio_pdv')
      and pdv_id = public.usuario_pdv_id()
    )
  );

create policy planos_acao_delete on public.planos_acao
  for delete to authenticated
  using (public.has_permission('merchandising', 'planos_acao', 'excluir', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- solicitacoes_material: rede_toda gerencia tudo; proprio_pdv lê/cria do
-- próprio posto; qualquer solicitante lê/edita a própria linha (ver decisão
-- de topo do arquivo — SELECT sem restrição de status, UPDATE só enquanto
-- pendente). Transição de estado validada pelo trigger (seção 7).
-- ---------------------------------------------------------------------------
grant select on public.solicitacoes_material to authenticated;
grant insert, update, delete on public.solicitacoes_material to authenticated;

create policy solicitacoes_material_select on public.solicitacoes_material
  for select to authenticated
  using (
    public.has_permission('merchandising', 'solicitacoes_material', 'ler', 'rede_toda')
    or (
      public.has_permission('merchandising', 'solicitacoes_material', 'ler', 'proprio_pdv')
      and pdv_id = public.usuario_pdv_id()
    )
    or solicitante_id = auth.uid()
  );

create policy solicitacoes_material_insert on public.solicitacoes_material
  for insert to authenticated
  with check (
    solicitante_id = auth.uid()
    and (
      public.has_permission('merchandising', 'solicitacoes_material', 'criar', 'rede_toda')
      or (
        public.has_permission('merchandising', 'solicitacoes_material', 'criar', 'proprio_pdv')
        and pdv_id = public.usuario_pdv_id()
      )
    )
  );

create policy solicitacoes_material_update on public.solicitacoes_material
  for update to authenticated
  using (
    public.has_permission('merchandising', 'solicitacoes_material', 'editar', 'rede_toda')
    or (solicitante_id = auth.uid() and status = 'pendente')
  )
  with check (
    public.has_permission('merchandising', 'solicitacoes_material', 'editar', 'rede_toda')
    or (solicitante_id = auth.uid() and status in ('pendente', 'cancelada'))
  );

create policy solicitacoes_material_delete on public.solicitacoes_material
  for delete to authenticated
  using (public.has_permission('merchandising', 'solicitacoes_material', 'excluir', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- campanhas: gestão rede_toda apenas (super_admin/admin/director) — manager/
-- collaborator não interagem com campanha (PRD antigo: "Não"/"Não").
-- ---------------------------------------------------------------------------
grant select on public.campanhas to authenticated;
grant insert, update, delete on public.campanhas to authenticated;

create policy campanhas_select on public.campanhas
  for select to authenticated
  using (public.has_permission('merchandising', 'campanhas', 'ler', 'rede_toda'));

create policy campanhas_insert on public.campanhas
  for insert to authenticated
  with check (public.has_permission('merchandising', 'campanhas', 'criar', 'rede_toda'));

create policy campanhas_update on public.campanhas
  for update to authenticated
  using (public.has_permission('merchandising', 'campanhas', 'editar', 'rede_toda'))
  with check (public.has_permission('merchandising', 'campanhas', 'editar', 'rede_toda'));

create policy campanhas_delete on public.campanhas
  for delete to authenticated
  using (public.has_permission('merchandising', 'campanhas', 'excluir', 'rede_toda'));


-- =============================================================================
-- 11. Storage — buckets avaliacao-pdv-fotos e material-fotos + RLS de
-- storage.objects. Mesmo padrão da Fase 2b: bucket por recurso, path
-- {entidade_id}/{arquivo}, buckets privados.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('avaliacao-pdv-fotos', 'avaliacao-pdv-fotos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('material-fotos', 'material-fotos', false)
on conflict (id) do nothing;

-- avaliacao-pdv-fotos: path {avaliacao_id}/{arquivo}. Upload/edição/exclusão
-- seguem quem pode gravar resposta (avaliador enquanto rascunho, ou
-- editar/rede_toda); leitura espelha avaliacoes_pdv_select.
create policy avaliacao_pdv_fotos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avaliacao-pdv-fotos'
    and exists (
      select 1 from public.avaliacoes_pdv a
      where a.id::text = (storage.foldername(name))[1]
        and (
          public.has_permission('merchandising', 'avaliacoes_pdv', 'ler', 'rede_toda')
          or (public.has_permission('merchandising', 'avaliacoes_pdv', 'ler', 'proprio_pdv') and a.pdv_id = public.usuario_pdv_id())
        )
    )
  );

create policy avaliacao_pdv_fotos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avaliacao-pdv-fotos'
    and exists (
      select 1 from public.avaliacoes_pdv a
      where a.id::text = (storage.foldername(name))[1]
        and a.status = 'rascunho'
        and (
          a.avaliador_id = auth.uid()
          or public.has_permission('merchandising', 'avaliacoes_pdv', 'editar', 'rede_toda')
        )
    )
  );

create policy avaliacao_pdv_fotos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avaliacao-pdv-fotos'
    and exists (
      select 1 from public.avaliacoes_pdv a
      where a.id::text = (storage.foldername(name))[1]
        and a.status = 'rascunho'
        and (a.avaliador_id = auth.uid() or public.has_permission('merchandising', 'avaliacoes_pdv', 'editar', 'rede_toda'))
    )
  )
  with check (
    bucket_id = 'avaliacao-pdv-fotos'
    and exists (
      select 1 from public.avaliacoes_pdv a
      where a.id::text = (storage.foldername(name))[1]
        and a.status = 'rascunho'
        and (a.avaliador_id = auth.uid() or public.has_permission('merchandising', 'avaliacoes_pdv', 'editar', 'rede_toda'))
    )
  );

create policy avaliacao_pdv_fotos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avaliacao-pdv-fotos'
    and exists (
      select 1 from public.avaliacoes_pdv a
      where a.id::text = (storage.foldername(name))[1]
        and a.status = 'rascunho'
        and (a.avaliador_id = auth.uid() or public.has_permission('merchandising', 'avaliacoes_pdv', 'editar', 'rede_toda'))
    )
  );

-- material-fotos: path {material_id}/{arquivo}. Upload/edição/exclusão = mesmo
-- grant de criar/editar rede_toda de materiais; leitura espelha materiais_select.
create policy material_fotos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'material-fotos' and public.has_permission('merchandising', 'materiais', 'ler', 'rede_toda'));

create policy material_fotos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'material-fotos'
    and (
      public.has_permission('merchandising', 'materiais', 'criar', 'rede_toda')
      or public.has_permission('merchandising', 'materiais', 'editar', 'rede_toda')
    )
  );

create policy material_fotos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'material-fotos' and public.has_permission('merchandising', 'materiais', 'editar', 'rede_toda'))
  with check (bucket_id = 'material-fotos' and public.has_permission('merchandising', 'materiais', 'editar', 'rede_toda'));

create policy material_fotos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'material-fotos' and public.has_permission('merchandising', 'materiais', 'editar', 'rede_toda'));


-- =============================================================================
-- 12. Seed de permissão — módulo 'merchandising' (fail-closed: sem isso,
-- ninguém opera este módulo)
-- =============================================================================

-- super_admin: acesso total, todos os recursos, todas as ações, rede_toda.
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', recurso.nome, acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('checklist'), ('avaliacoes_pdv'), ('planos_acao'), ('materiais'), ('solicitacoes_material'), ('campanhas')) as recurso(nome)
cross join (values ('criar'), ('ler'), ('editar'), ('excluir')) as acao(nome)
where p.nome = 'super_admin'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- admin: criar/ler/editar rede_toda em checklist/avaliacoes_pdv/planos_acao/
-- solicitacoes_material/campanhas; materiais só ler/editar (PRD antigo:
-- "CRUD de materiais: admin = Edição", sem criar/excluir). Excluir físico
-- fica só com super_admin, por design (mesmo padrão das fases anteriores).
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', recurso.nome, acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('checklist'), ('avaliacoes_pdv'), ('planos_acao'), ('solicitacoes_material'), ('campanhas')) as recurso(nome)
cross join (values ('criar'), ('ler'), ('editar')) as acao(nome)
where p.nome = 'admin'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', 'materiais', acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('ler'), ('editar')) as acao(nome)
where p.nome = 'admin'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- director: leitura de checklist/materiais; checklist completo (avalia
-- qualquer pdv, rede_toda) e cria/gerencia plano de ação e campanha
-- (PRD antigo: "Campanhas: director Sim", "Criar plano de ação: director Sim");
-- só visualiza solicitação de material (PRD: "Aprovar/entregar: director Só
-- visualiza"), mas pode solicitar (PRD: "Solicitar material: director Sim").
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', 'checklist', 'ler', 'rede_toda'
from public.papeis p
where p.nome = 'director'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', 'avaliacoes_pdv', acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('ler'), ('criar')) as acao(nome)
where p.nome = 'director'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', 'planos_acao', acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('ler'), ('criar'), ('editar')) as acao(nome)
where p.nome = 'director'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', 'materiais', 'ler', 'rede_toda'
from public.papeis p
where p.nome = 'director'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', 'solicitacoes_material', acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('ler'), ('criar')) as acao(nome)
where p.nome = 'director'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', 'campanhas', acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('ler'), ('criar'), ('editar')) as acao(nome)
where p.nome = 'director'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- manager: checklist/materiais de leitura (rede_toda — catálogo, não
-- territorial); avaliacoes_pdv e planos_acao de gestão do próprio pdv;
-- solicita material do próprio pdv e lê as do próprio pdv (para acompanhar
-- pedido de colaborador do mesmo posto).
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', recurso.nome, 'ler', 'rede_toda'
from public.papeis p
cross join (values ('checklist'), ('materiais')) as recurso(nome)
where p.nome = 'manager'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', 'avaliacoes_pdv', acao.nome, 'proprio_pdv'
from public.papeis p
cross join (values ('ler'), ('criar')) as acao(nome)
where p.nome = 'manager'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', 'planos_acao', acao.nome, 'proprio_pdv'
from public.papeis p
cross join (values ('ler'), ('criar'), ('editar')) as acao(nome)
where p.nome = 'manager'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', 'solicitacoes_material', acao.nome, 'proprio_pdv'
from public.papeis p
cross join (values ('ler'), ('criar')) as acao(nome)
where p.nome = 'manager'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- collaborator: checklist simplificado (leitura — is_critica filtrado na
-- tela, não aqui) e materiais de leitura; avalia e solicita material só do
-- próprio pdv; sem plano de ação (PRD antigo: "Criar plano de ação:
-- collaborator Não") e sem campanha.
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', recurso.nome, 'ler', 'rede_toda'
from public.papeis p
cross join (values ('checklist'), ('materiais')) as recurso(nome)
where p.nome = 'collaborator'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', 'avaliacoes_pdv', acao.nome, 'proprio_pdv'
from public.papeis p
cross join (values ('ler'), ('criar')) as acao(nome)
where p.nome = 'collaborator'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'merchandising', 'solicitacoes_material', 'criar', 'proprio_pdv'
from public.papeis p
where p.nome = 'collaborator'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- coordenador_compras / convenience_coordinator / supplier / approver_executive:
-- nenhum grant por padrão (least privilege, mesmo critério das fases
-- anteriores) — concede-se depois, pela UI de administração, se necessário.
