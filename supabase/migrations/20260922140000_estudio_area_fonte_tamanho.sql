-- =============================================================================
-- Estúdio — fonte e tamanho de texto por área
-- =============================================================================
--
-- Decisão (2026-09-22, ver docs/superpowers/specs/2026-09-22-estudio-fonte-
-- tamanho-texto-design.md): o admin passa a poder escolher, por área de
-- texto, uma fonte (dentre 3 opções livres de licença) e um tamanho MÁXIMO
-- — o texto ainda encolhe sozinho se não couber (mesma lógica de
-- desenharTextoNaArea, só muda o ponto de partida do cálculo). null nas
-- duas colunas (padrão, inclusive em todas as áreas já existentes) preserva
-- o comportamento 100% automático que já existe hoje.
--
-- "Futura" foi o pedido original, mas é fonte comercial (Monotype/URW), não
-- disponível no Google Fonts — substituída por "Jost" (~90% de semelhança
-- visual, geométrica, gratuita), decisão explícita do usuário.
-- =============================================================================

alter table public.estudio_template_areas
  add column fonte text
    check (fonte is null or fonte in ('Montserrat', 'Baloo 2', 'Jost')),
  add column tamanho_fonte_px integer
    check (tamanho_fonte_px is null or tamanho_fonte_px > 0);

comment on column public.estudio_template_areas.fonte is
  'Fonte usada nesta área de texto (Montserrat/Baloo 2/Jost). null usa o fallback sans-serif genérico (comportamento anterior a esta feature). Só tem efeito em áreas de texto — áreas de imagem ignoram este campo.';

comment on column public.estudio_template_areas.tamanho_fonte_px is
  'Tamanho MÁXIMO de fonte, em pixels do template final — o texto ainda encolhe automaticamente (ver desenharTextoNaArea) se o conteúdo real não couber na área. null usa o cálculo automático já existente (altura da área × 0.6).';
