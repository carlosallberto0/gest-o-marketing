-- =============================================================================
-- Marketing OS (novo) — Fase 5: Central Criativa + Biblioteca de Marca
-- demandas_criativas, demanda_criativa_arquivos, demanda_criativa_comentarios,
-- demanda_criativa_historico, brand_library
-- =============================================================================
--
-- PRÉ-REQUISITO: Core (20260908103000), Fase 2 (20260908140000), Fase 2b/3
-- (20260908160000, 20260908180000) e Fase 4 (20260910120000) já aplicadas.
-- Esta migration só LÊ usuarios/pdvs/campanhas/aprovacao_itens/has_permission/
-- usuario_pdv_id/update_updated_at_column/audit_logs/notificacoes — nenhuma
-- delas é alterada aqui. Notificação de Central Criativa usa a tabela
-- `notificacoes` já existente do Core (linhas ~330-350 de
-- 20260908103000_core_usuarios_papeis_permissoes.sql) — nenhuma tabela de
-- notificação nova é criada nesta migration. Nenhum trigger de notificação
-- automática é criado aqui (fora de escopo pedido; a UI pode inserir
-- notificacoes diretamente via grant já existente do Core, `usuario_id = own
-- OR criar/rede_toda`).
--
-- RENOME para português (convenção do projeto): `creative_demands` ficou
-- `demandas_criativas`; `creative_demand_history` ficou
-- `demanda_criativa_historico`; `brand_library` foi pedido explicitamente
-- SEM tradução do nome da tabela na tarefa — mantido `brand_library` (única
-- exceção à convenção snake_case-português nesta migration, decisão da
-- própria tarefa, não minha).
--
-- DECISÃO DE DESIGN — `demandas_criativas.tipo` e `.canal`: texto livre, SEM
--   CHECK e SEM trigger de validação contra `system_options`, mesmo já
--   existindo `system_options` no banco (Fase 2b). Decisão explícita da
--   tarefa, pelo mesmo motivo já documentado na Fase 3 para
--   materiais.tipo/categoria e na Fase 4 para aprovacao_itens.tipo: um bug
--   real já deixou um campo assim impossível de preencher por falta de seed.
--   Sem catálogo/seed para "tipo de demanda criativa" ou "canal" definido
--   nesta rodada — ver comentário de coluna.
--
-- DECISÃO DE DESIGN — `demandas_criativas.aprovacao_item_id` é vínculo
--   ADITIVO e opcional de volta para `aprovacao_itens` (Fase 4). Não obriga
--   nada em `aprovacao_itens` (nullable lá seria redundante — a FK mora só
--   aqui, unidirecional). Não há webhook nem trigger que sincronize
--   `aprovacao_itens.status` de volta para `demandas_criativas.status`
--   automaticamente: quando uma demanda é enviada para Aprovações Executivas
--   (aprovacao_item_id preenchido, status vira `aguardando_aprovacao`) e o
--   revisor decide (via a Edge Function de token da Fase 4), a atualização de
--   `demandas_criativas.status` (para `aprovada` ou de volta a `em_criacao`
--   se reprovada/revisão pedida) é MANUAL — o marketing olha o resultado em
--   Aprovações Executivas e faz a transição aqui. Automatizar essa ponte é
--   trabalho de Edge Function/trigger cross-módulo fora de escopo desta
--   rodada — decisão de produto explícita, não decidida em silêncio.
--
-- DECISÃO DE DESIGN — máquina de estado de `demandas_criativas.status` (10
--   estados, ver CHECK e comentário de coluna):
--     solicitada           → analise | cancelada
--     analise               → aguardando_info | em_criacao | cancelada
--     aguardando_info        → analise | cancelada
--     em_criacao             → revisao_interna | cancelada
--     revisao_interna        → em_criacao | aguardando_aprovacao | cancelada
--     aguardando_aprovacao   → aprovada | em_criacao | cancelada
--     aprovada               → em_producao | cancelada
--     em_producao            → concluida | cancelada
--     concluida / cancelada  = terminais
--   Validada em `demandas_criativas_before_update`. Diferente de
--   `manutencoes` (Fase 2), aqui NÃO há papel operacional paralelo
--   (fornecedor) com escopo próprio de transição: a MESMA policy de UPDATE
--   (`criativa/demandas/editar/rede_toda`) porta tanto edição de campo geral
--   quanto transição de status — decisão explícita da tarefa ("não crie
--   policy separada por campo... o trigger é a linha de defesa fina"). Isso
--   significa que o solicitante do posto NÃO pode cancelar a própria demanda
--   sozinho nesta rodada (diferente de `manutencoes`, que tem esse carve-out
--   explícito) — quem cancela é sempre marketing/admin. Sinalizado
--   explicitamente aqui: se isso se provar rígido demais na prática, é
--   ajuste de policy numa rodada futura, não decidido por engano agora.
--
-- DECISÃO DE DESIGN — `demandas_criativas.solicitante_id` é SEMPRE
--   sobrescrito por `demandas_criativas_before_insert` com `auth.uid()`,
--   nunca aceito do cliente (mais estrito que `manutencoes.solicitante_id`,
--   que só usava `auth.uid()` como default quando vinha nulo — aqui a tarefa
--   pediu explicitamente "nunca aceito do cliente", então o trigger
--   sobrescreve mesmo que o cliente tenha mandado outro valor).
--
-- DECISÃO DE DESIGN — validação de `pdv_solicitante_id` mora na policy de
--   INSERT (WITH CHECK), não em trigger. A tarefa deu a escolha explícita
--   ("solicitante_id = auth.uid() sempre... pdv_solicitante_id só pode ser
--   preenchido se bater com usuario_pdv_id() OU rede_toda") sem prescrever
--   onde — optei por WITH CHECK porque é exatamente o mesmo padrão já usado
--   em `avaliacoes_outdoor_insert`/`manutencoes_insert` (Fase 2) para a mesma
--   forma de regra (permissão rede_toda OU permissão proprio_pdv + match de
--   pdv), evitando uma segunda camada de trigger para algo que a RLS já
--   expressa bem. `pdv_solicitante_id` (e `solicitante_id`) ficam imutáveis
--   depois da criação, garantido em `demandas_criativas_before_update`.
--
-- DECISÃO DE DESIGN — `demanda_criativa_historico.nota` fica sempre NULL
--   nesta rodada. A tarefa não deu a `demandas_criativas` nenhuma coluna tipo
--   `justificativa`/`nota_transicao` para o cliente carregar um comentário
--   junto da transição de UPDATE (diferente de `manutencoes.justificativa`,
--   que existe e é exigida por CHECK em estados específicos) — não há de
--   onde o trigger tirar um texto para `nota`. Quem quiser registrar contexto
--   textual de uma transição usa `demanda_criativa_comentarios` à parte.
--   Pendência sinalizada, não decidida em silêncio: se `nota` por transição
--   precisar ser obrigatório/vir do cliente, é preciso adicionar uma coluna
--   de payload em `demandas_criativas` numa rodada futura.
--
-- DECISÃO DE DESIGN — INSERT de arquivo/comentário validado em WITH CHECK
--   (não em trigger), mesma lógica de "onde validar" acima: um único `exists`
--   contra `demandas_criativas` cobre autorização-de-escrita-do-pai E status
--   não-terminal (`concluida`/`cancelada`) numa única condição, sem precisar
--   de trigger adicional. O gate de quem pode inserir é grant de ESCRITA
--   (`editar/rede_toda` ou `editar/proprio_pdv`), nunca `ler` — usar `ler`
--   aqui deixaria qualquer papel com só leitura (ex.: `director`,
--   `ler/rede_toda`) subir arquivo/comentar em demanda de outro posto sem
--   grant de escrita nenhum, mesmo padrão já exigido em
--   `manutencao_fotos_insert` (Fase 2). O carve-out `d.solicitante_id =
--   auth.uid()` cobre o próprio dono da demanda comentando/anexando na
--   própria demanda mesmo sem grant de `editar` (é o solicitante original
--   acompanhando, não edição de terceiro); `editar/proprio_pdv` já cobre
--   comentar/anexar na demanda de um colega do MESMO pdv (a condição checa
--   `d.pdv_solicitante_id = usuario_pdv_id()`, não `d.solicitante_id =
--   auth.uid()`), sem precisar de condição extra.
--   `demanda_criativa_arquivos`/`demanda_criativa_comentarios` NÃO recebem
--   policy de UPDATE nem DELETE nesta rodada — a tarefa só pediu
--   leitura+inserção; excluir um anexo/comentário fica para uma rodada
--   futura, se pedido (evita grant morto).
--
-- DECISÃO DE DESIGN — `demandas_criativas` NÃO tem DELETE (nem físico, nem
--   soft-delete-via-flag): decisão explícita da tarefa ("soft delete não se
--   aplica bem a workflow — cancelada cumpre esse papel"). Sem GRANT nem
--   policy de DELETE para nenhum papel, nem super_admin — diferente da
--   convenção padrão do projeto (excluir físico = super_admin), aqui é
--   ausência TOTAL de caminho de exclusão por design do fluxo. Mesmo
--   raciocínio estendido (não pedido explicitamente, mas consistente) para
--   `brand_library`: soft delete já existe via `is_active` (mutável por
--   UPDATE); DELETE físico não foi pedido nesta rodada e não foi adicionado
--   — evita grant/policy especulativa.
--
-- DECISÃO DE DESIGN — `demanda_criativa_historico` é insert-only de verdade
--   (mesmo padrão de `aprovacao_decisoes`, Fase 4): SEM GRANT de INSERT para
--   `authenticated` (só SELECT é concedido) e SEM policy de INSERT — a única
--   escrita é o `insert` dentro de `demandas_criativas_before_update`
--   (SECURITY DEFINER), que roda como o dono da função e por isso não
--   depende do GRANT do papel chamador (mesmo mecanismo já usado em
--   `aprovacao_decisoes_after_insert` escrevendo em `aprovacao_revisores` sem
--   GRANT de UPDATE para `authenticated` nessa tabela). SEM UPDATE/DELETE
--   para ninguém, nem super_admin.
--
-- DECISÃO DE DESIGN — `brand_library.tipo` É CHECK fixo (6 valores), ao
--   contrário de `demandas_criativas.tipo`/`.canal` (texto livre). Distinção
--   deliberada: os 6 valores de `brand_library.tipo` são categorias
--   ESTRUTURAIS do produto "Biblioteca de Marca" (o que a tela sabe
--   renderizar/filtrar de forma diferente por tipo), não uma lista que o
--   usuário de negócio cadastra/edita — mesmo critério já usado em
--   `outdoors.status_operacional`/`manutencoes.status` (máquina de estado ou
--   categoria fechada de produto = CHECK; opção de cadastro administrável =
--   `system_options`).
--
-- DECISÃO DE DESIGN — `brand_library` SELECT é livre para todo
--   `authenticated` com `is_active = true`, SEM checar `has_permission`.
--   Exceção deliberada ao padrão fail-closed-por-grant do resto do banco
--   (pedido explícito da tarefa): "biblioteca de consulta" não é dado
--   sensível nem territorial — qualquer colaborador logado pode consultar
--   fonte/manual de marca/arte de campanha já publicada. O arquivo em si
--   ainda passa por signed URL do Storage (a policy de `storage.objects`
--   abaixo replica a mesma condição `is_active = true`, sem grant extra).
--   Mutação (INSERT/UPDATE) continua fail-closed via
--   `criativa/biblioteca/editar/rede_toda`.
--
-- PENDÊNCIA CONHECIDA — `brand_library` não tem lógica de "inativar versão
--   anterior ao subir nova versão do mesmo item" (backlog Sprint 5.1,
--   Apêndice B). Fora de escopo desta migration porque exige decidir o que
--   identifica "o mesmo item" (nome? slug? um `parent_id`/`grupo_id`
--   próprio?) — decisão de produto não tomada aqui. Cada INSERT hoje é um
--   registro novo e independente, sem vínculo automático com uma versão
--   anterior do "mesmo" material. Sinalizado, não implementado em silêncio.
--
-- DECISÃO DE SEED — módulo `criativa` não usa a ação `excluir` em nenhuma
--   policy criada nesta migration (não há DELETE físico em nenhuma das 5
--   tabelas — ver decisão acima), então `excluir` não é semeada para
--   nenhum papel: seria grant morto. `papéis de gestão` (que recebem
--   criar/ler/editar em demandas e editar em biblioteca) = `super_admin` e
--   `admin` — a tarefa usa o rótulo "marketing/admin" para quem edita; este
--   catálogo de papéis (ver Core) não tem um papel dedicado "marketing", e
--   `admin` é quem exerce essa função operacional aqui, mesmo critério já
--   usado nas fases anteriores. `director` recebe só leitura rede_toda em
--   demandas (visão executiva, mesmo padrão do módulo `midia_externa`: ler
--   tudo, editar só onde explicitamente listado — aqui a tarefa não listou
--   editar para director). `manager`/`collaborator` recebem
--   criar+ler/proprio_pdv em demandas, por pedido explícito da tarefa (abrir
--   demanda exige grant, mesmo para o próprio posto — coerente com
--   fail-closed). `supplier`/`coordenador_compras`/
--   `convenience_coordinator`/`approver_executive` não recebem nada por
--   padrão (least privilege, mesmo critério das fases anteriores).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. demandas_criativas — demanda criativa (fluxo tipo Kanban)
-- -----------------------------------------------------------------------------
create table public.demandas_criativas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  tipo text,
  solicitante_id uuid not null references public.usuarios(id),
  pdv_solicitante_id uuid references public.pdvs(id),
  responsavel_id uuid references public.usuarios(id),
  prioridade text not null default 'normal' check (prioridade in ('urgente', 'alta', 'normal', 'baixa')),
  status text not null default 'solicitada' check (status in (
    'solicitada', 'analise', 'aguardando_info', 'em_criacao', 'revisao_interna',
    'aguardando_aprovacao', 'aprovada', 'em_producao', 'concluida', 'cancelada'
  )),
  prazo date,
  canal text,
  brief text,
  aprovacao_item_id uuid references public.aprovacao_itens(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.demandas_criativas is 'Demanda criativa interna (fluxo tipo Kanban), substitui ferramenta externa. Máquina de estado de 10 status documentada no topo do arquivo. solicitante_id sempre = auth.uid() no INSERT (trigger, nunca aceito do cliente); pdv_solicitante_id nulo = demanda interna do próprio marketing.';
comment on column public.demandas_criativas.tipo is 'Texto livre, deliberadamente SEM CHECK nem trigger de validação contra system_options nesta rodada (mesmo motivo já documentado nas Fases 3 e 4 para materiais.tipo/categoria e aprovacao_itens.tipo: um bug real já deixou um campo assim impossível de preencher por falta de seed). Ver decisão no topo do arquivo.';
comment on column public.demandas_criativas.canal is 'Texto livre, mesma decisão de tipo — sem catálogo/system_options nesta rodada.';
comment on column public.demandas_criativas.pdv_solicitante_id is 'Nullable: presente quando quem abriu é de um posto específico, nulo quando é demanda interna do próprio marketing. Imutável após a criação (demandas_criativas_before_update). Validação de quem pode preencher com qual valor mora na policy de INSERT (WITH CHECK), não em trigger — ver decisão no topo do arquivo.';
comment on column public.demandas_criativas.aprovacao_item_id is 'Vínculo ADITIVO e opcional de volta para aprovacao_itens (Fase 4), quando a demanda é enviada para Aprovações Executivas. Não há webhook/trigger que sincronize aprovacao_itens.status de volta para o status desta linha — a atualização é MANUAL pelo marketing. SEMPRE null no INSERT (forçado em WITH CHECK de demandas_criativas_insert) — só pode ser preenchido depois, via UPDATE, que já exige criativa/demandas/editar/rede_toda; evita que quem só tem criar/proprio_pdv associe a própria demanda a um aprovacao_itens existente antes do fluxo real de envio. Ver decisão no topo do arquivo.';
comment on column public.demandas_criativas.status is 'Máquina de estado de 10 valores — ver decisão de topo do arquivo para o mapa completo de transições. Validada em demandas_criativas_before_update, não só por CHECK.';

create index demandas_criativas_solicitante_id_idx on public.demandas_criativas (solicitante_id);
create index demandas_criativas_pdv_solicitante_id_idx on public.demandas_criativas (pdv_solicitante_id);
create index demandas_criativas_status_idx on public.demandas_criativas (status);

create trigger set_updated_at
  before update on public.demandas_criativas
  for each row execute function public.update_updated_at_column();

alter table public.demandas_criativas enable row level security;


-- -----------------------------------------------------------------------------
-- 1b. BEFORE INSERT — força solicitante_id = auth.uid(), nasce em 'solicitada'
-- -----------------------------------------------------------------------------
create or replace function public.demandas_criativas_before_insert()
returns trigger
language plpgsql
as $$
begin
  new.solicitante_id := auth.uid();

  if new.status is null then
    new.status := 'solicitada';
  end if;
  if new.status <> 'solicitada' then
    raise exception 'demanda_criativa precisa nascer com status solicitada';
  end if;

  return new;
end;
$$;

comment on function public.demandas_criativas_before_insert is 'Força solicitante_id = auth.uid() (nunca aceito do cliente, decisão explícita da tarefa — mais estrito que o default condicional usado em manutencoes_before_insert). Toda demanda_criativa nasce em status solicitada. Validação de pdv_solicitante_id fica na policy de INSERT (WITH CHECK), não aqui — ver decisão no topo do arquivo.';

create trigger before_insert_forcar_solicitante
  before insert on public.demandas_criativas
  for each row execute function public.demandas_criativas_before_insert();


-- -----------------------------------------------------------------------------
-- 1c. BEFORE UPDATE — imutabilidade de identidade + máquina de estado + histórico
-- -----------------------------------------------------------------------------
create or replace function public.demandas_criativas_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed text[];
begin
  if new.solicitante_id <> old.solicitante_id
    or new.pdv_solicitante_id is distinct from old.pdv_solicitante_id
  then
    raise exception 'solicitante_id e pdv_solicitante_id são imutáveis após a criação';
  end if;

  if new.status = old.status then
    return new;
  end if;

  v_allowed := case old.status
    when 'solicitada' then array['analise', 'cancelada']
    when 'analise' then array['aguardando_info', 'em_criacao', 'cancelada']
    when 'aguardando_info' then array['analise', 'cancelada']
    when 'em_criacao' then array['revisao_interna', 'cancelada']
    when 'revisao_interna' then array['em_criacao', 'aguardando_aprovacao', 'cancelada']
    when 'aguardando_aprovacao' then array['aprovada', 'em_criacao', 'cancelada']
    when 'aprovada' then array['em_producao', 'cancelada']
    when 'em_producao' then array['concluida', 'cancelada']
    else array[]::text[]
  end;

  if not (new.status = any (v_allowed)) then
    raise exception 'transição de % para % não é permitida', old.status, new.status;
  end if;

  -- nota fica NULL: não há campo de payload em demandas_criativas para o
  -- cliente carregar um comentário junto da transição (ver decisão no topo
  -- do arquivo). Quem quiser contexto textual usa demanda_criativa_comentarios.
  insert into public.demanda_criativa_historico (demanda_id, alterado_por, status_antigo, status_novo, nota)
  values (new.id, auth.uid(), old.status, new.status, null);

  insert into public.audit_logs (action, entity_type, entity_id, usuario_id, dados_antes, dados_depois)
  values (
    'demanda_criativa_transicao_status',
    'demandas_criativas',
    new.id,
    auth.uid(),
    jsonb_build_object('status', old.status),
    jsonb_build_object('status', new.status)
  );

  return new;
end;
$$;

comment on function public.demandas_criativas_before_update is 'Trava solicitante_id/pdv_solicitante_id como imutáveis, valida a máquina de estado (mapa completo no topo do arquivo) e grava a transição em demanda_criativa_historico E audit_logs. A autorização de QUEM pode chegar a este UPDATE é inteira da policy de RLS (única, sem carve-out por ator — ver decisão no topo do arquivo); este trigger só valida SEQUÊNCIA, não ator. SECURITY DEFINER porque o INSERT em demanda_criativa_historico/audit_logs não depende do GRANT do papel chamador (mesmo mecanismo de aprovacao_decisoes_after_insert, Fase 4).';

create trigger before_update_validar_transicao
  before update on public.demandas_criativas
  for each row execute function public.demandas_criativas_before_update();


-- -----------------------------------------------------------------------------
-- 2. demanda_criativa_arquivos — anexos/versões de arquivo da demanda
-- -----------------------------------------------------------------------------
create table public.demanda_criativa_arquivos (
  id uuid primary key default gen_random_uuid(),
  demanda_id uuid not null references public.demandas_criativas(id) on delete cascade,
  enviado_por uuid not null references public.usuarios(id),
  arquivo_url text not null,
  nome_arquivo text not null,
  tamanho_bytes bigint,
  versao integer not null default 1,
  arquivo_final boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.demanda_criativa_arquivos is 'Arquivo/versão anexado a uma demanda_criativa. Sem updated_at de propósito — arquivo enviado não se edita, só se adiciona nova versão (nova linha, versao incrementado pelo cliente). Sem policy de UPDATE/DELETE nesta rodada (não pedido — evita grant morto).';
comment on column public.demanda_criativa_arquivos.arquivo_url is 'Path no bucket de Storage demanda-criativa-arquivos, formato {demanda_id}/{arquivo}.';
comment on column public.demanda_criativa_arquivos.arquivo_final is 'Marca a versão entregue como final do trabalho — distinção de exibição, não de máquina de estado (não valida nada por trigger).';

create index demanda_criativa_arquivos_demanda_id_idx on public.demanda_criativa_arquivos (demanda_id);

alter table public.demanda_criativa_arquivos enable row level security;


-- -----------------------------------------------------------------------------
-- 3. demanda_criativa_comentarios — comentário/discussão na demanda
-- -----------------------------------------------------------------------------
create table public.demanda_criativa_comentarios (
  id uuid primary key default gen_random_uuid(),
  demanda_id uuid not null references public.demandas_criativas(id) on delete cascade,
  autor_id uuid not null references public.usuarios(id),
  conteudo text not null,
  created_at timestamptz not null default now()
);

comment on table public.demanda_criativa_comentarios is 'Comentário/discussão numa demanda_criativa. Sem updated_at de propósito — comentário não se edita nesta rodada (decisão de simplicidade, não pedido nada além de criar/ler). Sem policy de UPDATE/DELETE nesta rodada.';

create index demanda_criativa_comentarios_demanda_id_idx on public.demanda_criativa_comentarios (demanda_id);

alter table public.demanda_criativa_comentarios enable row level security;


-- -----------------------------------------------------------------------------
-- 4. demanda_criativa_historico — trilha IMUTÁVEL de transição de status
-- -----------------------------------------------------------------------------
create table public.demanda_criativa_historico (
  id uuid primary key default gen_random_uuid(),
  demanda_id uuid not null references public.demandas_criativas(id) on delete cascade,
  alterado_por uuid references public.usuarios(id) on delete set null,
  status_antigo text,
  status_novo text not null,
  nota text,
  created_at timestamptz not null default now()
);

comment on table public.demanda_criativa_historico is 'Trilha IMUTÁVEL de transição de status de demandas_criativas. SEM UPDATE nem DELETE para ninguém, nem super_admin (mesmo padrão de aprovacao_decisoes, Fase 4). Só é escrita por demandas_criativas_before_update (SECURITY DEFINER) — sem GRANT de INSERT para authenticated, sem policy de INSERT direto pro cliente. nota fica sempre NULL nesta rodada — ver decisão no topo do arquivo.';
comment on column public.demanda_criativa_historico.alterado_por is 'auth.uid() no momento da transição; ON DELETE SET NULL — a trilha sobrevive à exclusão física do usuário, mesmo padrão de audit_logs.usuario_id.';

create index demanda_criativa_historico_demanda_id_idx on public.demanda_criativa_historico (demanda_id);

alter table public.demanda_criativa_historico enable row level security;


-- -----------------------------------------------------------------------------
-- 5. brand_library — biblioteca de marca (fonte/guia/arte finalizada de consulta)
-- -----------------------------------------------------------------------------
create table public.brand_library (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('fonte', 'guia_cores', 'manual_marca', 'arte_campanha', 'material_institucional', 'outro')),
  arquivo_url text not null,
  thumbnail_url text,
  tags text[] not null default '{}',
  versao integer not null default 1,
  is_active boolean not null default true,
  enviado_por uuid not null references public.usuarios(id),
  campanha_id uuid references public.campanhas(id),
  descricao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.brand_library is 'Biblioteca de marca (fonte/guia de cores/manual de marca/arte de campanha/material institucional finalizado), de consulta. is_active é o soft delete (toggle via UPDATE); sem DELETE físico nesta rodada (não pedido). Sem lógica de inativação automática de versão anterior ao subir uma nova (pendência conhecida — ver decisão no topo do arquivo).';
comment on column public.brand_library.tipo is 'CHECK fixo, DIFERENTE de tipo/canal de demandas_criativas: são categorias estruturais do produto (a tela sabe renderizar/filtrar por tipo), não catálogo administrável pelo usuário de negócio — ver decisão no topo do arquivo.';
comment on column public.brand_library.arquivo_url is 'Path no bucket de Storage biblioteca-marca-arquivos, formato {brand_library_id}/{arquivo}. Bucket privado mesmo com leitura de tabela livre — ainda passa por signed URL.';
comment on column public.brand_library.campanha_id is 'Nullable — nem todo material de marca está ligado a uma campanha específica (ex.: manual de marca institucional).';

create index brand_library_campanha_id_idx on public.brand_library (campanha_id);
create index brand_library_is_active_idx on public.brand_library (is_active);

create trigger set_updated_at
  before update on public.brand_library
  for each row execute function public.update_updated_at_column();

alter table public.brand_library enable row level security;


-- =============================================================================
-- 6. RLS — políticas por papel + GRANT explícito (obrigatório, CLAUDE.md)
-- Módulo: 'criativa', recursos 'demandas' e 'biblioteca'. Fail-closed
-- (ADR-006) em tudo, EXCETO a exceção deliberada de SELECT livre em
-- brand_library (documentada no topo do arquivo).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- demandas_criativas: SELECT com dono-vê-o-próprio + rede_toda + proprio_pdv;
-- INSERT com pdv_solicitante_id validado inline; UPDATE única (campo geral E
-- transição de status, sem policy separada). SEM DELETE (decisão explícita —
-- ver topo do arquivo).
-- ---------------------------------------------------------------------------
grant select, insert, update on public.demandas_criativas to authenticated;

create policy demandas_criativas_select on public.demandas_criativas
  for select to authenticated
  using (
    solicitante_id = auth.uid()
    or public.has_permission('criativa', 'demandas', 'ler', 'rede_toda')
    or (
      public.has_permission('criativa', 'demandas', 'ler', 'proprio_pdv')
      and pdv_solicitante_id = public.usuario_pdv_id()
    )
  );

create policy demandas_criativas_insert on public.demandas_criativas
  for insert to authenticated
  with check (
    solicitante_id = auth.uid()
    and aprovacao_item_id is null
    and (
      public.has_permission('criativa', 'demandas', 'criar', 'rede_toda')
      or (
        public.has_permission('criativa', 'demandas', 'criar', 'proprio_pdv')
        and pdv_solicitante_id = public.usuario_pdv_id()
      )
    )
  );

create policy demandas_criativas_update on public.demandas_criativas
  for update to authenticated
  using (public.has_permission('criativa', 'demandas', 'editar', 'rede_toda'))
  with check (public.has_permission('criativa', 'demandas', 'editar', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- demanda_criativa_arquivos: leitura espelha a visibilidade (ler) da demanda
-- pai; inserção exige grant de ESCRITA (editar/rede_toda ou editar/proprio_pdv)
-- OU ser o solicitante original, nunca só `ler` (ver decisão no topo do
-- arquivo) — e também exige que a demanda não esteja concluida nem cancelada.
-- Sem UPDATE/DELETE nesta rodada.
-- ---------------------------------------------------------------------------
grant select, insert on public.demanda_criativa_arquivos to authenticated;

create policy demanda_criativa_arquivos_select on public.demanda_criativa_arquivos
  for select to authenticated
  using (
    exists (
      select 1 from public.demandas_criativas d
      where d.id = demanda_criativa_arquivos.demanda_id
        and (
          d.solicitante_id = auth.uid()
          or public.has_permission('criativa', 'demandas', 'ler', 'rede_toda')
          or (public.has_permission('criativa', 'demandas', 'ler', 'proprio_pdv') and d.pdv_solicitante_id = public.usuario_pdv_id())
        )
    )
  );

create policy demanda_criativa_arquivos_insert on public.demanda_criativa_arquivos
  for insert to authenticated
  with check (
    enviado_por = auth.uid()
    and exists (
      select 1 from public.demandas_criativas d
      where d.id = demanda_criativa_arquivos.demanda_id
        and d.status not in ('concluida', 'cancelada')
        and (
          d.solicitante_id = auth.uid()
          or public.has_permission('criativa', 'demandas', 'editar', 'rede_toda')
          or (public.has_permission('criativa', 'demandas', 'editar', 'proprio_pdv') and d.pdv_solicitante_id = public.usuario_pdv_id())
        )
    )
  );


-- ---------------------------------------------------------------------------
-- demanda_criativa_comentarios: mesmo padrão de demanda_criativa_arquivos
-- (inserção por grant de escrita, nunca de leitura — ver decisão no topo).
-- ---------------------------------------------------------------------------
grant select, insert on public.demanda_criativa_comentarios to authenticated;

create policy demanda_criativa_comentarios_select on public.demanda_criativa_comentarios
  for select to authenticated
  using (
    exists (
      select 1 from public.demandas_criativas d
      where d.id = demanda_criativa_comentarios.demanda_id
        and (
          d.solicitante_id = auth.uid()
          or public.has_permission('criativa', 'demandas', 'ler', 'rede_toda')
          or (public.has_permission('criativa', 'demandas', 'ler', 'proprio_pdv') and d.pdv_solicitante_id = public.usuario_pdv_id())
        )
    )
  );

create policy demanda_criativa_comentarios_insert on public.demanda_criativa_comentarios
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from public.demandas_criativas d
      where d.id = demanda_criativa_comentarios.demanda_id
        and d.status not in ('concluida', 'cancelada')
        and (
          d.solicitante_id = auth.uid()
          or public.has_permission('criativa', 'demandas', 'editar', 'rede_toda')
          or (public.has_permission('criativa', 'demandas', 'editar', 'proprio_pdv') and d.pdv_solicitante_id = public.usuario_pdv_id())
        )
    )
  );


-- ---------------------------------------------------------------------------
-- demanda_criativa_historico: SELECT espelha a demanda pai. SEM GRANT de
-- INSERT/UPDATE/DELETE para authenticated — só demandas_criativas_before_update
-- (SECURITY DEFINER) escreve aqui.
-- ---------------------------------------------------------------------------
grant select on public.demanda_criativa_historico to authenticated;

create policy demanda_criativa_historico_select on public.demanda_criativa_historico
  for select to authenticated
  using (
    exists (
      select 1 from public.demandas_criativas d
      where d.id = demanda_criativa_historico.demanda_id
        and (
          d.solicitante_id = auth.uid()
          or public.has_permission('criativa', 'demandas', 'ler', 'rede_toda')
          or (public.has_permission('criativa', 'demandas', 'ler', 'proprio_pdv') and d.pdv_solicitante_id = public.usuario_pdv_id())
        )
    )
  );

-- Sem policy de INSERT/UPDATE/DELETE por design: só o trigger SECURITY
-- DEFINER de demandas_criativas grava aqui.


-- ---------------------------------------------------------------------------
-- brand_library: SELECT livre para todo authenticated com is_active = true
-- (exceção deliberada ao fail-closed-por-grant — ver decisão no topo do
-- arquivo). INSERT/UPDATE fail-closed via criativa/biblioteca/editar/rede_toda.
-- SEM DELETE nesta rodada (is_active já cobre soft delete via UPDATE).
-- ---------------------------------------------------------------------------
grant select, insert, update on public.brand_library to authenticated;

create policy brand_library_select on public.brand_library
  for select to authenticated
  using (is_active = true);

create policy brand_library_insert on public.brand_library
  for insert to authenticated
  with check (
    enviado_por = auth.uid()
    and public.has_permission('criativa', 'biblioteca', 'editar', 'rede_toda')
  );

create policy brand_library_update on public.brand_library
  for update to authenticated
  using (public.has_permission('criativa', 'biblioteca', 'editar', 'rede_toda'))
  with check (public.has_permission('criativa', 'biblioteca', 'editar', 'rede_toda'));


-- =============================================================================
-- 7. Storage — buckets demanda-criativa-arquivos e biblioteca-marca-arquivos +
-- RLS de storage.objects. Mesmo padrão das fases anteriores: bucket privado,
-- path {entidade_id}/{arquivo}.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('demanda-criativa-arquivos', 'demanda-criativa-arquivos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('biblioteca-marca-arquivos', 'biblioteca-marca-arquivos', false)
on conflict (id) do nothing;

-- demanda-criativa-arquivos: path {demanda_id}/{arquivo}. Leitura/inserção
-- espelham exatamente a mesma condição das policies de tabela acima
-- (inserção por grant de escrita/editar, nunca de leitura/ler — ver decisão
-- no topo do arquivo). Sem update/delete (arquivo enviado não se edita/remove
-- nesta rodada).
create policy demanda_criativa_arquivos_bucket_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'demanda-criativa-arquivos'
    and exists (
      select 1 from public.demandas_criativas d
      where d.id::text = (storage.foldername(name))[1]
        and (
          d.solicitante_id = auth.uid()
          or public.has_permission('criativa', 'demandas', 'ler', 'rede_toda')
          or (public.has_permission('criativa', 'demandas', 'ler', 'proprio_pdv') and d.pdv_solicitante_id = public.usuario_pdv_id())
        )
    )
  );

create policy demanda_criativa_arquivos_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'demanda-criativa-arquivos'
    and exists (
      select 1 from public.demandas_criativas d
      where d.id::text = (storage.foldername(name))[1]
        and d.status not in ('concluida', 'cancelada')
        and (
          d.solicitante_id = auth.uid()
          or public.has_permission('criativa', 'demandas', 'editar', 'rede_toda')
          or (public.has_permission('criativa', 'demandas', 'editar', 'proprio_pdv') and d.pdv_solicitante_id = public.usuario_pdv_id())
        )
    )
  );

-- biblioteca-marca-arquivos: path {brand_library_id}/{arquivo}. Leitura
-- espelha o is_active=true da tabela; escrita segue o mesmo grant global de
-- criativa/biblioteca/editar/rede_toda (sem checagem por linha — mesma forma
-- da policy de tabela).
create policy biblioteca_marca_arquivos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'biblioteca-marca-arquivos'
    and exists (
      select 1 from public.brand_library b
      where b.id::text = (storage.foldername(name))[1]
        and b.is_active = true
    )
  );

create policy biblioteca_marca_arquivos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'biblioteca-marca-arquivos'
    and public.has_permission('criativa', 'biblioteca', 'editar', 'rede_toda')
  );

create policy biblioteca_marca_arquivos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'biblioteca-marca-arquivos' and public.has_permission('criativa', 'biblioteca', 'editar', 'rede_toda'))
  with check (bucket_id = 'biblioteca-marca-arquivos' and public.has_permission('criativa', 'biblioteca', 'editar', 'rede_toda'));


