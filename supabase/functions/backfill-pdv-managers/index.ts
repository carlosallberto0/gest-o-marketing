import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claims.claims.sub;
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role !== 'super_admin') {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Get all PDVs without manager
    const { data: pdvsWithoutManager } = await supabase
      .from('pdvs')
      .select('id')
      .is('manager_id', null);

    if (!pdvsWithoutManager || pdvsWithoutManager.length === 0) {
      return new Response(JSON.stringify({ success: true, updated: 0, message: 'Todos os PDVs já possuem gerente.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let updatedCount = 0;

    for (const pdv of pdvsWithoutManager) {
      // Strategy 1: Check if a manager profile has pdv_id pointing to this PDV
      const { data: managerByProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('pdv_id', pdv.id)
        .eq('role', 'manager')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (managerByProfile) {
        await supabase.from('pdvs').update({ manager_id: managerByProfile.id }).eq('id', pdv.id);
        updatedCount++;
        continue;
      }

      // Strategy 2: Find most frequent evaluator for this PDV in media_evaluations
      const { data: evaluations } = await supabase
        .from('media_evaluations')
        .select('evaluator_id')
        .eq('pdv_id', pdv.id);

      if (evaluations && evaluations.length > 0) {
        const freq: Record<string, number> = {};
        for (const ev of evaluations) {
          freq[ev.evaluator_id] = (freq[ev.evaluator_id] || 0) + 1;
        }
        const topEvaluator = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];

        const { data: evalProfile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', topEvaluator)
          .eq('role', 'manager')
          .eq('status', 'active')
          .single();

        if (evalProfile) {
          await supabase.from('pdvs').update({ manager_id: evalProfile.id }).eq('id', pdv.id);
          updatedCount++;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, updated: updatedCount, total: pdvsWithoutManager.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
