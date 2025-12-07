-- Create material requests table
CREATE TABLE public.material_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.trade_materials(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pdv_id UUID NOT NULL REFERENCES public.pdvs(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  justification TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delivered')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_material_requests_updated_at
BEFORE UPDATE ON public.material_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Managers and collaborators can create their own requests
CREATE POLICY "Users can create material requests"
ON public.material_requests
FOR INSERT
WITH CHECK (
  has_module_access(auth.uid(), 'merchandising'::module_access)
  AND requester_id = auth.uid()
);

-- Users can view their own requests, admins can view all
CREATE POLICY "Users can view material requests"
ON public.material_requests
FOR SELECT
USING (
  has_module_access(auth.uid(), 'merchandising'::module_access)
  AND (
    requester_id = auth.uid()
    OR get_user_role(auth.uid()) IN ('super_admin', 'admin', 'director')
  )
);

-- Admins can update any request (approve/reject/deliver)
CREATE POLICY "Admins can update material requests"
ON public.material_requests
FOR UPDATE
USING (
  get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Admins can delete requests
CREATE POLICY "Admins can delete material requests"
ON public.material_requests
FOR DELETE
USING (
  get_user_role(auth.uid()) IN ('super_admin', 'admin')
);