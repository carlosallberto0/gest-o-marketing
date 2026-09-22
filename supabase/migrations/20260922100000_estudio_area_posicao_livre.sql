-- =============================================================================
-- Estúdio — posição livre híbrida por elemento (área de imagem)
-- =============================================================================
--
-- Decisão (2026-09-22, ver docs/superpowers/specs/2026-09-22-estudio-posicao-
-- livre-hibrida-design.md): o admin passa a poder marcar, por área, se o
-- colaborador pode ajustar a posição/escala do elemento já colocado ali
-- (em vez de ficar travado exatamente na área). Reaproveita
-- estudio_composicao_elementos.deslocamento_x_px/deslocamento_y_px/
-- fator_escala — colunas já existentes desde a Fase do Estúdio
-- (20260911140000_estudio_comunicacao.sql), já lidas por
-- desenharImagemNaArea() no export, nunca expostas em UI até agora.
-- =============================================================================

alter table public.estudio_template_areas
  add column posicao_livre boolean not null default false;

comment on column public.estudio_template_areas.posicao_livre is
  'Se true, o colaborador pode arrastar/redimensionar (escala uniforme) o elemento dentro desta área a partir da posição inicial, usando estudio_composicao_elementos.deslocamento_x_px/deslocamento_y_px/fator_escala. Só tem efeito em áreas de imagem — áreas de texto ignoram este campo (desenharTextoNaArea sempre centraliza, sem deslocamento/escala).';
