import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export interface Pdv {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  status: "ativo" | "inativo";
  created_at: string;
  updated_at: string;
}

const pdvsKeys = {
  all: ["pdvs"] as const,
  detail: (id: string) => ["pdvs", id] as const,
};

// RLS decide o que volta (rede_toda vs. próprio pdv) — sem filtro extra aqui.
export function usePdvs() {
  return useQuery({
    queryKey: pdvsKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase.from("pdvs").select("*").order("nome");
      if (error) throw error;
      return data as Pdv[];
    },
  });
}

export function usePdv(id: string) {
  return useQuery({
    queryKey: pdvsKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("pdvs").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Pdv;
    },
    enabled: !!id,
  });
}

export function useCreatePdv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { codigo: string; nome: string; tipo: string }) => {
      const { data, error } = await supabase.from("pdvs").insert(input).select().single();
      if (error) throw error;
      return data as Pdv;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pdvsKeys.all });
    },
  });
}

export function useUpdatePdv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      codigo?: string;
      nome?: string;
      tipo?: string;
      status?: "ativo" | "inativo";
    }) => {
      const { data, error } = await supabase.from("pdvs").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as Pdv;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: pdvsKeys.all });
      queryClient.invalidateQueries({ queryKey: pdvsKeys.detail(variables.id) });
    },
  });
}

// Soft delete — exclusão física exige super_admin e ação separada, não implementada aqui.
export function useDeactivatePdv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("pdvs")
        .update({ status: "inativo" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Pdv;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: pdvsKeys.all });
      queryClient.invalidateQueries({ queryKey: pdvsKeys.detail(id) });
    },
  });
}
