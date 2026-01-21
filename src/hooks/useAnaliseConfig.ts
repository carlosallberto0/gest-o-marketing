import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClusterConfig, AnaliseConfig } from '@/types/analise-estrategica';

export function useAnaliseConfig() {
  return useQuery({
    queryKey: ['analise-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analise_config')
        .select('*');
      
      if (error) throw error;
      
      // Convert array to object for easier access
      const configMap: Record<string, unknown> = {};
      (data as AnaliseConfig[])?.forEach((item) => {
        configMap[item.key] = item.value;
      });
      
      return configMap;
    }
  });
}

export function useUpdateAnaliseConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      // Check if exists first
      const { data: existing } = await supabase
        .from('analise_config')
        .select('id')
        .eq('key', key)
        .single();
      
      if (existing) {
        const { data, error } = await supabase
          .from('analise_config')
          .update({ 
            value: value as Record<string, never>,
            updated_at: new Date().toISOString()
          })
          .eq('key', key)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('analise_config')
          .insert({ 
            key, 
            value: value as Record<string, never>
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analise-config'] });
    }
  });
}

export function useClustersConfig(tipoPdv?: 'conveniencia' | 'outdoor') {
  return useQuery({
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
}

export function useUpdateClusterConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cluster: Partial<ClusterConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from('analise_clusters_config')
        .update({
          ...cluster,
          updated_at: new Date().toISOString()
        })
        .eq('id', cluster.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusters-config'] });
    }
  });
}
