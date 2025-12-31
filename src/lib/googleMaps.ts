// Utilitários para links do Google Maps

/**
 * Cria uma URL do Google Maps a partir de coordenadas lat/lng
 */
export function coordsToGoogleMapsUrl(lat?: number | null, lng?: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

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
 * IMPORTANTE: Prioriza !3d/!4d (ponto exato do lugar) sobre @lat,lng (viewport do mapa)
 * 
 * Formatos suportados (em ordem de prioridade):
 * 1. !3d-23.5505!4d-46.6333 (ponto do lugar - mais preciso)
 * 2. !8m2!3d-23.5505!4d-46.6333 (variante do ponto do lugar)
 * 3. /maps/search/-23.5505,-46.6333 (URLs expandidas de links curtos)
 * 4. ?q=-23.5505,-46.6333 (query parameter)
 * 5. /place/-23.5505,-46.6333 (place URL)
 * 6. @-23.5505,-46.6333 (viewport - menos preciso, usado como fallback)
 */
export function extractCoordsFromGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null;
  
  // Decode URL to handle %2C and + as commas/spaces
  const decodedUrl = decodeURIComponent(url.trim()).replace(/\+/g, '');

  // PRIORITY 1: !3d...!4d... (ponto exato do lugar - mais preciso)
  // Pattern: !3d-23.5505!4d-46.6333 (embedded maps)
  const embedPattern = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
  const embedMatch = decodedUrl.match(embedPattern);
  if (embedMatch) {
    return { lat: parseFloat(embedMatch[1]), lng: parseFloat(embedMatch[2]) };
  }

  // PRIORITY 2: !8m2!3d...!4d... (variante)
  const dataPattern = /!8m2!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
  const dataMatch = decodedUrl.match(dataPattern);
  if (dataMatch) {
    return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };
  }

  // PRIORITY 3: /maps/search/-16.455045,-49.054816 (expanded short URLs)
  const searchPattern = /\/maps\/search\/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/;
  const searchMatch = decodedUrl.match(searchPattern);
  if (searchMatch) {
    return { lat: parseFloat(searchMatch[1]), lng: parseFloat(searchMatch[2]) };
  }

  // PRIORITY 4: ?q=-23.5505,-46.6333 or &q=
  const qPattern = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const qMatch = decodedUrl.match(qPattern);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  }

  // PRIORITY 5: /place/-23.5505,-46.6333
  const placePattern = /\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const placeMatch = decodedUrl.match(placePattern);
  if (placeMatch) {
    return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
  }

  // PRIORITY 6 (FALLBACK): /@-23.5505,-46.6333 (viewport - menos preciso)
  const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const atMatch = decodedUrl.match(atPattern);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  return null;
}

/**
 * Checks if a URL is a short Google Maps URL that needs server-side resolution
 */
export function isShortGoogleMapsUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.includes('maps.app.goo.gl') || trimmed.includes('goo.gl/maps');
}