-- =============================================================================
-- 8. Seed de permissão — módulo 'criativa' (fail-closed: sem isso, ninguém
-- opera este módulo). Critério de quem recebe o quê documentado no topo do
-- arquivo (seção "DECISÃO DE SEED").
-- =============================================================================

-- super_admin/admin ("papéis de gestão" = marketing/admin, ver topo do
-- arquivo): criar/ler/editar rede_toda em demandas; editar rede_toda em
-- biblioteca. Sem 'excluir' — não há DELETE físico em nenhuma tabela desta
-- migration, grant seria morto.
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'criativa', 'demandas', acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('criar'), ('ler'), ('editar')) as acao(nome)
where p.nome in ('super_admin', 'admin')
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'criativa', 'biblioteca', 'editar', 'rede_toda'
from public.papeis p
where p.nome in ('super_admin', 'admin')
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- director: visão executiva, só leitura rede_toda em demandas (mesmo padrão
-- de midia_externa — ler tudo, editar só onde explicitamente listado; a
-- tarefa não listou editar para director aqui). Sem grant de biblioteca —
-- já cobre pela leitura livre da policy (não precisa de has_permission).
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'criativa', 'demandas', 'ler', 'rede_toda'
from public.papeis p
where p.nome = 'director'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- manager/collaborator: criar+ler proprio_pdv em demandas — pedido explícito
-- da tarefa (abrir a própria demanda exige grant, mesmo fail-closed).
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'criativa', 'demandas', acao.nome, 'proprio_pdv'
from public.papeis p
cross join (values ('criar'), ('ler')) as acao(nome)
where p.nome in ('manager', 'collaborator')
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- supplier/coordenador_compras/convenience_coordinator/approver_executive:
-- nenhum grant por padrão (least privilege, mesmo critério das fases
-- anteriores) — concede-se depois, se necessário, pela UI de administração.
