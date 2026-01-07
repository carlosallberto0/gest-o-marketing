import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

export interface OutdoorCycleConfig {
  validade_horas: number;
  comportamento_expiracao: 'pendente_reavaliacao' | 'bloquear_pagamento';
  notificar_gerente_horas_antes: number;
  notificar_super_admin_expirado_24h: boolean;
  bloquear_pagamento_nao_operacional: boolean;
}

const DEFAULT_CONFIG: OutdoorCycleConfig = {
  validade_horas: 24,
  comportamento_expiracao: 'pendente_reavaliacao',
  notificar_gerente_horas_antes: 6,
  notificar_super_admin_expirado_24h: true,
  bloquear_pagamento_nao_operacional: true,
};

export function useOutdoorCycleConfig() {
  return useQuery({
    queryKey: ['outdoor-cycle-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'outdoor_cycle_config')
        .maybeSingle();

      if (error) {
        console.error('Error fetching outdoor cycle config:', error);
        return DEFAULT_CONFIG;
      }

      if (!data?.value) {
        return DEFAULT_CONFIG;
      }

      return data.value as unknown as OutdoorCycleConfig;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateOutdoorCycleConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<OutdoorCycleConfig>) => {
      // First get current config
      const { data: current } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'outdoor_cycle_config')
        .maybeSingle();

      const currentConfig = (current?.value as unknown as OutdoorCycleConfig) || DEFAULT_CONFIG;
      const newConfig = { ...currentConfig, ...config };

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'outdoor_cycle_config',
          value: newConfig,
          description: 'Configurações do ciclo de avaliação de outdoors',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;
      return newConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outdoor-cycle-config'] });
      showToast.success('Configurações do ciclo atualizadas!');
    },
    onError: (error) => {
      console.error('Error updating outdoor cycle config:', error);
      showToast.error('Erro ao atualizar configurações');
    },
  });
}

export type VerificationStatus = 'avaliado' | 'pendente_reavaliacao' | 'nunca_avaliado' | 'expirado_48h';

export function calculateVerificationStatus(
  avaliacaoValidaAte: string | null,
  lastEvaluation: string | null,
  validadeHoras: number = 24
): VerificationStatus {
  if (!lastEvaluation) {
    return 'nunca_avaliado';
  }

  if (!avaliacaoValidaAte) {
    return 'pendente_reavaliacao';
  }

  const validUntil = new Date(avaliacaoValidaAte);
  const now = new Date();

  if (validUntil > now) {
    return 'avaliado';
  }

  // Check if expired more than 48h
  const expiredHours = (now.getTime() - validUntil.getTime()) / (1000 * 60 * 60);
  if (expiredHours > 48) {
    return 'expirado_48h';
  }

  return 'pendente_reavaliacao';
}

export function getVerificationStatusLabel(status: VerificationStatus): string {
  const labels: Record<VerificationStatus, string> = {
    avaliado: 'Avaliado',
    pendente_reavaliacao: 'Pendente Reavaliação',
    nunca_avaliado: 'Nunca Avaliado',
    expirado_48h: 'Atrasado (+48h)',
  };
  return labels[status];
}

export function getVerificationStatusColor(status: VerificationStatus): string {
  const colors: Record<VerificationStatus, string> = {
    avaliado: 'bg-success text-success-foreground',
    pendente_reavaliacao: 'bg-warning text-warning-foreground',
    nunca_avaliado: 'bg-muted text-muted-foreground',
    expirado_48h: 'bg-destructive text-destructive-foreground',
  };
  return colors[status];
}
