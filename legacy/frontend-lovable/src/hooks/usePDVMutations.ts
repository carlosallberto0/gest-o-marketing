import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

interface UpdatePDVData {
  id: string;
  name?: string;
  type?: 'posto' | 'conveniencia' | 'both';
  address?: string;
  city?: string;
  state?: string;
  active_modules?: ('media' | 'merchandising')[];
  photo_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  manager_id?: string | null;
}

export function useUpdatePDV() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePDVData) => {
      const { id, ...updateData } = data;
      
      const { error } = await supabase
        .from('pdvs')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdvs'] });
      showToast.success('PDV atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating PDV:', error);
      showToast.error('Erro ao atualizar PDV');
    },
  });
}

export function useTogglePDVStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('pdvs')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['pdvs'] });
      showToast.success(newStatus === 'active' ? 'PDV ativado!' : 'PDV desativado!');
    },
    onError: (error) => {
      console.error('Error toggling PDV status:', error);
      showToast.error('Erro ao alterar status do PDV');
    },
  });
}

export function useDeletePDV() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pdvs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdvs'] });
      showToast.success('PDV excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting PDV:', error);
      showToast.error('Erro ao excluir PDV', 'Verifique se não há dados vinculados.');
    },
  });
}
