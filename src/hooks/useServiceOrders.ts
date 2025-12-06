import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ServiceOrder {
  id: string;
  number: string;
  outdoor_id: string;
  supplier_id: string;
  type: 'installation' | 'maintenance' | 'removal' | 'replacement';
  description: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  total_cost: number;
  pdf_url: string | null;
  created_at: string;
  approved_at: string | null;
  completed_at: string | null;
  // Joined data
  outdoor?: {
    code: string;
    location: string;
    width: number;
    height: number;
    area: number | null;
    pdv?: {
      name: string;
      address: string;
      city: string;
      state: string;
    };
  };
  supplier?: {
    name: string;
    cnpj: string;
    phone: string;
    email: string;
    address: string;
  };
}

export function useServiceOrders() {
  return useQuery({
    queryKey: ['service-orders'],
    queryFn: async (): Promise<ServiceOrder[]> => {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          outdoor:outdoors(code, location, width, height, area, pdv:pdvs(name, address, city, state)),
          supplier:suppliers(name, cnpj, phone, email, address)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ServiceOrder[];
    },
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
}

interface CreateServiceOrderInput {
  outdoor_id: string;
  supplier_id: string;
  type: 'installation' | 'maintenance' | 'removal' | 'replacement';
  description: string;
  total_cost: number;
}

export function useCreateServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateServiceOrderInput) => {
      // Generate order number
      const { count } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true });

      const orderNumber = `OS-${String((count || 0) + 1).padStart(4, '0')}`;

      const { data, error } = await supabase
        .from('service_orders')
        .insert({
          ...input,
          number: orderNumber,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('Ordem de serviço criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating service order:', error);
      toast.error('Erro ao criar ordem de serviço');
    },
  });
}

interface UpdateServiceOrderInput {
  id: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
}

export function useUpdateServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: UpdateServiceOrderInput) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
      } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('service_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating service order:', error);
      toast.error('Erro ao atualizar ordem de serviço');
    },
  });
}

export function useDeleteServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('Ordem de serviço excluída!');
    },
    onError: (error) => {
      console.error('Error deleting service order:', error);
      toast.error('Erro ao excluir ordem de serviço');
    },
  });
}