-- Add maps_url column to pdvs table for storing Google Maps links
-- This enables batch recalibration of coordinates from saved URLs
ALTER TABLE public.pdvs 
ADD COLUMN IF NOT EXISTS maps_url text NULL;

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.pdvs.maps_url IS 'URL do Google Maps para o PDV, usado para recalibração de coordenadas';