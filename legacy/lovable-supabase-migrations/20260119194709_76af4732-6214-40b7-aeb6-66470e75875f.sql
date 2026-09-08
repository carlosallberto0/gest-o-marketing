-- =====================================================
-- Security Fixes Migration
-- Fixes: storage policies, profiles RLS, contracts RLS
-- =====================================================

-- ==============================================
-- 1. FIX STORAGE BUCKET POLICIES
-- Add ownership checks to UPDATE and DELETE
-- ==============================================

-- Drop existing weak policies
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;

-- Create fixed policies with ownership checks
CREATE POLICY "Users can update own photos" ON storage.objects 
  FOR UPDATE TO authenticated 
  USING (bucket_id = 'photos' AND auth.uid() = owner);

CREATE POLICY "Users can delete own photos" ON storage.objects 
  FOR DELETE TO authenticated 
  USING (bucket_id = 'photos' AND auth.uid() = owner);

-- Add admin override for managing all photos
CREATE POLICY "Admins can manage all photos" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'photos' AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- ==============================================
-- 2. FIX PROFILES TABLE RLS
-- Restrict sensitive field access to admins only
-- Create secure view for non-admin access
-- ==============================================

-- Create a safe view for general profile access (excludes sensitive fields)
CREATE OR REPLACE VIEW public.profiles_safe 
WITH (security_invoker=on) AS
SELECT 
  id, 
  name, 
  email, 
  role, 
  modules, 
  pdv_id, 
  status, 
  pode_aprovar_os, 
  created_at, 
  updated_at
FROM public.profiles;

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.profiles_safe TO authenticated;

-- Create function to check if user is admin (avoiding recursion)
CREATE OR REPLACE FUNCTION public.is_admin_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'admin')
  )
$$;

-- ==============================================
-- 3. FIX CONTRACTS TABLE RLS
-- Restrict access to admins and assigned PDV managers
-- ==============================================

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Users can view contracts" ON public.contracts;

-- Create restrictive policy: Admins see all, managers see contracts for their PDV outdoors
CREATE POLICY "Admins can view all contracts" ON public.contracts
  FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'director')
  );

CREATE POLICY "Managers can view contracts for their PDV" ON public.contracts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.outdoors o
      JOIN public.pdvs p ON o.pdv_id = p.id
      WHERE (o.contract_id = contracts.id OR o.id = contracts.outdoor_id)
      AND p.manager_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.contract_outdoors co
      JOIN public.outdoors o ON co.outdoor_id = o.id
      JOIN public.pdvs p ON o.pdv_id = p.id
      WHERE co.contract_id = contracts.id
      AND p.manager_id = auth.uid()
    )
  );

-- ==============================================
-- 4. CLEAR EXISTING PLAINTEXT PASSWORDS
-- Remove stored temp_password values for security
-- ==============================================

-- Clear all temporary passwords (they should be one-time use)
UPDATE public.profiles SET temp_password = NULL WHERE temp_password IS NOT NULL;