-- =============================================================================
-- Marketing OS (novo) — Dado de exemplo, todos os módulos (Fases 1-7)
-- =============================================================================
--
-- PROPÓSITO: 1 exemplo por ESTADO relevante de cada fluxo, para o usuário
-- testar cada tela manualmente e descobrir o que funciona e o que não
-- funciona. Não é volume realista, não é 1 linha genérica por tabela.
--
-- Este é dado de teste por definição (docs/decisions/ADR-012-dado-de-teste-
-- wipe-no-corte.md): todo dado criado até o corte para produção é teste, sem
-- marcação especial, e será apagado num script de wipe futuro. Não idempotente
-- de propósito — rodar duas vezes duplica os registros (não há chave natural
-- para ON CONFLICT na maior parte destas tabelas); rode uma vez só.
--
-- PRÉ-REQUISITO: as 8 migrations de Fase 1-7 já aplicadas neste projeto
-- Supabase. Roda inteiro no SQL Editor do painel (privilégio suficiente para
-- bypassar RLS — os INSERT/UPDATE abaixo não dependem de nenhuma policy).
--
-- ARMADILHA EVITADA (leia antes de rodar de novo se algo falhar no meio):
--   O SQL Editor não carrega uma sessão JWT normal — auth.uid() retornaria
--   NULL o tempo todo. Isso quebraria DUAS coisas: (1) demandas_criativas
--   força solicitante_id = auth.uid() INCONDICIONALMENTE no INSERT (não só
--   quando vem nulo, diferente de manutencoes) — com auth.uid() nulo, a
--   inserção falharia a constraint NOT NULL; (2) manutencoes_before_update e
--   analise_recalcular() exigem has_permission(..., 'rede_toda') = true para
--   o ator da transação — sem um auth.uid() válido, nenhuma dessas
--   transições/chamada passaria. A seção 0 abaixo simula a sessão do usuário
--   de bootstrap via `request.jwt.claim.sub` (mesma leitura que auth.uid() faz
--   internamente), só para esta transação/sessão do editor. ASSUME que esse
--   usuário já tem o papel super_admin ativo (usuario_papeis) — é o único
--   papel com grant de editar/rede_toda em midia_externa/manutencoes e de
--   recalcular/rede_toda em analise/clusters; sem isso, o script para com uma
--   exceção clara no meio (não silenciosa) apontando a transição que falhou.
--
-- JÁ SEMEADO, NÃO REPETIDO AQUI (confirmado antes desta tarefa):
--   analise_pesos_tipo, analise_clusters_config (20260915090000);
--   estudio_categorias (20260911140000).
--
-- FORA DE ESCOPO, SINALIZADO NO RELATÓRIO FINAL (dependem de upload real no
-- Storage ou de Edge Function — nunca simulados aqui com path/token falso):
--   estudio_templates, estudio_elementos, estudio_composicoes;
--   manutencao_fotos, demanda_criativa_arquivos;
--   pdvs.foto_url, outdoors.foto_url, materiais.imagem_url;
--   qualquer token gerado por send-approval-request (Edge Function).
-- Exceção deliberada: brand_library.arquivo_url e respostas_checklist.foto_url
-- são NOT NULL e o item 4/checklist do pedido explicitamente pede essas duas
-- tabelas povoadas — usam path placeholder claramente marcado como fixture
-- sem objeto real no bucket (sinalizado também no relatório final).
-- =============================================================================


-- =============================================================================
-- 0. Bootstrap — resolve o usuario_id real (nunca um uuid inventado) e simula
--    a sessão dele para auth.uid()/has_permission() funcionarem nos triggers
--    abaixo (ver nota de armadilha no topo do arquivo).
-- =============================================================================
do $$
declare
  v_usuario_id uuid;
