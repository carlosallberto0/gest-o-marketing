-- Create enum for user roles (following security best practices)
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'director', 'manager', 'collaborator', 'supplier', 'coordenador_compras', 'convenience_coordinator');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_app_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_app_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_app_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Add access token columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_token VARCHAR(64) UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS token_gerado_em TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS token_valido_ate TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ultimo_acesso_via_link TIMESTAMPTZ;

-- Create access_logs table for tracking link usage
CREATE TABLE public.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    token_usado VARCHAR(64),
    tipo_acesso TEXT NOT NULL CHECK (tipo_acesso IN ('link', 'login')),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on access_logs
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for access_logs
CREATE POLICY "Super admins and admins can view all logs"
ON public.access_logs
FOR SELECT
TO authenticated
USING (
    public.has_app_role(auth.uid(), 'super_admin') OR 
    public.has_app_role(auth.uid(), 'admin')
);

CREATE POLICY "Super admins can insert logs"
ON public.access_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_app_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their own logs"
ON public.access_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow service role to insert logs (for edge functions)
CREATE POLICY "Service role can insert logs"
ON public.access_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_access_token ON public.profiles(access_token) WHERE access_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON public.access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON public.access_logs(created_at DESC);

-- Function to generate unique access token
CREATE OR REPLACE FUNCTION public.generate_access_token()
RETURNS VARCHAR(64)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_token VARCHAR(64);
    token_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 12 character alphanumeric token
        new_token := substr(md5(random()::text || clock_timestamp()::text), 1, 12);
        
        -- Check if token already exists
        SELECT EXISTS(SELECT 1 FROM profiles WHERE access_token = new_token) INTO token_exists;
        
        EXIT WHEN NOT token_exists;
    END LOOP;
    
    RETURN new_token;
END;
$$;