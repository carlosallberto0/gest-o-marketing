import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateOutdoorInput {
  code: string;
  pdvId: string;
  location: string;
  width: number;
  height: number;
  photoUrl?: string;
  ownershipType?: 'owned' | 'rented';
  supplierId?: string;
}

export function useCreateOutdoor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOutdoorInput) => {
      const { data, error } = await supabase
        .from('outdoors')
        .insert({
          code: input.code,
          pdv_id: input.pdvId,
          location: input.location,
          width: input.width,
          height: input.height,
          photo_url: input.photoUrl || null,
          ownership_type: input.ownershipType || 'owned',
          supplier_id: input.supplierId || null,
          status: 'pending_evaluation',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outdoors'] });
      toast.success('Outdoor criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating outdoor:', error);
      toast.error('Erro ao criar outdoor');
    },
  });
}
