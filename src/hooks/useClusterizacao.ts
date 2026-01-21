import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClusterConfig } from '@/types/analise-estrategica';

interface PDVData {
  id: string;
  type: 'posto' | 'conveniencia' | 'both';
  // Media data
  totalOutdoors?: number;
  operationalOutdoors?: number;
  avgOutdoorArea?: number;
  // Merchandising data
  lastMerchScore?: number;
  totalEvaluations?: number;
}

interface ClusterResult {
  pdv_id: string;
  pdv_tipo: 'conveniencia' | 'outdoor';
  cluster_id: string | null;
  pontuacao_total: number;
  pontuacao_midia: number;
  pontuacao_merchandising: number;
  pontuacao_detalhada: Record<string, number>;
  gap_midia_merch: number;
  potencial_aproveitamento: number;
}

// Calculate media score based on criteria
export function calcularScoreMidia(
  pdvData: PDVData, 
  criterios: Record<string, number>
): { score: number; detalhes: Record<string, number> } {
  const detalhes: Record<string, number> = {};
  let scoreTotal = 0;
  
  // Calculate based on available data
  if (pdvData.totalOutdoors !== undefined && pdvData.operationalOutdoors !== undefined) {
    const taxaOperacional = pdvData.totalOutdoors > 0 
      ? (pdvData.operationalOutdoors / pdvData.totalOutdoors) * 100 
      : 0;
    
    // Use conservacao criteria for operational rate
    if (criterios.conservacao) {
      detalhes.conservacao = taxaOperacional * criterios.conservacao;
      scoreTotal += detalhes.conservacao;
    }
    
    // Use visibilidade for presence
    if (criterios.visibilidade) {
      const presenceScore = pdvData.totalOutdoors > 0 ? 100 : 0;
      detalhes.visibilidade = presenceScore * criterios.visibilidade;
      scoreTotal += detalhes.visibilidade;
    }
  }
  
  // Location/size criteria
  if (pdvData.avgOutdoorArea !== undefined && criterios.tamanho_m2) {
    const sizeScore = Math.min(pdvData.avgOutdoorArea / 50, 1) * 100; // 50m² = 100%
    detalhes.tamanho_m2 = sizeScore * criterios.tamanho_m2;
    scoreTotal += detalhes.tamanho_m2;
  }
  
  return { score: scoreTotal, detalhes };
}

// Calculate merchandising score based on criteria
export function calcularScoreMerchandising(
  pdvData: PDVData, 
  criterios: Record<string, number>
): { score: number; detalhes: Record<string, number> } {
  const detalhes: Record<string, number> = {};
  let scoreTotal = 0;
  
  // Use last merch score directly
  if (pdvData.lastMerchScore !== undefined) {
    // Distribute across criteria
    const baseScore = pdvData.lastMerchScore;
    
    Object.entries(criterios).forEach(([key, weight]) => {
      detalhes[key] = baseScore * weight;
      scoreTotal += detalhes[key];
    });
  }
  
  return { score: scoreTotal, detalhes };
}

// Classify PDV into a cluster
export function classificarEmCluster(
  scoreTotal: number, 
  clusters: ClusterConfig[]
): ClusterConfig | null {
  // Sort by faixa_min descending to find highest matching range
  const sortedClusters = [...clusters].sort((a, b) => b.faixa_min - a.faixa_min);
  
  for (const cluster of sortedClusters) {
    if (scoreTotal >= cluster.faixa_min && scoreTotal <= cluster.faixa_max) {
      return cluster;
    }
  }
  
  // If no match, return the lowest cluster
  return sortedClusters[sortedClusters.length - 1] || null;
}

