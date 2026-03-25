import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

interface CreateOutdoorInput {
  pdvId: string;
  location: string;
  locationUrl?: string;
  width: number;
  height: number;
  photoUrl?: string;
  ownershipType?: 'owned' | 'rented';
  supplierId?: string;
  lat?: number;
  lng?: number;
  descriptionType?: string;
  direction?: string;
}

export function useCreateOutdoor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOutdoorInput) => {
      const { data, error } = await supabase
        .from('outdoors')
        .insert({
          pdv_id: input.pdvId,
          location: input.location,
          location_url: input.locationUrl || null,
          width: input.width,
          height: input.height,
          photo_url: input.photoUrl || null,
          ownership_type: input.ownershipType || 'owned',
          supplier_id: input.supplierId || null,
          lat: input.lat || null,
          lng: input.lng || null,
          status: 'pending_evaluation',
          description_type: input.descriptionType || null,
          direction: input.direction || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outdoors'] });
      showToast.success('Outdoor criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating outdoor:', error);
      showToast.error('Erro ao criar outdoor');
    },
  });
}
