import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RevisorInput {
  usuario_id?: string;
  email: string;
  nome: string;
  ordem?: number;
}

interface SendApprovalRequestBody {
  item_id: string;
  revisores: RevisorInput[];
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Primeira linha: validar o papel do chamador. Nenhuma operação de dado
    // acontece antes disso.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonError('Sessão ausente.', 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const jwt = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return jsonError('Sessão inválida.', 401);
    }
    const user = userData.user;

    // has_permission() avalia auth.uid() a partir do JWT da requisição — por
    // isso a checagem de permissão usa um client separado, autenticado com o
    // próprio JWT do chamador (via anon key + header Authorization), em vez
    // do client de service role (que não tem auth.uid()). É a alternativa mais
    // simples descrita na tarefa: um client por responsabilidade, sem simular
    // claims manualmente.
    const authedClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: allowed, error: permError } = await authedClient.rpc('has_permission', {
      p_modulo: 'aprovacoes',
      p_recurso: 'itens',
      p_acao: 'criar',
      p_escopo: 'rede_toda',
    });

    if (permError) {
      console.error('Erro ao checar permissão:', permError.message);
      return jsonError('Erro ao validar permissão.', 500);
    }
    if (!allowed) {
      return jsonError('Você não tem permissão para enviar itens para aprovação.', 403);
    }

    let body: SendApprovalRequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonError('Corpo da requisição inválido.', 400);
    }

    const { item_id, revisores } = body;

    if (!item_id || typeof item_id !== 'string') {
      return jsonError('item_id é obrigatório.', 400);
    }
    if (!Array.isArray(revisores) || revisores.length === 0) {
      return jsonError('Informe ao menos um revisor.', 400);
    }
    for (const revisor of revisores) {
      if (!revisor?.email?.trim() || !revisor?.nome?.trim()) {
        return jsonError('Cada revisor precisa de email e nome.', 400);
      }
    }

    const { data: item, error: itemError } = await supabaseAdmin
      .from('aprovacao_itens')
      .select('id, submetido_por, status')
      .eq('id', item_id)
      .maybeSingle();

    if (itemError) {
      console.error('Erro ao buscar item:', itemError.message);
      return jsonError('Erro ao buscar item.', 500);
    }
    if (!item) {
      return jsonError('Item não encontrado.', 404);
    }
    if (item.submetido_por !== user.id) {
      return jsonError('Você não é o autor deste item.', 403);
    }
    if (item.status !== 'draft') {
      return jsonError('Este item já foi enviado para aprovação.', 400);
    }

    // token e token_expira_em nunca são enviados — o banco gera os dois
    // (default gen_random_uuid() e o trigger aprovacao_revisores_before_insert).
    const rowsToInsert = revisores.map((r) => ({
      item_id,
      usuario_id: r.usuario_id ?? null,
      email: r.email.trim(),
      nome: r.nome.trim(),
      ordem: r.ordem ?? 0,
    }));

    const { data: inseridos, error: insertError } = await supabaseAdmin
      .from('aprovacao_revisores')
      .insert(rowsToInsert)
      .select('id, nome, email, token');

    if (insertError || !inseridos) {
      console.error('Erro ao inserir revisores:', insertError?.message);
      return jsonError('Erro ao registrar revisores.', 500);
    }

    // Dispara aprovacao_itens_before_update (valida draft->pending e grava
    // audit_logs) — não replicado aqui.
    const { error: updateError } = await supabaseAdmin
      .from('aprovacao_itens')
      .update({ status: 'pending' })
      .eq('id', item_id);

    if (updateError) {
      console.error('Erro ao atualizar status do item:', updateError.message);

      // Compensação: sem transação entre o INSERT de revisores e este UPDATE,
      // um UPDATE que falha depois do INSERT ter tido sucesso deixaria
      // revisor com token válido apontando pra item ainda em draft. Desfaz o
      // INSERT para restaurar o estado limpo antes de responder ao chamador.
      const { error: rollbackError } = await supabaseAdmin
        .from('aprovacao_revisores')
        .delete()
        .in('id', inseridos.map((r) => r.id));

      if (rollbackError) {
        console.error('Erro ao desfazer inserção de revisores', rollbackError.code);
      }

      return jsonError('Erro ao enviar item para aprovação. Tente novamente.', 500);
    }

    return new Response(
      JSON.stringify({
        revisores: inseridos.map((r) => ({
          id: r.id,
          nome: r.nome,
          email: r.email,
          token: r.token,
          caminho: `/aprovacao/${r.token}`,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro em send-approval-request:', error instanceof Error ? error.message : error);
    return jsonError('Erro interno.', 500);
  }
});
