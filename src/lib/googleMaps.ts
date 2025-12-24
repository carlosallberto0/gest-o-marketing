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

/**
 * Extrai coordenadas de uma URL do Google Maps.
 * Formatos suportados:
 * - https://www.google.com/maps/@-23.5505,-46.6333,15z
 * - https://www.google.com/maps/place/.../@-23.5505,-46.6333,15z
 * - https://www.google.com/maps?q=-23.5505,-46.6333
 * - https://google.com/maps/place/...!3d-23.5505!4d-46.6333
 */
export function extractCoordsFromGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null;

  // Pattern: /@-23.5505,-46.6333,
  const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const atMatch = url.match(atPattern);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  // Pattern: ?q=-23.5505,-46.6333 or &q=
  const qPattern = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const qMatch = url.match(qPattern);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  }

  // Pattern: !3d-23.5505!4d-46.6333 (embedded maps)
  const embedPattern = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
  const embedMatch = url.match(embedPattern);
  if (embedMatch) {
    return { lat: parseFloat(embedMatch[1]), lng: parseFloat(embedMatch[2]) };
  }

  return null;
}
