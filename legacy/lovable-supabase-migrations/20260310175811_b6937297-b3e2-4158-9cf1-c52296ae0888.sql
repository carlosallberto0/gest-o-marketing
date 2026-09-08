
-- Add supplier_id to profiles to link supplier users to their supplier entity
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id);

-- Create supplier_work_orders table
CREATE TABLE public.supplier_work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.maintenance_approval_packages(id),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  assigned_by uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  validated_at timestamptz,
  validated_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create supplier_work_order_items table
CREATE TABLE public.supplier_work_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.supplier_work_orders(id) ON DELETE CASCADE,
  outdoor_id uuid NOT NULL REFERENCES public.outdoors(id),
  package_item_id uuid REFERENCES public.maintenance_package_items(id),
  original_photo_url text,
  execution_photo_url text,
  executed boolean NOT NULL DEFAULT false,
  executed_at timestamptz,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_work_order_items ENABLE ROW LEVEL SECURITY;

-- Security definer function to get supplier_id from profile
CREATE OR REPLACE FUNCTION public.get_user_supplier_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT supplier_id FROM public.profiles WHERE id = p_user_id;
$$;

-- RLS for supplier_work_orders
CREATE POLICY "Admins full access on supplier_work_orders"
ON public.supplier_work_orders FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'))
WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Suppliers can view own work orders"
ON public.supplier_work_orders FOR SELECT
TO authenticated
USING (supplier_id = get_user_supplier_id(auth.uid()));

CREATE POLICY "Suppliers can update own work orders"
ON public.supplier_work_orders FOR UPDATE
TO authenticated
USING (supplier_id = get_user_supplier_id(auth.uid()))
WITH CHECK (supplier_id = get_user_supplier_id(auth.uid()));

-- RLS for supplier_work_order_items
CREATE POLICY "Admins full access on supplier_work_order_items"
ON public.supplier_work_order_items FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'))
WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Suppliers can view own work order items"
ON public.supplier_work_order_items FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.supplier_work_orders wo
  WHERE wo.id = supplier_work_order_items.work_order_id
  AND wo.supplier_id = get_user_supplier_id(auth.uid())
));

CREATE POLICY "Suppliers can update own work order items"
ON public.supplier_work_order_items FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.supplier_work_orders wo
  WHERE wo.id = supplier_work_order_items.work_order_id
  AND wo.supplier_id = get_user_supplier_id(auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.supplier_work_orders wo
  WHERE wo.id = supplier_work_order_items.work_order_id
  AND wo.supplier_id = get_user_supplier_id(auth.uid())
));

-- Create indexes
CREATE INDEX idx_supplier_work_orders_supplier_id ON public.supplier_work_orders(supplier_id);
CREATE INDEX idx_supplier_work_orders_status ON public.supplier_work_orders(status);
CREATE INDEX idx_supplier_work_order_items_work_order_id ON public.supplier_work_order_items(work_order_id);
CREATE INDEX idx_supplier_work_order_items_outdoor_id ON public.supplier_work_order_items(outdoor_id);
