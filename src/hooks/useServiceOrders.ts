import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// New status flow for service orders
export type ServiceOrderStatus = 
  | 'pending'           // Gerente criou, aguardando Admin
  | 'approved'          // Admin aprovou, aguardando Diretoria  
  | 'pending_director'  // Aguardando aprovação da diretoria
  | 'director_approved' // Diretoria aprovou
  | 'in_progress'       // Fornecedor em execução
  | 'completed'         // Fornecedor concluiu, aguardando validação
  | 'validated'         // Gerente validou
  | 'cancelled'         // Cancelada
  | 'correction_requested'; // Correção solicitada

export const statusConfig = {
  pending: { label: 'Pendente Admin', color: 'bg-yellow-500', step: 1 },
  approved: { label: 'Aprovada Admin', color: 'bg-blue-500', step: 2 },
  pending_director: { label: 'Aguardando Diretoria', color: 'bg-orange-500', step: 3 },
  director_approved: { label: 'Aprovada Diretoria', color: 'bg-green-500', step: 4 },
  in_progress: { label: 'Em Execução', color: 'bg-purple-500', step: 5 },
  completed: { label: 'Concluída', color: 'bg-emerald-500', step: 6 },
  validated: { label: 'Validada', color: 'bg-green-600', step: 7 },
  cancelled: { label: 'Cancelada', color: 'bg-red-500', step: 0 },
  correction_requested: { label: 'Correção Solicitada', color: 'bg-amber-500', step: 0 },
};

