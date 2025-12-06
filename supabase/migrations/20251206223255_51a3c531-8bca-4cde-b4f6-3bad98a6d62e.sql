-- Create maintenance_requests table for manager requests
CREATE TABLE public.maintenance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outdoor_id UUID NOT NULL REFERENCES public.outdoors(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id),
  evaluation_id UUID REFERENCES public.media_evaluations(id),
  reason TEXT NOT NULL,
  observations TEXT,
  photos TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending_review',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  service_order_id UUID REFERENCES public.service_orders(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_order_items table for multiple outdoors per service order
CREATE TABLE public.service_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  outdoor_id UUID NOT NULL REFERENCES public.outdoors(id),
  maintenance_request_id UUID REFERENCES public.maintenance_requests(id),
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for maintenance_requests
CREATE POLICY "Users can view maintenance requests"
ON public.maintenance_requests
FOR SELECT
USING (has_module_access(auth.uid(), 'media'::module_access));

CREATE POLICY "Users can create maintenance requests"
ON public.maintenance_requests
FOR INSERT
WITH CHECK (has_module_access(auth.uid(), 'media'::module_access) AND requester_id = auth.uid());

CREATE POLICY "Directors can approve maintenance requests"
ON public.maintenance_requests
FOR UPDATE
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'director'::user_role]));

CREATE POLICY "Admins can delete maintenance requests"
ON public.maintenance_requests
FOR DELETE
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- RLS policies for service_order_items
CREATE POLICY "Users can view service order items"
ON public.service_order_items
FOR SELECT
USING (has_module_access(auth.uid(), 'media'::module_access));

CREATE POLICY "Directors can manage service order items"
ON public.service_order_items
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'director'::user_role]));

-- Add trigger for updated_at
CREATE TRIGGER update_maintenance_requests_updated_at
BEFORE UPDATE ON public.maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();