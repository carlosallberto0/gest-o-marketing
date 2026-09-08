import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';
import { Database } from '@/integrations/supabase/types';

type OutdoorStatus = Database['public']['Tables']['outdoors']['Row']['status'];

interface UpdateOutdoorInput {
  id: string;
  code?: string;
  pdv_id?: string;
  location?: string;
  location_url?: string | null;
  width?: number;
  height?: number;
  photo_url?: string | null;
  ownership_type?: 'owned' | 'rented';
  supplier_id?: string | null;
  lat?: number | null;
  lng?: number | null;
  description_type?: string | null;
  direction?: string | null;
  status?: OutdoorStatus;
  status_operacional?: string;
}

export function useUpdateOutdoor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateOutdoorInput) => {
      const { data: result, error } = await supabase
        .from('outdoors')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outdoors'] });
      queryClient.invalidateQueries({ queryKey: ['strategic-map-data'] });
      showToast.success('Outdoor atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating outdoor:', error);
      showToast.error('Erro ao atualizar outdoor');
    },
  });
}

export function useDeleteOutdoor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('outdoors')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outdoors'] });
      queryClient.invalidateQueries({ queryKey: ['strategic-map-data'] });
      showToast.success('Outdoor excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting outdoor:', error);
      showToast.error('Erro ao excluir outdoor. Verifique se não há dados vinculados.');
    },
  });
}