begin
  select id into v_usuario_id from public.usuarios where email = 'marketing@redesaoroque.com.br';

  if v_usuario_id is null then
    raise exception 'usuario marketing@redesaoroque.com.br não existe em public.usuarios (existe só em auth.users, ou não fez signup ainda). Sinalizado — não inventar uuid de fallback. Faça login uma vez no app com este e-mail (dispara handle_new_user) e rode este script de novo.';
  end if;

  -- Cobre as duas formas conhecidas de auth.uid() ler o claim 'sub', para não
  -- depender da versão exata do helper na plataforma.
  -- is_local=true (não false): escopo de transação, não de sessão — some
  -- sozinho no COMMIT/ROLLBACK implícito do SQL Editor. NUNCA copiar este
  -- padrão com is_local=false numa Edge Function/RPC exposta a
  -- 'authenticated': em conexão pooled (PgBouncer transaction mode), false
  -- vazaria esta identidade forjada para a próxima requisição de outro
  -- usuário na mesma conexão. Aqui é seguro só porque roda em conexão de
  -- admin/SQL Editor, fora do caminho de PostgREST/RLS.
  perform set_config('request.jwt.claim.sub', v_usuario_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_usuario_id::text, 'role', 'authenticated')::text, true);
end $$;


-- =============================================================================
-- 1. Core — pdvs (tipos e status variados)
-- =============================================================================
insert into public.pdvs (nome, tipo, status) values
  ('Posto Centro', 'POS', 'ativo'),
  ('Posto Rodovia', 'POS', 'ativo'),
  ('Conveniência Bairro Novo', 'CONV', 'ativo'),
  ('Conveniência Shopping', 'CONV', 'inativo');


-- =============================================================================
-- 2. Mídia Externa
-- =============================================================================

-- 2a. fornecedores
insert into public.fornecedores (nome, telefone, email) values
  ('Sinalização ABC Ltda', '(11) 4002-8922', 'contato@sinalizacaoabc.exemplo'),
  ('Manutenção Outdoor Sul Ltda', '(11) 4003-1234', 'contato@outdoorsul.exemplo');

-- 2b. outdoors — 3 status_operacional diferentes (operacional, nao_operacional
-- com motivo, pendente_avaliacao/default)
insert into public.outdoors (pdv_id, localizacao, largura_m, altura_m, status_operacional, supplier_id)
values (
  (select id from public.pdvs where nome = 'Posto Centro'),
  'Fachada principal - Posto Centro',
  9.00, 3.00,
  'operacional',
  (select id from public.fornecedores where nome = 'Sinalização ABC Ltda')
);

insert into public.outdoors (pdv_id, localizacao, largura_m, altura_m, status_operacional, motivo_nao_operacional, supplier_id)
values (
  (select id from public.pdvs where nome = 'Posto Rodovia'),
  'Acesso rodovia BR-101 - Posto Rodovia',
  12.00, 4.00,
  'nao_operacional',
  'Estrutura danificada por vendaval',
  (select id from public.fornecedores where nome = 'Manutenção Outdoor Sul Ltda')
);

insert into public.outdoors (pdv_id, localizacao, largura_m, altura_m)
values (
  (select id from public.pdvs where nome = 'Conveniência Bairro Novo'),
  'Muro lateral - Conveniência Bairro Novo',
  6.00, 2.50
); -- status_operacional fica no default 'pendente_avaliacao'

-- 2c. contratos + contrato_outdoors (vincula os 2 outdoors de posto POS)
with novo_contrato as (
  insert into public.contratos (proprietario_nome, proprietario_contato, vigencia_inicio, vigencia_fim, valor_mensal, forma_pagamento, status)
  values ('Imóveis Silva Ltda', '(11) 9999-0000', '2026-01-01', '2027-12-31', 2500.00, 'boleto mensal', 'ativo')
  returning id
)
insert into public.contrato_outdoors (contrato_id, outdoor_id)
select nc.id, o.id
from novo_contrato nc
join public.outdoors o on o.localizacao in (
  'Fachada principal - Posto Centro',
  'Acesso rodovia BR-101 - Posto Rodovia'
);

