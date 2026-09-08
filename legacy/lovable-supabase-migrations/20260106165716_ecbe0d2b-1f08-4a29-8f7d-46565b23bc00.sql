-- 1. Remover política vulnerável que expõe todos os perfis
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 2. Criar política segura para admins verem todos os perfis
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- 3. Criar política para usuários verem apenas seu próprio perfil
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);