import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkEditParams {
  pdvIds: string[];
  updates: {
    manager_id?: string | null;
    status_importacao?: string;
    status?: string;
  };
}

interface BulkEditResult {
  success: number;
  failed: number;
  errors: string[];
}

export function useBulkEditPDVs() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ pdvIds, updates }: BulkEditParams): Promise<BulkEditResult> => {
      const result: BulkEditResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      // Update all PDVs in parallel
      const updatePromises = pdvIds.map(async (id) => {
        const { error } = await supabase
          .from('pdvs')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) {
          result.failed++;
          result.errors.push(`PDV ${id}: ${error.message}`);
        } else {
          result.success++;
        }
      });

      await Promise.all(updatePromises);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['map-pdvs'] });
      queryClient.invalidateQueries({ queryKey: ['pdvs'] });
      
      if (result.failed === 0) {
        toast.success(`${result.success} PDVs atualizados com sucesso!`);
      } else {
        toast.warning(`${result.success} atualizados, ${result.failed} erros`);
      }
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar PDVs: ${error.message}`);
    },
  });

  return mutation;
}