-- 2d. avaliacoes_outdoor — 1 vistoria (outdoor operacional), exercita o
-- trigger sincronizar_outdoor_apos_avaliacao (AFTER INSERT).
insert into public.avaliacoes_outdoor (outdoor_id, avaliador_id, status_resultante, observacoes)
values (
  (select id from public.outdoors where localizacao = 'Fachada principal - Posto Centro'),
  (select id from public.usuarios where email = 'marketing@redesaoroque.com.br'),
  'operacional',
  'Vistoria de rotina, estrutura e lona em bom estado.'
);

-- 2e. manutencoes — 3 estados da máquina (solicitada / em_execucao / validada)

-- M1: nasce e fica em 'solicitada' (sem transição).
insert into public.manutencoes (outdoor_id, solicitante_id, urgencia, tipo, descricao)
values (
  (select id from public.outdoors where localizacao = 'Acesso rodovia BR-101 - Posto Rodovia'),
  (select id from public.usuarios where email = 'marketing@redesaoroque.com.br'),
  'alta', 'corretiva',
  'Recolocação de estrutura danificada por vendaval'
);

-- M2: nasce e transiciona até 'em_execucao'.
insert into public.manutencoes (outdoor_id, solicitante_id, urgencia, tipo, descricao)
values (
  (select id from public.outdoors where localizacao = 'Fachada principal - Posto Centro'),
  (select id from public.usuarios where email = 'marketing@redesaoroque.com.br'),
  'normal', 'preventiva',
  'Troca de lona da face principal'
);

-- As 3 transições abaixo exigem has_permission('midia_externa','manutencoes',
-- 'editar','rede_toda') = true para auth.uid() (admin ou super_admin — ver
-- manutencoes_before_update, Fase 2). Igual à análise estratégica (seção 6),
-- todo o script é UMA transação implícita no SQL Editor: uma exceção aqui sem
-- tratamento derrubaria também os dados de Core/Merchandising/etc. já
-- inseridos. DO block com EXCEPTION evita isso — na falha, a manutenção fica
-- parada em 'solicitada' (já persistida pelo INSERT acima) em vez de sumir.
do $$
begin
  update public.manutencoes set status = 'aprovada'
  where descricao = 'Troca de lona da face principal' and status = 'solicitada';

  update public.manutencoes set status = 'atribuida', fornecedor_id = (select id from public.fornecedores where nome = 'Sinalização ABC Ltda')
  where descricao = 'Troca de lona da face principal' and status = 'aprovada';

  update public.manutencoes set status = 'em_execucao'
  where descricao = 'Troca de lona da face principal' and status = 'atribuida';
exception when others then
  -- manutencoes_before_update usa "raise exception 'mensagem'" sem ERRCODE
  -- explícito (SQLSTATE cai no default P0001, não 42501/insufficient_privilege)
  -- — não dá pra restringir a WHEN insufficient_privilege sem arriscar deixar
  -- passar o erro de permissão real. sqlstate na mensagem compensa, dando
  -- como diferenciar visualmente erro esperado de bug real.
  raise notice 'transição de manutencao (Troca de lona da face principal) parou no meio (sqlstate %): %. Provável causa: usuario de bootstrap sem admin/super_admin ativo em midia_externa/manutencoes.', sqlstate, sqlerrm;
end $$;

-- M3: nasce e transiciona até 'validada' (ciclo completo).
insert into public.manutencoes (outdoor_id, solicitante_id, urgencia, tipo, descricao)
values (
  (select id from public.outdoors where localizacao = 'Muro lateral - Conveniência Bairro Novo'),
  (select id from public.usuarios where email = 'marketing@redesaoroque.com.br'),
  'baixa', 'preventiva',
  'Pintura de reforço na estrutura'
);

