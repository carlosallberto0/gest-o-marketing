-- Create system_settings table for evaluation configurations
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only super_admin can read/write settings
CREATE POLICY "Super admins can read settings" 
ON public.system_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

CREATE POLICY "Super admins can update settings" 
ON public.system_settings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

CREATE POLICY "Super admins can insert settings" 
ON public.system_settings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Insert default evaluation settings
INSERT INTO public.system_settings (key, value, description) VALUES
('evaluation_frequency', '{"pdv_days": 30, "outdoor_days": 7}', 'Frequência de avaliações em dias'),
('notification_settings', '{"alert_managers": true, "days_before": 3, "enabled": true}', 'Configurações de notificação de avaliações'),
('evaluation_config', '{"require_photo": true, "require_signature": false, "max_days_overdue": 7}', 'Configurações gerais de avaliação');