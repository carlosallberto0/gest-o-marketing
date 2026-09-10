import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Signed URL de curta duração — só para exibir a peça na hora em que a tela
// pública é aberta, nunca um link permanente.
const SIGNED_URL_TTL_SECONDS = 300;

interface GetApprovalItemBody {
  token: string;
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
    // Página pública /aprovacao/:token — SEM sessão Supabase. O acesso inteiro
    // é validado manualmente contra aprovacao_revisores.token, nunca via RLS
    // (ver ADR-011). Por isso o client aqui é sempre service role.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let body: GetApprovalItemBody;
    try {
      body = await req.json();
    } catch {
      return jsonError('Corpo da requisição inválido.', 400);
    }

    const { token } = body;
    if (!token || typeof token !== 'string') {
      return jsonError('Token é obrigatório.', 400);
    }

    // Nunca select * — só os campos necessários para validar o link.
    const { data: revisor, error: revisorError } = await supabaseAdmin
      .from('aprovacao_revisores')
      .select('item_id, email, nome, status, token_expira_em')
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

    // Nunca select * — nunca inclui submetido_por/notas nem dados de outros
    // revisores do mesmo item.
    const { data: item, error: itemError } = await supabaseAdmin
      .from('aprovacao_itens')
      .select('titulo, descricao, tipo, arquivo_url, preview_url')
      .eq('id', revisor.item_id)
      .maybeSingle();

    if (itemError) {
      console.error('Erro ao buscar item do revisor:', itemError.message);
      return jsonError('Erro ao buscar item.', 500);
    }
    if (!item) {
      return jsonError('Item não encontrado.', 404);
    }

    const responseBody: Record<string, unknown> = {
      titulo: item.titulo,
      descricao: item.descricao,
      tipo: item.tipo,
      revisor: { nome: revisor.nome, email: revisor.email },
    };

    if (item.arquivo_url) {
      const { data: arquivoSigned, error: arquivoSignError } = await supabaseAdmin.storage
        .from('aprovacao-arquivos')
        .createSignedUrl(item.arquivo_url, SIGNED_URL_TTL_SECONDS);

      if (arquivoSignError || !arquivoSigned) {
        console.error('Erro ao gerar signed URL do arquivo:', arquivoSignError?.message);
        return jsonError('Erro ao carregar arquivo do item.', 500);
      }
      responseBody.arquivo_url_assinada = arquivoSigned.signedUrl;
    }

    if (item.preview_url) {
      const { data: previewSigned, error: previewSignError } = await supabaseAdmin.storage
        .from('aprovacao-arquivos')
        .createSignedUrl(item.preview_url, SIGNED_URL_TTL_SECONDS);

      if (previewSignError || !previewSigned) {
        console.error('Erro ao gerar signed URL do preview:', previewSignError?.message);
        // Preview é opcional — não bloqueia a exibição do item por conta dele.
      } else {
        responseBody.preview_url_assinada = previewSigned.signedUrl;
      }
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro em get-approval-item:', error instanceof Error ? error.message : error);
    return jsonError('Erro interno.', 500);
  }
});