-- Mesmo motivo do bloco de M2 acima (permissão admin/super_admin exigida
-- pelo trigger + risco de rollback da transação inteira do script).
do $$
begin
  update public.manutencoes set status = 'aprovada'
  where descricao = 'Pintura de reforço na estrutura' and status = 'solicitada';

  update public.manutencoes set status = 'atribuida', fornecedor_id = (select id from public.fornecedores where nome = 'Manutenção Outdoor Sul Ltda')
  where descricao = 'Pintura de reforço na estrutura' and status = 'aprovada';

  update public.manutencoes set status = 'em_execucao'
  where descricao = 'Pintura de reforço na estrutura' and status = 'atribuida';

  update public.manutencoes set status = 'concluida_fornecedor'
  where descricao = 'Pintura de reforço na estrutura' and status = 'em_execucao';

  update public.manutencoes set status = 'validada'
  where descricao = 'Pintura de reforço na estrutura' and status = 'concluida_fornecedor';
exception when others then
  -- Mesmo motivo do comentário no bloco de M2 acima: sem ERRCODE explícito no
  -- raise exception do trigger, sqlstate na mensagem é o jeito seguro de
  -- diferenciar "erro esperado de permissão" de bug real.
  raise notice 'transição de manutencao (Pintura de reforço na estrutura) parou no meio (sqlstate %): %. Provável causa: usuario de bootstrap sem admin/super_admin ativo em midia_externa/manutencoes.', sqlstate, sqlerrm;
end $$;


-- =============================================================================
-- 3. Merchandising
-- =============================================================================

-- 3a. categorias_checklist (não havia seed nenhum antes desta migration)
insert into public.categorias_checklist (nome, ordem) values
  ('Frente de Caixa', 0),
  ('Interior da Loja', 1),
  ('Área Externa', 2);

-- 3b. perguntas_checklist — 2 por categoria, flags de obrigatoriedade variadas
insert into public.perguntas_checklist (categoria_id, texto, ordem, exige_foto, exige_comentario, exige_material, is_critica) values
  ((select id from public.categorias_checklist where nome = 'Frente de Caixa'),
   'Caixa está limpo e organizado?', 0, false, false, false, false),
  ((select id from public.categorias_checklist where nome = 'Frente de Caixa'),
   'Material promocional exposto corretamente na frente de caixa?', 1, true, false, true, false),
  ((select id from public.categorias_checklist where nome = 'Interior da Loja'),
   'Prateleiras estão abastecidas e sem buracos?', 0, false, false, false, false),
  ((select id from public.categorias_checklist where nome = 'Interior da Loja'),
   'Iluminação interna está funcionando em todos os setores?', 1, false, true, false, true),
  ((select id from public.categorias_checklist where nome = 'Área Externa'),
   'Fachada e sinalização externa estão limpas e visíveis?', 0, true, false, false, false),
  ((select id from public.categorias_checklist where nome = 'Área Externa'),
   'Área de abastecimento está livre de lixo e entulho?', 1, false, false, false, false);

-- 3c. materiais — tipo/categoria ficam NULL (sem seed de system_options para
-- merchandising/material_tipo|material_categoria ainda — ver pendência
-- documentada na Fase 3; preencher um valor não nulo aqui quebraria o
-- trigger validar_system_option por falta de catálogo).
insert into public.materiais (nome, custo_unitario, estoque_atual, estoque_minimo) values
  ('Banner de Promoção Combustível', 45.00, 20, 5),
  ('Wobbler Prateleira', 2.20, 100, 20),
  ('Faixa Testeira', 12.00, 30, 10),
  ('Adesivo de Vitrine', 8.50, 50, 15);

-- 3d. avaliacoes_pdv — nasce em rascunho, respostas cobrem toda obrigatoriedade
insert into public.avaliacoes_pdv (pdv_id, avaliador_id)
values (
  (select id from public.pdvs where nome = 'Conveniência Bairro Novo'),
  (select id from public.usuarios where email = 'marketing@redesaoroque.com.br')
);

