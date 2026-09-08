-- Create alerts table for system notifications
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('contract_expiring', 'outdoor_pending', 'campaign_goal', 'low_score', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  related_id UUID NULL,
  related_type TEXT NULL CHECK (related_type IN ('contract', 'outdoor', 'campaign', 'pdv', 'evaluation')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NULL
);

-- Enable Row Level Security
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own alerts or global alerts" 
ON public.alerts 
FOR SELECT 
USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Admins can manage all alerts" 
ON public.alerts 
FOR ALL 
USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Users can mark their alerts as read" 
ON public.alerts 
FOR UPDATE 
USING (user_id IS NULL OR user_id = auth.uid())
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Create index for performance
CREATE INDEX idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX idx_alerts_is_read ON public.alerts(is_read);
CREATE INDEX idx_alerts_type ON public.alerts(type);

-- Create function to generate alerts automatically
CREATE OR REPLACE FUNCTION public.generate_contract_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contract_record RECORD;
BEGIN
  -- Delete old contract expiring alerts
  DELETE FROM public.alerts WHERE type = 'contract_expiring' AND created_at < now() - interval '1 day';
  
  -- Create alerts for contracts expiring in 30 days
  FOR contract_record IN 
    SELECT c.id, c.farmer_name, c.end_date, o.code as outdoor_code
    FROM public.contracts c
    JOIN public.outdoors o ON o.contract_id = c.id
    WHERE c.status = 'active' 
    AND c.end_date <= CURRENT_DATE + interval '30 days'
    AND c.end_date >= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM public.alerts a 
      WHERE a.related_id = c.id 
      AND a.type = 'contract_expiring'
      AND a.created_at > now() - interval '1 day'
    )
  LOOP
    INSERT INTO public.alerts (type, title, message, severity, related_id, related_type)
    VALUES (
      'contract_expiring',
      'Contrato próximo do vencimento',
      'O contrato com ' || contract_record.farmer_name || ' (Outdoor ' || contract_record.outdoor_code || ') vence em ' || 
      (contract_record.end_date - CURRENT_DATE) || ' dias.',
      CASE 
        WHEN (contract_record.end_date - CURRENT_DATE) <= 7 THEN 'error'
        WHEN (contract_record.end_date - CURRENT_DATE) <= 14 THEN 'warning'
        ELSE 'info'
      END,
      contract_record.id,
      'contract'
    );
  END LOOP;
END;
$$;

-- Create function to generate outdoor pending alerts
CREATE OR REPLACE FUNCTION public.generate_outdoor_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  outdoor_record RECORD;
BEGIN
  -- Delete old outdoor pending alerts
  DELETE FROM public.alerts WHERE type = 'outdoor_pending' AND created_at < now() - interval '1 day';
  
  -- Create alerts for outdoors pending evaluation for more than 30 days
  FOR outdoor_record IN 
    SELECT o.id, o.code, o.location, p.name as pdv_name,
           COALESCE(o.last_evaluation, o.created_at) as last_check
    FROM public.outdoors o
    JOIN public.pdvs p ON p.id = o.pdv_id
    WHERE o.status = 'pending_evaluation'
    AND COALESCE(o.last_evaluation, o.created_at) < now() - interval '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.alerts a 
      WHERE a.related_id = o.id 
      AND a.type = 'outdoor_pending'
      AND a.created_at > now() - interval '1 day'
    )
  LOOP
    INSERT INTO public.alerts (type, title, message, severity, related_id, related_type)
    VALUES (
      'outdoor_pending',
      'Outdoor aguardando avaliação',
      'O outdoor ' || outdoor_record.code || ' (' || outdoor_record.pdv_name || ') está pendente há mais de 30 dias.',
      'warning',
      outdoor_record.id,
      'outdoor'
    );
  END LOOP;
END;
$$;