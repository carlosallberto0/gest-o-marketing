import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
//
// Bate com o corpo real devolvido por get-approval-item/index.ts:
// arquivo_url_assinada só entra na resposta quando aprovacao_itens.arquivo_url
// não é nulo (coluna nullable no schema) — por isso opcional aqui, não
// obrigatório. preview_url_assinada já era opcional (preview é opcional e,
// se a signed URL falhar, a function segue sem bloquear a resposta).
export interface AprovacaoPublica {
  titulo: string;
  descricao: string | null;
  tipo: string | null;
  arquivo_url_assinada?: string;
  preview_url_assinada?: string;
  revisor: { nome: string; email: string };
}

const aprovacaoPublicaKeys = {
  detail: (token: string) => ["aprovacao_publica", token] as const,
};

// Mesmo tratamento de erro de useAprovacoes.ts — supabase-js não joga o corpo
// JSON `{error}` de uma resposta não-2xx em error.message, precisa ler
// manualmente via FunctionsHttpError.context. get-approval-item e
// submit-approval-decision sempre respondem com o status HTTP correto para
// erro (conferido no código-fonte de ambas) — sem segundo caminho de erro de
// negócio a tratar aqui.
async function parseFunctionsError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return new Error(body.error as string);
    } catch {
      // corpo da resposta de erro não era JSON — cai no fallback abaixo
    }
  }
  return error instanceof Error ? error : new Error("Erro ao chamar função.");
}

// Página pública /aprovacao/:token — SEM sessão Supabase. O acesso inteiro é
// validado pela Edge Function contra aprovacao_revisores.token (ver ADR-011),
// nunca via RLS/auth.uid() — não existe policy nenhuma que libere isso pra
// `anon`.
export function useAprovacaoPorToken(token: string | undefined) {
  return useQuery({
    queryKey: aprovacaoPublicaKeys.detail(token ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-approval-item", { body: { token } });
      if (error) throw await parseFunctionsError(error);
      return data as AprovacaoPublica;
    },
    enabled: !!token,
  });
}

export function useResponderAprovacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      token: string;
      decisao: "approved" | "rejected" | "revision_requested";
      comentario?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("submit-approval-decision", { body: input });
      if (error) throw await parseFunctionsError(error);
      return data as { ok: true };
    },
    onSuccess: (_data, variables) => {
      // Página pública, sem cache de app compartilhado relevante — só a
      // própria query do token, pra UI refletir "já respondido" se o usuário
      // tentar de novo (a function passa a responder 409 pro mesmo token).
      queryClient.invalidateQueries({ queryKey: aprovacaoPublicaKeys.detail(variables.token) });
    },
  });
}
