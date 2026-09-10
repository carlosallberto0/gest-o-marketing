import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export interface RespostaChecklist {
  id: string;
  avaliacao_id: string;
  pergunta_id: string;
  valor: "sim" | "nao" | "na";
  comentario: string | null;
  foto_url: string | null;
  material_id: string | null;
  created_at: string;
  updated_at: string;
}

const respostasChecklistKeys = {
  list: (avaliacaoId: string) => ["respostas_checklist", avaliacaoId] as const,
};

export function useRespostasChecklist(avaliacaoId: string) {
  return useQuery({
    queryKey: respostasChecklistKeys.list(avaliacaoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("respostas_checklist")
        .select("*")
        .eq("avaliacao_id", avaliacaoId);
      if (error) throw error;
      return data as RespostaChecklist[];
    },
    enabled: !!avaliacaoId,
  });
}

// upsert por (avaliacao_id, pergunta_id): a tela salva resposta por
// pergunta, chamando de novo para corrigir valor/foto/comentário antes de
// concluir. RLS barra quando a avaliação pai não está mais 'rascunho' ou o
// ator não é o avaliador — erro propaga sem checagem duplicada em JS.
export function useSalvarRespostaChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      avaliacao_id: string;
      pergunta_id: string;
      valor: "sim" | "nao" | "na";
      comentario?: string | null;
      foto_url?: string | null;
      material_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("respostas_checklist")
        .upsert(input, { onConflict: "avaliacao_id,pergunta_id" })
        .select()
        .single();
      if (error) throw error;
      return data as RespostaChecklist;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: respostasChecklistKeys.list(data.avaliacao_id) });
    },
  });
}