-- respostas_checklist — foto_url é placeholder de fixture (sem objeto real no
-- bucket avaliacao-pdv-fotos): necessário para satisfazer exige_foto e deixar
-- o trigger concluir a avaliação; pendência de teste manual (upload real).
insert into public.respostas_checklist (avaliacao_id, pergunta_id, valor)
select
  (select id from public.avaliacoes_pdv where pdv_id = (select id from public.pdvs where nome = 'Conveniência Bairro Novo') and status = 'rascunho'),
  (select id from public.perguntas_checklist where texto = 'Caixa está limpo e organizado?'),
  'sim';

insert into public.respostas_checklist (avaliacao_id, pergunta_id, valor, foto_url, material_id)
select
  (select id from public.avaliacoes_pdv where pdv_id = (select id from public.pdvs where nome = 'Conveniência Bairro Novo') and status = 'rascunho'),
  (select id from public.perguntas_checklist where texto = 'Material promocional exposto corretamente na frente de caixa?'),
  'sim',
  'seed-fixture/sem-upload-real.jpg',
  (select id from public.materiais where nome = 'Wobbler Prateleira');

insert into public.respostas_checklist (avaliacao_id, pergunta_id, valor)
select
  (select id from public.avaliacoes_pdv where pdv_id = (select id from public.pdvs where nome = 'Conveniência Bairro Novo') and status = 'rascunho'),
  (select id from public.perguntas_checklist where texto = 'Prateleiras estão abastecidas e sem buracos?'),
  'nao'; -- problema -> vira plano de ação abaixo

insert into public.respostas_checklist (avaliacao_id, pergunta_id, valor, comentario)
select
  (select id from public.avaliacoes_pdv where pdv_id = (select id from public.pdvs where nome = 'Conveniência Bairro Novo') and status = 'rascunho'),
  (select id from public.perguntas_checklist where texto = 'Iluminação interna está funcionando em todos os setores?'),
  'nao',
  'Duas lâmpadas queimadas no corredor de bebidas.';

insert into public.respostas_checklist (avaliacao_id, pergunta_id, valor, foto_url)
select
  (select id from public.avaliacoes_pdv where pdv_id = (select id from public.pdvs where nome = 'Conveniência Bairro Novo') and status = 'rascunho'),
  (select id from public.perguntas_checklist where texto = 'Fachada e sinalização externa estão limpas e visíveis?'),
  'sim',
  'seed-fixture/sem-upload-real.jpg';

insert into public.respostas_checklist (avaliacao_id, pergunta_id, valor)
select
  (select id from public.avaliacoes_pdv where pdv_id = (select id from public.pdvs where nome = 'Conveniência Bairro Novo') and status = 'rascunho'),
  (select id from public.perguntas_checklist where texto = 'Área de abastecimento está livre de lixo e entulho?'),
  'na';

-- Conclui a avaliação — trigger calcula pontos_total/percentual_total/scores_categoria.
update public.avaliacoes_pdv set status = 'concluida'
where pdv_id = (select id from public.pdvs where nome = 'Conveniência Bairro Novo') and status = 'rascunho';

-- 3e. planos_acao — a partir da resposta problemática ("Prateleiras...nao")
insert into public.planos_acao (resposta_id, descricao, responsavel_id, prazo)
select
  rc.id,
  'Repor produtos nas prateleiras vazias e revisar reposição semanal.',
  (select id from public.usuarios where email = 'marketing@redesaoroque.com.br'),
  '2026-09-30'
from public.respostas_checklist rc
join public.perguntas_checklist pc on pc.id = rc.pergunta_id
where pc.texto = 'Prateleiras estão abastecidas e sem buracos?'
  and rc.avaliacao_id = (select id from public.avaliacoes_pdv where pdv_id = (select id from public.pdvs where nome = 'Conveniência Bairro Novo'));

-- 3f. solicitacoes_material — só PDV tipo CONV (regra de negócio validada por trigger)
insert into public.solicitacoes_material (material_id, solicitante_id, pdv_id, quantidade, justificativa)
values (
  (select id from public.materiais where nome = 'Faixa Testeira'),
  (select id from public.usuarios where email = 'marketing@redesaoroque.com.br'),
  (select id from public.pdvs where nome = 'Conveniência Bairro Novo'),
  5,
  'Reposição de material de vitrine para a campanha do mês.'
);

