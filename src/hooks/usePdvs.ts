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
  foto_url: string | null;
  created_at: string;
  updated_at: string;
}

const pdvsKeys = {
  all: ["pdvs"] as const,
  detail: (id: string) => ["pdvs", id] as const,
};

// RLS decide o que volta (rede_toda vs. próprio pdv) — sem filtro extra aqui.
// `options.enabled` (default true se omitido) repassa pro `useQuery` interno —
// existe pra chamador que só precisa disparar a query condicionalmente (ex.:
// useBuscaGlobal, que só busca PDVs com o CommandDialog aberto). Parâmetro
// opcional: chamadas existentes sem argumento continuam idênticas.
export function usePdvs(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: pdvsKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase.from("pdvs").select("*").order("nome");
      if (error) throw error;
      return data as Pdv[];
    },
    enabled: options?.enabled ?? true,
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

// codigo nunca vai no payload — o trigger before_insert_gerar_codigo (banco)
// gera "<tipo>-NNNN" quando NEW.codigo vem nulo (migration
// 20260908160000_system_options_codigo_sequencial_fotos.sql).
export function useCreatePdv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { nome: string; tipo: string; foto_url?: string | null }) => {
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
      nome?: string;
      tipo?: string;
      status?: "ativo" | "inativo";
      foto_url?: string | null;
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
