
-- Routes table
CREATE TABLE public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'auto' CHECK (type IN ('auto', 'manual', 'unified')),
  package_id uuid REFERENCES public.maintenance_approval_packages(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  origin_lat numeric NOT NULL DEFAULT -15.4472,
  origin_lng numeric NOT NULL DEFAULT -47.3339,
  origin_label text NOT NULL DEFAULT 'Formosa - GO',
  total_distance_km numeric DEFAULT 0,
  estimated_days integer DEFAULT 15,
  deadline date,
  production_days integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage routes" ON public.routes
  FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Directors can view routes" ON public.routes
  FOR SELECT USING (get_user_role(auth.uid()) = 'director');

CREATE POLICY "Suppliers can view their routes" ON public.routes
  FOR SELECT USING (supplier_id = get_user_supplier_id(auth.uid()));

CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Route points table
CREATE TABLE public.route_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  outdoor_id uuid NOT NULL REFERENCES public.outdoors(id) ON DELETE CASCADE,
  sequence integer NOT NULL DEFAULT 0,
  scheduled_date date,
  priority text NOT NULL DEFAULT 'pending' CHECK (priority IN ('critical', 'pending', 'preventive')),
  estimated_arrival_order integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.route_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage route points" ON public.route_points
  FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Directors can view route points" ON public.route_points
  FOR SELECT USING (get_user_role(auth.uid()) = 'director');

CREATE POLICY "Suppliers can view their route points" ON public.route_points
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = route_points.route_id
      AND r.supplier_id = get_user_supplier_id(auth.uid())
    )
  );

CREATE INDEX idx_route_points_route_id ON public.route_points(route_id);
CREATE INDEX idx_route_points_outdoor_id ON public.route_points(outdoor_id);

-- Route history table
CREATE TABLE public.route_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'edited', 'unified', 'completed')),
  user_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage route history" ON public.route_history
  FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Directors can view route history" ON public.route_history
  FOR SELECT USING (get_user_role(auth.uid()) = 'director');

CREATE POLICY "Authenticated can insert route history" ON public.route_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_route_history_route_id ON public.route_history(route_id);
