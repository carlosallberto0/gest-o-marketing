import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface EvaluationFrequency {
  pdv_days: number;
  outdoor_days: number;
}

export interface NotificationSettings {
  alert_managers: boolean;
  days_before: number;
  enabled: boolean;
}

export interface EvaluationConfig {
  require_photo: boolean;
  require_signature: boolean;
  max_days_overdue: number;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: Json;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async (): Promise<SystemSetting[]> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('key');

      if (error) throw error;
      return (data || []) as SystemSetting[];
    },
  });
}

export function useSystemSetting<T>(key: string, defaultValue: T) {
  return useQuery({
    queryKey: ['system-settings', key],
    queryFn: async (): Promise<T> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return defaultValue;
        }
        throw error;
      }
      return (data?.value as T) || defaultValue;
    },
  });
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, unknown> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('system_settings')
        .update({ 
          value: value as unknown as Json,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('key', key)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings', variables.key] });
      toast.success('Configuração salva com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating setting:', error);
      toast.error('Erro ao salvar configuração');
    },
  });
}
