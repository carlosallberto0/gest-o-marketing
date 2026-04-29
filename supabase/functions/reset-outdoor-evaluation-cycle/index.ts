// Reset outdoor evaluation cycle for fully-evaluated PDVs and notify their managers.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller via JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerId = userData.user.id;

    // Service-role admin client
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Confirm caller is super_admin
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .single();
    if (profileError || profile?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: super_admin required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const outdoorDays = Number(body?.outdoor_days);
    if (!Number.isFinite(outdoorDays) || outdoorDays <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid outdoor_days' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all outdoors with pdv + manager info
    const { data: outdoors, error: outErr } = await admin
      .from('outdoors')
      .select('id, pdv_id, status, pdvs:pdv_id(id, manager_id, name)');
    if (outErr) throw outErr;

    // Group by PDV; identify fully evaluated PDVs (no pending_evaluation outdoors)
    const pdvMap = new Map<string, { managerId: string | null; name: string; total: number; pending: number; outdoorIds: string[] }>();
    for (const o of outdoors || []) {
      const pdvId = (o as any).pdv_id as string | null;
      if (!pdvId) continue;
      const pdv = (o as any).pdvs as { id: string; manager_id: string | null; name: string } | null;
      const entry = pdvMap.get(pdvId) ?? {
        managerId: pdv?.manager_id ?? null,
        name: pdv?.name ?? '',
        total: 0,
        pending: 0,
        outdoorIds: [],
      };
      entry.total += 1;
      if ((o as any).status === 'pending_evaluation') entry.pending += 1;
      entry.outdoorIds.push((o as any).id);
      pdvMap.set(pdvId, entry);
    }

    const pdvsToReset: string[] = [];
    const outdoorIdsToReset: string[] = [];
    const managerIds = new Set<string>();
    const pdvNamesByManager = new Map<string, string[]>();

    for (const [pdvId, info] of pdvMap.entries()) {
      if (info.total > 0 && info.pending === 0) {
        pdvsToReset.push(pdvId);
        outdoorIdsToReset.push(...info.outdoorIds);
        if (info.managerId) {
          managerIds.add(info.managerId);
          const arr = pdvNamesByManager.get(info.managerId) ?? [];
          arr.push(info.name);
          pdvNamesByManager.set(info.managerId, arr);
        }
      }
    }

    let outdoorsReset = 0;
    if (outdoorIdsToReset.length > 0) {
      const { error: updErr, count } = await admin
        .from('outdoors')
        .update({
          status: 'pending_evaluation',
          avaliacao_valida_ate: null,
          updated_at: new Date().toISOString(),
        }, { count: 'exact' })
        .in('id', outdoorIdsToReset);
      if (updErr) throw updErr;
      outdoorsReset = count ?? outdoorIdsToReset.length;
    }

    // Notify each impacted manager
    const notifications = Array.from(managerIds).map((managerId) => {
      const pdvNames = pdvNamesByManager.get(managerId) ?? [];
      const pdvLabel = pdvNames.length > 0 ? ` (${pdvNames.join(', ')})` : '';
      return {
        usuario_id: managerId,
        tipo: 'outdoor_cycle_reset',
        modulo: 'media',
        prioridade: 'alta',
        titulo: 'Novo prazo para avaliação dos outdoors',
        mensagem: `Foi definido um novo prazo de ${outdoorDays} dias. Avalie os outdoors do seu posto${pdvLabel}.`,
        url_acao: '/outdoors',
        tipo_referencia: 'evaluation_cycle',
      };
    });

    if (notifications.length > 0) {
      const { error: notifErr } = await admin.from('notificacoes_sistema').insert(notifications);
      if (notifErr) throw notifErr;
    }

    // Audit log
    await admin.from('audit_logs').insert({
      user_id: callerId,
      action: 'reset_outdoor_evaluation_cycle',
      entity_type: 'system_settings',
      new_data: {
        outdoor_days: outdoorDays,
        pdvs_reset: pdvsToReset.length,
        outdoors_reset: outdoorsReset,
        managers_notified: notifications.length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        pdvs_reset: pdvsToReset.length,
        outdoors_reset: outdoorsReset,
        managers_notified: notifications.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('reset-outdoor-evaluation-cycle error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
