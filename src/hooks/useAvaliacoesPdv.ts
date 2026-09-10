import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export interface AvaliacaoPdv {
  id: string;
  pdv_id: string;
  avaliador_id: string;
  status: "rascunho" | "concluida";
  data_avaliacao: string;
  concluida_em: string | null;
  pontos_total: number | null;
  pontos_possiveis_total: number | null;
  percentual_total: number | null;
  // Gravado só pelo trigger na conclusão — nunca aceito de escrita do cliente.
  scores_categoria: {
    categoria_id: string;
    pontos: number;
    possiveis: number;
    percentual: number | null;
  }[];
  assinatura_url: string | null;
  created_at: string;
  updated_at: string;
}

const avaliacoesPdvKeys = {
  all: ["avaliacoes_pdv"] as const,
  list: (pdvId?: string) => ["avaliacoes_pdv", "list", pdvId ?? null] as const,
  detail: (id: string) => ["avaliacoes_pdv", "detail", id] as const,
};

// RLS decide o que volta — pdvId aqui é refinamento de tela, não segurança.
export function useAvaliacoesPdv(pdvId?: string) {
  return useQuery({
    queryKey: avaliacoesPdvKeys.list(pdvId),
    queryFn: async () => {
      let query = supabase.from("avaliacoes_pdv").select("*").order("data_avaliacao", { ascending: false });
      if (pdvId) query = query.eq("pdv_id", pdvId);

      const { data, error } = await query;
      if (error) throw error;
      return data as AvaliacaoPdv[];
    },
  });
}

export function useAvaliacaoPdv(id: string) {
  return useQuery({
    queryKey: avaliacoesPdvKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("avaliacoes_pdv").select("*").eq("id", id).single();
      if (error) throw error;
      return data as AvaliacaoPdv;
    },
    enabled: !!id,
  });
}

// avaliador_id nunca vem de parâmetro do chamador: a RLS exige
// avaliador_id = auth.uid() (sem impersonação), então o hook resolve o
// usuário logado internamente via supabase.auth.getUser() — nenhuma tela
// precisa (nem consegue) passar um id diferente por engano.
export function useCreateAvaliacaoPdv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { pdv_id: string }) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("avaliacoes_pdv")
        .insert({ ...input, avaliador_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as AvaliacaoPdv;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: avaliacoesPdvKeys.list() });
      queryClient.invalidateQueries({ queryKey: avaliacoesPdvKeys.list(data.pdv_id) });
    },
  });
}

// Única transição de UPDATE que o cliente faz: {status: 'concluida'}. O
// trigger do banco calcula pontos/percentuais/scores_categoria e rejeita
// qualquer outra transição — erro do trigger (ex.: resposta obrigatória
// faltando) propaga sem tratamento especial, a tela decide como exibir.
// Não existe mutation genérica de "editar avaliação" de propósito.
export function useConcluirAvaliacaoPdv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await supabase
        .from("avaliacoes_pdv")
        .update({ status: "concluida" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as AvaliacaoPdv;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: avaliacoesPdvKeys.list() });
      queryClient.invalidateQueries({ queryKey: avaliacoesPdvKeys.list(data.pdv_id) });
      queryClient.invalidateQueries({ queryKey: avaliacoesPdvKeys.detail(data.id) });
    },
  });
}
