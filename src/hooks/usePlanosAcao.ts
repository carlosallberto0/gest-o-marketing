import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export type PlanoAcaoStatus = "pendente" | "em_andamento" | "concluido" | "cancelado";

export interface PlanoAcao {
  id: string;
  resposta_id: string;
  avaliacao_id: string;
  pdv_id: string;
  descricao: string;
  responsavel_id: string;
  prazo: string;
  status: PlanoAcaoStatus;
  notas: string | null;
  concluido_em: string | null;
  created_at: string;
  updated_at: string;
}

interface PlanosAcaoFiltros {
  pdvId?: string;
  status?: string;
}

const planosAcaoKeys = {
  all: ["planos_acao"] as const,
  list: (filtros?: PlanosAcaoFiltros) => ["planos_acao", "list", filtros ?? {}] as const,
  detail: (id: string) => ["planos_acao", "detail", id] as const,
};

// RLS decide o que volta — filtros aqui são refinamento de tela, não
// segurança. prazo asc: planos mais urgentes primeiro.
export function usePlanosAcao(filtros?: PlanosAcaoFiltros) {
  return useQuery({
    queryKey: planosAcaoKeys.list(filtros),
    queryFn: async () => {
      let query = supabase.from("planos_acao").select("*").order("prazo", { ascending: true });
      if (filtros?.pdvId) query = query.eq("pdv_id", filtros.pdvId);
      if (filtros?.status) query = query.eq("status", filtros.status);

      const { data, error } = await query;
      if (error) throw error;
      return data as PlanoAcao[];
    },
  });
}

export function usePlanoAcao(id: string) {
  return useQuery({
    queryKey: planosAcaoKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("planos_acao").select("*").eq("id", id).single();
      if (error) throw error;
      return data as PlanoAcao;
    },
    enabled: !!id,
  });
}

// avaliacao_id/pdv_id/status nunca vão no payload — o trigger
// planos_acao_before_insert deriva os dois primeiros a partir de resposta_id
// e força status = 'pendente'. responsavel_id não é resolvido por trigger
// (diferente de avaliador_id): resolvido aqui via auth.getUser() — quem cria
// o plano assume como responsável por padrão. Reatribuir para outra pessoa
// fica para quando existir seletor de usuário.
export function useCreatePlanoAcao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { resposta_id: string; descricao: string; prazo: string }) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Usuário não autenticado.");

      const { data, error } = await supabase
        .from("planos_acao")
        .insert({ ...input, responsavel_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as PlanoAcao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planosAcaoKeys.all });
    },
  });
}

// resposta_id/avaliacao_id/pdv_id são imutáveis após criação (trigger
// rejeita). Sem responsavel_id por ora — não há seletor de usuário nesta
// rodada.
export function useUpdatePlanoAcao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      descricao?: string;
      prazo?: string;
      notas?: string | null;
    }) => {
      const { data, error } = await supabase.from("planos_acao").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as PlanoAcao;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: planosAcaoKeys.all });
      queryClient.invalidateQueries({ queryKey: planosAcaoKeys.detail(variables.id) });
    },
  });
}

// Transição de status: pendente → em_andamento|cancelado, em_andamento →
// concluido|cancelado. O trigger valida e rejeita transição inválida com
// mensagem própria (e grava concluido_em) — erro propaga sem ser mascarado.
export function useTransicionarStatusPlanoAcao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PlanoAcaoStatus }) => {
      const { data, error } = await supabase.from("planos_acao").update({ status }).eq("id", id).select().single();
      if (error) throw error;
      return data as PlanoAcao;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: planosAcaoKeys.all });
      queryClient.invalidateQueries({ queryKey: planosAcaoKeys.detail(variables.id) });
    },
  });
}
