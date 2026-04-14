ALTER TABLE supplier_work_order_items 
ADD COLUMN validated boolean NOT NULL DEFAULT false,
ADD COLUMN validated_at timestamptz;