-- 3g. campanhas — 2 status diferentes (planejada, ativa)
insert into public.campanhas (nome, status, data_inicio, data_fim, pdvs_alvo) values (
  'Queima de Estoque Combustível',
  'planejada',
  '2026-10-01', '2026-10-31',
  array[
    (select id from public.pdvs where nome = 'Posto Centro'),
    (select id from public.pdvs where nome = 'Posto Rodovia')
  ]
);

insert into public.campanhas (nome, status, data_inicio, data_fim, pdvs_alvo) values (
  'Promoção AmPm Verão',
  'planejada',
  '2026-09-15', '2026-12-15',
  array[
    (select id from public.pdvs where nome = 'Conveniência Bairro Novo'),
    (select id from public.pdvs where nome = 'Conveniência Shopping')
  ]
);

update public.campanhas set status = 'ativa'
where nome = 'Promoção AmPm Verão' and status = 'planejada';


-- =============================================================================
-- 4. Aprovações Executivas
-- =============================================================================

-- Item 1: fica em 'pending', 2 revisores convidados, nenhuma decisão ainda.
insert into public.aprovacao_itens (titulo, descricao, tipo, status, submetido_por)
values (
  'Banner tabela de preços - revisão trimestral',
  'Revisão trimestral da tabela de preços exibida nos banners de pista.',
  'banner',
  'pending',
  (select id from public.usuarios where email = 'marketing@redesaoroque.com.br')
);

insert into public.aprovacao_revisores (item_id, email, nome, ordem)
select id, 'diretoria@redesaoroque.exemplo', 'Diretoria Comercial', 0
from public.aprovacao_itens where titulo = 'Banner tabela de preços - revisão trimestral';

insert into public.aprovacao_revisores (item_id, email, nome, ordem)
select id, 'presidencia@redesaoroque.exemplo', 'Presidência', 1
from public.aprovacao_itens where titulo = 'Banner tabela de preços - revisão trimestral';

-- Item 2: nasce 'pending', 1 revisor aprova -> trigger de agregação fecha
-- o item como 'approved' (unanimidade de 1/1). Exercita o histórico de decisão.
insert into public.aprovacao_itens (titulo, descricao, tipo, status, submetido_por)
values (
  'Arte campanha Dia das Mães - peça final',
  'Peça final da campanha de Dia das Mães, pronta para publicação.',
  'arte_campanha',
  'pending',
  (select id from public.usuarios where email = 'marketing@redesaoroque.com.br')
);

insert into public.aprovacao_revisores (item_id, email, nome, ordem)
select id, 'diretoria@redesaoroque.exemplo', 'Diretoria Comercial', 0
from public.aprovacao_itens where titulo = 'Arte campanha Dia das Mães - peça final';

insert into public.aprovacao_decisoes (revisor_id, decisao, comentario)
select
  (select ar.id from public.aprovacao_revisores ar
   join public.aprovacao_itens ai on ai.id = ar.item_id
   where ai.titulo = 'Arte campanha Dia das Mães - peça final'),
  'approved',
  'Aprovado, seguir para produção.';


-- =============================================================================
-- 5. Central Criativa + Biblioteca de Marca
-- =============================================================================

-- Demanda A: fica em 'solicitada'.
-- solicitante_id explícito abaixo é irrelevante na prática — o trigger
-- demandas_criativas_before_insert SOBRESCREVE sempre com auth.uid() (ver nota
-- de armadilha no topo do arquivo); mantido só por clareza de intenção.
insert into public.demandas_criativas (titulo, descricao, tipo, canal, prioridade, solicitante_id)
values (
  'Post Instagram Aniversário da Loja',
  'Arte para o post de aniversário da rede no Instagram.',
  'social_media', 'instagram', 'normal',
  (select id from public.usuarios where email = 'marketing@redesaoroque.com.br')
);

