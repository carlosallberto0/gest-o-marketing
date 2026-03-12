

# Corrigir Visibilidade de Nomes de Gerentes para Diretores

## Problema

A tabela `profiles` possui RLS que permite SELECT apenas para:
- O próprio usuário (`auth.uid() = id`)
- Super Admin e Admin (`get_user_role(auth.uid()) IN ('super_admin', 'admin')`)

Quando um **diretor** acessa a página "Progresso Avaliações", o hook `usePDVs` faz um join `profiles!pdvs_manager_id_fkey(name)` para buscar o nome do gerente. Como o diretor não tem permissão de leitura em outros perfis, o join retorna `null` e todos os postos aparecem como "Sem gerente".

## Solução

Adicionar uma política RLS na tabela `profiles` permitindo que diretores façam SELECT em perfis. Isso é seguro porque diretores são um papel de confiança e precisam ver informações de gestores sob sua supervisão.

### Migração SQL

```sql
CREATE POLICY "Directors can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'director'::user_role);
```

### Arquivos
- **Migração de banco**: 1 política RLS nova na tabela `profiles`

Nenhuma alteração de código é necessária — a lógica do `usePDVs` e do `EvaluationProgress` já está correta.

