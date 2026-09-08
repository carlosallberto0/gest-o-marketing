import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

export interface SupplierPricing {
  id: string;
  supplier_id: string;
  service_type: string;
  custo_base: number;
  custo_por_m2: number;
  custo_hora_trabalho: number;
  tempo_estimado_horas: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Novos campos de produção
  custo_impressao_m2: number;
  custo_envio_base: number;
  inclui_material: boolean;
  custo_construcao_base: number;
  custo_construcao_m2: number;
}

export function useSupplierPricing(supplierId?: string) {
  return useQuery({
    queryKey: ['supplier-pricing', supplierId],
    queryFn: async (): Promise<SupplierPricing[]> => {
      let query = supabase
        .from('supplier_pricing')
        .select('*')
        .order('service_type');

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!supplierId || supplierId === undefined,
  });
}

export interface UpsertSupplierPricingInput {
  supplier_id: string;
  service_type: string;
  custo_base: number;
  custo_por_m2: number;
  custo_hora_trabalho: number;
  tempo_estimado_horas: number;
  observacoes?: string;
  // Novos campos de produção
  custo_impressao_m2?: number;
  custo_envio_base?: number;
  inclui_material?: boolean;
  custo_construcao_base?: number;
  custo_construcao_m2?: number;
}

export function useUpsertSupplierPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpsertSupplierPricingInput) => {
      const { data, error } = await supabase
        .from('supplier_pricing')
        .upsert(input, { onConflict: 'supplier_id,service_type' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-pricing', variables.supplier_id] });
      queryClient.invalidateQueries({ queryKey: ['supplier-pricing'] });
      showToast.success('Preços atualizados com sucesso!');
    },
    onError: (error) => {
      console.error('Error upserting supplier pricing:', error);
      showToast.error('Erro ao atualizar preços do fornecedor');
    },
  });
}

export function useDeleteSupplierPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplierId, serviceType }: { supplierId: string; serviceType: string }) => {
      const { error } = await supabase
        .from('supplier_pricing')
        .delete()
        .eq('supplier_id', supplierId)
        .eq('service_type', serviceType);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-pricing', variables.supplierId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-pricing'] });
    },
    onError: (error) => {
      console.error('Error deleting supplier pricing:', error);
      showToast.error('Erro ao remover preço');
    },
  });
}

// Get pricing for a specific service type
export function getPricingForService(
  pricing: SupplierPricing[],
  serviceType: string
): SupplierPricing | undefined {
  return pricing.find(p => p.service_type === serviceType);
}