-- Demanda B: transiciona até 'em_criacao'.
insert into public.demandas_criativas (titulo, descricao, tipo, canal, prioridade, pdv_solicitante_id, prazo, solicitante_id)
values (
  'Banner tabela de preços posto Centro',
  'Banner impresso para atualizar a tabela de preços na pista.',
  'banner_impresso', 'pdv_impresso', 'alta',
  (select id from public.pdvs where nome = 'Posto Centro'),
  '2026-09-28',
  (select id from public.usuarios where email = 'marketing@redesaoroque.com.br')
);

update public.demandas_criativas set status = 'analise'
where titulo = 'Banner tabela de preços posto Centro' and status = 'solicitada';

update public.demandas_criativas set status = 'em_criacao'
where titulo = 'Banner tabela de preços posto Centro' and status = 'analise';

-- Demanda C: ciclo completo até 'concluida', vinculada a um aprovacao_itens
-- (aprovacao_item_id só é preenchido DEPOIS via UPDATE, nunca no INSERT —
-- WITH CHECK de demandas_criativas_insert exige NULL na criação).
insert into public.demandas_criativas (titulo, descricao, tipo, canal, prioridade, prazo, solicitante_id)
values (
  'Arte campanha Dia das Mães',
  'Arte completa da campanha de Dia das Mães para todos os canais.',
  'campanha', 'instagram', 'urgente',
  '2026-09-25',
  (select id from public.usuarios where email = 'marketing@redesaoroque.com.br')
);

update public.demandas_criativas set status = 'analise'
where titulo = 'Arte campanha Dia das Mães' and status = 'solicitada';

update public.demandas_criativas set status = 'em_criacao'
where titulo = 'Arte campanha Dia das Mães' and status = 'analise';

update public.demandas_criativas set status = 'revisao_interna'
where titulo = 'Arte campanha Dia das Mães' and status = 'em_criacao';

update public.demandas_criativas set status = 'aguardando_aprovacao'
where titulo = 'Arte campanha Dia das Mães' and status = 'revisao_interna';

-- Vínculo aditivo com Aprovações Executivas (não muda status, não passa pela
-- máquina de estado — trigger retorna cedo quando new.status = old.status).
update public.demandas_criativas
set aprovacao_item_id = (select id from public.aprovacao_itens where titulo = 'Arte campanha Dia das Mães - peça final')
where titulo = 'Arte campanha Dia das Mães' and status = 'aguardando_aprovacao' and aprovacao_item_id is null;

update public.demandas_criativas set status = 'aprovada'
where titulo = 'Arte campanha Dia das Mães' and status = 'aguardando_aprovacao';

update public.demandas_criativas set status = 'em_producao'
where titulo = 'Arte campanha Dia das Mães' and status = 'aprovada';

update public.demandas_criativas set status = 'concluida'
where titulo = 'Arte campanha Dia das Mães' and status = 'em_producao';

-- brand_library — arquivo_url é NOT NULL; placeholder de fixture sem objeto
-- real no bucket biblioteca-marca-arquivos (pendência de teste manual, ver
-- topo do arquivo). Pedido explícito do escopo (item 4), diferente de
-- estudio_templates/elementos/composicoes (esses sim ficam de fora).
insert into public.brand_library (nome, tipo, arquivo_url, enviado_por, descricao) values (
  'Manual de Marca 2026',
  'manual_marca',
  'seed-fixture/manual-marca-2026.pdf',
  (select id from public.usuarios where email = 'marketing@redesaoroque.com.br'),
  'Manual de identidade visual da rede (versão 2026).'
);

insert into public.brand_library (nome, tipo, arquivo_url, enviado_por, descricao) values (
  'Paleta de Cores Institucional',
  'guia_cores',
  'seed-fixture/paleta-cores.pdf',
  (select id from public.usuarios where email = 'marketing@redesaoroque.com.br'),
  'Paleta de cores oficiais da marca, com códigos hex/CMYK.'
);

