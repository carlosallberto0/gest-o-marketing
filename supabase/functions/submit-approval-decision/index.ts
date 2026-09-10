import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Decisao = 'approved' | 'rejected' | 'revision_requested';

interface SubmitDecisionBody {
  token: string;
  decisao: Decisao;
  comentario?: string;
}

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Página pública /aprovacao/:token — SEM sessão Supabase. Mesma base de
    // acesso por token de get-approval-item; checagens duplicadas de
    // propósito (cada Edge Function roda isolada, sem módulo compartilhado
    // nesta fase do projeto).
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let body: SubmitDecisionBody;
    try {
      body = await req.json();
    } catch {
      return jsonError('Corpo da requisição inválido.', 400);
    }

    const { token, decisao, comentario } = body;

    if (!token || typeof token !== 'string') {
      return jsonError('Token é obrigatório.', 400);
    }
    if (decisao !== 'approved' && decisao !== 'rejected' && decisao !== 'revision_requested') {
      return jsonError('Decisão inválida.', 400);
    }
    if (decisao !== 'approved' && !comentario?.trim()) {
      return jsonError('Comentário é obrigatório para essa decisão.', 400);
    }

    const { data: revisor, error: revisorError } = await supabaseAdmin
      .from('aprovacao_revisores')
      .select('id, status, token_expira_em')
      .eq('token', token)
      .maybeSingle();

    if (revisorError) {
      console.error('Erro ao buscar revisor por token', revisorError.code);
      return jsonError('Erro ao validar link.', 500);
    }
    if (!revisor) {
      return jsonError('Link inválido.', 404);
    }
    if (new Date(revisor.token_expira_em) <= new Date()) {
      return jsonError('Link expirado.', 401);
    }
    if (revisor.status !== 'pending') {
      return jsonError('Esta aprovação já foi respondida.', 409);
    }

    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'desconhecido';
    const userAgent = req.headers.get('user-agent') ?? null;

    // item_id é derivado por aprovacao_decisoes_before_insert a partir de
    // revisor_id — nunca enviado aqui. status/respondido_em do revisor e o
    // status agregado do item são atualizados por
    // aprovacao_decisoes_after_insert, não replicado nesta função.
    const { error: insertError } = await supabaseAdmin.from('aprovacao_decisoes').insert({
      revisor_id: revisor.id,
      decisao,
      comentario: comentario?.trim() || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (insertError) {
      // unique(revisor_id) estourando é uma corrida rara entre a checagem de
      // status acima e este INSERT — mesmo efeito de "já respondida", não é
      // erro interno.
      if (insertError.code === '23505') {
        return jsonError('Esta aprovação já foi respondida.', 409);
      }
      console.error('Erro ao registrar decisão:', insertError.message);
      return jsonError('Erro ao registrar decisão.', 500);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro em submit-approval-decision:', error instanceof Error ? error.message : error);
    return jsonError('Erro interno.', 500);
  }
});
