-- Create maintenance_approval_packages table
CREATE TABLE public.maintenance_approval_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending_director',
  observations TEXT,
  director_id UUID REFERENCES public.profiles(id),
  director_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Create maintenance_package_items table
CREATE TABLE public.maintenance_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.maintenance_approval_packages(id) ON DELETE CASCADE,
  outdoor_id UUID NOT NULL REFERENCES public.outdoors(id),
  evaluation_id UUID REFERENCES public.media_evaluations(id),
  status TEXT NOT NULL DEFAULT 'pending',
  director_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_approval_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_package_items ENABLE ROW LEVEL SECURITY;

-- RLS for maintenance_approval_packages
CREATE POLICY "Admins can manage packages"
  ON public.maintenance_approval_packages
  FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Directors can view and update packages"
  ON public.maintenance_approval_packages
  FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'director'));

CREATE POLICY "Directors can approve packages"
  ON public.maintenance_approval_packages
  FOR UPDATE
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'director'));

-- RLS for maintenance_package_items
CREATE POLICY "Admins can manage package items"
  ON public.maintenance_package_items
  FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Directors can view and update package items"
  ON public.maintenance_package_items
  FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'director'));

CREATE POLICY "Directors can approve package items"
  ON public.maintenance_package_items
  FOR UPDATE
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'director'));

-- Create indexes for better performance
CREATE INDEX idx_maintenance_packages_status ON public.maintenance_approval_packages(status);
CREATE INDEX idx_maintenance_packages_created_by ON public.maintenance_approval_packages(created_by);
CREATE INDEX idx_maintenance_package_items_package_id ON public.maintenance_package_items(package_id);
CREATE INDEX idx_maintenance_package_items_outdoor_id ON public.maintenance_package_items(outdoor_id);