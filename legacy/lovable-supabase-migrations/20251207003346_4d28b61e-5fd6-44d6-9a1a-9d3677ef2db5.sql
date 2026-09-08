-- Create stock_movements table for tracking all stock changes
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.trade_materials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('withdrawal', 'entry', 'adjustment')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  justification TEXT NOT NULL CHECK (char_length(justification) >= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Only super_admin and admin can create movements
CREATE POLICY "Admins can create stock movements"
ON public.stock_movements
FOR INSERT
WITH CHECK (
  get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Only super_admin and admin can view movements
CREATE POLICY "Admins can view stock movements"
ON public.stock_movements
FOR SELECT
USING (
  get_user_role(auth.uid()) IN ('super_admin', 'admin')
);

-- Create function to update material stock after movement
CREATE OR REPLACE FUNCTION public.update_material_stock_after_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trade_materials
  SET current_stock = NEW.new_stock,
      updated_at = now()
  WHERE id = NEW.material_id;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update stock
CREATE TRIGGER trigger_update_material_stock
AFTER INSERT ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_material_stock_after_movement();