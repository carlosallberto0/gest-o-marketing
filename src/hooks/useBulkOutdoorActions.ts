import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/lib/toast';
import { OutdoorStatus } from '@/types';

interface BulkActionInput {
  outdoorIds: string[];
  action: 'operational' | 'non_operational' | 'pending_evaluation';
  validadeHoras?: number;
  observations?: string;
}

export function useBulkOutdoorActions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ outdoorIds, action, validadeHoras = 24, observations }: BulkActionInput) => {
      if (!user) throw new Error('Usuário não autenticado');

      const avaliacaoValidaAte = new Date(Date.now() + validadeHoras * 60 * 60 * 1000).toISOString();

      // Update all outdoors
      const { error: updateError } = await supabase
        .from('outdoors')
        .update({
          status: action as OutdoorStatus,
          last_evaluation: new Date().toISOString(),
          avaliacao_valida_ate: avaliacaoValidaAte,
          updated_at: new Date().toISOString(),
        })
        .in('id', outdoorIds);

      if (updateError) throw updateError;

      // Log the bulk action in audit_logs
      const { error: logError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'bulk_status_update',
          entity_type: 'outdoor',
          entity_id: outdoorIds[0], // First ID as reference
          new_data: {
            outdoor_ids: outdoorIds,
            new_status: action,
            validade_horas: validadeHoras,
            observations,
            total_affected: outdoorIds.length,
          },
        });

      if (logError) {
        console.error('Error logging bulk action:', logError);
      }

      return { affected: outdoorIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['outdoors'] });
      queryClient.invalidateQueries({ queryKey: ['outdoor-cycle-health'] });
      showToast.success(`${data.affected} outdoor(s) atualizado(s) com sucesso!`);
    },
    onError: (error) => {
      console.error('Error in bulk action:', error);
      showToast.error('Erro ao atualizar outdoors em massa');
    },
  });
}

export function useOutdoorCycleHealth() {
  const queryClient = useQueryClient();

  return {
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: ['outdoors'] });
    },
  };
}
