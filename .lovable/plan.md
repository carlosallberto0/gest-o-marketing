

# Corrigir permissões de menu do Diretor não sendo aplicadas

## Problema

A tabela `system_settings` tem políticas RLS que restringem leitura para `super_admin`. Existe uma política específica para `manager_menu_permissions` que permite leitura por usuários autenticados, mas **não existe uma política equivalente para `director_menu_permissions`**.

Quando o diretor tenta carregar as permissões, a query falha silenciosamente (RLS bloqueia), o hook retorna os valores padrão (tudo habilitado), e o menu aparece completo.

## Solução

Adicionar uma política RLS na tabela `system_settings` que permita usuários autenticados lerem o registro com key `director_menu_permissions`.

## Implementação

| Alteração | Detalhe |
|-----------|---------|
| Migração SQL | `CREATE POLICY "Allow authenticated read director_menu_permissions" ON system_settings FOR SELECT TO authenticated USING (key = 'director_menu_permissions');` |

Uma única migração resolve o problema. Nenhum arquivo de código precisa ser alterado.

