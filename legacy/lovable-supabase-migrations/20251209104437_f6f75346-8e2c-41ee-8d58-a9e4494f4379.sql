-- Add geolocation columns to outdoors table
ALTER TABLE public.outdoors ADD COLUMN IF NOT EXISTS lat numeric(10, 8);
ALTER TABLE public.outdoors ADD COLUMN IF NOT EXISTS lng numeric(11, 8);
ALTER TABLE public.outdoors ADD COLUMN IF NOT EXISTS validation_radius_meters integer DEFAULT 50;

-- Create geolocation history table
CREATE TABLE public.outdoor_geolocation_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outdoor_id uuid NOT NULL REFERENCES public.outdoors(id) ON DELETE CASCADE,
  evaluation_id uuid REFERENCES public.media_evaluations(id) ON DELETE SET NULL,
  latitude numeric(10, 8) NOT NULL,
  longitude numeric(11, 8) NOT NULL,
  accuracy numeric(5, 2),
  distance_from_outdoor numeric(10, 2),
  is_valid boolean DEFAULT true,
  validation_notes text,
  captured_by uuid REFERENCES public.profiles(id),
  photo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_outdoor_geolocation_history_outdoor 
  ON public.outdoor_geolocation_history(outdoor_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.outdoor_geolocation_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for geolocation history
CREATE POLICY "Users with media access can view geolocation history"
  ON public.outdoor_geolocation_history
  FOR SELECT
  USING (has_module_access(auth.uid(), 'media'::module_access));

CREATE POLICY "Users with media access can create geolocation history"
  ON public.outdoor_geolocation_history
  FOR INSERT
  WITH CHECK (has_module_access(auth.uid(), 'media'::module_access) AND captured_by = auth.uid());

CREATE POLICY "Admins can manage geolocation history"
  ON public.outdoor_geolocation_history
  FOR ALL
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role]));

-- Add lat/lng to media_evaluations if not exists (they already have it based on types)