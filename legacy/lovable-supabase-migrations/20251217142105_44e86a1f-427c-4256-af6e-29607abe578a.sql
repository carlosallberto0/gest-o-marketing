-- Add new role 'coordenador_compras' to the user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'coordenador_compras';

-- Add 'pode_aprovar_os' field to profiles for directors
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pode_aprovar_os boolean DEFAULT false;

-- Create notifications table
CREATE TABLE public.notificacoes_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  modulo text NOT NULL CHECK (modulo IN ('media', 'merchandising', 'sistema')),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  url_acao text,
  id_referencia uuid,
  tipo_referencia text,
  lida boolean DEFAULT false,
  criada_em timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notificacoes_sistema ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notificacoes_sistema
FOR SELECT
USING (usuario_id = auth.uid() OR usuario_id IS NULL);

-- Policy: Users can mark their notifications as read
CREATE POLICY "Users can update own notifications"
ON public.notificacoes_sistema
FOR UPDATE
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

-- Policy: System can insert notifications (via service role or authenticated users with proper roles)
CREATE POLICY "Admins can manage all notifications"
ON public.notificacoes_sistema
FOR ALL
USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Create index for faster queries
CREATE INDEX idx_notificacoes_usuario_lida ON public.notificacoes_sistema(usuario_id, lida);
CREATE INDEX idx_notificacoes_criada_em ON public.notificacoes_sistema(criada_em DESC);

-- Create function to send notification
CREATE OR REPLACE FUNCTION public.enviar_notificacao(
  p_usuario_id uuid,
  p_tipo text,
  p_modulo text,
  p_titulo text,
  p_mensagem text,
  p_url_acao text DEFAULT NULL,
  p_id_referencia uuid DEFAULT NULL,
  p_tipo_referencia text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notificacao_id uuid;
BEGIN
  INSERT INTO public.notificacoes_sistema (
    usuario_id, tipo, modulo, titulo, mensagem, url_acao, id_referencia, tipo_referencia
  ) VALUES (
    p_usuario_id, p_tipo, p_modulo, p_titulo, p_mensagem, p_url_acao, p_id_referencia, p_tipo_referencia
  )
  RETURNING id INTO v_notificacao_id;
  
  RETURN v_notificacao_id;
END;
$$;

-- Create function to notify users by role
CREATE OR REPLACE FUNCTION public.notificar_por_role(
  p_role user_role,
  p_tipo text,
  p_modulo text,
  p_titulo text,
  p_mensagem text,
  p_url_acao text DEFAULT NULL,
  p_id_referencia uuid DEFAULT NULL,
  p_tipo_referencia text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notificacoes_sistema (
    usuario_id, tipo, modulo, titulo, mensagem, url_acao, id_referencia, tipo_referencia
  )
  SELECT 
    p.id,
    p_tipo,
    p_modulo,
    p_titulo,
    p_mensagem,
    p_url_acao,
    p_id_referencia,
    p_tipo_referencia
  FROM public.profiles p
  WHERE p.role = p_role AND p.status = 'active';
END;
$$;

-- Create function to notify directors who can approve OS
CREATE OR REPLACE FUNCTION public.notificar_diretores_aprovadores(
  p_tipo text,
  p_titulo text,
  p_mensagem text,
  p_url_acao text DEFAULT NULL,
  p_id_referencia uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notificacoes_sistema (
    usuario_id, tipo, modulo, titulo, mensagem, url_acao, id_referencia, tipo_referencia
  )
  SELECT 
    p.id,
    p_tipo,
    'media',
    p_titulo,
    p_mensagem,
    p_url_acao,
    p_id_referencia,
    'service_order'
  FROM public.profiles p
  WHERE p.role = 'director' 
    AND p.pode_aprovar_os = true 
    AND p.status = 'active';
END;
$$;