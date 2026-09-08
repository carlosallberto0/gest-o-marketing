import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Outdoor } from "@/hooks/useOutdoors";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export interface AvaliacaoOutdoor {
  id: string;
  outdoor_id: string;
  avaliador_id: string;
  data_avaliacao: string;
  status_resultante: Outdoor["status_operacional"];
  motivo: string | null;
  fotos: string[];
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateAvaliacaoOutdoorInput {
  outdoor_id: string;
  status_resultante: Outdoor["status_operacional"];
  motivo?: string | null;
  fotos?: string[];
  observacoes?: string | null;
}

const avaliacoesKeys = {
  list: (outdoorId: string) => ["avaliacoes_outdoor", outdoorId] as const,
};

// "outdoors" replicado aqui (em vez de importar outdoorsKeys) porque essa
// chave já é pública o suficiente para as duas telas dependerem dela sem
// acoplar os dois arquivos de hook um ao outro.
const outdoorsAllKey = ["outdoors"] as const;
const outdoorDetailKey = (id: string) => ["outdoors", "detail", id] as const;

export function useAvaliacoesOutdoor(outdoorId: string) {
  return useQuery({
    queryKey: avaliacoesKeys.list(outdoorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes_outdoor")
        .select("*")
        .eq("outdoor_id", outdoorId)
        .order("data_avaliacao", { ascending: false });
      if (error) throw error;
      return data as AvaliacaoOutdoor[];
    },
    enabled: !!outdoorId,
  });
}

// avaliador_id nunca vem de parâmetro do chamador: a RLS exige
// avaliador_id = auth.uid() (sem impersonação), então o hook resolve o
// usuário logado internamente via supabase.auth.getUser() — nenhuma tela
// precisa (nem consegue) passar um id diferente por engano.
export function useCreateAvaliacaoOutdoor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAvaliacaoOutdoorInput) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("avaliacoes_outdoor")
        .insert({ ...input, avaliador_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as AvaliacaoOutdoor;
    },
    // O trigger sincronizar_outdoor_apos_avaliacao (banco) já propaga o
    // resultado para outdoors — aqui só invalida para a UI refletir o que o
    // banco já mudou, sem replicar a lógica de sincronização no frontend.
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: avaliacoesKeys.list(data.outdoor_id) });
      queryClient.invalidateQueries({ queryKey: outdoorDetailKey(data.outdoor_id) });
      queryClient.invalidateQueries({ queryKey: outdoorsAllKey });
    },
  });
}
