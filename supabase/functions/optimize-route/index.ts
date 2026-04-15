import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Haversine distance in km
function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 0,
  pending: 1,
  preventive: 2,
};

interface OutdoorPoint {
  outdoor_id: string;
  lat: number;
  lng: number;
  priority: string;
}

interface OptimizedPoint {
  outdoor_id: string;
  sequence: number;
  scheduled_date: string;
  priority: string;
  distance_from_prev_km: number;
}

function optimizeRoute(
  origin: { lat: number; lng: number },
  points: OutdoorPoint[],
  approvalDate: string,
  productionDays: number,
  totalDays: number
): OptimizedPoint[] {
  if (points.length === 0) return [];

  // Sort by priority first, then use nearest-neighbor
  const sorted = [...points].sort(
    (a, b) =>
      (PRIORITY_WEIGHT[a.priority] ?? 1) - (PRIORITY_WEIGHT[b.priority] ?? 1)
  );

  // Group by priority
  const groups: Record<string, OutdoorPoint[]> = {};
  for (const p of sorted) {
    const key = p.priority || "pending";
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }

  // Nearest-neighbor within each priority group
  const ordered: OutdoorPoint[] = [];
  let currentLat = origin.lat;
  let currentLng = origin.lng;

  for (const priority of ["critical", "pending", "preventive"]) {
    const group = groups[priority] || [];
    const remaining = [...group];

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const dist = haversine(
          currentLat,
          currentLng,
          remaining[i].lat,
          remaining[i].lng
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      const nearest = remaining.splice(nearestIdx, 1)[0];
      ordered.push(nearest);
      currentLat = nearest.lat;
      currentLng = nearest.lng;
    }
  }

  // Distribute across days
  const startDate = new Date(approvalDate);
  startDate.setDate(startDate.getDate() + productionDays); // min execution date

  const maxPerDay = Math.max(1, Math.ceil(ordered.length / (totalDays - productionDays)));
  let prevLat = origin.lat;
  let prevLng = origin.lng;

  return ordered.map((point, idx) => {
    const dayOffset = Math.floor(idx / maxPerDay);
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset);

    const dist = haversine(prevLat, prevLng, point.lat, point.lng);
    prevLat = point.lat;
    prevLng = point.lng;

    return {
      outdoor_id: point.outdoor_id,
      sequence: idx + 1,
      scheduled_date: date.toISOString().split("T")[0],
      priority: point.priority,
      distance_from_prev_km: Math.round(dist * 100) / 100,
    };
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const {
      outdoor_ids,
      origin_lat = -15.4472,
      origin_lng = -47.3339,
      approval_date,
      production_days = 2,
      total_days = 15,
    } = body;

    if (!outdoor_ids || !Array.isArray(outdoor_ids) || outdoor_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "outdoor_ids is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch outdoor coordinates and status
    const { data: outdoors, error } = await supabase
      .from("outdoors")
      .select("id, lat, lng, status, non_operational_reason")
      .in("id", outdoor_ids);

    if (error) throw error;

    const points: OutdoorPoint[] = (outdoors || [])
      .filter((o: any) => o.lat && o.lng)
      .map((o: any) => ({
        outdoor_id: o.id,
        lat: Number(o.lat),
        lng: Number(o.lng),
        priority:
          o.status === "non_operational"
            ? "critical"
            : o.status === "pending_evaluation"
            ? "pending"
            : "preventive",
      }));

    const result = optimizeRoute(
      { lat: origin_lat, lng: origin_lng },
      points,
      approval_date || new Date().toISOString().split("T")[0],
      production_days,
      total_days
    );

    const totalDistance = result.reduce((sum, r) => sum + r.distance_from_prev_km, 0);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          points: result,
          total_distance_km: Math.round(totalDistance * 100) / 100,
          estimated_days: total_days,
          skipped: outdoor_ids.length - points.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("optimize-route error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
