-- Add direction column to outdoors table
ALTER TABLE outdoors 
ADD COLUMN direction TEXT DEFAULT NULL;

COMMENT ON COLUMN outdoors.direction IS 'Sentido/orientação da placa do outdoor (ex: sentido Palmas). Campo opcional para guiar manutenção.';