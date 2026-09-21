// Matemática compartilhada de posicionamento em percentual, usada tanto pelo
// editor de áreas do admin (EstudioTemplates.tsx) quanto pelo editor de
// composição do colaborador (EstudioColaborador.tsx) — um retângulo em
// percentual (0-100) relativo ao container da imagem do template.
export interface RetanguloPercentual {
  xPercent: number;
  yPercent: number;
  larguraPercent: number;
  alturaPercent: number;
}

// Abaixo disso a área fica pequena demais pra ser útil/tocável.
export const TAMANHO_MINIMO_PERCENT = 2;

export function pontoParaPercentual(
  clientX: number,
  clientY: number,
  container: DOMRect,
): { xPercent: number; yPercent: number } {
  const xPercent = ((clientX - container.left) / container.width) * 100;
  const yPercent = ((clientY - container.top) / container.height) * 100;
  return { xPercent, yPercent };
}

// Garante 0 <= x, y e x+largura, y+altura <= 100, e largura/altura >= TAMANHO_MINIMO_PERCENT.
export function clampRetangulo(retangulo: RetanguloPercentual): RetanguloPercentual {
  const larguraPercent = Math.min(Math.max(retangulo.larguraPercent, TAMANHO_MINIMO_PERCENT), 100);
  const alturaPercent = Math.min(Math.max(retangulo.alturaPercent, TAMANHO_MINIMO_PERCENT), 100);
  const xPercent = Math.min(Math.max(retangulo.xPercent, 0), 100 - larguraPercent);
  const yPercent = Math.min(Math.max(retangulo.yPercent, 0), 100 - alturaPercent);
  return { xPercent, yPercent, larguraPercent, alturaPercent };
}

export function pontoDentroDoRetangulo(xPercent: number, yPercent: number, retangulo: RetanguloPercentual): boolean {
  return (
    xPercent >= retangulo.xPercent &&
    xPercent <= retangulo.xPercent + retangulo.larguraPercent &&
    yPercent >= retangulo.yPercent &&
    yPercent <= retangulo.yPercent + retangulo.alturaPercent
  );
}
