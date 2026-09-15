-- =============================================================================
-- Marketing OS (novo) — RPC de permissão agregada para navegação
-- minhas_permissoes()
-- =============================================================================
--
-- CONTEXTO — Fase 1 do redesenho de front-end
-- (docs/design/DIAGNOSTICO-REDESIGN-FRONTEND.md, decisão de 2026-09-15): o
-- novo AppShell precisa esconder grupos inteiros do menu por papel (ex.: um
-- manager não deveria ver "Administração"). Isso exigiria N chamadas de
-- has_permission() por carregamento de página — o hook useHasPermission.ts
-- documentava essa limitação de propósito ("sem cache de todas as permissões
-- do usuário — abstração especulativa não pedida"), decisão agora revisitada
-- porque deixou de ser especulativa (ver comentário atualizado nesse arquivo).
--
-- DECISÃO — mesma regra de segurança de has_permission()/usuario_pdv_id():
-- SECURITY DEFINER, SEM parâmetro de usuário livre, responde só sobre
-- auth.uid(). Não vira oráculo de leitura via RPC pública.
-- =============================================================================

create or replace function public.minhas_permissoes()
returns table(modulo text, recurso text, acao text, escopo text)
language sql
stable
security definer
set search_path = public
as $$
  select pc.modulo, pc.recurso, pc.acao, pc.escopo
  from public.usuario_papeis up
  join public.usuarios u on u.id = up.usuario_id
  join public.permissoes_concedidas pc on pc.papel_id = up.papel_id
  where up.usuario_id = auth.uid()
    and up.is_active = true
    and u.status = 'ativo'
    and pc.is_active = true;
$$;

comment on function public.minhas_permissoes is 'Retorna todos os grants ativos (modulo, recurso, acao, escopo) do papel de auth.uid() — mesma checagem fail-closed de has_permission() (usuario_papeis.is_active, usuarios.status, permissoes_concedidas.is_active), mas devolve o conjunto inteiro em 1 chamada em vez de checar 1 combinação por vez. Existe para o AppShell filtrar grupos de menu por papel sem 1 RPC por item. SECURITY DEFINER sem parâmetro de usuário (mesmo motivo de has_permission()/usuario_pdv_id(): nunca virar oráculo de leitura via RPC pública).';

grant execute on function public.minhas_permissoes() to authenticated;
