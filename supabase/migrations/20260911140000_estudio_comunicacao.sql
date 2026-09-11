-- =============================================================================
-- Marketing OS (novo) — Fase 6: Estúdio de Comunicação
-- estudio_categorias, estudio_templates, estudio_elementos,
-- estudio_template_areas, estudio_composicoes, estudio_composicao_elementos
-- =============================================================================
--
-- PRÉ-REQUISITO: Core (20260908103000), Fase 2 (20260908140000), Fase 2b/3
-- (20260908160000, 20260908180000), Fase 4 (20260910120000) e Fase 5
-- (20260911100000) já aplicadas. Esta migration só LÊ usuarios/pdvs/
-- campanhas/has_permission/usuario_pdv_id/update_updated_at_column — nenhuma
-- delas é alterada aqui.
--
-- RENOME para português (convenção do projeto): `studio_template_categories`
-- ficou `estudio_categorias`; `studio_templates` ficou `estudio_templates`;
-- `studio_elements` ficou `estudio_elementos`; `studio_template_areas` ficou
-- `estudio_template_areas`; `studio_compositions` ficou `estudio_composicoes`;
-- `studio_composition_elements` ficou `estudio_composicao_elementos`.
--
-- DECISÃO DE DESIGN — canal NORMALIZADO, não duplicado entre categoria e
--   template. O backlog original (1.1.01/1.1.02) lista `channel` tanto em
--   `studio_template_categories` quanto em `studio_templates`. Optei por
--   normalizar: `estudio_templates` NÃO tem coluna `canal` própria — deriva
--   via join com `estudio_categorias.canal` (a categoria já é obrigatória,
--   `categoria_id not null`). Motivo: um template não pode logicamente
--   pertencer a um canal diferente do canal da própria categoria — manter os
--   dois campos permitiria essa divergência silenciosa e exigiria trigger de
--   coerência só para não acontecer. Normalizado elimina a classe de bug
--   (mesmo raciocínio de "opção de campo vem de system_options, não
--   duplicada" aplicado aqui a uma FK em vez de um catálogo). Custo aceito:
--   toda leitura de "templates do canal X" precisa de join com
--   `estudio_categorias`; nas tabelas já existentes desse porte (`brand_
--   library`, `demandas_criativas`) esse join já é rotina no frontend.
--
-- DECISÃO DE DESIGN — DELETE físico em `estudio_templates`: implementado,
--   restrito a `super_admin` (`estudio/templates/excluir/rede_toda`),
--   diferente de `brand_library` (Fase 5, sem DELETE) porque o backlog aqui
--   pede DELETE explicitamente (1.1.02: "INSERT/UPDATE/DELETE para admin/
--   super_admin"). Mesmo padrão do resto do projeto ("exclusão física exige
--   super_admin e ação explícita"). A integridade é protegida sem CASCADE
--   especulativo: `estudio_composicoes.template_id` referencia o template SEM
--   `on delete cascade` (default `NO ACTION`/RESTRICT do Postgres) — apagar
--   um template com composições existentes falha na constraint, forçando
--   decisão explícita (reatribuir/remover as composições primeiro) em vez de
--   apagar composições de posto em cascata por engano. `estudio_categorias`
--   e `estudio_elementos` NÃO recebem DELETE físico nesta rodada — não foi
--   pedido para elas (só para template, 1.1.02, diferente de 1.1.01/1.1.03) e
--   `is_active=false` (soft delete) já cobre "desativar não apaga", mesmo
--   critério de `brand_library`.
--
-- DECISÃO DE DESIGN — granularidade de recurso: `estudio_categorias`,
--   `estudio_templates` e `estudio_elementos` compartilham o MESMO recurso de
--   permissão (`estudio/templates`) para escrita, por pedido explícito da
--   tarefa ("não crie recurso categorias/elementos separado"). Quem gerencia
--   template gerencia categoria e elemento com o mesmo grant. Ação usada é
--   sempre `editar` para INSERT+UPDATE (a tarefa não pede `criar` separado
--   aqui); `excluir` só existe para o DELETE de template.
--
-- DECISÃO DE DESIGN — `estudio_template_areas` não tem `is_active` nem
--   `updated_at` (lista de colunas da tarefa é exaustiva e não inclui
--   nenhuma das duas — mesmo padrão já aceito em `demanda_criativa_arquivos`/
--   `demanda_criativa_comentarios`, Fase 5, que também omitem `updated_at` de
--   propósito). Leitura espelha `estudio_templates.is_active = true` via
--   `exists`. Escrita (INSERT/UPDATE/DELETE) usa o MESMO grant de edição
--   (`estudio/templates/editar/rede_toda`) — incluindo DELETE, sem exigir
--   `super_admin`: uma área é configuração estrutural do LAYOUT do template
--   (redesenhar o template inclui remover área), não um registro de negócio
--   com histórico próprio; não é o mesmo tipo de "exclusão física" que a
--   convenção do projeto protege com `super_admin` (essa convenção se aplica
--   a entidades, não a linhas de configuração de uma entidade que o próprio
--   editor já controla via `editar`).
--
-- DECISÃO DE DESIGN — `estudio_composicoes` e `estudio_composicao_elementos`
--   seguem EXATAMENTE a lista de colunas da tarefa, que não inclui `is_active`
--   em nenhuma das duas nem `updated_at` em `estudio_composicao_elementos`.
--   Consequência: NÃO há grant nem policy de DELETE para `estudio_composicoes`
--   nem soft-delete — uma composição, uma vez criada, só transiciona de
--   status (`draft`/`saved`/`exported`), nunca é removida nesta rodada. Isso
--   é PENDÊNCIA CONHECIDA, não decidida em silêncio: se um rascunho precisar
--   ser descartável de verdade, é preciso decidir soft delete (`is_active`)
--   ou DELETE físico numa rodada futura — a tarefa não pediu nenhum dos dois
--   aqui. `estudio_composicao_elementos` TEM DELETE (junto com INSERT/UPDATE),
--   porque remover/substituir um elemento de dentro de uma composição em
--   edição é parte normal do fluxo (1.1.06 do backlog: "Remover elemento da
--   composição apaga o registro correspondente") — sem trigger de
--   `updated_at` porque a coluna não existe, edição de elemento na prática é
--   delete+insert ou update dos campos de posição/escala, ambos cobertos pela
--   policy de escrita.
--
-- DECISÃO DE DESIGN — máquina de status de `estudio_composicoes`
--   (`draft`/`saved`/`exported`) é DELIBERADAMENTE sem imutabilidade de
--   transição — diferente de toda outra máquina de estado do projeto até
--   aqui (`manutencoes`, `demandas_criativas`, `outdoors`). Backlog 1.3.03:
--   "Exportar não impede reedição — continua editável". Não há trigger de
--   `v_allowed` restringindo `old.status -> new.status`; qualquer transição
--   em qualquer direção é permitida por CHECK simples. A ÚNICA validação de
--   trigger implementada é a exigida explicitamente pela tarefa: `nome` não
--   pode ser NULL quando `status` está virando `saved` ou `exported`
--   (`estudio_composicoes_before_update`, roda em INSERT e UPDATE). Sem
--   trilha `_historico` dedicada para composições — não pedida, e não faria
--   sentido junto de uma máquina de estado sem restrição de sequência. Toda
--   transição de status (em qualquer direção) é gravada em `audit_logs` —
--   sem trava de sequência, a trilha de auditoria é a única forma de saber
--   quem exportou ou quem reabriu um `exported` de volta pra `draft`.
--
-- DECISÃO DE DESIGN — `criado_por`/`template_id`/`pdv_id` de
--   `estudio_composicoes` são imutáveis após a criação, travados em
--   `estudio_composicoes_before_update` (mesmo padrão de
--   `demandas_criativas_before_update` para `solicitante_id`/
--   `pdv_solicitante_id`, Fase 5). Revisão de segurança apontou que a policy
--   de UPDATE por si só (escopo `proprio_pdv` exigindo `pdv_id =
--   usuario_pdv_id()` no `WITH CHECK`) não bastava: quem tem `rede_toda`
--   (ou `proprio_pdv` reescrevendo só `criado_por`/`template_id`) conseguia
--   alterar esses campos livremente num UPDATE comum, sem checagem alguma —
--   a trigger fecha essa lacuna independente de escopo.
--
-- DECISÃO DE SEED — `estudio/composicoes/criar|ler|editar/rede_toda` vai só
--   para `super_admin`/`admin` (mesmo critério de "papéis de gestão" das
--   fases anteriores, ver Fase 5). `director` recebe só
--   `estudio/composicoes/ler/rede_toda` (visão executiva sem escrita), mesmo
--   precedente de `demandas_criativas` (Fase 5) — corrigido na revisão de
--   segurança para manter consistência entre as fases.
--
-- SEED DE CATEGORIAS (1.1.01) — canal de cada categoria inicial é escolha
--   razoável documentada, não veio especificado literalmente pela tarefa:
--     Combustível            -> pdv_impresso (tabela de preço/banner na pista)
--     Serviços Automotivos   -> lona (faixa/lona promocional no posto)
--     AmPm/Alimentação       -> instagram_feed (divulgação de conveniência)
--     Promoção Especial      -> whatsapp (broadcast de promoção pro cliente)
--     Informativo            -> led (painel de LED com informação rotativa)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. estudio_categorias — categoria de template (canal fixo, estrutural)
-- -----------------------------------------------------------------------------
create table public.estudio_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  canal text not null check (canal in ('whatsapp', 'instagram_feed', 'instagram_story', 'pdv_impresso', 'email', 'led', 'lona')),
  icone text,
  ordem integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.estudio_categorias is 'Categoria de template do Estúdio de Comunicação. canal é CHECK fixo — categoria estrutural do produto, mesmo padrão de brand_library.tipo (Fase 5), não catálogo administrável via system_options. nome é UNIQUE para permitir seed idempotente (on conflict (nome) do nothing) se a migration for reaplicada.';
comment on column public.estudio_categorias.canal is 'Canal de destino da peça. Fonte única de canal: estudio_templates deriva o canal via join com esta coluna (ver decisão no topo do arquivo), não duplica.';

create index estudio_categorias_is_active_idx on public.estudio_categorias (is_active);

create trigger set_updated_at
  before update on public.estudio_categorias
  for each row execute function public.update_updated_at_column();

alter table public.estudio_categorias enable row level security;


-- -----------------------------------------------------------------------------
-- 2. estudio_templates — layout pré-produzido (PNG) com áreas configuráveis
-- -----------------------------------------------------------------------------
create table public.estudio_templates (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  categoria_id uuid not null references public.estudio_categorias(id),
  imagem_base_url text not null,
  thumbnail_url text,
  largura_px integer not null check (largura_px > 0),
  altura_px integer not null check (altura_px > 0),
  versao integer not null default 1,
  is_active boolean not null default true,
  criado_por uuid not null references public.usuarios(id),
  campanha_id uuid references public.campanhas(id),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.estudio_templates is 'Layout pré-produzido (PNG exportado do Photoshop) que o colaborador de posto usa como base para montar uma peça. SEM coluna canal própria — deriva de estudio_categorias.canal via categoria_id (ver decisão de normalização no topo do arquivo).';
comment on column public.estudio_templates.imagem_base_url is 'Path no bucket de Storage estudio-templates, formato {template_id}/{arquivo}.';
comment on column public.estudio_templates.campanha_id is 'Nullable — template pode ser de campanha específica (visível só a postos incluídos, regra de frontend/futuro escopo) ou genérico institucional.';
comment on column public.estudio_templates.is_active is 'Soft delete padrão: desativar não apaga. DELETE físico também existe nesta tabela, restrito a super_admin — ver decisão no topo do arquivo.';

create index estudio_templates_categoria_id_idx on public.estudio_templates (categoria_id);
create index estudio_templates_campanha_id_idx on public.estudio_templates (campanha_id);
create index estudio_templates_is_active_idx on public.estudio_templates (is_active);

create trigger set_updated_at
  before update on public.estudio_templates
  for each row execute function public.update_updated_at_column();

alter table public.estudio_templates enable row level security;


-- -----------------------------------------------------------------------------
-- 3. estudio_elementos — biblioteca de elementos reutilizáveis
-- -----------------------------------------------------------------------------
create table public.estudio_elementos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('imagem_produto', 'logo', 'selo', 'icone', 'grafico', 'texto_titulo', 'texto_preco', 'texto_descricao', 'texto_cta', 'texto_info')),
  arquivo_url text,
  thumbnail_url text,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  enviado_por uuid not null references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint estudio_elementos_arquivo_coerente check (
    (tipo in ('imagem_produto', 'logo', 'selo', 'icone', 'grafico') and arquivo_url is not null)
    or
    (tipo in ('texto_titulo', 'texto_preco', 'texto_descricao', 'texto_cta', 'texto_info') and arquivo_url is null)
  )
);

comment on table public.estudio_elementos is 'Biblioteca de elementos reutilizáveis entre templates (imagem de produto, logo, selo, ícone, gráfico ou área de texto livre). tipo é CHECK fixo — mesmo espírito estrutural de estudio_categorias.canal.';
comment on column public.estudio_elementos.arquivo_url is 'Path no bucket de Storage estudio-elementos, formato {elemento_id}/{arquivo}. NULL obrigatório para tipo de texto, NOT NULL obrigatório para tipo visual — validado pelo CHECK estudio_elementos_arquivo_coerente.';
comment on column public.estudio_elementos.tags is 'Busca por tag via ANY(tags), backlog 1.1.03.';

create index estudio_elementos_tipo_idx on public.estudio_elementos (tipo);
create index estudio_elementos_is_active_idx on public.estudio_elementos (is_active);

create trigger set_updated_at
  before update on public.estudio_elementos
  for each row execute function public.update_updated_at_column();

alter table public.estudio_elementos enable row level security;


-- -----------------------------------------------------------------------------
-- 4. estudio_template_areas — área interativa definida sobre o layout base
-- -----------------------------------------------------------------------------
create table public.estudio_template_areas (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.estudio_templates(id) on delete cascade,
  nome text not null,
  tipo_elemento_permitido text not null check (tipo_elemento_permitido in ('imagem_produto', 'logo', 'selo', 'icone', 'grafico', 'texto_titulo', 'texto_preco', 'texto_descricao', 'texto_cta', 'texto_info')),
  x_percent numeric(5, 2) not null check (x_percent >= 0 and x_percent <= 100),
  y_percent numeric(5, 2) not null check (y_percent >= 0 and y_percent <= 100),
  largura_percent numeric(5, 2) not null check (largura_percent > 0 and largura_percent <= 100),
  altura_percent numeric(5, 2) not null check (altura_percent > 0 and altura_percent <= 100),
  obrigatorio boolean not null default true,
  max_elementos integer not null default 1 check (max_elementos > 0),
  z_index integer not null default 0,
  notas text,
  created_at timestamptz not null default now()
);

comment on table public.estudio_template_areas is 'Área interativa sobre o layout base de um template, em percentual (independência de resolução). SEM is_active/updated_at — lista de colunas exaustiva da tarefa, ver decisão no topo do arquivo. Cascata: apagar o template apaga suas áreas (on delete cascade).';
comment on column public.estudio_template_areas.tipo_elemento_permitido is 'Mesmos 10 valores de estudio_elementos.tipo — restringe qual elemento pode ser colocado nesta área.';

create index estudio_template_areas_template_id_idx on public.estudio_template_areas (template_id);

alter table public.estudio_template_areas enable row level security;


-- -----------------------------------------------------------------------------
-- 5. estudio_composicoes — peça montada pelo posto a partir de um template
-- -----------------------------------------------------------------------------
create table public.estudio_composicoes (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.estudio_templates(id),
  pdv_id uuid not null references public.pdvs(id),
  criado_por uuid not null references public.usuarios(id),
  nome text,
  status text not null default 'draft' check (status in ('draft', 'saved', 'exported')),
  composition_data jsonb not null default '{}'::jsonb,
  export_file_url text,
  versao integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.estudio_composicoes is 'Peça montada por um posto a partir de um template. Máquina de status SEM restrição de sequência (draft/saved/exported livres em qualquer direção, backlog 1.3.03: "exportar não impede reedição") — diferente de toda outra máquina de estado do projeto, ver decisão no topo do arquivo. SEM DELETE/soft-delete nesta rodada (pendência conhecida).';
comment on column public.estudio_composicoes.criado_por is 'Sempre = auth.uid() no INSERT, forçado por trigger estudio_composicoes_before_insert (nunca aceito do cliente, mesmo padrão de demandas_criativas.solicitante_id). Imutável após a criação — travado em estudio_composicoes_before_update (mesmo padrão de demandas_criativas_before_update para solicitante_id).';
comment on column public.estudio_composicoes.nome is 'Nullable — só obrigatório ao transicionar para status saved/exported, validado em estudio_composicoes_before_update. Rascunho (draft) pode não ter nome.';
comment on column public.estudio_composicoes.composition_data is 'Estrutura completa da composição (elementos por área, textos, posições) além das linhas normalizadas em estudio_composicao_elementos — backlog 1.1.05: "armazena estrutura completa, não apenas o arquivo final".';

create index estudio_composicoes_template_id_idx on public.estudio_composicoes (template_id);
create index estudio_composicoes_pdv_id_idx on public.estudio_composicoes (pdv_id);
create index estudio_composicoes_status_idx on public.estudio_composicoes (status);

create trigger set_updated_at
  before update on public.estudio_composicoes
  for each row execute function public.update_updated_at_column();

alter table public.estudio_composicoes enable row level security;


-- -----------------------------------------------------------------------------
-- 5b. BEFORE INSERT — força criado_por = auth.uid()
-- -----------------------------------------------------------------------------
create or replace function public.estudio_composicoes_before_insert()
returns trigger
language plpgsql
as $$
begin
  new.criado_por := auth.uid();
  return new;
end;
$$;

comment on function public.estudio_composicoes_before_insert is 'Força criado_por = auth.uid() (nunca aceito do cliente), mesmo padrão de demandas_criativas_before_insert (Fase 5).';

create trigger before_insert_forcar_criado_por
  before insert on public.estudio_composicoes
  for each row execute function public.estudio_composicoes_before_insert();


-- -----------------------------------------------------------------------------
-- 5c. BEFORE INSERT OR UPDATE — nome obrigatório para status saved/exported
--   (INSERT) + imutabilidade de identidade e auditoria de transição (UPDATE)
-- -----------------------------------------------------------------------------
create or replace function public.estudio_composicoes_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('saved', 'exported') and new.nome is null then
    raise exception 'estudio_composicoes.nome é obrigatório para status saved ou exported';
  end if;

  if tg_op = 'UPDATE' then
    if new.criado_por <> old.criado_por then
      raise exception 'estudio_composicoes.criado_por é imutável após a criação';
    end if;

    if new.template_id <> old.template_id then
      raise exception 'estudio_composicoes.template_id é imutável após a criação';
    end if;

    if new.pdv_id <> old.pdv_id then
      raise exception 'estudio_composicoes.pdv_id é imutável após a criação';
    end if;

    if new.status <> old.status then
      insert into public.audit_logs (action, entity_type, entity_id, usuario_id, dados_antes, dados_depois)
      values (
        'estudio_composicao_transicao_status',
        'estudio_composicoes',
        new.id,
        auth.uid(),
        jsonb_build_object('status', old.status),
        jsonb_build_object('status', new.status)
      );
    end if;
  end if;

  return new;
end;
$$;

comment on function public.estudio_composicoes_before_update is 'INSERT: rejeita status saved/exported sem nome preenchido. UPDATE: trava criado_por/template_id/pdv_id como imutáveis (mesmo padrão de demandas_criativas_before_update para solicitante_id/pdv_solicitante_id) e grava toda transição de status em audit_logs — não há trava de sequência old.status->new.status (deliberadamente livre, ver decisão no topo do arquivo), e é justamente por isso que a trilha de auditoria importa: sem ela não há como saber quem exportou ou quem reabriu um exported de volta pra draft. SECURITY DEFINER porque o INSERT em audit_logs não depende do GRANT do papel chamador (mesmo mecanismo de demandas_criativas_before_update, Fase 5).';

create trigger before_insert_update_estudio_composicoes
  before insert or update on public.estudio_composicoes
  for each row execute function public.estudio_composicoes_before_update();


-- -----------------------------------------------------------------------------
-- 6. estudio_composicao_elementos — elemento posicionado dentro de uma composição
-- -----------------------------------------------------------------------------
create table public.estudio_composicao_elementos (
  id uuid primary key default gen_random_uuid(),
  composicao_id uuid not null references public.estudio_composicoes(id) on delete cascade,
  area_id uuid not null references public.estudio_template_areas(id),
  elemento_id uuid references public.estudio_elementos(id),
  valor_texto text,
  deslocamento_x_px numeric not null default 0,
  deslocamento_y_px numeric not null default 0,
  fator_escala numeric not null default 1 check (fator_escala > 0),
  created_at timestamptz not null default now(),
  constraint estudio_composicao_elementos_um_valor check (
    (elemento_id is not null and valor_texto is null)
    or
    (elemento_id is null and valor_texto is not null)
  )
);

comment on table public.estudio_composicao_elementos is 'Elemento individual posicionado dentro de uma área de uma composição. Exatamente um entre elemento_id (área visual) e valor_texto (área de texto) é preenchido — CHECK estudio_composicao_elementos_um_valor. SEM updated_at — lista de colunas exaustiva da tarefa; editar posição/escala usa UPDATE mesmo assim, coluna não existe por decisão da tarefa.';

create index estudio_composicao_elementos_composicao_id_idx on public.estudio_composicao_elementos (composicao_id);
create index estudio_composicao_elementos_area_id_idx on public.estudio_composicao_elementos (area_id);

alter table public.estudio_composicao_elementos enable row level security;


-- =============================================================================
-- 7. RLS — políticas por papel + GRANT explícito (obrigatório, CLAUDE.md)
-- Módulo: 'estudio', recursos 'templates' (categorias/templates/elementos/
-- áreas compartilham este recurso para escrita, ver decisão no topo) e
-- 'composicoes'. Leitura de catálogo (categorias/templates/elementos) é
-- livre para is_active=true, mesma exceção documentada de brand_library
-- (Fase 5) — não é dado sensível nem territorial.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- estudio_categorias
-- ---------------------------------------------------------------------------
grant select, insert, update on public.estudio_categorias to authenticated;

create policy estudio_categorias_select on public.estudio_categorias
  for select to authenticated
  using (is_active = true);

create policy estudio_categorias_insert on public.estudio_categorias
  for insert to authenticated
  with check (public.has_permission('estudio', 'templates', 'editar', 'rede_toda'));

create policy estudio_categorias_update on public.estudio_categorias
  for update to authenticated
  using (public.has_permission('estudio', 'templates', 'editar', 'rede_toda'))
  with check (public.has_permission('estudio', 'templates', 'editar', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- estudio_templates — inclui DELETE físico restrito a super_admin (ver topo)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.estudio_templates to authenticated;

create policy estudio_templates_select on public.estudio_templates
  for select to authenticated
  using (is_active = true);

create policy estudio_templates_insert on public.estudio_templates
  for insert to authenticated
  with check (
    criado_por = auth.uid()
    and public.has_permission('estudio', 'templates', 'editar', 'rede_toda')
  );

create policy estudio_templates_update on public.estudio_templates
  for update to authenticated
  using (public.has_permission('estudio', 'templates', 'editar', 'rede_toda'))
  with check (public.has_permission('estudio', 'templates', 'editar', 'rede_toda'));

create policy estudio_templates_delete on public.estudio_templates
  for delete to authenticated
  using (public.has_permission('estudio', 'templates', 'excluir', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- estudio_elementos — sem DELETE nesta rodada (ver topo)
-- ---------------------------------------------------------------------------
grant select, insert, update on public.estudio_elementos to authenticated;

create policy estudio_elementos_select on public.estudio_elementos
  for select to authenticated
  using (is_active = true);

create policy estudio_elementos_insert on public.estudio_elementos
  for insert to authenticated
  with check (
    enviado_por = auth.uid()
    and public.has_permission('estudio', 'templates', 'editar', 'rede_toda')
  );

create policy estudio_elementos_update on public.estudio_elementos
  for update to authenticated
  using (public.has_permission('estudio', 'templates', 'editar', 'rede_toda'))
  with check (public.has_permission('estudio', 'templates', 'editar', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- estudio_template_areas — leitura espelha template.is_active; escrita
-- (incluindo DELETE) usa o mesmo grant de edição, sem exigir super_admin
-- (ver decisão no topo do arquivo).
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.estudio_template_areas to authenticated;

create policy estudio_template_areas_select on public.estudio_template_areas
  for select to authenticated
  using (
    exists (
      select 1 from public.estudio_templates t
      where t.id = estudio_template_areas.template_id
        and t.is_active = true
    )
  );

create policy estudio_template_areas_insert on public.estudio_template_areas
  for insert to authenticated
  with check (public.has_permission('estudio', 'templates', 'editar', 'rede_toda'));

create policy estudio_template_areas_update on public.estudio_template_areas
  for update to authenticated
  using (public.has_permission('estudio', 'templates', 'editar', 'rede_toda'))
  with check (public.has_permission('estudio', 'templates', 'editar', 'rede_toda'));

create policy estudio_template_areas_delete on public.estudio_template_areas
  for delete to authenticated
  using (public.has_permission('estudio', 'templates', 'editar', 'rede_toda'));


-- ---------------------------------------------------------------------------
-- estudio_composicoes — SELECT/UPDATE por escopo territorial; INSERT com
-- criado_por forçado por trigger e pdv_id validado inline; SEM DELETE (ver
-- decisão no topo do arquivo).
-- ---------------------------------------------------------------------------
grant select, insert, update on public.estudio_composicoes to authenticated;

create policy estudio_composicoes_select on public.estudio_composicoes
  for select to authenticated
  using (
    public.has_permission('estudio', 'composicoes', 'ler', 'rede_toda')
    or (
      public.has_permission('estudio', 'composicoes', 'ler', 'proprio_pdv')
      and pdv_id = public.usuario_pdv_id()
    )
  );

create policy estudio_composicoes_insert on public.estudio_composicoes
  for insert to authenticated
  with check (
    criado_por = auth.uid()
    and (
      public.has_permission('estudio', 'composicoes', 'criar', 'rede_toda')
      or (
        public.has_permission('estudio', 'composicoes', 'criar', 'proprio_pdv')
        and pdv_id = public.usuario_pdv_id()
      )
    )
  );

create policy estudio_composicoes_update on public.estudio_composicoes
  for update to authenticated
  using (
    public.has_permission('estudio', 'composicoes', 'editar', 'rede_toda')
    or (
      public.has_permission('estudio', 'composicoes', 'editar', 'proprio_pdv')
      and pdv_id = public.usuario_pdv_id()
    )
  )
  with check (
    public.has_permission('estudio', 'composicoes', 'editar', 'rede_toda')
    or (
      public.has_permission('estudio', 'composicoes', 'editar', 'proprio_pdv')
      and pdv_id = public.usuario_pdv_id()
    )
  );


-- ---------------------------------------------------------------------------
-- estudio_composicao_elementos — espelha inteiramente quem pode ler/editar a
-- estudio_composicoes pai (SELECT usa 'ler', INSERT/UPDATE/DELETE usam
-- 'editar', mesma condição de escopo territorial).
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.estudio_composicao_elementos to authenticated;

create policy estudio_composicao_elementos_select on public.estudio_composicao_elementos
  for select to authenticated
  using (
    exists (
      select 1 from public.estudio_composicoes c
      where c.id = estudio_composicao_elementos.composicao_id
        and (
          public.has_permission('estudio', 'composicoes', 'ler', 'rede_toda')
          or (public.has_permission('estudio', 'composicoes', 'ler', 'proprio_pdv') and c.pdv_id = public.usuario_pdv_id())
        )
    )
  );

create policy estudio_composicao_elementos_insert on public.estudio_composicao_elementos
  for insert to authenticated
  with check (
    exists (
      select 1 from public.estudio_composicoes c
      where c.id = estudio_composicao_elementos.composicao_id
        and (
          public.has_permission('estudio', 'composicoes', 'editar', 'rede_toda')
          or (public.has_permission('estudio', 'composicoes', 'editar', 'proprio_pdv') and c.pdv_id = public.usuario_pdv_id())
        )
    )
  );

create policy estudio_composicao_elementos_update on public.estudio_composicao_elementos
  for update to authenticated
  using (
    exists (
      select 1 from public.estudio_composicoes c
      where c.id = estudio_composicao_elementos.composicao_id
        and (
          public.has_permission('estudio', 'composicoes', 'editar', 'rede_toda')
          or (public.has_permission('estudio', 'composicoes', 'editar', 'proprio_pdv') and c.pdv_id = public.usuario_pdv_id())
        )
    )
  )
  with check (
    exists (
      select 1 from public.estudio_composicoes c
      where c.id = estudio_composicao_elementos.composicao_id
        and (
          public.has_permission('estudio', 'composicoes', 'editar', 'rede_toda')
          or (public.has_permission('estudio', 'composicoes', 'editar', 'proprio_pdv') and c.pdv_id = public.usuario_pdv_id())
        )
    )
  );

create policy estudio_composicao_elementos_delete on public.estudio_composicao_elementos
  for delete to authenticated
  using (
    exists (
      select 1 from public.estudio_composicoes c
      where c.id = estudio_composicao_elementos.composicao_id
        and (
          public.has_permission('estudio', 'composicoes', 'editar', 'rede_toda')
          or (public.has_permission('estudio', 'composicoes', 'editar', 'proprio_pdv') and c.pdv_id = public.usuario_pdv_id())
        )
    )
  );


-- =============================================================================
-- 8. Storage — buckets estudio-templates, estudio-elementos, estudio-composicoes
-- + RLS de storage.objects. Mesmo padrão das fases anteriores: bucket
-- privado, path {entidade_id}/{arquivo}.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('estudio-templates', 'estudio-templates', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('estudio-elementos', 'estudio-elementos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('estudio-composicoes', 'estudio-composicoes', false)
on conflict (id) do nothing;

-- estudio-templates: path {template_id}/{arquivo}. Leitura espelha is_active
-- da tabela; escrita (insert/update) usa o mesmo grant de edição; DELETE de
-- arquivo restrito a super_admin, espelhando a mesma decisão do DELETE da
-- linha de tabela.
create policy estudio_templates_bucket_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'estudio-templates'
    and exists (
      select 1 from public.estudio_templates t
      where t.id::text = (storage.foldername(name))[1]
        and t.is_active = true
    )
  );

create policy estudio_templates_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'estudio-templates'
    and public.has_permission('estudio', 'templates', 'editar', 'rede_toda')
  );

create policy estudio_templates_bucket_update on storage.objects
  for update to authenticated
  using (bucket_id = 'estudio-templates' and public.has_permission('estudio', 'templates', 'editar', 'rede_toda'))
  with check (bucket_id = 'estudio-templates' and public.has_permission('estudio', 'templates', 'editar', 'rede_toda'));

create policy estudio_templates_bucket_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'estudio-templates'
    and public.has_permission('estudio', 'templates', 'excluir', 'rede_toda')
  );

-- estudio-elementos: path {elemento_id}/{arquivo}. Mesmo padrão, sem DELETE
-- (mesma decisão do DELETE da linha de tabela — não pedido para elementos).
create policy estudio_elementos_bucket_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'estudio-elementos'
    and exists (
      select 1 from public.estudio_elementos e
      where e.id::text = (storage.foldername(name))[1]
        and e.is_active = true
    )
  );

create policy estudio_elementos_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'estudio-elementos'
    and public.has_permission('estudio', 'templates', 'editar', 'rede_toda')
  );

create policy estudio_elementos_bucket_update on storage.objects
  for update to authenticated
  using (bucket_id = 'estudio-elementos' and public.has_permission('estudio', 'templates', 'editar', 'rede_toda'))
  with check (bucket_id = 'estudio-elementos' and public.has_permission('estudio', 'templates', 'editar', 'rede_toda'));

-- estudio-composicoes: path {composicao_id}/{arquivo} (export PNG final).
-- Leitura/escrita seguem exatamente quem pode ler/editar a composição pai,
-- mesmo escopo territorial de pdv_id. Sem DELETE (mesma decisão da tabela).
create policy estudio_composicoes_bucket_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'estudio-composicoes'
    and exists (
      select 1 from public.estudio_composicoes c
      where c.id::text = (storage.foldername(name))[1]
        and (
          public.has_permission('estudio', 'composicoes', 'ler', 'rede_toda')
          or (public.has_permission('estudio', 'composicoes', 'ler', 'proprio_pdv') and c.pdv_id = public.usuario_pdv_id())
        )
    )
  );

create policy estudio_composicoes_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'estudio-composicoes'
    and exists (
      select 1 from public.estudio_composicoes c
      where c.id::text = (storage.foldername(name))[1]
        and (
          public.has_permission('estudio', 'composicoes', 'editar', 'rede_toda')
          or (public.has_permission('estudio', 'composicoes', 'editar', 'proprio_pdv') and c.pdv_id = public.usuario_pdv_id())
        )
    )
  );

create policy estudio_composicoes_bucket_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'estudio-composicoes'
    and exists (
      select 1 from public.estudio_composicoes c
      where c.id::text = (storage.foldername(name))[1]
        and (
          public.has_permission('estudio', 'composicoes', 'editar', 'rede_toda')
          or (public.has_permission('estudio', 'composicoes', 'editar', 'proprio_pdv') and c.pdv_id = public.usuario_pdv_id())
        )
    )
  )
  with check (
    bucket_id = 'estudio-composicoes'
    and exists (
      select 1 from public.estudio_composicoes c
      where c.id::text = (storage.foldername(name))[1]
        and (
          public.has_permission('estudio', 'composicoes', 'editar', 'rede_toda')
          or (public.has_permission('estudio', 'composicoes', 'editar', 'proprio_pdv') and c.pdv_id = public.usuario_pdv_id())
        )
    )
  );


-- =============================================================================
-- 9. Seed de permissão — módulo 'estudio' (fail-closed: sem isso, ninguém
-- opera este módulo). Critério documentado no topo do arquivo.
-- =============================================================================

-- super_admin/admin ("papéis de gestão"): editar rede_toda no recurso
-- templates (cobre categorias/templates/elementos/áreas, mesmo grant) e
-- criar/ler/editar rede_toda no recurso composicoes.
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'estudio', 'templates', 'editar', 'rede_toda'
from public.papeis p
where p.nome in ('super_admin', 'admin')
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'estudio', 'composicoes', acao.nome, 'rede_toda'
from public.papeis p
cross join (values ('criar'), ('ler'), ('editar')) as acao(nome)
where p.nome in ('super_admin', 'admin')
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- só super_admin recebe 'excluir' em templates (DELETE físico de template,
-- ver decisão no topo do arquivo — mais restrito que o 'editar' de admin).
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'estudio', 'templates', 'excluir', 'rede_toda'
from public.papeis p
where p.nome = 'super_admin'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- manager/collaborator: criar/ler/editar proprio_pdv em composicoes — abrir,
-- ver e editar (salvar rascunho, finalizar, reexportar) a própria peça do
-- próprio posto.
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'estudio', 'composicoes', acao.nome, 'proprio_pdv'
from public.papeis p
cross join (values ('criar'), ('ler'), ('editar')) as acao(nome)
where p.nome in ('manager', 'collaborator')
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- director: visão executiva sem escrita — só leitura rede_toda em
-- composicoes, mesmo precedente de demandas_criativas (Fase 5).
insert into public.permissoes_concedidas (papel_id, modulo, recurso, acao, escopo)
select p.id, 'estudio', 'composicoes', 'ler', 'rede_toda'
from public.papeis p
where p.nome = 'director'
on conflict (papel_id, modulo, recurso, acao, escopo) do nothing;

-- supplier/coordenador_compras/convenience_coordinator/approver_executive:
-- nenhum grant por padrão nesta rodada (least privilege, mesmo critério das
-- fases anteriores).


-- =============================================================================
-- 10. Seed de categorias iniciais (backlog 1.1.01)
-- =============================================================================
insert into public.estudio_categorias (nome, canal, ordem) values
  ('Combustível', 'pdv_impresso', 0),
  ('Serviços Automotivos', 'lona', 1),
  ('AmPm/Alimentação', 'instagram_feed', 2),
  ('Promoção Especial', 'whatsapp', 3),
  ('Informativo', 'led', 4)
on conflict (nome) do nothing;
