import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export interface Fornecedor {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const fornecedoresKeys = {
  all: ["fornecedores"] as const,
  detail: (id: string) => ["fornecedores", id] as const,
};

// RLS exige midia_externa/fornecedores/ler/rede_toda — sem filtro extra aqui,
// só a regra de negócio (não listar inativo).
export function useFornecedores() {
  return useQuery({
    queryKey: fornecedoresKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("is_active", true)
        .order("nome");
      if (error) throw error;
      return data as Fornecedor[];
    },
  });
}

export function useCreateFornecedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { nome: string; telefone?: string; email?: string }) => {
      const { data, error } = await supabase.from("fornecedores").insert(input).select().single();
      if (error) throw error;
      return data as Fornecedor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fornecedoresKeys.all });
    },
  });
}

export function useUpdateFornecedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      nome?: string;
      telefone?: string;
      email?: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase.from("fornecedores").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as Fornecedor;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: fornecedoresKeys.all });
      queryClient.invalidateQueries({ queryKey: fornecedoresKeys.detail(variables.id) });
    },
  });
}
