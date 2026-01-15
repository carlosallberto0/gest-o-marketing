import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

interface ContractOutdoor {
  outdoor: {
    id: string;
    code: string;
    location: string;
    pdvs: {
      name: string;
    } | null;
  };
}

interface ContractImage {
  id: string;
  image_url: string;
  page_order: number;
}

interface Contract {
  id: string;
  outdoor_id: string | null;
  farmer_name: string;
  farmer_cpf: string;
  farmer_phone: string | null;
  farmer_email: string | null;
  start_date: string;
  end_date: string;
  monthly_value: number;
  annual_value: number;
  payment_method: string;
  auto_renewal: boolean;
  status: string;
  document_url: string | null;
  created_at: string;
  updated_at: string;
  // New relations
  contract_outdoors: ContractOutdoor[];
  contract_images: ContractImage[];
  // Legacy relation (for backward compatibility)
  outdoors?: {
    code: string;
    location: string;
    pdvs?: {
      name: string;
    };
  } | null;
}

export function useContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          contract_outdoors(
            outdoor:outdoors(id, code, location, pdvs(name))
          ),
          contract_images(id, image_url, page_order)
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
      
      // Check in contract_outdoors pivot table first
      const { data: pivotData, error: pivotError } = await supabase
        .from('contract_outdoors')
        .select(`
          contract:contracts(
            *,
            contract_outdoors(
              outdoor:outdoors(id, code, location, pdvs(name))
            ),
            contract_images(id, image_url, page_order)
          )
        `)
        .eq('outdoor_id', outdoorId)
        .maybeSingle();

      if (pivotError) throw pivotError;
      
      if (pivotData?.contract) {
        return pivotData.contract as Contract;
      }
      
      // Fallback: check legacy outdoor_id column
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          contract_outdoors(
            outdoor:outdoors(id, code, location, pdvs(name))
          ),
          contract_images(id, image_url, page_order)
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
  outdoorIds?: string[];
  imageUrls?: string[];
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

      // Update contract
      const { data, error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;

      // Update outdoor associations if provided
      if (input.outdoorIds !== undefined) {
        // Delete existing associations
        await supabase
          .from('contract_outdoors')
          .delete()
          .eq('contract_id', input.id);

        // Insert new associations
        if (input.outdoorIds.length > 0) {
          await supabase
            .from('contract_outdoors')
            .insert(
              input.outdoorIds.map(outdoorId => ({
                contract_id: input.id,
                outdoor_id: outdoorId,
              }))
            );
        }
      }

      // Update images if provided
      if (input.imageUrls !== undefined) {
        // Delete existing images
        await supabase
          .from('contract_images')
          .delete()
          .eq('contract_id', input.id);

        // Insert new images
        if (input.imageUrls.length > 0) {
          await supabase
            .from('contract_images')
            .insert(
              input.imageUrls.map((url, index) => ({
                contract_id: input.id,
                image_url: url,
                page_order: index,
              }))
            );
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract'] });
      queryClient.invalidateQueries({ queryKey: ['contract-images'] });
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
      // Cascade delete will handle contract_outdoors and contract_images
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
