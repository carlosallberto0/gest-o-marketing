-- Add ownership_type and supplier_id to outdoors table
ALTER TABLE public.outdoors 
ADD COLUMN IF NOT EXISTS ownership_type text DEFAULT 'owned' CHECK (ownership_type IN ('owned', 'rented')),
ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id);

-- Add photo_url to pdvs table if not exists
ALTER TABLE public.pdvs ADD COLUMN IF NOT EXISTS photo_url text;