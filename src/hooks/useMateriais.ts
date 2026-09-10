import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export interface Material {
  id: string;
  codigo: string;
  nome: string;
  tipo: string | null;
  categoria: string | null;
  custo_unitario: number;
  estoque_atual: number;
  estoque_minimo: number;
  status: "ativo" | "inativo";
  imagem_url: string | null;
  created_at: string;
  updated_at: string;
}

const materiaisKeys = {
  all: ["materiais"] as const,
  detail: (id: string) => ["materiais", id] as const,
};

// RLS decide o que volta — sem filtro extra aqui, mesmo comentário de usePdvs.
export function useMateriais() {
  return useQuery({
    queryKey: materiaisKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase.from("materiais").select("*").order("nome");
      if (error) throw error;
      return data as Material[];
    },
  });
}

export function useMaterial(id: string) {
  return useQuery({
    queryKey: materiaisKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("materiais").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Material;
    },
    enabled: !!id,
  });
}

// codigo nunca vai no payload — o trigger materiais_gerar_codigo (banco) gera
// "MAT-NNNN" quando NEW.codigo vem nulo, mesmo padrão de pdvs/outdoors.
export function useCreateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      nome: string;
      tipo?: string | null;
      categoria?: string | null;
      custo_unitario?: number;
      estoque_minimo?: number;
      imagem_url?: string | null;
    }) => {
      const { data, error } = await supabase.from("materiais").insert(input).select().single();
      if (error) throw error;
      return data as Material;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materiaisKeys.all });
    },
  });
}

// Edição geral — nunca aceita estoque_atual (saldo, ação restrita, ver
// useAjustarEstoqueMaterial) nem codigo.
export function useUpdateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      nome?: string;
      tipo?: string | null;
      categoria?: string | null;
      custo_unitario?: number;
      estoque_minimo?: number;
      status?: "ativo" | "inativo";
      imagem_url?: string | null;
    }) => {
      const { data, error } = await supabase.from("materiais").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as Material;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: materiaisKeys.all });
      queryClient.invalidateQueries({ queryKey: materiaisKeys.detail(variables.id) });
    },
  });
}

// Ajuste de saldo — ação administrativa explícita, separada da edição geral
// (comentário da tabela: "incrementado/ajustado por UPDATE direto, ação
// restrita a super_admin/admin").
export function useAjustarEstoqueMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, estoque_atual }: { id: string; estoque_atual: number }) => {
      const { data, error } = await supabase
        .from("materiais")
        .update({ estoque_atual })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Material;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: materiaisKeys.all });
      queryClient.invalidateQueries({ queryKey: materiaisKeys.detail(variables.id) });
    },
  });
}

// Soft delete — exclusão física exige super_admin e ação separada, não implementada aqui.
export function useDeactivateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("materiais")
        .update({ status: "inativo" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Material;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: materiaisKeys.all });
      queryClient.invalidateQueries({ queryKey: materiaisKeys.detail(id) });
    },
  });
}
