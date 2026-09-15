// Utilitário puro (sem componente) da Análise Estratégica — separado de
// src/components/analise-estrategica/ClusterVisual.tsx de propósito: um
// arquivo que mistura função utilitária com componente React quebra o Fast
// Refresh (warning react-refresh/only-export-components), diferente de
// src/components/ui/chart.tsx, que só exporta componente/tipo.
import type { AnaliseClusterCalculo } from "@/hooks/useAnaliseEstrategica";

export interface ClusterContagem {
  clusterId: string;
  nome: string;
  cor: string;
  quantidade: number;
}

// Fallback pro caso (raro, config incompleta) de cálculo sem cluster ativo
// cadastrado pro tipo — token semântico do tema (mesmo cinza de
// --muted-foreground), não hex hardcoded.
const COR_SEM_CLUSTER = "hsl(var(--chart-5))";

export function agruparPorCluster(dados: AnaliseClusterCalculo[]): ClusterContagem[] {
  const mapa = new Map<string, ClusterContagem>();
  for (const item of dados) {
    const chave = item.cluster_id ?? "sem-cluster";
    const existente = mapa.get(chave);
    if (existente) {
      existente.quantidade += 1;
      continue;
    }
    mapa.set(chave, {
      clusterId: chave,
      nome: item.cluster?.nome ?? "Sem cluster",
      cor: item.cluster?.cor_hex ?? COR_SEM_CLUSTER,
      quantidade: 1,
    });
  }
  return Array.from(mapa.values());
}
