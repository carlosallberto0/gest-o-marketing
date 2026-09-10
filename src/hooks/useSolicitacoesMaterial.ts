import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export type SolicitacaoMaterialStatus =
  | "pendente"
  | "aprovada"
  | "rejeitada"
  | "separada"
  | "entregue"
  | "cancelada";

export interface SolicitacaoMaterial {
  id: string;
  material_id: string;
  solicitante_id: string;
  pdv_id: string;
  quantidade: number;
  justificativa: string;
  status: SolicitacaoMaterialStatus;
  aprovado_por: string | null;
  aprovado_em: string | null;
  entregue_em: string | null;
  notas_admin: string | null;
  created_at: string;
  updated_at: string;
}

interface SolicitacoesMaterialFiltros {
  pdvId?: string;
  status?: string;
}

const solicitacoesMaterialKeys = {
  all: ["solicitacoes_material"] as const,
  list: (filtros?: SolicitacoesMaterialFiltros) => ["solicitacoes_material", "list", filtros ?? {}] as const,
  detail: (id: string) => ["solicitacoes_material", "detail", id] as const,
};

// RLS decide o que volta (rede_toda vs. proprio_pdv) — os filtros aqui são
// refinamento de tela, não segurança.
export function useSolicitacoesMaterial(filtros?: SolicitacoesMaterialFiltros) {
  return useQuery({
    queryKey: solicitacoesMaterialKeys.list(filtros),
    queryFn: async () => {
      let query = supabase.from("solicitacoes_material").select("*").order("created_at", { ascending: false });
      if (filtros?.pdvId) query = query.eq("pdv_id", filtros.pdvId);
      if (filtros?.status) query = query.eq("status", filtros.status);

      const { data, error } = await query;
      if (error) throw error;
      return data as SolicitacaoMaterial[];
    },
  });
}

export function useSolicitacaoMaterial(id: string) {
  return useQuery({
    queryKey: solicitacoesMaterialKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("solicitacoes_material").select("*").eq("id", id).single();
      if (error) throw error;
      return data as SolicitacaoMaterial;
    },
    enabled: !!id,
  });
}

// solicitante_id/status/aprovado_por/aprovado_em/entregue_em nunca vão no
// payload — o trigger seta solicitante_id via auth.uid() e força
// status='pendente'. O trigger também valida que pdv_id é tipo CONV
// (conveniência); o erro propaga literal para a tela tratar.
export function useCreateSolicitacaoMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      material_id: string;
      pdv_id: string;
      quantidade: number;
      justificativa: string;
    }) => {
      const { data, error } = await supabase.from("solicitacoes_material").insert(input).select().single();
      if (error) throw error;
      return data as SolicitacaoMaterial;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: solicitacoesMaterialKeys.all });
    },
  });
}

// Mutation genérica de transição — cobre aprovar/rejeitar/separar/entregar/
// cancelar, com notas_admin opcional junto. Quem pode fazer qual transição é
// decidido pelo trigger/RLS (solicitante só cancela a própria enquanto
// pendente; demais exigem merchandising/solicitacoes_material/editar/rede_toda);
// erros do trigger (transição inválida ou estoque insuficiente) chegam aqui
// como erro normal do mutation, não crash.
export function useTransicionarSolicitacaoMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      notas_admin,
      ...input
    }: {
      id: string;
      status: SolicitacaoMaterialStatus;
      notas_admin?: string;
    }) => {
      const { data, error } = await supabase
        .from("solicitacoes_material")
        .update({ ...input, ...(notas_admin !== undefined ? { notas_admin } : {}) })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as SolicitacaoMaterial;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: solicitacoesMaterialKeys.all });
      queryClient.invalidateQueries({ queryKey: solicitacoesMaterialKeys.detail(variables.id) });
    },
  });
}
