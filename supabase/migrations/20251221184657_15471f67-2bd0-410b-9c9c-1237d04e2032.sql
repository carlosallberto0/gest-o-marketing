-- Criar tabela de revisões mensais de outdoors
CREATE TABLE public.outdoor_monthly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outdoor_id uuid REFERENCES public.outdoors(id) ON DELETE CASCADE NOT NULL,
  reviewer_id uuid REFERENCES public.profiles(id) NOT NULL,
  review_month date NOT NULL,
  status text NOT NULL CHECK (status IN ('approved', 'needs_maintenance')),
  current_photo_url text,
  observations text,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  UNIQUE(outdoor_id, review_month)
);

-- Habilitar RLS
ALTER TABLE public.outdoor_monthly_reviews ENABLE ROW LEVEL SECURITY;

-- Policies para outdoor_monthly_reviews
CREATE POLICY "Users with media access can view reviews" 
ON public.outdoor_monthly_reviews 
FOR SELECT 
USING (has_module_access(auth.uid(), 'media'::module_access));

CREATE POLICY "Managers and admins can create reviews" 
ON public.outdoor_monthly_reviews 
FOR INSERT 
WITH CHECK (
  reviewer_id = auth.uid() AND 
  get_user_role(auth.uid()) IN ('super_admin', 'admin', 'director', 'manager')
);

CREATE POLICY "Admins can update reviews" 
ON public.outdoor_monthly_reviews 
FOR UPDATE 
USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Admins can delete reviews" 
ON public.outdoor_monthly_reviews 
FOR DELETE 
USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Adicionar coluna current_photo_url na tabela maintenance_requests
ALTER TABLE public.maintenance_requests 
ADD COLUMN IF NOT EXISTS current_photo_url text;