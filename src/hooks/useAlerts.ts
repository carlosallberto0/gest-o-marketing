import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Alert {
  id: string;
  type: 'contract_expiring' | 'outdoor_pending' | 'campaign_goal' | 'low_score' | 'info';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  related_id: string | null;
  related_type: 'contract' | 'outdoor' | 'campaign' | 'pdv' | 'evaluation' | null;
  is_read: boolean;
  user_id: string | null;
  created_at: string;
  expires_at: string | null;
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async (): Promise<Alert[]> => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as Alert[];
    },
  });
}

export function useUnreadAlertsCount() {
  return useQuery({
    queryKey: ['alerts-unread-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (error) throw error;
      return count || 0;
    },
  });
}

export function useMarkAlertAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread-count'] });
    },
  });
}

export function useMarkAllAlertsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread-count'] });
      toast.success('Todas as notificações foram marcadas como lidas');
    },
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alert: Omit<Alert, 'id' | 'created_at' | 'is_read'>) => {
      const { data, error } = await supabase
        .from('alerts')
        .insert(alert)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread-count'] });
    },
  });
}