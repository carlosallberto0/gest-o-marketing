// =============== ANÁLISE ESTRATÉGICA TYPES ===============

export type PDVTipoAnalise = 'conveniencia' | 'outdoor';
export type InsightTipo = 'tendencia' | 'alerta' | 'oportunidade';
export type ModuloFoco = 'midia' | 'merchandising' | 'integrado';

export interface ClusterConfig {
  id: string;
  nome: string;
  tipo_pdv: PDVTipoAnalise;
  cor_hex: string;
  criterios_midia: Record<string, number>;
  criterios_merchandising: Record<string, number>;
  peso_midia: number;
  peso_merchandising: number;
  faixa_min: number;
  faixa_max: number;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClusterCalculo {
  id: string;
  pdv_id: string;
  pdv_tipo: PDVTipoAnalise;
  cluster_id: string | null;
  pontuacao_total: number;
  pontuacao_midia: number;
  pontuacao_merchandising: number;
  pontuacao_detalhada: Record<string, number>;
  gap_midia_merch: number;
  potencial_aproveitamento: number;
  data_calculo: string;
  created_at: string;
  // Joined fields
  cluster?: ClusterConfig;
  pdv?: {
    id: string;
    name: string;
    city: string;
    state: string;
    type: string;
  };
}

export interface Insight {
  id: string;
  titulo: string;
  descricao: string;
  tipo: InsightTipo;
  pdv_tipo: PDVTipoAnalise | 'ambos';
  modulo_foco: ModuloFoco;
  dados: Record<string, unknown>;
  acoes_recomendadas: string[];
  impacto_estimado: number;
  pdv_id?: string;
  lido: boolean;
  data_geracao: string;
  created_at: string;
  // Joined fields
  pdv?: {
    id: string;
    name: string;
  };
}

export interface AnaliseRelatorio {
  id: string;
  nome: string;
  pdv_tipo: PDVTipoAnalise | 'todos' | null;
  parametros: Record<string, unknown>;
  agendamento_cron?: string;
  ultima_geracao?: string;
  ativo: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AnaliseConfig {
  id: string;
  key: string;
  value: unknown;
  updated_at: string;
  updated_by?: string;
}

export interface AnaliseKPIs {
  totalPDVs: number;
  totalConveniencia: number;
  totalOutdoors: number;
  scoreMedio: number;
  scoreMedioConveniencia: number;
  scoreMedioOutdoors: number;
  clustersCriticos: number;
  insightsNaoLidos: number;
  gapMedio: number;
}

export interface ClusterDistribution {
  cluster: ClusterConfig;
  count: number;
  percentage: number;
}
