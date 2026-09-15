import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.

export interface AnalisePesoTipo {
  id: string;
  tipo_pdv: string;
  peso_midia: number;
  peso_merchandising: number;
  created_at: string;
  updated_at: string;
}

export interface AnaliseClusterConfig {
  id: string;
  nome: string;
  tipo_pdv: string;
  cor_hex: string;
  faixa_min: number;
  faixa_max: number;
  ordem: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Snapshot só-leitura — sem GRANT de insert/update/delete pra nenhum papel,
// só a função analise_recalcular() (SECURITY DEFINER) escreve. `cluster`/`pdv`
// nullable: cluster_id pode ser null (nenhum cluster ativo cadastrado pro
// tipo) e o embed em si pode vir null se a config foi apagada ou o pdv não
// existir mais.
export interface AnaliseClusterCalculo {
  id: string;
  pdv_id: string;
  tipo_pdv: string;
  cluster_id: string | null;
  score_midia: number;
  score_merch: number | null;
  pontuacao_total: number;
  gap_midia_merch: number;
  potencial_aproveitamento: number;
  data_calculo: string;
  created_at: string;
  updated_at: string;
  cluster: { nome: string; cor_hex: string; faixa_min: number; faixa_max: number } | null;
  pdv: { codigo: string; nome: string } | null;
}

export type AnaliseInsightTipo = "alerta" | "oportunidade" | "tendencia";

export interface AnaliseInsight {
  id: string;
  titulo: string;
  descricao: string;
  tipo: AnaliseInsightTipo;
  tipo_pdv: string | null;
  dados: Record<string, unknown>;
  lido: boolean;
  created_at: string;
  updated_at: string;
}

interface AnaliseClustersConfigFiltros {
  tipoPdv?: string;
}

interface AnaliseClustersCalculoFiltros {
  tipoPdv?: string;
}

interface AnaliseInsightsFiltros {
  tipo?: string;
  lido?: boolean;
}

const analisePesosTipoKeys = {
  all: ["analise_pesos_tipo"] as const,
};

const analiseClustersConfigKeys = {
  all: ["analise_clusters_config"] as const,
  list: (filtros?: AnaliseClustersConfigFiltros) => ["analise_clusters_config", "list", filtros ?? {}] as const,
};

const analiseClustersCalculoKeys = {
  all: ["analise_clusters_calculo"] as const,
  list: (filtros?: AnaliseClustersCalculoFiltros) => ["analise_clusters_calculo", "list", filtros ?? {}] as const,
};

const analiseInsightsKeys = {
  all: ["analise_insights"] as const,
  list: (filtros?: AnaliseInsightsFiltros) => ["analise_insights", "list", filtros ?? {}] as const,
};

// ---------------------------------------------------------------------------
// analise_pesos_tipo — uma linha por tipo_pdv. Sem hook/tela de "critério" —
// isso é escopo de fase posterior (só peso, não critério, ver migration).
// ---------------------------------------------------------------------------

// RLS decide quem vê ('ler' ou 'editar', ver migration) — sem filtro aqui.
export function useAnalisePesosTipo() {
  return useQuery({
    queryKey: analisePesosTipoKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase.from("analise_pesos_tipo").select("*");
      if (error) throw error;
      return data as AnalisePesoTipo[];
    },
  });
}

export function useUpdateAnalisePesoTipo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      peso_midia?: number;
      peso_merchandising?: number;
    }) => {
      const { data, error } = await supabase.from("analise_pesos_tipo").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as AnalisePesoTipo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analisePesosTipoKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// analise_clusters_config — sem coluna de peso/critério de propósito (ver
// migration). Constraint EXCLUDE de sobreposição de faixa é do banco; erro
// propaga sem checagem duplicada em JS.
// ---------------------------------------------------------------------------

export function useAnaliseClustersConfig(filtros?: AnaliseClustersConfigFiltros) {
  return useQuery({
    queryKey: analiseClustersConfigKeys.list(filtros),
    queryFn: async () => {
      let query = supabase
        .from("analise_clusters_config")
        .select("*")
        .order("tipo_pdv")
        .order("faixa_min");
      if (filtros?.tipoPdv) query = query.eq("tipo_pdv", filtros.tipoPdv);

      const { data, error } = await query;
      if (error) throw error;
      return data as AnaliseClusterConfig[];
    },
  });
}

export function useCreateAnaliseClusterConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      nome: string;
      tipo_pdv: string;
      cor_hex: string;
      faixa_min: number;
      faixa_max: number;
      ordem?: number;
    }) => {
      const { data, error } = await supabase.from("analise_clusters_config").insert(input).select().single();
      if (error) throw error;
      return data as AnaliseClusterConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analiseClustersConfigKeys.all });
    },
  });
}

