
-- Create sequence starting after the current max
CREATE SEQUENCE IF NOT EXISTS outdoor_code_seq START WITH 165;

-- Initialize sequence to the correct value based on existing data
DO $$
DECLARE
  max_num integer;
BEGIN
  SELECT COALESCE(MAX(
    CASE 
      WHEN code ~ '^OUT-\d+$' THEN CAST(SUBSTRING(code FROM 'OUT-(\d+)') AS integer)
      ELSE 0
    END
  ), 0) INTO max_num FROM outdoors;
  
  IF max_num >= 165 THEN
    PERFORM setval('outdoor_code_seq', max_num);
  END IF;
END $$;

-- Create trigger function to auto-generate code on insert
CREATE OR REPLACE FUNCTION public.generate_outdoor_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $func$
BEGIN
  -- Only generate if code is not provided or is empty
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'OUT-' || LPAD(nextval('outdoor_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$func$;

-- Create trigger
CREATE TRIGGER trg_generate_outdoor_code
  BEFORE INSERT ON outdoors
  FOR EACH ROW
  EXECUTE FUNCTION generate_outdoor_code();
