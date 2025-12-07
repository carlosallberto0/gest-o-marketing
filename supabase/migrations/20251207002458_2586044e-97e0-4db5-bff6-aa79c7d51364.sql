-- Drop the existing select policy
DROP POLICY IF EXISTS "Users can view materials" ON public.trade_materials;

-- Create new policy that excludes 'gift' type for non-admin users
CREATE POLICY "Users can view materials" 
ON public.trade_materials 
FOR SELECT 
USING (
  has_module_access(auth.uid(), 'merchandising'::module_access)
  AND (
    get_user_role(auth.uid()) IN ('super_admin', 'admin')
    OR type != 'gift'
  )
);