import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClusterCalculo, Insight, AnaliseKPIs, ClusterDistribution, ClusterConfig } from '@/types/analise-estrategica';

// Busca cálculos de cluster com dados do PDV
export function useClusterCalculos(tipoPdv?: 'conveniencia' | 'outdoor') {
  return useQuery({
    queryKey: ['cluster-calculos', tipoPdv],
    queryFn: async () => {
      let query = supabase
        .from('analise_clusters_calculo')
        .select(`
          *,
          cluster:analise_clusters_config(*),
          pdv:pdvs(id, name, city, state, type)
        `)
        .order('pontuacao_total', { ascending: false });
      
      if (tipoPdv) {
        query = query.eq('pdv_tipo', tipoPdv);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as ClusterCalculo[];
    }
  });
}

// Busca insights
export function useInsights(tipoPdv?: 'conveniencia' | 'outdoor' | 'ambos', tipo?: 'tendencia' | 'alerta' | 'oportunidade') {
  return useQuery({
    queryKey: ['analise-insights', tipoPdv, tipo],
    queryFn: async () => {
      let query = supabase
        .from('analise_insights')
        .select(`
          *,
          pdv:pdvs(id, name)
        `)
        .order('data_geracao', { ascending: false });
      
      if (tipoPdv && tipoPdv !== 'ambos') {
        query = query.or(`pdv_tipo.eq.${tipoPdv},pdv_tipo.eq.ambos`);
      }
      
      if (tipo) {
        query = query.eq('tipo', tipo);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Insight[];
    }
  });
}

// Busca PDVs com gaps significativos
export function useGapAnalysis(threshold: number = 20) {
  return useQuery({
    queryKey: ['gap-analysis', threshold],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analise_clusters_calculo')
        .select(`
          *,
          cluster:analise_clusters_config(*),
          pdv:pdvs(id, name, city, state, type)
        `)
        .gte('gap_midia_merch', threshold)
        .order('gap_midia_merch', { ascending: false });
      
      if (error) throw error;
      return data as ClusterCalculo[];
    }
  });
}

// Estatísticas do módulo
export function useAnaliseKPIs(): { data: AnaliseKPIs | null; isLoading: boolean; error: Error | null } {
  const { data: calculos, isLoading: loadingCalculos, error: errorCalculos } = useClusterCalculos();
  const { data: insights, isLoading: loadingInsights, error: errorInsights } = useInsights();
  const { data: clusters } = useQuery({
    queryKey: ['clusters-config-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analise_clusters_config')
        .select('*')
        .eq('ativo', true);
      if (error) throw error;
      return data as ClusterConfig[];
    }
  });

  const isLoading = loadingCalculos || loadingInsights;
  const error = errorCalculos || errorInsights;

  if (isLoading || !calculos || !insights || !clusters) {
    return { data: null, isLoading, error };
  }

  const conveniencias = calculos.filter(c => c.pdv_tipo === 'conveniencia');
  const outdoors = calculos.filter(c => c.pdv_tipo === 'outdoor');
  
  // Find critical clusters (last in order, lowest score range)
  const criticalClusterIds = clusters
    .filter(c => c.faixa_max <= 50)
    .map(c => c.id);

  const kpis: AnaliseKPIs = {
    totalPDVs: calculos.length,
    totalConveniencia: conveniencias.length,
    totalOutdoors: outdoors.length,
    scoreMedio: calculos.length > 0 
      ? calculos.reduce((acc, c) => acc + c.pontuacao_total, 0) / calculos.length 
      : 0,
    scoreMedioConveniencia: conveniencias.length > 0 
      ? conveniencias.reduce((acc, c) => acc + c.pontuacao_total, 0) / conveniencias.length 
      : 0,
    scoreMedioOutdoors: outdoors.length > 0 
      ? outdoors.reduce((acc, c) => acc + c.pontuacao_total, 0) / outdoors.length 
      : 0,
    clustersCriticos: calculos.filter(c => c.cluster_id && criticalClusterIds.includes(c.cluster_id)).length,
    insightsNaoLidos: insights.filter(i => !i.lido).length,
    gapMedio: calculos.length > 0 
      ? calculos.reduce((acc, c) => acc + Math.abs(c.gap_midia_merch), 0) / calculos.length 
      : 0
  };

  return { data: kpis, isLoading, error };
}

// Distribuição de clusters
export function useClusterDistribution(tipoPdv?: 'conveniencia' | 'outdoor') {
  const { data: calculos, isLoading: loadingCalculos } = useClusterCalculos(tipoPdv);
  const { data: clusters, isLoading: loadingClusters } = useQuery({
    queryKey: ['clusters-config', tipoPdv],
    queryFn: async () => {
      let query = supabase
        .from('analise_clusters_config')
        .select('*')
        .eq('ativo', true)
        .order('ordem');
      
      if (tipoPdv) {
        query = query.eq('tipo_pdv', tipoPdv);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ClusterConfig[];
    }
  });

  const isLoading = loadingCalculos || loadingClusters;

  if (isLoading || !calculos || !clusters) {
    return { data: null, isLoading };
  }

  const distribution: ClusterDistribution[] = clusters.map(cluster => {
    const count = calculos.filter(c => c.cluster_id === cluster.id).length;
    return {
      cluster,
      count,
      percentage: calculos.length > 0 ? (count / calculos.length) * 100 : 0
    };
  });

  return { data: distribution, isLoading };
}