// Sem `tipo_pdv` no payload de update, por decisão própria (não há precedente
// exato de campo travado por trigger/policy neste caso — a migration não
// impede via banco). tipo_pdv é o campo que a constraint EXCLUDE usa pra
// isolar sobreposição de faixa por tipo; deixar mudar aqui, numa tela de
// edição de faixa/cor, misturaria "corrigir uma config" com "reclassificar
// o cluster pra outro tipo", que é uma operação estrutural diferente e não
// foi pedida.
export function useUpdateAnaliseClusterConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      nome?: string;
      cor_hex?: string;
      faixa_min?: number;
      faixa_max?: number;
      ordem?: number;
    }) => {
      const { data, error } = await supabase
        .from("analise_clusters_config")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as AnaliseClusterConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analiseClustersConfigKeys.all });
    },
  });
}

// Soft delete — a constraint EXCLUDE só compara clusters ATIVOS (where
// is_active), então desativar nunca conflita com outra faixa.
export function useDesativarAnaliseClusterConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("analise_clusters_config")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as AnaliseClusterConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analiseClustersConfigKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// analise_clusters_calculo — snapshot só-leitura (sem hook de mutação: sem
// GRANT de insert/update/delete pra nenhum papel, ver migration). pdv_id tem
// uma única FK pra pdvs e cluster_id uma única FK pra analise_clusters_config
// — embed direto pelo nome da tabela, sem precisar do nome da constraint.
// Sem hook separado de "última data de cálculo": quem precisar deriva de
// `data_calculo` da primeira linha da lista abaixo (já vem ordenado por
// pontuacao_total desc, mas todas as linhas de um mesmo recálculo compartilham
// o mesmo data_calculo — pegar de qualquer uma serve).
// ---------------------------------------------------------------------------

const CLUSTER_CALCULO_SELECT_COM_EMBED =
  "*, cluster:analise_clusters_config(nome, cor_hex, faixa_min, faixa_max), pdv:pdvs(codigo, nome)";

export function useAnaliseClustersCalculo(filtros?: AnaliseClustersCalculoFiltros) {
  return useQuery({
    queryKey: analiseClustersCalculoKeys.list(filtros),
    queryFn: async () => {
      let query = supabase
        .from("analise_clusters_calculo")
        .select(CLUSTER_CALCULO_SELECT_COM_EMBED)
        .order("pontuacao_total", { ascending: false });
      if (filtros?.tipoPdv) query = query.eq("tipo_pdv", filtros.tipoPdv);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AnaliseClusterCalculo[];
    },
  });
}

// ---------------------------------------------------------------------------
// analise_insights — cliente só muda `lido`, e só via RPC (sem GRANT de
// update geral, ver migration).
// ---------------------------------------------------------------------------

export function useAnaliseInsights(filtros?: AnaliseInsightsFiltros) {
  return useQuery({
    queryKey: analiseInsightsKeys.list(filtros),
    queryFn: async () => {
      let query = supabase.from("analise_insights").select("*").order("created_at", { ascending: false });
      if (filtros?.tipo) query = query.eq("tipo", filtros.tipo);
      if (filtros?.lido !== undefined) query = query.eq("lido", filtros.lido);

      const { data, error } = await query;
      if (error) throw error;
      return data as AnaliseInsight[];
    },
  });
}

export function useMarcarInsightLido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("analise_marcar_insight_lido", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analiseInsightsKeys.all });
    },
  });
}

// Única mutation do módulo que invalida duas famílias de query key ao mesmo
// tempo: analise_recalcular() apaga e reinsere analise_clusters_calculo e
// analise_insights juntas, na mesma transação (ver migration) — os dois
// conjuntos de dado mudam por completo, não faz sentido invalidar um sem o
// outro.
export function useAnaliseRecalcular() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("analise_recalcular");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analiseClustersCalculoKeys.all });
      queryClient.invalidateQueries({ queryKey: analiseInsightsKeys.all });
    },
  });
}