// Calculate cluster for a single PDV
export function calcularClusterPDV(
  pdvData: PDVData,
  clusters: ClusterConfig[]
): ClusterResult {
  // Determine PDV type for analysis
  const pdvTipo: 'conveniencia' | 'outdoor' = 
    pdvData.type === 'conveniencia' ? 'conveniencia' : 'outdoor';
  
  // Get clusters for this type
  const clustersDoTipo = clusters.filter(c => c.tipo_pdv === pdvTipo);
  
  if (clustersDoTipo.length === 0) {
    return {
      pdv_id: pdvData.id,
      pdv_tipo: pdvTipo,
      cluster_id: null,
      pontuacao_total: 0,
      pontuacao_midia: 0,
      pontuacao_merchandising: 0,
      pontuacao_detalhada: {},
      gap_midia_merch: 0,
      potencial_aproveitamento: 0
    };
  }
  
  // Use first cluster's config for weights and criteria
  const config = clustersDoTipo[0];
  
  const { score: scoreMidia, detalhes: detalhesMidia } = calcularScoreMidia(
    pdvData, 
    config.criterios_midia
  );
  
  const { score: scoreMerch, detalhes: detalhesMerch } = calcularScoreMerchandising(
    pdvData, 
    config.criterios_merchandising
  );
  
  // Apply weights
  const pontuacaoMidia = scoreMidia * config.peso_midia;
  const pontuacaoMerch = scoreMerch * config.peso_merchandising;
  const pontuacaoTotal = pontuacaoMidia + pontuacaoMerch;
  
  // Calculate gap
  const gap = scoreMidia - scoreMerch;
  
  // Calculate potential (how much can improve)
  const potencial = 100 - pontuacaoTotal;
  
  // Classify
  const cluster = classificarEmCluster(pontuacaoTotal, clustersDoTipo);
  
  return {
    pdv_id: pdvData.id,
    pdv_tipo: pdvTipo,
    cluster_id: cluster?.id || null,
    pontuacao_total: Math.round(pontuacaoTotal * 100) / 100,
    pontuacao_midia: Math.round(pontuacaoMidia * 100) / 100,
    pontuacao_merchandising: Math.round(pontuacaoMerch * 100) / 100,
    pontuacao_detalhada: { ...detalhesMidia, ...detalhesMerch },
    gap_midia_merch: Math.round(gap * 100) / 100,
    potencial_aproveitamento: Math.round(potencial * 100) / 100
  };
}

// Hook to recalculate all clusters
export function useRecalcularClusters() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Fetch all PDVs with their data
      const { data: pdvs, error: pdvError } = await supabase
        .from('pdvs')
        .select('id, name, type, city, state')
        .eq('status', 'active');
      
      if (pdvError) throw pdvError;
      
      // Fetch outdoor counts per PDV
      const { data: outdoors, error: outdoorError } = await supabase
        .from('outdoors')
        .select('pdv_id, status, area');
      
      if (outdoorError) throw outdoorError;
      
      // Fetch latest merch evaluations
      const { data: evaluations, error: evalError } = await supabase
        .from('merch_evaluations')
        .select('pdv_id, percentage_score')
        .eq('status', 'completed');
      
      if (evalError) throw evalError;
      
      // Fetch cluster configs
      const { data: clusters, error: clusterError } = await supabase
        .from('analise_clusters_config')
        .select('*')
        .eq('ativo', true);
      
      if (clusterError) throw clusterError;
      
      // Group outdoor data by PDV
      const outdoorsByPdv: Record<string, { total: number; operational: number; avgArea: number }> = {};
      outdoors?.forEach(o => {
        if (!outdoorsByPdv[o.pdv_id]) {
          outdoorsByPdv[o.pdv_id] = { total: 0, operational: 0, avgArea: 0 };
        }
        outdoorsByPdv[o.pdv_id].total++;
        if (o.status === 'operational') {
          outdoorsByPdv[o.pdv_id].operational++;
        }
        outdoorsByPdv[o.pdv_id].avgArea = (outdoorsByPdv[o.pdv_id].avgArea + (o.area || 0)) / outdoorsByPdv[o.pdv_id].total;
      });
      
      // Get latest evaluation per PDV
      const latestEvalByPdv: Record<string, number> = {};
      evaluations?.forEach(e => {
        latestEvalByPdv[e.pdv_id] = e.percentage_score || 0;
      });
      
      // Calculate clusters for each PDV
      const results: ClusterResult[] = [];
      
      pdvs?.forEach(pdv => {
        const outdoorData = outdoorsByPdv[pdv.id] || { total: 0, operational: 0, avgArea: 0 };
        
        const pdvData: PDVData = {
          id: pdv.id,
          type: pdv.type as 'posto' | 'conveniencia' | 'both',
          totalOutdoors: outdoorData.total,
          operationalOutdoors: outdoorData.operational,
          avgOutdoorArea: outdoorData.avgArea,
          lastMerchScore: latestEvalByPdv[pdv.id]
        };
        
        const result = calcularClusterPDV(pdvData, clusters as ClusterConfig[]);
        results.push(result);
      });
      
      // Delete old calculations and insert new ones
      await supabase.from('analise_clusters_calculo').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (results.length > 0) {
        const { error: insertError } = await supabase
          .from('analise_clusters_calculo')
          .insert(results.map(r => ({
            ...r,
            data_calculo: new Date().toISOString()
          })));
        
        if (insertError) throw insertError;
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cluster-calculos'] });
      queryClient.invalidateQueries({ queryKey: ['gap-analysis'] });
    }
  });
}
