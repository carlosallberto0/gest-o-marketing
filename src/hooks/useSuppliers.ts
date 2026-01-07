import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

export interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  service_types: string[];
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async (): Promise<Supplier[]> => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      return (data || []) as Supplier[];
    },
  });
}

export function useActiveSuppliers() {
  return useQuery({
    queryKey: ['suppliers', 'active'],
    queryFn: async (): Promise<Supplier[]> => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return (data || []) as Supplier[];
    },
  });
}

export interface CreateSupplierInput {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  service_types: string[];
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSupplierInput) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(input as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      showToast.success('Fornecedor cadastrado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating supplier:', error);
      showToast.error('Erro ao cadastrar fornecedor');
    },
  });
}

export interface UpdateSupplierInput {
  id: string;
  name?: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  service_types?: string[];
  status?: 'active' | 'inactive';
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateSupplierInput) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      showToast.success('Fornecedor atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating supplier:', error);
      showToast.error('Erro ao atualizar fornecedor');
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      showToast.success('Fornecedor excluído!');
    },
    onError: (error) => {
      console.error('Error deleting supplier:', error);
      showToast.error('Erro ao excluir fornecedor');
    },
  });
}
