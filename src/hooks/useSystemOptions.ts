import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

export interface SystemOption {
  id: string;
  category: string;
  option_key: string;
  option_label: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Mapeamento de categorias para labels amigáveis
export const CATEGORY_LABELS: Record<string, string> = {
  outdoor_description_type: 'Descrição/Tipo de Outdoor',
  outdoor_ownership_type: 'Tipo de Propriedade (Outdoor)',
  pdv_status_importacao: 'Status de Importação (PDV)',
  pdv_status: 'Status do PDV',
  pdv_type: 'Tipo de PDV',
  material_request_status: 'Status de Requisição de Material',
  maintenance_request_status: 'Status de Manutenção',
  campaign_status: 'Status de Campanha',
  supplier_service_type: 'Tipos de Serviço (Fornecedor)',
};

// Buscar opções de uma categoria específica
export function useSystemOptions(category: string) {
  return useQuery({
    queryKey: ['system-options', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_options')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as SystemOption[];
    },
    enabled: !!category,
  });
}

// Buscar todas as opções (incluindo inativas) para gerenciamento
export function useAllSystemOptions(category: string) {
  return useQuery({
    queryKey: ['system-options-all', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_options')
        .select('*')
        .eq('category', category)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as SystemOption[];
    },
    enabled: !!category,
  });
}

// Buscar todas as categorias disponíveis
export function useSystemOptionsCategories() {
  return useQuery({
    queryKey: ['system-options-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_options')
        .select('category')
        .order('category');

      if (error) throw error;
      
      // Retornar categorias únicas
      const categories = [...new Set(data.map(item => item.category))];
      return categories;
    },
  });
}

// Criar nova opção
export function useCreateSystemOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      category: string;
      option_key: string;
      option_label: string;
      display_order?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('system_options')
        .insert({
          category: input.category,
          option_key: input.option_key,
          option_label: input.option_label,
          display_order: input.display_order ?? 999,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system-options', variables.category] });
      queryClient.invalidateQueries({ queryKey: ['system-options-all', variables.category] });
      queryClient.invalidateQueries({ queryKey: ['system-options-categories'] });
      showToast.success('Opção criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating option:', error);
      if (error?.code === '23505') {
        showToast.error('Já existe uma opção com essa chave nesta categoria.');
      } else {
        showToast.error('Erro ao criar opção.');
      }
    },
  });
}

// Atualizar opção existente
export function useUpdateSystemOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      category: string;
      option_key?: string;
      option_label?: string;
      display_order?: number;
      is_active?: boolean;
    }) => {
      const updateData: Partial<SystemOption> = {
        updated_at: new Date().toISOString(),
      };

      if (input.option_key !== undefined) updateData.option_key = input.option_key;
      if (input.option_label !== undefined) updateData.option_label = input.option_label;
      if (input.display_order !== undefined) updateData.display_order = input.display_order;
      if (input.is_active !== undefined) updateData.is_active = input.is_active;

      const { data, error } = await supabase
        .from('system_options')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, category: input.category };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-options', data.category] });
      queryClient.invalidateQueries({ queryKey: ['system-options-all', data.category] });
      showToast.success('Opção atualizada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error updating option:', error);
      showToast.error('Erro ao atualizar opção.');
    },
  });
}

// Excluir opção (soft delete via is_active = false)
export function useDeleteSystemOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; category: string }) => {
      const { error } = await supabase
        .from('system_options')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-options', data.category] });
      queryClient.invalidateQueries({ queryKey: ['system-options-all', data.category] });
      showToast.success('Opção excluída com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error deleting option:', error);
      showToast.error('Erro ao excluir opção.');
    },
  });
}

// Reordenar opções
export function useReorderSystemOptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { category: string; orderedIds: string[] }) => {
      // Atualizar cada opção com sua nova ordem
      const updates = input.orderedIds.map((id, index) => 
        supabase
          .from('system_options')
          .update({ display_order: index + 1, updated_at: new Date().toISOString() })
          .eq('id', id)
      );

      await Promise.all(updates);
      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-options', data.category] });
      queryClient.invalidateQueries({ queryKey: ['system-options-all', data.category] });
      showToast.success('Ordem atualizada!');
    },
    onError: (error) => {
      console.error('Error reordering options:', error);
      showToast.error('Erro ao reordenar opções.');
    },
  });
}
