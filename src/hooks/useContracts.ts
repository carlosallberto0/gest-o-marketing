import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';
import type { Database } from '@/integrations/supabase/types';

interface Contract {
  id: string;
  outdoor_id: string;
  farmer_name: string;
  farmer_cpf: string;
  farmer_phone: string | null;
  farmer_email: string | null;
  start_date: string;
  end_date: string;
  monthly_value: number;
  annual_value: number;
  payment_method: 'cash' | 'fuel' | 'both';
  auto_renewal: boolean;
  status: string;
  document_url: string | null;
  created_at: string;
  updated_at: string;
  outdoors?: {
    code: string;
    location: string;
    pdvs?: {
      name: string;
    };
  };
}

export function useContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          outdoors!contracts_outdoor_id_fkey(code, location, pdvs(name))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Contract[];
    },
  });
}

export function useContractByOutdoor(outdoorId: string | null) {
  return useQuery({
    queryKey: ['contract', outdoorId],
    queryFn: async () => {
      if (!outdoorId) return null;
      
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          outdoors!contracts_outdoor_id_fkey(code, location, pdvs(name))
        `)
        .eq('outdoor_id', outdoorId)
        .maybeSingle();

      if (error) throw error;
      return data as Contract | null;
    },
    enabled: !!outdoorId,
  });
}

interface UpdateContractInput {
  id: string;
  farmerName?: string;
  farmerCpf?: string;
  farmerPhone?: string | null;
  farmerEmail?: string | null;
  startDate?: string;
  endDate?: string;
  monthlyValue?: number;
  paymentMethod?: string;
  autoRenewal?: boolean;
  status?: string;
  documentUrl?: string | null;
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateContractInput) => {
      const updateData: Record<string, unknown> = {};
      
      if (input.farmerName !== undefined) updateData.farmer_name = input.farmerName;
      if (input.farmerCpf !== undefined) updateData.farmer_cpf = input.farmerCpf;
      if (input.farmerPhone !== undefined) updateData.farmer_phone = input.farmerPhone;
      if (input.farmerEmail !== undefined) updateData.farmer_email = input.farmerEmail;
      if (input.startDate !== undefined) updateData.start_date = input.startDate;
      if (input.endDate !== undefined) updateData.end_date = input.endDate;
      if (input.monthlyValue !== undefined) {
        updateData.monthly_value = input.monthlyValue;
        updateData.annual_value = input.monthlyValue * 12;
      }
      if (input.paymentMethod !== undefined) updateData.payment_method = input.paymentMethod;
      if (input.autoRenewal !== undefined) updateData.auto_renewal = input.autoRenewal;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.documentUrl !== undefined) updateData.document_url = input.documentUrl;

      const { data, error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract'] });
      showToast.success('Contrato atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating contract:', error);
      showToast.error('Erro ao atualizar contrato');
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contractId: string) => {
      // First, get the contract to find the outdoor_id
      const { data: contract, error: fetchError } = await supabase
        .from('contracts')
        .select('outdoor_id')
        .eq('id', contractId)
        .single();

      if (fetchError) throw fetchError;

      // Unlink the contract from the outdoor
      if (contract?.outdoor_id) {
        const { error: unlinkError } = await supabase
          .from('outdoors')
          .update({ contract_id: null })
          .eq('id', contract.outdoor_id);

        if (unlinkError) throw unlinkError;
      }

      // Delete the contract
      const { error: deleteError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract'] });
      queryClient.invalidateQueries({ queryKey: ['outdoors'] });
      showToast.success('Contrato excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting contract:', error);
      showToast.error('Erro ao excluir contrato');
    },
  });
}
