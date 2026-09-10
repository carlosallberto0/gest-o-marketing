import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export type AprovacaoItemStatus = "draft" | "pending" | "approved" | "rejected" | "revision_requested";

export interface AprovacaoItem {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string | null;
  arquivo_url: string | null;
  preview_url: string | null;
  status: AprovacaoItemStatus;
  submetido_por: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export type AprovacaoRevisorStatus = "pending" | "approved" | "rejected" | "revision_requested" | "expired";

export interface AprovacaoRevisor {
  id: string;
  item_id: string;
  usuario_id: string | null;
  email: string;
  nome: string;
  ordem: number;
  status: AprovacaoRevisorStatus;
  token: string;
  token_expira_em: string;
  notificado_em: string | null;
  respondido_em: string | null;
  created_at: string;
  updated_at: string;
}

export type AprovacaoDecisaoTipo = "approved" | "rejected" | "revision_requested";

export interface AprovacaoDecisao {
  id: string;
  item_id: string;
  revisor_id: string;
  decisao: AprovacaoDecisaoTipo;
  comentario: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const aprovacaoItensKeys = {
  all: ["aprovacao_itens"] as const,
  list: (status?: string) => ["aprovacao_itens", "list", status ?? null] as const,
  detail: (id: string) => ["aprovacao_itens", "detail", id] as const,
};

const aprovacaoRevisoresKeys = {
  list: (itemId: string) => ["aprovacao_revisores", "list", itemId] as const,
};

const aprovacaoDecisoesKeys = {
  list: (itemId: string) => ["aprovacao_decisoes", "list", itemId] as const,
};

// supabase-js não joga o corpo JSON `{error}` de uma resposta não-2xx da Edge
// Function em error.message — precisa ler o corpo manualmente a partir de
// FunctionsHttpError.context. Conferido o código-fonte das três functions do
// módulo (send-approval-request/get-approval-item/submit-approval-decision):
// todas respondem sempre com o status HTTP correto para erro, nunca 200 com
// `{error}` no corpo — não existe segundo caminho de erro de negócio a tratar.
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

// RLS decide o que volta (grant aprovacoes/itens/ler/rede_toda, sem
// isolamento por pdv_id — módulo de gestão executiva) — status é refinamento
// de tela.
export function useAprovacaoItens(status?: string) {
  return useQuery({
    queryKey: aprovacaoItensKeys.list(status),
    queryFn: async () => {
      let query = supabase.from("aprovacao_itens").select("*").order("created_at", { ascending: false });
      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) throw error;
      return data as AprovacaoItem[];
    },
  });
}

export function useAprovacaoItem(id: string) {
  return useQuery({
    queryKey: aprovacaoItensKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("aprovacao_itens").select("*").eq("id", id).single();
      if (error) throw error;
      return data as AprovacaoItem;
    },
    enabled: !!id,
  });
}

// token incluso na seleção de propósito: quem chama este hook é o usuário
// autenticado com grant de gestão (aprovacoes/itens/ler/rede_toda) — não é a
// página pública por token, essa passa pela Edge Function get-approval-item,
// nunca por este hook. Exibir (ou não) o token na tela é decisão da camada de
// UI; este hook só busca o dado que a RLS já libera.
export function useAprovacaoRevisores(itemId: string) {
  return useQuery({
    queryKey: aprovacaoRevisoresKeys.list(itemId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aprovacao_revisores")
        .select("*")
        .eq("item_id", itemId)
        .order("ordem");
      if (error) throw error;
      return data as AprovacaoRevisor[];
    },
    enabled: !!itemId,
  });
}

// aprovacao_decisoes é insert-only (trilha imutável) — histórico completo do item.
export function useAprovacaoDecisoes(itemId: string) {
  return useQuery({
    queryKey: aprovacaoDecisoesKeys.list(itemId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aprovacao_decisoes")
        .select("*")
        .eq("item_id", itemId)
        .order("created_at");
      if (error) throw error;
      return data as AprovacaoDecisao[];
    },
    enabled: !!itemId,
  });
}

// status/arquivo_url/preview_url nunca vão no payload — status usa o default
// 'draft' do banco, os dois campos de arquivo ficam fora do draft inicial (só
// preenchidos depois do upload, via useUpdateAprovacaoItemDraft). tipo fica
// fora do input (sem system_options seedado — mesma pendência já registrada
// na Fase 3 para materiais.tipo, não reintroduzir).
//
// submetido_por: DIFERENTE do que outras Fases documentaram para colunas
// equivalentes (solicitante_id/avaliador_id) — aqui não existe nenhum
// aprovacao_itens_before_insert que derive a coluna (conferido na migration
// 20260910120000: só há trigger BEFORE UPDATE em aprovacao_itens). A coluna é
// `not null` sem default, e a RLS de INSERT exige `submetido_por = auth.uid()`.
// Sem mandar o campo, o INSERT falha (NOT NULL). Resolvido aqui com o mesmo
// padrão já usado em useAvaliacoesPdv.ts/useAvaliacoesOutdoor.ts:
// supabase.auth.getUser() dentro do hook, nunca aceito como parâmetro do
// chamador (sem impersonação).
export function useCreateAprovacaoItemDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { titulo: string; descricao?: string }) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Usuário não autenticado.");

      const { data, error } = await supabase
        .from("aprovacao_itens")
        .insert({ ...input, submetido_por: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as AprovacaoItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aprovacaoItensKeys.all });
    },
  });
}

// status nunca vai no payload — a única forma de sair de draft é
// useEnviarParaAprovacao (Edge Function). A RLS de UPDATE já trava a escrita
// a submetido_por = auth.uid() e status = 'draft', então uma tentativa fora
// disso não afeta linha nenhuma (erro "not found" do .single()).
export function useUpdateAprovacaoItemDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      titulo?: string;
      descricao?: string;
      arquivo_url?: string;
      preview_url?: string;
      notas?: string;
    }) => {
      const { data, error } = await supabase.from("aprovacao_itens").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as AprovacaoItem;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: aprovacaoItensKeys.all });
      queryClient.invalidateQueries({ queryKey: aprovacaoItensKeys.detail(variables.id) });
    },
  });
}

interface EnviarParaAprovacaoRevisor {
  usuario_id?: string;
  email: string;
  nome: string;
  ordem?: number;
}

// draft->pending não é um UPDATE direto — é a Edge Function
// send-approval-request: cria os revisores (com token/expiração gerados pelo
// banco) e muda o status do item numa operação atômica, via service role.
export function useEnviarParaAprovacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { item_id: string; revisores: EnviarParaAprovacaoRevisor[] }) => {
      const { data, error } = await supabase.functions.invoke("send-approval-request", { body: input });
      if (error) throw await parseFunctionsError(error);
      return data as {
        revisores: { id: string; nome: string; email: string; token: string; caminho: string }[];
      };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: aprovacaoItensKeys.all });
      queryClient.invalidateQueries({ queryKey: aprovacaoItensKeys.detail(variables.item_id) });
      // Revisores são criados por esta function — lista de revisores do item
      // realmente depende dela, não é invalidação em excesso.
      queryClient.invalidateQueries({ queryKey: aprovacaoRevisoresKeys.list(variables.item_id) });
    },
  });
}
