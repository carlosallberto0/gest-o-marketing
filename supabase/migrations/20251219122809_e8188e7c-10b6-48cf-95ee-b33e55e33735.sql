-- Update PDV coordinates from KML data using name pattern matching
-- Rodotruck Prudente → Prudente
UPDATE public.pdvs SET lat = -22.1392804, lng = -51.5504499 WHERE LOWER(name) LIKE '%prudente%';

-- Rodotruck Castilho → Castilho
UPDATE public.pdvs SET lat = -20.8443541, lng = -51.4696719 WHERE LOWER(name) LIKE '%castilho%';

-- Posto São Roque Sabiá → Sabiá
UPDATE public.pdvs SET lat = -13.0729958, lng = -55.9317253 WHERE LOWER(name) LIKE '%sabiá%' OR LOWER(name) LIKE '%sabia%';

-- Posto Shell - Rede São Roque - SOF Norte → Posto Sof Norte
UPDATE public.pdvs SET lat = -15.7503124, lng = -47.9241706 WHERE LOWER(name) LIKE '%sof norte%';

-- Posto São Roque BR-080 → 080
UPDATE public.pdvs SET lat = -15.3886857, lng = -48.2048692 WHERE LOWER(name) LIKE '%080%';

-- Posto São Roque 29 → 29
UPDATE public.pdvs SET lat = -13.8131333, lng = -56.0745352 WHERE LOWER(name) = '29';

-- Posto São Roque Conquista → Conquista
UPDATE public.pdvs SET lat = -16.3531685, lng = -48.9148598 WHERE LOWER(name) LIKE '%conquista%';

-- Café Vereda → Vereda Verde
UPDATE public.pdvs SET lat = -17.160799, lng = -47.7231929 WHERE LOWER(name) LIKE '%vereda%';

-- Additional coordinates for common PDV names from KML
-- These can be matched if more PDVs are added later
-- Posto Rodotruck Raposão: -21.9027051, -51.8185052
-- Posto São Roque Rio Preto: -20.6562735, -49.3415878
-- Posto Cascavel: -18.6693608, -48.1694412
-- Posto Brasileirão: -18.6613147, -48.1612866
-- Posto Mineirão: -18.6810009, -48.1794282