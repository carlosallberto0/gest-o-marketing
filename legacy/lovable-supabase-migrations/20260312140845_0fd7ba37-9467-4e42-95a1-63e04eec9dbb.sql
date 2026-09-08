CREATE POLICY "Directors can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'director'::user_role);