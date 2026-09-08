# Runbook — bootstrap do primeiro `super_admin`

> Necessário porque o modelo é fail-closed (ADR-006): sem nenhuma linha em
> `usuario_papeis`, ninguém tem permissão para nada — nem para se
> autoconceder a primeira atribuição de papel, já que `INSERT` em
> `usuario_papeis` também exige `has_permission('core', 'usuario_papeis',
> 'criar', 'rede_toda')`, e ninguém começa com esse grant. Este passo manual
> só é necessário uma vez, ao subir o projeto Supabase novo (`qlezexylaixllhakpezv`).

## Pré-requisito

A migration `20260908103000_core_usuarios_papeis_permissoes.sql` já foi
aplicada (tabelas `usuarios`, `papeis`, `usuario_papeis` existem, e o papel
`super_admin` já está semeado em `papeis`).

## Passo 1 — signup normal

A pessoa que vai ser a primeira `super_admin` faz signup pelo fluxo normal de
autenticação do Supabase (tela de cadastro do app, ou `supabase.auth.signUp`
direto). Isso dispara o trigger `on_auth_user_created` → `handle_new_user()`,
que cria a linha correspondente em `public.usuarios` automaticamente
(`status = 'ativo'`, `pdv_id = null`).

Neste ponto o usuário já consegue logar, mas não enxerga nada além do próprio
perfil — nenhuma permissão foi concedida ainda.

## Passo 2 — atribuir o papel `super_admin` via SQL Editor

Só um acesso com privilégio de `service_role`/dono do banco (SQL Editor do
painel Supabase, ou uma conexão direta como `postgres`) consegue fazer este
`INSERT`, porque `service_role`/`postgres` não está sujeito às policies de
RLS — é o único jeito de plantar a primeira linha sem já ter permissão.

1. Descubra o `id` (uuid) do usuário recém-criado. Pelo e-mail:

   ```sql
   select id, nome, email, status
   from public.usuarios
   where email = '<email-do-primeiro-super-admin>';
   ```

2. Descubra o `id` do papel `super_admin` (já semeado pela migration):

   ```sql
   select id, nome from public.papeis where nome = 'super_admin';
   ```

3. Insira a atribuição (troque os dois placeholders pelos uuids obtidos acima):

   ```sql
   insert into public.usuario_papeis (usuario_id, papel_id)
   values (
     '<uuid-do-usuario>',
     (select id from public.papeis where nome = 'super_admin')
   )
   on conflict (usuario_id, papel_id) do nothing;
   ```

   (a subquery evita precisar colar o uuid do papel manualmente — só o do
   usuário é obrigatório).

## Passo 3 — confirmar

Logado como esse usuário, `has_permission('core', 'usuarios', 'ler',
'rede_toda')` deve retornar `true`:

```sql
-- rodar autenticado como o próprio usuário (ex.: via RPC do app, ou
-- "Run as" no SQL Editor se o painel suportar; se não, confirme indiretamente
-- checando se a linha em usuario_papeis existe e está ativa)
select up.is_active, p.nome
from public.usuario_papeis up
join public.papeis p on p.id = up.papel_id
where up.usuario_id = '<uuid-do-usuario>';
```

A partir daqui, esse `super_admin` já pode usar a própria aplicação (UI de
administração de permissões, quando existir) para conceder papéis e grants a
todo mundo — este runbook não precisa ser repetido.
