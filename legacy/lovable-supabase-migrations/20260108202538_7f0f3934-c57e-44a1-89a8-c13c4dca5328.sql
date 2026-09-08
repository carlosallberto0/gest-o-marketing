-- Alterar a coluna service_types de service_type[] para TEXT[]
-- Isso permite tipos de serviço dinâmicos configurados em system_options
ALTER TABLE suppliers 
  ALTER COLUMN service_types TYPE TEXT[] 
  USING service_types::TEXT[];