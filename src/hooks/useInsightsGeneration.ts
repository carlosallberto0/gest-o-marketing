import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClusterCalculo, Insight, ClusterConfig } from '@/types/analise-estrategica';

interface InsightData {
  titulo: string;
  descricao: string;
  tipo: 'tendencia' | 'alerta' | 'oportunidade';
  pdv_tipo: 'conveniencia' | 'outdoor' | 'ambos';
  modulo_foco: 'midia' | 'merchandising' | 'integrado';
  dados: Record<string, unknown>;
  acoes_recomendadas: string[];
  impacto_estimado: number;
  pdv_id?: string;
}

// Generate insights based on cluster calculations
export function generateInsightsFromCalculos(
  calculos: ClusterCalculo[],
  clusters: ClusterConfig[]
): InsightData[] {
  const insights: InsightData[] = [];
  
  if (calculos.length === 0) return insights;
  
  // 1. Alert for PDVs with high gap between media and merchandising
  const highGapPdvs = calculos.filter(c => Math.abs(c.gap_midia_merch) > 25);
  if (highGapPdvs.length > 0) {
    insights.push({
      titulo: `${highGapPdvs.length} PDVs com desbalanceamento entre módulos`,
      descricao: `Foram identificados ${highGapPdvs.length} PDVs com diferença significativa entre scores de Mídia e Merchandising (gap > 25 pontos). Isso indica oportunidade de melhoria focada.`,
      tipo: 'alerta',
      pdv_tipo: 'ambos',
      modulo_foco: 'integrado',
      dados: { 
        count: highGapPdvs.length, 
        avgGap: highGapPdvs.reduce((acc, c) => acc + Math.abs(c.gap_midia_merch), 0) / highGapPdvs.length 
      },
      acoes_recomendadas: [
        'Revisar estratégia de cada PDV individualmente',
        'Priorizar módulo defasado para equilibrar performance',
        'Agendar visitas de avaliação nos PDVs críticos'
      ],
      impacto_estimado: highGapPdvs.length * 5
    });
  }
  
  // 2. Opportunity for PDVs with high potential
  const highPotentialPdvs = calculos.filter(c => c.potencial_aproveitamento > 40);
  if (highPotentialPdvs.length > 0) {
    insights.push({
      titulo: `${highPotentialPdvs.length} PDVs com alto potencial de melhoria`,
      descricao: `Identificados ${highPotentialPdvs.length} PDVs que podem melhorar mais de 40 pontos em sua pontuação total. Foco nestes PDVs pode trazer resultados significativos.`,
      tipo: 'oportunidade',
      pdv_tipo: 'ambos',
      modulo_foco: 'integrado',
      dados: { 
        count: highPotentialPdvs.length,
        avgPotential: highPotentialPdvs.reduce((acc, c) => acc + c.potencial_aproveitamento, 0) / highPotentialPdvs.length
      },
      acoes_recomendadas: [
        'Criar plano de ação específico para cada PDV',
        'Definir metas mensais de melhoria',
        'Monitorar progresso semanalmente'
      ],
      impacto_estimado: highPotentialPdvs.length * 10
    });
  }
  
  // 3. Trend for critical clusters
  const criticalClusters = clusters.filter(c => c.faixa_max <= 50);
  const criticalClusterIds = criticalClusters.map(c => c.id);
  const criticalPdvs = calculos.filter(c => c.cluster_id && criticalClusterIds.includes(c.cluster_id));
  
  if (criticalPdvs.length > 0) {
    const convenienciaCriticos = criticalPdvs.filter(c => c.pdv_tipo === 'conveniencia').length;
    const outdoorsCriticos = criticalPdvs.filter(c => c.pdv_tipo === 'outdoor').length;
    
    insights.push({
      titulo: `${criticalPdvs.length} PDVs em clusters críticos`,
      descricao: `Atenção: ${convenienciaCriticos} conveniências e ${outdoorsCriticos} outdoors estão classificados em clusters críticos (score < 50). Ação imediata recomendada.`,
      tipo: 'alerta',
      pdv_tipo: 'ambos',
      modulo_foco: 'integrado',
      dados: { 
        total: criticalPdvs.length,
        conveniencia: convenienciaCriticos,
        outdoor: outdoorsCriticos
      },
      acoes_recomendadas: [
        'Priorizar visitas técnicas aos PDVs críticos',
        'Avaliar necessidade de manutenção urgente',
        'Rever estratégia de merchandising'
      ],
      impacto_estimado: criticalPdvs.length * 15
    });
  }
  
  // 4. Trend for merchandising performance
  const avgMerchScore = calculos.reduce((acc, c) => acc + c.pontuacao_merchandising, 0) / calculos.length;
  const avgMediaScore = calculos.reduce((acc, c) => acc + c.pontuacao_midia, 0) / calculos.length;
  
  if (avgMerchScore < avgMediaScore - 10) {
    insights.push({
      titulo: 'Merchandising abaixo da Mídia Externa',
      descricao: `O score médio de Merchandising (${avgMerchScore.toFixed(1)}) está ${(avgMediaScore - avgMerchScore).toFixed(1)} pontos abaixo da Mídia Externa. Oportunidade de equilibrar através de ações de trade marketing.`,
      tipo: 'tendencia',
      pdv_tipo: 'ambos',
      modulo_foco: 'merchandising',
      dados: { avgMerch: avgMerchScore, avgMedia: avgMediaScore },
      acoes_recomendadas: [
        'Intensificar campanhas de merchandising',
        'Treinar equipe de PDV',
        'Revisar materiais de trade'
      ],
      impacto_estimado: 20
    });
  } else if (avgMediaScore < avgMerchScore - 10) {
    insights.push({
      titulo: 'Mídia Externa abaixo do Merchandising',
      descricao: `O score médio de Mídia Externa (${avgMediaScore.toFixed(1)}) está ${(avgMerchScore - avgMediaScore).toFixed(1)} pontos abaixo do Merchandising. Recomenda-se foco em manutenção e visibilidade de outdoors.`,
      tipo: 'tendencia',
      pdv_tipo: 'ambos',
      modulo_foco: 'midia',
      dados: { avgMerch: avgMerchScore, avgMedia: avgMediaScore },
      acoes_recomendadas: [
        'Revisar manutenção de outdoors',
        'Avaliar visibilidade e conservação',
        'Planejar novos pontos de mídia'
      ],
      impacto_estimado: 20
    });
  }
  
  return insights;
}

