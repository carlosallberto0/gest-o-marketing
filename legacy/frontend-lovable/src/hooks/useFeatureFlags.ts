import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

interface FeatureFlag {
  id: string;
  module_key: string;
  feature_key: string;
  enabled: boolean;
  updated_at: string;
}

export function useFeatureFlags() {
  const queryClient = useQueryClient();

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async (): Promise<FeatureFlag[]> => {
      const { data, error } = await supabase
        .from('module_feature_flags')
        .select('*')
        .order('module_key');

      if (error) {
        console.error('Error fetching feature flags:', error);
        return [];
      }
      return data as FeatureFlag[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const isModuleEnabled = useCallback((moduleKey: string): boolean => {
    const flag = flags.find(f => f.module_key === moduleKey && f.feature_key === '__module__');
    return flag ? flag.enabled : true; // default: habilitado
  }, [flags]);

  const isFeatureEnabled = useCallback((moduleKey: string, featureKey: string): boolean => {
    // Se o módulo está desabilitado, nenhuma feature funciona
    if (!isModuleEnabled(moduleKey)) return false;
    
    const flag = flags.find(f => f.module_key === moduleKey && f.feature_key === featureKey);
    return flag ? flag.enabled : true; // default: habilitado
  }, [flags, isModuleEnabled]);

  const toggleFlag = useMutation({
    mutationFn: async ({ moduleKey, featureKey, enabled }: { moduleKey: string; featureKey: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('module_feature_flags')
        .upsert(
          { module_key: moduleKey, feature_key: featureKey, enabled, updated_at: new Date().toISOString() },
          { onConflict: 'module_key,feature_key' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
  });

  return {
    flags,
    isLoading,
    isModuleEnabled,
    isFeatureEnabled,
    toggleFlag,
  };
}
