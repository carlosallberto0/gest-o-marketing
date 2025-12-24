import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract coordinates from Google Maps URL
function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
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

  // Pattern: !8m2!3d-23.5505!4d-46.6333
  const dataPattern = /!8m2!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
  const dataMatch = url.match(dataPattern);
  if (dataMatch) {
    return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };
  }

  // Pattern: /place/-23.5505,-46.6333
  const placePattern = /\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const placeMatch = url.match(placePattern);
  if (placeMatch) {
    return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        expandedUrl = response.url;
        console.log('Expanded URL:', expandedUrl);
        
        // Try to extract coords from expanded URL
        coords = extractCoordsFromUrl(expandedUrl);
        console.log('Extracted coords:', coords);
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