export interface ServiceOrder {
  id: string;
  number: string;
  outdoor_id: string;
  supplier_id: string;
  type: 'installation' | 'maintenance' | 'removal' | 'replacement';
  description: string;
  status: ServiceOrderStatus;
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

// Hook for pending admin approval
export function usePendingAdminServiceOrders() {
  return useQuery({
    queryKey: ['service-orders', 'pending-admin'],
    queryFn: async (): Promise<ServiceOrder[]> => {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          outdoor:outdoors(code, location, width, height, area, pdv:pdvs(name, address, city, state)),
          supplier:suppliers(name, cnpj, phone, email, address)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ServiceOrder[];
    },
  });
}

// Hook for pending director approval
export function usePendingDirectorServiceOrders() {
  return useQuery({
    queryKey: ['service-orders', 'pending-director'],
    queryFn: async (): Promise<ServiceOrder[]> => {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          outdoor:outdoors(code, location, width, height, area, pdv:pdvs(name, address, city, state)),
          supplier:suppliers(name, cnpj, phone, email, address)
        `)
        .eq('status', 'pending_director')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ServiceOrder[];
    },
  });
}

// Hook for supplier in-progress orders
export function useInProgressServiceOrders() {
  return useQuery({
    queryKey: ['service-orders', 'in-progress'],
    queryFn: async (): Promise<ServiceOrder[]> => {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          outdoor:outdoors(code, location, width, height, area, pdv:pdvs(name, address, city, state)),
          supplier:suppliers(name, cnpj, phone, email, address)
        `)
        .in('status', ['director_approved', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ServiceOrder[];
    },
  });
}

// Hook for manager validation
export function usePendingValidationServiceOrders() {
  return useQuery({
    queryKey: ['service-orders', 'pending-validation'],
    queryFn: async (): Promise<ServiceOrder[]> => {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          outdoor:outdoors(code, location, width, height, area, pdv:pdvs(name, address, city, state)),
          supplier:suppliers(name, cnpj, phone, email, address)
        `)
        .eq('status', 'completed')
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
          status: 'pending', // Start with pending admin approval
        })
        .select()
        .single();

      if (error) throw error;
      
      // Send notification to admin
      await supabase.rpc('notificar_por_role', {
        p_role: 'admin',
        p_tipo: 'os_nova',
        p_modulo: 'media',
        p_titulo: 'Nova Ordem de Serviço',
        p_mensagem: `Nova OS ${orderNumber} aguardando aprovação`,
        p_url_acao: '/admin/aprovacoes/os',
        p_id_referencia: data.id,
        p_tipo_referencia: 'service_order'
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('Ordem de serviço criada e enviada para aprovação!');
    },
    onError: (error) => {
      console.error('Error creating service order:', error);
      toast.error('Erro ao criar ordem de serviço');
    },
  });
}

interface UpdateServiceOrderInput {
  id: string;
  status: ServiceOrderStatus;
  observations?: string;
}

export function useUpdateServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, observations }: UpdateServiceOrderInput) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'approved' || status === 'director_approved') {
        updates.approved_at = new Date().toISOString();
      } else if (status === 'completed' || status === 'validated') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('service_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Send notifications based on status change
      const notificationMessages: Record<string, { role: string; title: string; message: string; url: string }> = {
        pending_director: {
          role: 'director',
          title: 'OS Aguardando Aprovação',
          message: `Ordem de serviço ${data.number} aguardando aprovação da diretoria`,
          url: '/diretoria/aprovacoes/os'
        },
        director_approved: {
          role: 'supplier',
          title: 'Nova OS Aprovada',
          message: `Ordem de serviço ${data.number} aprovada - iniciar execução`,
          url: '/service-orders'
        },
        completed: {
          role: 'manager',
          title: 'OS Concluída',
          message: `Ordem de serviço ${data.number} concluída pelo fornecedor - validar qualidade`,
          url: '/gerente/validacoes'
        },
        validated: {
          role: 'admin',
          title: 'OS Validada',
          message: `Ordem de serviço ${data.number} validada pelo gerente`,
          url: '/service-orders'
        }
      };

      const notification = notificationMessages[status];
      if (notification) {
        await supabase.rpc('notificar_por_role', {
          p_role: notification.role,
          p_tipo: 'os_status',
          p_modulo: 'media',
          p_titulo: notification.title,
          p_mensagem: notification.message,
          p_url_acao: notification.url,
          p_id_referencia: id,
          p_tipo_referencia: 'service_order'
        });
      }

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

// Admin approve - sends to director
export function useAdminApproveServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('service_orders')
        .update({ 
          status: 'pending_director',
          approved_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notify directors with approval permission
      await supabase.rpc('notificar_diretores_aprovadores', {
        p_tipo: 'os_aprovacao',
        p_titulo: 'OS Aguardando Aprovação',
        p_mensagem: `Ordem de serviço ${data.number} aguardando aprovação da diretoria`,
        p_url_acao: '/diretoria/aprovacoes/os',
        p_id_referencia: id
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('OS enviada para aprovação da diretoria!');
    },
    onError: (error) => {
      console.error('Error approving service order:', error);
      toast.error('Erro ao aprovar ordem de serviço');
    },
  });
}

// Director approve - sends to supplier
export function useDirectorApproveServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('service_orders')
        .update({ 
          status: 'director_approved'
        })
        .eq('id', id)
        .select(`
          *,
          supplier:suppliers(name, email)
        `)
        .single();

      if (error) throw error;

      // Notify admin and supplier
      await supabase.rpc('notificar_por_role', {
        p_role: 'admin',
        p_tipo: 'os_aprovada',
        p_modulo: 'media',
        p_titulo: 'OS Aprovada pela Diretoria',
        p_mensagem: `Ordem de serviço ${data.number} foi aprovada pela diretoria`,
        p_url_acao: '/service-orders',
        p_id_referencia: id,
        p_tipo_referencia: 'service_order'
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('OS aprovada e enviada ao fornecedor!');
    },
    onError: (error) => {
      console.error('Error approving service order:', error);
      toast.error('Erro ao aprovar ordem de serviço');
    },
  });
}

// Supplier starts execution
export function useStartServiceOrderExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('service_orders')
        .update({ status: 'in_progress' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('Execução iniciada!');
    },
    onError: (error) => {
      console.error('Error starting execution:', error);
      toast.error('Erro ao iniciar execução');
    },
  });
}

// Supplier completes execution
export function useCompleteServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('service_orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notify manager for validation
      await supabase.rpc('notificar_por_role', {
        p_role: 'manager',
        p_tipo: 'os_concluida',
        p_modulo: 'media',
        p_titulo: 'OS Concluída - Validar',
        p_mensagem: `Ordem de serviço ${data.number} concluída - aguardando validação`,
        p_url_acao: '/gerente/validacoes',
        p_id_referencia: id,
        p_tipo_referencia: 'service_order'
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('OS concluída - enviada para validação!');
    },
    onError: (error) => {
      console.error('Error completing service order:', error);
      toast.error('Erro ao concluir ordem de serviço');
    },
  });
}

// Manager validates
export function useValidateServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('service_orders')
        .update({ status: 'validated' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notify admin
      await supabase.rpc('notificar_por_role', {
        p_role: 'admin',
        p_tipo: 'os_validada',
        p_modulo: 'media',
        p_titulo: 'OS Validada',
        p_mensagem: `Ordem de serviço ${data.number} foi validada pelo gerente`,
        p_url_acao: '/service-orders',
        p_id_referencia: id,
        p_tipo_referencia: 'service_order'
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('OS validada com sucesso!');
    },
    onError: (error) => {
      console.error('Error validating service order:', error);
      toast.error('Erro ao validar ordem de serviço');
    },
  });
}

// Request correction
export function useRequestServiceOrderCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, observations }: { id: string; observations: string }) => {
      const { data, error } = await supabase
        .from('service_orders')
        .update({ 
          status: 'correction_requested',
          description: observations // Append observations
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('Correção solicitada!');
    },
    onError: (error) => {
      console.error('Error requesting correction:', error);
      toast.error('Erro ao solicitar correção');
    },
  });
}