insert into public.brand_library (nome, tipo, arquivo_url, enviado_por, campanha_id, descricao)
select
  'Arte Campanha Dia das Mães - Final',
  'arte_campanha',
  'seed-fixture/arte-dia-das-maes-final.png',
  (select id from public.usuarios where email = 'marketing@redesaoroque.com.br'),
  (select id from public.campanhas where nome = 'Promoção AmPm Verão'),
  'Peça final aprovada da campanha de Dia das Mães.';


-- =============================================================================
-- 6. Análise Estratégica — deriva clusters/insights do dado real acima
-- =============================================================================
-- analise_pesos_tipo e analise_clusters_config já estão semeados
-- (20260915090000). Exige has_permission('analise','clusters','recalcular',
-- 'rede_toda') = true para auth.uid() — só super_admin tem esse grant (ver
-- ADR-002), nem 'admin' tem. O SQL Editor roda o script colado como UMA
-- transação implícita (protocolo simple query multi-statement do Postgres) —
-- se esta chamada estourasse uma exceção sem tratamento, o ROLLBACK
-- derrubaria TODO o dado já semeado acima, não só a análise. Por isso o
-- DO block abaixo captura qualquer erro aqui e vira um NOTICE (sinalizado,
-- não silencioso) em vez de abortar a transação inteira — o resto do seed
-- fica de pé mesmo se o usuário de bootstrap não for super_admin.
do $$
begin
  perform public.analise_recalcular();
exception when others then
  -- analise_recalcular() também usa "raise exception 'mensagem'" sem ERRCODE
  -- explícito (SQLSTATE default P0001, não 42501/insufficient_privilege) —
  -- WHEN insufficient_privilege não pegaria esse erro de permissão real.
  -- sqlstate na mensagem é o fallback pra diferenciar visualmente.
  raise notice 'analise_recalcular() não rodou (sqlstate %): %. Provável causa: usuario_id de bootstrap sem papel super_admin ativo. Depois de conceder super_admin, rode manualmente: select public.analise_recalcular();', sqlstate, sqlerrm;
end $$;


-- =============================================================================
-- 7. Conferência rápida — contagem por tabela (opcional, só leitura)
-- =============================================================================
select 'pdvs' as tabela, count(*) from public.pdvs
union all select 'fornecedores', count(*) from public.fornecedores
union all select 'outdoors', count(*) from public.outdoors
union all select 'contratos', count(*) from public.contratos
union all select 'contrato_outdoors', count(*) from public.contrato_outdoors
union all select 'avaliacoes_outdoor', count(*) from public.avaliacoes_outdoor
union all select 'manutencoes', count(*) from public.manutencoes
union all select 'categorias_checklist', count(*) from public.categorias_checklist
union all select 'perguntas_checklist', count(*) from public.perguntas_checklist
union all select 'materiais', count(*) from public.materiais
union all select 'avaliacoes_pdv', count(*) from public.avaliacoes_pdv
union all select 'respostas_checklist', count(*) from public.respostas_checklist
union all select 'planos_acao', count(*) from public.planos_acao
union all select 'solicitacoes_material', count(*) from public.solicitacoes_material
union all select 'campanhas', count(*) from public.campanhas
union all select 'aprovacao_itens', count(*) from public.aprovacao_itens
union all select 'aprovacao_revisores', count(*) from public.aprovacao_revisores
union all select 'aprovacao_decisoes', count(*) from public.aprovacao_decisoes
union all select 'demandas_criativas', count(*) from public.demandas_criativas
union all select 'demanda_criativa_historico', count(*) from public.demanda_criativa_historico
union all select 'brand_library', count(*) from public.brand_library
union all select 'analise_clusters_calculo', count(*) from public.analise_clusters_calculo
union all select 'analise_insights', count(*) from public.analise_insights;
