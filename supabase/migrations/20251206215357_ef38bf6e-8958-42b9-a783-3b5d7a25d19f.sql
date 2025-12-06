-- Create evaluation comments table
CREATE TABLE public.evaluation_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID NOT NULL REFERENCES public.merch_evaluations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evaluation_comments ENABLE ROW LEVEL SECURITY;

-- Admins and managers can create comments
CREATE POLICY "Admins and managers can create comments"
ON public.evaluation_comments
FOR INSERT
WITH CHECK (
  get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'director'::user_role, 'manager'::user_role])
);

-- Users with merchandising access can view comments
CREATE POLICY "Users can view comments"
ON public.evaluation_comments
FOR SELECT
USING (has_module_access(auth.uid(), 'merchandising'::module_access));

-- Authors can delete their own comments
CREATE POLICY "Authors can delete own comments"
ON public.evaluation_comments
FOR DELETE
USING (author_id = auth.uid());

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluation_comments;