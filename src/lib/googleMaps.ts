// Utilitários para links do Google Maps

/**
 * Converte um valor salvo em `outdoor.location` em uma URL abrível no Google Maps.
 * - Se já for URL (http/https), retorna como está.
 * - Se for URL sem protocolo (ex: maps.app.goo.gl/...), adiciona https://
 * - Caso contrário, cria uma busca no Google Maps usando o texto.
 */
export function toGoogleMapsUrl(input?: string | null): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;

  // Já é URL completa
  if (/^https?:\/\//i.test(raw)) return raw;

  // URL sem protocolo
  if (/^(maps\.app\.goo\.gl|www\.google\.com\/maps|google\.com\/maps)/i.test(raw)) {
    return `https://${raw}`;
  }

  // Fallback: tratar como consulta/endereço
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}`;
}
