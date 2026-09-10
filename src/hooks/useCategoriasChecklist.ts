import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export interface CategoriaChecklist {
  id: string;
  nome: string;
  icone: string | null;
  ordem: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const categoriasChecklistKeys = {
  all: ["categorias_checklist"] as const,
  detail: (id: string) => ["categorias_checklist", id] as const,
};

// RLS decide o que volta — sem filtro extra aqui, mesmo comentário de usePdvs.
export function useCategoriasChecklist() {
  return useQuery({
    queryKey: categoriasChecklistKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_checklist")
        .select("*")
        .order("ordem")
        .order("nome");
      if (error) throw error;
      return data as CategoriaChecklist[];
    },
  });
}

export function useCreateCategoriaChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { nome: string; icone?: string | null; ordem?: number }) => {
      const { data, error } = await supabase.from("categorias_checklist").insert(input).select().single();
      if (error) throw error;
      return data as CategoriaChecklist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriasChecklistKeys.all });
    },
  });
}

export function useUpdateCategoriaChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      nome?: string;
      icone?: string | null;
      ordem?: number;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("categorias_checklist")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CategoriaChecklist;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: categoriasChecklistKeys.all });
      queryClient.invalidateQueries({ queryKey: categoriasChecklistKeys.detail(variables.id) });
    },
  });
}

// Soft delete — exclusão física exige super_admin e ação separada, não implementada aqui.
export function useDeactivateCategoriaChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("categorias_checklist")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CategoriaChecklist;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: categoriasChecklistKeys.all });
      queryClient.invalidateQueries({ queryKey: categoriasChecklistKeys.detail(id) });
    },
  });
}
