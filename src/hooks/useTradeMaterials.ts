import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';
import { Database } from '@/integrations/supabase/types';

type MaterialType = Database['public']['Tables']['trade_materials']['Row']['type'];

export interface TradeMaterial {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: MaterialType;
  category: string;
  unit_cost: number;
  current_stock: number;
  minimum_stock: number;
  status: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useTradeMaterials() {
  return useQuery({
    queryKey: ['trade-materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_materials')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as TradeMaterial[];
    },
  });
}

export function useCreateTradeMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (material: {
      code: string;
      name: string;
      description?: string | null;
      type: MaterialType;
      category: string;
      unit_cost: number;
      current_stock?: number;
      minimum_stock?: number;
      status?: string;
      image_url?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('trade_materials')
        .insert(material)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-materials'] });
      showToast.success('Material criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating material:', error);
      showToast.error('Erro ao criar material');
    },
  });
}

export function useUpdateTradeMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...material }: { 
      id: string;
      code?: string;
      name?: string;
      description?: string | null;
      type?: MaterialType;
      category?: string;
      unit_cost?: number;
      current_stock?: number;
      minimum_stock?: number;
      status?: string;
      image_url?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('trade_materials')
        .update(material)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-materials'] });
      showToast.success('Material atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating material:', error);
      showToast.error('Erro ao atualizar material');
    },
  });
}

export function useDeleteTradeMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trade_materials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-materials'] });
      showToast.success('Material excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting material:', error);
      showToast.error('Erro ao excluir material. Verifique se não há dados vinculados.');
    },
  });
}
