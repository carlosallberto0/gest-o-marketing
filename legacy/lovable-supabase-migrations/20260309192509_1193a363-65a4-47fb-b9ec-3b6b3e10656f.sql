ALTER TABLE public.maintenance_approval_packages 
ADD COLUMN ready_for_service_order boolean NOT NULL DEFAULT false;