import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null;
  const decoded = decodeURIComponent(url).replace(/\+/g, '');

  const patterns = [
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    /!8m2!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    /\/maps\/search\/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/,
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
  ];

  for (const p of patterns) {
    const m = decoded.match(p);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  return null;
}

function isShortUrl(url: string): boolean {
  const t = url.trim().toLowerCase();
  return t.includes('maps.app.goo.gl') || t.includes('goo.gl/maps');
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch outdoors with location_url
    const { data: outdoors, error } = await supabase
      .from('outdoors')
      .select('id, code, lat, lng, location_url')
      .not('location_url', 'is', null)
      .neq('location_url', '');

    if (error) throw error;

    const results: { id: string; code: string; oldLat: number; oldLng: number; newLat: number; newLng: number; distance: number }[] = [];
    const errors: { id: string; code: string; reason: string }[] = [];
    let skipped = 0;

    for (const o of outdoors || []) {
      let url = o.location_url;
      let coords: { lat: number; lng: number } | null = null;

      // Try direct extraction first
      if (!isShortUrl(url)) {
        coords = extractCoordsFromUrl(url);
      } else {
        // Expand short URL
        try {
          const resp = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          const expanded = resp.url;
          coords = extractCoordsFromUrl(expanded);
          if (!coords) {
            try {
              const html = await resp.text();
              coords = extractCoordsFromUrl(html);
            } catch { /* ignore */ }
          }
        } catch (e) {
          errors.push({ id: o.id, code: o.code, reason: `Failed to expand short URL: ${e.message}` });
          continue;
        }
      }

      if (!coords) {
        errors.push({ id: o.id, code: o.code, reason: 'Could not extract coords from URL' });
        continue;
      }

      const oldLat = o.lat ?? 0;
      const oldLng = o.lng ?? 0;
      const dist = (oldLat && oldLng) ? haversineMeters(oldLat, oldLng, coords.lat, coords.lng) : Infinity;

      if (dist < 50) {
        skipped++;
        continue;
      }

      // Update
      const { error: updateErr } = await supabase
        .from('outdoors')
        .update({ lat: coords.lat, lng: coords.lng, updated_at: new Date().toISOString() })
        .eq('id', o.id);

      if (updateErr) {
        errors.push({ id: o.id, code: o.code, reason: `Update failed: ${updateErr.message}` });
      } else {
        results.push({ id: o.id, code: o.code, oldLat, oldLng, newLat: coords.lat, newLng: coords.lng, distance: Math.round(dist) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: outdoors?.length || 0,
        updated: results.length,
        skipped,
        errors: errors.length,
        details: { updated: results, errors },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Recalibration error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
