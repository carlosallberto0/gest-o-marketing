import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export type CampanhaStatus = "planejada" | "ativa" | "encerrada" | "cancelada";

export interface Campanha {
  id: string;
  codigo: string;
  nome: string;
  tipo: string | null;
  status: CampanhaStatus;
  data_inicio: string;
  data_fim: string;
  pdvs_alvo: string[];
  materiais_necessarios: unknown[];
  metas_kpi: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const campanhasKeys = {
  all: ["campanhas"] as const,
  list: (status?: string) => ["campanhas", "list", status ?? null] as const,
  detail: (id: string) => ["campanhas", "detail", id] as const,
};

// RLS de campanhas é rede_toda (sem proprio_pdv) — sem filtro de pdv aqui.
// `options.enabled` (default true se omitido) repassa pro `useQuery` interno —
// mesmo motivo de usePdvs: chamador que só precisa disparar a query
// condicionalmente (ex.: useBuscaGlobal). Parâmetro opcional adicional:
// chamadas existentes com só `status` (ou sem nenhum argumento) continuam
// idênticas.
export function useCampanhas(status?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: campanhasKeys.list(status),
    queryFn: async () => {
      let query = supabase.from("campanhas").select("*").order("data_inicio", { ascending: false });
      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) throw error;
      return data as Campanha[];
    },
    enabled: options?.enabled ?? true,
  });
}

export function useCampanha(id: string) {
  return useQuery({
    queryKey: campanhasKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("campanhas").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Campanha;
    },
    enabled: !!id,
  });
}

// codigo/status/materiais_necessarios/metas_kpi nunca vão no payload — codigo
// é gerado pelo trigger campanhas_gerar_codigo no INSERT, status usa o
// default 'planejada' do banco, e os dois jsonb estão fora de escopo nesta
// rodada.
export function useCreateCampanha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      nome: string;
      tipo?: string | null;
      data_inicio: string;
      data_fim: string;
      pdvs_alvo?: string[];
    }) => {
      const { data, error } = await supabase.from("campanhas").insert(input).select().single();
      if (error) throw error;
      return data as Campanha;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campanhasKeys.all });
    },
  });
}

export function useUpdateCampanha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      nome?: string;
      tipo?: string | null;
      data_inicio?: string;
      data_fim?: string;
      pdvs_alvo?: string[];
    }) => {
      const { data, error } = await supabase.from("campanhas").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as Campanha;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: campanhasKeys.all });
      queryClient.invalidateQueries({ queryKey: campanhasKeys.detail(variables.id) });
    },
  });
}

// Transição de status — trigger campanhas_before_update valida a máquina de
// estado (planejada→ativa|cancelada, ativa→encerrada|cancelada, demais
// terminais) e rejeita com mensagem própria; erro propaga sem mascarar.
export function useTransicionarStatusCampanha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CampanhaStatus }) => {
      const { data, error } = await supabase.from("campanhas").update({ status }).eq("id", id).select().single();
      if (error) throw error;
      return data as Campanha;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: campanhasKeys.all });
      queryClient.invalidateQueries({ queryKey: campanhasKeys.detail(variables.id) });
    },
  });
}