// Hook to regenerate insights
export function useRegenerarInsights() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Fetch current calculations
      const { data: calculos, error: calcError } = await supabase
        .from('analise_clusters_calculo')
        .select(`
          *,
          cluster:analise_clusters_config(*)
        `);
      
      if (calcError) throw calcError;
      
      // Fetch cluster configs
      const { data: clusters, error: clusterError } = await supabase
        .from('analise_clusters_config')
        .select('*')
        .eq('ativo', true);
      
      if (clusterError) throw clusterError;
      
      // Generate insights
      const newInsights = generateInsightsFromCalculos(
        calculos as ClusterCalculo[],
        clusters as ClusterConfig[]
      );
      
      // Delete old insights (keep last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await supabase
        .from('analise_insights')
        .delete()
        .lt('data_geracao', thirtyDaysAgo.toISOString());
      
      // Insert new insights
      if (newInsights.length > 0) {
        const insightsToInsert = newInsights.map(i => ({
          titulo: i.titulo,
          descricao: i.descricao,
          tipo: i.tipo,
          pdv_tipo: i.pdv_tipo,
          modulo_foco: i.modulo_foco,
          dados: JSON.parse(JSON.stringify(i.dados)),
          acoes_recomendadas: i.acoes_recomendadas,
          impacto_estimado: i.impacto_estimado,
          data_geracao: new Date().toISOString()
        }));
        
        const { error: insertError } = await supabase
          .from('analise_insights')
          .insert(insightsToInsert);
        
        if (insertError) throw insertError;
      }
      
      return newInsights;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analise-insights'] });
    }
  });
}
