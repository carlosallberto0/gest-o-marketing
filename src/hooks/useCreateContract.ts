import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

interface CreateContractInput {
  outdoorId: string;
  farmerName: string;
  farmerCpf: string;
  farmerPhone?: string;
  farmerEmail?: string;
  startDate: string;
  endDate: string;
  monthlyValue: number;
  paymentMethod: string;
  autoRenewal: boolean;
  documentUrl?: string;
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateContractInput) => {
      const monthlyValue = input.monthlyValue;
      const annualValue = monthlyValue * 12;
      
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          outdoor_id: input.outdoorId,
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
          document_url: input.documentUrl || null,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      // Update outdoor with contract_id
      if (data) {
        await supabase
          .from('outdoors')
          .update({ contract_id: data.id })
          .eq('id', input.outdoorId);
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
