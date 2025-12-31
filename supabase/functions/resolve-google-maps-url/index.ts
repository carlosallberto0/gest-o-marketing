import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Extract coordinates from Google Maps URL
 * IMPORTANTE: Prioriza !3d/!4d (ponto exato do lugar) sobre @lat,lng (viewport do mapa)
 */
function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null;

  // Decode URL to handle %2C and + as commas/spaces
  const decodedUrl = decodeURIComponent(url).replace(/\+/g, '');

  // PRIORITY 1: !3d...!4d... (ponto exato do lugar - mais preciso)
  const embedPattern = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
  const embedMatch = decodedUrl.match(embedPattern);
  if (embedMatch) {
    console.log('Found coords via !3d/!4d pattern (most precise)');
    return { lat: parseFloat(embedMatch[1]), lng: parseFloat(embedMatch[2]) };
  }

  // PRIORITY 2: !8m2!3d...!4d... (variante)
  const dataPattern = /!8m2!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
  const dataMatch = decodedUrl.match(dataPattern);
  if (dataMatch) {
    console.log('Found coords via !8m2!3d/!4d pattern');
    return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };
  }

  // PRIORITY 3: /maps/search/-16.455045,-49.054816 (expanded short URLs)
  const searchPattern = /\/maps\/search\/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/;
  const searchMatch = decodedUrl.match(searchPattern);
  if (searchMatch) {
    console.log('Found coords via /maps/search/ pattern');
    return { lat: parseFloat(searchMatch[1]), lng: parseFloat(searchMatch[2]) };
  }

  // PRIORITY 4: ?q=-23.5505,-46.6333 or &q=
  const qPattern = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const qMatch = decodedUrl.match(qPattern);
  if (qMatch) {
    console.log('Found coords via ?q= pattern');
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  }

  // PRIORITY 5: /place/-23.5505,-46.6333
  const placePattern = /\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const placeMatch = decodedUrl.match(placePattern);
  if (placeMatch) {
    console.log('Found coords via /place/ pattern');
    return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
  }

  // PRIORITY 6 (FALLBACK): /@-23.5505,-46.6333 (viewport - menos preciso)
  const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const atMatch = decodedUrl.match(atPattern);
  if (atMatch) {
    console.log('Found coords via @ pattern (viewport - less precise)');
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  return null;
}

// Validate that URL is from Google Maps
function isValidGoogleMapsUrl(url: string): boolean {
  const validDomains = [
    'maps.app.goo.gl',
    'goo.gl/maps',
    'google.com/maps',
    'www.google.com/maps',
    'maps.google.com',
  ];
  
  try {
    const parsedUrl = new URL(url);
    return validDomains.some(domain => 
      parsedUrl.hostname === domain || 
      parsedUrl.hostname.endsWith('.' + domain) ||
      url.includes(domain)
    );
  } catch {
    return validDomains.some(domain => url.includes(domain));
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resolving URL:', url);

    // Validate domain
    if (!isValidGoogleMapsUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid Google Maps URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, try to extract coords directly
    let coords = extractCoordsFromUrl(url);
    let expandedUrl = url;

    // If no coords found and it's a short URL, try to expand it
    if (!coords && (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps'))) {
      console.log('Short URL detected, following redirects...');
      
      try {
        // Follow redirects to get the final URL
        const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        
        expandedUrl = response.url;
        console.log('Expanded URL:', expandedUrl);
        
        // Try to extract coords from expanded URL
        coords = extractCoordsFromUrl(expandedUrl);
        console.log('Extracted coords from URL:', coords);
        
        // If still no coords, try to extract from HTML body (some redirects hide coords in meta/scripts)
        if (!coords) {
          try {
            const html = await response.text();
            console.log('Trying to extract coords from HTML body...');
            
            // Try to find coords in the HTML (often in meta tags or script data)
            coords = extractCoordsFromUrl(html);
            if (coords) {
              console.log('Found coords in HTML body:', coords);
            }
          } catch (htmlError) {
            console.error('Error reading HTML body:', htmlError);
          }
        }
      } catch (fetchError) {
        console.error('Error following redirect:', fetchError);
      }
    }

    return new Response(
      JSON.stringify({ 
        expandedUrl, 
        coords,
        success: coords !== null 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error resolving URL:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to resolve URL' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
