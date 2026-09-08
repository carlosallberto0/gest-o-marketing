-- Tabela para armazenar imagens das páginas do contrato
CREATE TABLE public.contract_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  page_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índice para busca rápida
CREATE INDEX idx_contract_images_contract_id ON contract_images(contract_id);

-- RLS para contract_images
ALTER TABLE contract_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage contract images"
  ON contract_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Tabela pivot para relação N:N entre contratos e outdoors
CREATE TABLE public.contract_outdoors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  outdoor_id UUID NOT NULL REFERENCES outdoors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(contract_id, outdoor_id)
);

-- Índices para performance
CREATE INDEX idx_contract_outdoors_contract ON contract_outdoors(contract_id);
CREATE INDEX idx_contract_outdoors_outdoor ON contract_outdoors(outdoor_id);

-- RLS para contract_outdoors
ALTER TABLE contract_outdoors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage contract_outdoors"
  ON contract_outdoors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Migrar relações 1:1 existentes para a tabela pivot
INSERT INTO contract_outdoors (contract_id, outdoor_id)
SELECT id, outdoor_id FROM contracts WHERE outdoor_id IS NOT NULL;

-- Tornar outdoor_id nullable para novos contratos (agora usamos a tabela pivot)
ALTER TABLE contracts ALTER COLUMN outdoor_id DROP NOT NULL;