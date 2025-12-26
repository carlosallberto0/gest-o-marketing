-- Add description_type column to outdoors table
ALTER TABLE public.outdoors 
ADD COLUMN IF NOT EXISTS description_type TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.outdoors.description_type IS 'Type of outdoor: etanol_gasolina, diesel, institucional, servico';