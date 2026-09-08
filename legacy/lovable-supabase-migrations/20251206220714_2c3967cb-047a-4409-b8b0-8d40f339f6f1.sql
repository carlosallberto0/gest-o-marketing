-- Create action_plans table for non-compliant items
CREATE TABLE public.action_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID NOT NULL REFERENCES public.merch_evaluations(id) ON DELETE CASCADE,
  answer_id UUID NOT NULL REFERENCES public.evaluation_answers(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  responsible_id UUID REFERENCES public.profiles(id),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;

-- Admins and managers can manage action plans
CREATE POLICY "Admins and managers can manage action plans"
ON public.action_plans
FOR ALL
USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'director', 'manager'));

-- Users can view action plans
CREATE POLICY "Users can view action plans"
ON public.action_plans
FOR SELECT
USING (has_module_access(auth.uid(), 'merchandising'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_plans;