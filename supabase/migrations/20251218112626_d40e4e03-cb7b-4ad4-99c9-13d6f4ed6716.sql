-- Add new values to the service_order_status enum
ALTER TYPE public.service_order_status ADD VALUE IF NOT EXISTS 'pending_director';
ALTER TYPE public.service_order_status ADD VALUE IF NOT EXISTS 'director_approved';
ALTER TYPE public.service_order_status ADD VALUE IF NOT EXISTS 'validated';
ALTER TYPE public.service_order_status ADD VALUE IF NOT EXISTS 'correction_requested';