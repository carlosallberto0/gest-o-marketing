import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const token = Deno.env.get('MAPBOX_PUBLIC_TOKEN')
    
    if (!token) {
      console.error('[get-mapbox-token] MAPBOX_PUBLIC_TOKEN not configured')
      return new Response(
        JSON.stringify({ error: 'Mapbox token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate token format (public tokens start with 'pk.')
    if (!token.startsWith('pk.')) {
      console.error('[get-mapbox-token] Invalid token format - must start with pk.')
      return new Response(
        JSON.stringify({ error: 'Invalid Mapbox token format', details: 'Token must be a public token (pk.)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[get-mapbox-token] Token validated successfully')
    return new Response(
      JSON.stringify({ token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[get-mapbox-token] Error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
