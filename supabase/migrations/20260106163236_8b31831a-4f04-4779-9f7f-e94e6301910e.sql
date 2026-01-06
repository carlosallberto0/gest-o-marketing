-- Add urgency and maintenance_type columns to maintenance_requests
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS maintenance_type TEXT DEFAULT 'corretiva';

-- Add check constraints
ALTER TABLE maintenance_requests 
ADD CONSTRAINT maintenance_requests_urgency_check 
CHECK (urgency IN ('baixa', 'normal', 'alta', 'emergencial'));

ALTER TABLE maintenance_requests 
ADD CONSTRAINT maintenance_requests_type_check 
CHECK (maintenance_type IN ('preventiva', 'corretiva'));

-- Create index for filtering by urgency
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_urgency ON maintenance_requests(urgency);