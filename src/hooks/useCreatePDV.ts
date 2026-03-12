import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

interface CreatePDVInput {
  code: string;
  name: string;
  type: 'posto' | 'conveniencia' | 'both';
  address: string;
  city: string;
  state: string;
  modules: ('media' | 'merchandising')[];
  photoUrl?: string;
  lat?: number;
  lng?: number;
  managerId?: string;
}

export function useCreatePDV() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePDVInput) => {
      const { data, error } = await supabase
        .from('pdvs')
        .insert({
          code: input.code,
          name: input.name,
          type: input.type,
          address: input.address,
          city: input.city,
          state: input.state,
          active_modules: input.modules,
          lat: input.lat || null,
          lng: input.lng || null,
          manager_id: input.managerId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdvs'] });
      showToast.success('PDV criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating PDV:', error);
      if (error?.code === '23505') {
        showToast.error('Código duplicado', 'Feche o diálogo e tente novamente.');
      } else {
        showToast.error('Erro ao criar PDV');
      }
    },
  });
}
