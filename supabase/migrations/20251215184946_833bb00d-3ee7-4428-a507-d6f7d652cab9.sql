-- Create "Positivação de Materiais" category for PDV checklist
INSERT INTO public.checklist_categories (name, icon, sort_order)
VALUES ('Positivação de Materiais', 'Package', 10);

-- Add material-related questions to the new category
-- First, get the category id using a CTE
WITH cat AS (
  SELECT id FROM public.checklist_categories WHERE name = 'Positivação de Materiais' LIMIT 1
)
INSERT INTO public.checklist_questions (category_id, text, tip, sort_order, requires_photo, is_critical, requires_material, material_type)
SELECT 
  cat.id,
  q.text,
  q.tip,
  q.sort_order,
  q.requires_photo,
  q.is_critical,
  q.requires_material,
  q.material_type::material_type
FROM cat, (VALUES
  ('Wobbler está presente e posicionado corretamente?', 'Wobbler deve estar na altura dos olhos, visível e limpo', 1, true, true, true, 'promotional'),
  ('Stopper está posicionado no ponto de venda?', 'Stopper deve estar na gôndola ou prateleira do produto', 2, true, true, true, 'promotional'),
  ('Móbile de teto está instalado e visível?', 'Móbile deve estar no teto, acima da área de circulação', 3, true, false, true, 'promotional'),
  ('Clip Strip está instalado corretamente?', 'Clip Strip deve estar fixado em gôndola ou prateleira', 4, true, false, true, 'display'),
  ('Display de balcão está presente e organizado?', 'Display deve estar no balcão, limpo e com produtos organizados', 5, true, true, true, 'display'),
  ('Faixa de gôndola está instalada corretamente?', 'Faixa deve estar na frente da gôndola, alinhada e visível', 6, true, false, true, 'signage'),
  ('Precificador está presente e com preço correto?', 'Verificar se o preço está atualizado e legível', 7, false, false, true, 'printed'),
  ('Adesivo de chão está aplicado e em bom estado?', 'Adesivo deve estar no chão, limpo e sem desgaste', 8, true, false, true, 'sticker'),
  ('Cartaz/Poster está aplicado na entrada?', 'Cartaz deve estar na porta de vidro ou janela da loja', 9, true, false, true, 'poster'),
  ('Adesivo de geladeira está aplicado corretamente?', 'Adesivo deve estar na porta da geladeira, visível', 10, true, false, true, 'sticker'),
  ('Banner promocional está posicionado corretamente?', 'Banner deve estar em local de destaque e visível', 11, true, false, true, 'banner'),
  ('Flyers estão disponíveis para os clientes?', 'Flyers devem estar organizados e acessíveis', 12, false, false, true, 'flyer')
) AS q(text, tip, sort_order, requires_photo, is_critical, requires_material, material_type);