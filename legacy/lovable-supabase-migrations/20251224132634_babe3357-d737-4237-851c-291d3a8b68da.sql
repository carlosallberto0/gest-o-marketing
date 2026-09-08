-- Add location_url column to store the original Google Maps URL
ALTER TABLE public.outdoors ADD COLUMN IF NOT EXISTS location_url text;