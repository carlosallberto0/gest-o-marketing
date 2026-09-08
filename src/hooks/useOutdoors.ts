import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export interface Outdoor {
  id: string;
  pdv_id: string;
  codigo: string;
  localizacao: string;
  largura_m: number | null;
  altura_m: number | null;
  area_m2: number | null; // coluna gerada — nunca enviar em insert/update
  status_operacional: "operacional" | "nao_operacional" | "pendente_avaliacao";
  motivo_nao_operacional: string | null;
  foto_url: string | null;
  supplier_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// codigo nunca vai no payload — o trigger before_insert_gerar_codigo (banco)
// gera "OUT-NNNN" quando NEW.codigo vem nulo (migration
// 20260908160000_system_options_codigo_sequencial_fotos.sql).
interface CreateOutdoorInput {
  pdv_id: string;
  localizacao: string;
  largura_m?: number | null;
  altura_m?: number | null;
  status_operacional?: Outdoor["status_operacional"];
  motivo_nao_operacional?: string | null;
  foto_url?: string | null;
  supplier_id?: string | null;
}

interface UpdateOutdoorInput extends Partial<CreateOutdoorInput> {
  id: string;
  is_active?: boolean;
}

// "all" é prefixo de list(pdvId) e detail(id) — invalidar outdoorsKeys.all
// já derruba as duas por match de prefixo do React Query.
const outdoorsKeys = {
  all: ["outdoors"] as const,
  list: (pdvId?: string) => (pdvId ? (["outdoors", "pdv", pdvId] as const) : outdoorsKeys.all),
  detail: (id: string) => ["outdoors", "detail", id] as const,
};

// RLS decide rede_toda vs. proprio_pdv; o filtro por pdvId aqui é só para a
// tela que já sabe em qual posto está (ex.: lista de outdoors do próprio pdv).
export function useOutdoors(pdvId?: string) {
  return useQuery({
    queryKey: outdoorsKeys.list(pdvId),
    queryFn: async () => {
      let query = supabase.from("outdoors").select("*").order("codigo");
      if (pdvId) {
        query = query.eq("pdv_id", pdvId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Outdoor[];
    },
  });
}

export function useOutdoor(id: string) {
  return useQuery({
    queryKey: outdoorsKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("outdoors").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Outdoor;
    },
    enabled: !!id,
  });
}

export function useCreateOutdoor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOutdoorInput) => {
      const { data, error } = await supabase.from("outdoors").insert(input).select().single();
      if (error) throw error;
      return data as Outdoor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outdoorsKeys.all });
    },
  });
}

export function useUpdateOutdoor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateOutdoorInput) => {
      const { data, error } = await supabase.from("outdoors").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as Outdoor;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: outdoorsKeys.all });
      queryClient.invalidateQueries({ queryKey: outdoorsKeys.detail(variables.id) });
    },
  });
}
