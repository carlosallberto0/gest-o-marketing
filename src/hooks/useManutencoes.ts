import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export type ManutencaoStatus =
  | "solicitada"
  | "em_espera"
  | "aprovada"
  | "rejeitada"
  | "atribuida"
  | "em_execucao"
  | "concluida_fornecedor"
  | "correcao_solicitada"
  | "validada"
  | "cancelada";

export type ManutencaoUrgencia = "baixa" | "normal" | "alta" | "emergencial";

export type ManutencaoTipo = "preventiva" | "corretiva";

export interface Manutencao {
  id: string;
  outdoor_id: string;
  pdv_id: string;
  avaliacao_origem_id: string | null;
  fornecedor_id: string | null;
  solicitante_id: string;
  urgencia: ManutencaoUrgencia;
  tipo: ManutencaoTipo;
  status: ManutencaoStatus;
  descricao: string | null;
  justificativa: string | null;
  data_reavaliacao: string | null;
  prazo_atendimento: string | null;
  created_at: string;
  updated_at: string;
}

interface ManutencoesFiltros {
  pdvId?: string;
  fornecedorId?: string;
  status?: string;
}

const manutencoesKeys = {
  all: ["manutencoes"] as const,
  list: (filtros?: ManutencoesFiltros) => ["manutencoes", "list", filtros ?? {}] as const,
  detail: (id: string) => ["manutencoes", "detail", id] as const,
};

// RLS decide o que volta (rede_toda vs. proprio_pdv vs. proprio_fornecedor) —
// os filtros aqui são refinamento de tela, não segurança.
export function useManutencoes(filtros?: ManutencoesFiltros) {
  return useQuery({
    queryKey: manutencoesKeys.list(filtros),
    queryFn: async () => {
      let query = supabase.from("manutencoes").select("*").order("created_at", { ascending: false });
      if (filtros?.pdvId) query = query.eq("pdv_id", filtros.pdvId);
      if (filtros?.fornecedorId) query = query.eq("fornecedor_id", filtros.fornecedorId);
      if (filtros?.status) query = query.eq("status", filtros.status);

      const { data, error } = await query;
      if (error) throw error;
      return data as Manutencao[];
    },
  });
}

export function useManutencao(id: string) {
  return useQuery({
    queryKey: manutencoesKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("manutencoes").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Manutencao;
    },
    enabled: !!id,
  });
}

// solicitante_id/status/pdv_id/prazo_atendimento nunca vão no payload — o
// trigger before_insert_derivar_campos (seção 8b da migration) resolve os
// três primeiros via auth.uid()/default/lookup de outdoor, e calcula o SLA.
export function useCreateManutencao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      outdoor_id: string;
      urgencia: ManutencaoUrgencia;
      tipo: ManutencaoTipo;
      descricao?: string;
    }) => {
      const { data, error } = await supabase.from("manutencoes").insert(input).select().single();
      if (error) throw error;
      return data as Manutencao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: manutencoesKeys.all });
    },
  });
}

// Mutation genérica de transição — cobre aprovar/rejeitar/atribuir/executar/
// validar/cancelar. Quem pode fazer qual transição é decidido pelo trigger
// before_update_validar_transicao (seção 8c); erros de RLS/trigger (42501 ou
// exceção "transição de X para Y não é permitida") chegam aqui como erro
// normal do mutation, não crash.
export function useTransicionarManutencao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      status: ManutencaoStatus;
      justificativa?: string;
      data_reavaliacao?: string;
      fornecedor_id?: string;
    }) => {
      const { data, error } = await supabase.from("manutencoes").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as Manutencao;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: manutencoesKeys.all });
      queryClient.invalidateQueries({ queryKey: manutencoesKeys.detail(variables.id) });
    },
  });
}
