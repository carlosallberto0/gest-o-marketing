import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export interface PerguntaChecklist {
  id: string;
  categoria_id: string;
  texto: string;
  dica: string | null;
  ordem: number;
  exige_foto: boolean;
  exige_comentario: boolean;
  // Filtro de APRESENTAÇÃO (colaborador não vê pergunta crítica na tela
  // dele), nunca filtro de RLS — mesma pergunta é lida por todo mundo com
  // grant. Ver comentário da coluna na migration.
  is_critica: boolean;
  exige_material: boolean;
  tipo_material: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const perguntasChecklistKeys = {
  all: ["perguntas_checklist"] as const,
  list: (categoriaId?: string) => ["perguntas_checklist", "list", categoriaId ?? null] as const,
  detail: (id: string) => ["perguntas_checklist", "detail", id] as const,
};

// RLS decide o que volta — categoriaId aqui é refinamento de tela, não
// segurança. enabled sempre true: sem categoriaId, lista todas.
export function usePerguntasChecklist(categoriaId?: string) {
  return useQuery({
    queryKey: perguntasChecklistKeys.list(categoriaId),
    queryFn: async () => {
      let query = supabase.from("perguntas_checklist").select("*").order("ordem");
      if (categoriaId) query = query.eq("categoria_id", categoriaId);

      const { data, error } = await query;
      if (error) throw error;
      return data as PerguntaChecklist[];
    },
  });
}

export function useCreatePerguntaChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      categoria_id: string;
      texto: string;
      dica?: string | null;
      ordem?: number;
      exige_foto?: boolean;
      exige_comentario?: boolean;
      is_critica?: boolean;
      exige_material?: boolean;
      tipo_material?: string | null;
    }) => {
      const { data, error } = await supabase.from("perguntas_checklist").insert(input).select().single();
      if (error) throw error;
      return data as PerguntaChecklist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: perguntasChecklistKeys.all });
    },
  });
}

export function useUpdatePerguntaChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      categoria_id?: string;
      texto?: string;
      dica?: string | null;
      ordem?: number;
      exige_foto?: boolean;
      exige_comentario?: boolean;
      is_critica?: boolean;
      exige_material?: boolean;
      tipo_material?: string | null;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("perguntas_checklist")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as PerguntaChecklist;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: perguntasChecklistKeys.all });
      queryClient.invalidateQueries({ queryKey: perguntasChecklistKeys.detail(variables.id) });
    },
  });
}

// Soft delete — exclusão física exige super_admin e ação separada, não implementada aqui.
export function useDeactivatePerguntaChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("perguntas_checklist")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as PerguntaChecklist;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: perguntasChecklistKeys.all });
      queryClient.invalidateQueries({ queryKey: perguntasChecklistKeys.detail(id) });
    },
  });
}
