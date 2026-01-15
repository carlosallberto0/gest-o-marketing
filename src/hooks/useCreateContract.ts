import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

interface CreateContractInput {
  outdoorIds: string[];
  farmerName: string;
  farmerCpf: string;
  farmerPhone?: string;
  farmerEmail?: string;
  startDate: string;
  endDate: string;
  monthlyValue: number;
  paymentMethod: string;
  autoRenewal: boolean;
  imageUrls?: string[];
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateContractInput) => {
      const monthlyValue = input.monthlyValue;
      const annualValue = monthlyValue * 12;
      
      // 1. Create contract (without outdoor_id - we use the pivot table now)
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          farmer_name: input.farmerName,
          farmer_cpf: input.farmerCpf,
          farmer_phone: input.farmerPhone || null,
          farmer_email: input.farmerEmail || null,
          start_date: input.startDate,
          end_date: input.endDate,
          monthly_value: monthlyValue,
          annual_value: annualValue,
          payment_method: input.paymentMethod,
          auto_renewal: input.autoRenewal,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Insert outdoor associations
      if (input.outdoorIds.length > 0) {
        const { error: outdoorError } = await supabase
          .from('contract_outdoors')
          .insert(
            input.outdoorIds.map(outdoorId => ({
              contract_id: data.id,
              outdoor_id: outdoorId,
            }))
          );

        if (outdoorError) throw outdoorError;

        // Update each outdoor with contract_id (for backward compatibility)
        for (const outdoorId of input.outdoorIds) {
          await supabase
            .from('outdoors')
            .update({ contract_id: data.id })
            .eq('id', outdoorId);
        }
      }

      // 3. Insert contract images
      if (input.imageUrls && input.imageUrls.length > 0) {
        const { error: imageError } = await supabase
          .from('contract_images')
          .insert(
            input.imageUrls.map((url, index) => ({
              contract_id: data.id,
              image_url: url,
              page_order: index,
            }))
          );

        if (imageError) throw imageError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['outdoors'] });
      showToast.success('Contrato criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating contract:', error);
      showToast.error('Erro ao criar contrato');
    },
  });
}
