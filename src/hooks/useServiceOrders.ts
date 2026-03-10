import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

// New status flow for service orders (extended from DB enum)
export type ServiceOrderStatus = 
  | 'pending'           // Gerente criou, aguardando Admin
  | 'approved'          // Admin aprovou (legacy)  
  | 'pending_director'  // Aguardando aprovação da diretoria
  | 'director_approved' // Diretoria aprovou
  | 'in_progress'       // Fornecedor em execução
  | 'completed'         // Fornecedor concluiu, aguardando validação
  | 'validated'         // Gerente validou
  | 'cancelled'         // Cancelada
  | 'correction_requested'; // Correção solicitada

export const statusConfig: Record<ServiceOrderStatus, { label: string; color: string; step: number }> = {
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
        .eq('status', 'pending' as any)
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
        .eq('status', 'pending_director' as any)
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
        .in('status', ['director_approved', 'in_progress'] as any)
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
        .eq('status', 'completed' as any)
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
  custo_fornecedor?: number;
  custos_operacionais?: number;
  multiplicador_regional?: number;
  detalhamento_custos?: Record<string, unknown>;
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

      const insertData: any = {
        outdoor_id: input.outdoor_id,
        supplier_id: input.supplier_id,
        type: input.type,
        description: input.description,
        total_cost: input.total_cost,
        custo_fornecedor: input.custo_fornecedor || 0,
        custos_operacionais: input.custos_operacionais || 0,
        multiplicador_regional: input.multiplicador_regional || 1,
        detalhamento_custos: input.detalhamento_custos || {},
        number: orderNumber,
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('service_orders')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      
      // Fetch outdoor info for rich notification
      let outdoorCode = '';
      try {
        const { data: outdoorInfo } = await supabase
          .from('outdoors')
          .select('code')
          .eq('id', input.outdoor_id)
          .single();
        outdoorCode = outdoorInfo?.code || '';
      } catch {}

      // Send notification to admin
      try {
        await supabase.rpc('notificar_por_role', {
          p_role: 'admin' as any,
          p_tipo: 'os_nova',
          p_modulo: 'media',
          p_titulo: `Nova OS ${orderNumber} - ${outdoorCode}`,
          p_mensagem: `Nova OS ${orderNumber} para ${outdoorCode} aguardando aprovação`,
          p_url_acao: '/admin/aprovacoes/os',
          p_id_referencia: data.id,
          p_tipo_referencia: 'service_order'
        });
      } catch (e) {
        console.error('Error sending notification:', e);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      showToast.success('Ordem de serviço criada e enviada para aprovação!');
    },
    onError: (error) => {
      console.error('Error creating service order:', error);
      showToast.error('Erro ao criar ordem de serviço');
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
    mutationFn: async ({ id, status }: UpdateServiceOrderInput) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'approved' || status === 'director_approved') {
        updates.approved_at = new Date().toISOString();
      } else if (status === 'completed' || status === 'validated') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('service_orders')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      showToast.success('Status atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating service order:', error);
      showToast.error('Erro ao atualizar ordem de serviço');
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
      showToast.success('Ordem de serviço excluída!');
    },
    onError: (error) => {
      console.error('Error deleting service order:', error);
      showToast.error('Erro ao excluir ordem de serviço');
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
          status: 'pending_director' as any,
          approved_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Fetch outdoor info for rich notification
      let outdoorCode = '';
      try {
        const { data: outdoorInfo } = await supabase
          .from('outdoors')
          .select('code')
          .eq('id', data.outdoor_id)
          .single();
        outdoorCode = outdoorInfo?.code || '';
      } catch {}

      // Notify directors with approval permission
      try {
        await supabase.rpc('notificar_diretores_aprovadores', {
          p_tipo: 'os_aprovacao',
          p_titulo: `OS ${data.number} - ${outdoorCode} Aguardando Aprovação`,
          p_mensagem: `OS ${data.number} para ${outdoorCode} aguardando aprovação da diretoria`,
          p_url_acao: '/diretoria/aprovacoes/os',
          p_id_referencia: id
        });
      } catch (e) {
        console.error('Error sending notification:', e);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      showToast.success('OS enviada para aprovação da diretoria!');
    },
    onError: (error) => {
      console.error('Error approving service order:', error);
      showToast.error('Erro ao aprovar ordem de serviço');
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
          status: 'director_approved' as any
        })
        .eq('id', id)
        .select(`
          *,
          supplier:suppliers(name, email)
        `)
        .single();

      if (error) throw error;

      // Fetch director name for rich notification
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let directorName = 'Diretoria';
      if (currentUser) {
        const { data: profile } = await supabase.from('profiles').select('name').eq('id', currentUser.id).single();
        directorName = profile?.name || 'Diretoria';
      }

      // Notify admin
      try {
        await supabase.rpc('notificar_por_role', {
          p_role: 'admin' as any,
          p_tipo: 'os_aprovada',
          p_modulo: 'media',
          p_titulo: `OS ${data.number} Aprovada por ${directorName}`,
          p_mensagem: `${directorName} aprovou OS ${data.number}`,
          p_url_acao: '/service-orders',
          p_id_referencia: id,
          p_tipo_referencia: 'service_order'
        });
      } catch (e) {
        console.error('Error sending notification:', e);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      showToast.success('OS aprovada e enviada ao fornecedor!');
    },
    onError: (error) => {
      console.error('Error approving service order:', error);
      showToast.error('Erro ao aprovar ordem de serviço');
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
        .update({ status: 'in_progress' as any })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      showToast.success('Execução iniciada!');
    },
    onError: (error) => {
      console.error('Error starting execution:', error);
      showToast.error('Erro ao iniciar execução');
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
          status: 'completed' as any,
          completed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Fetch outdoor code for rich notification
      let outdoorCode = '';
      try {
        const { data: outdoorInfo } = await supabase
          .from('outdoors')
          .select('code')
          .eq('id', data.outdoor_id)
          .single();
        outdoorCode = outdoorInfo?.code || '';
      } catch {}

      // Notify manager for validation
      try {
        await supabase.rpc('notificar_por_role', {
          p_role: 'manager' as any,
          p_tipo: 'os_concluida',
          p_modulo: 'media',
          p_titulo: `OS ${data.number} Concluída - ${outdoorCode}`,
          p_mensagem: `OS ${data.number} para ${outdoorCode} concluída - aguardando validação`,
          p_url_acao: '/gerente/validacoes',
          p_id_referencia: id,
          p_tipo_referencia: 'service_order'
        });
      } catch (e) {
        console.error('Error sending notification:', e);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      showToast.success('OS concluída - enviada para validação!');
    },
    onError: (error) => {
      console.error('Error completing service order:', error);
      showToast.error('Erro ao concluir ordem de serviço');
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
        .update({ status: 'validated' as any })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notify admin
      try {
        await supabase.rpc('notificar_por_role', {
          p_role: 'admin' as any,
          p_tipo: 'os_validada',
          p_modulo: 'media',
          p_titulo: 'OS Validada',
          p_mensagem: `Ordem de serviço ${data.number} foi validada pelo gerente`,
          p_url_acao: '/service-orders',
          p_id_referencia: id,
          p_tipo_referencia: 'service_order'
        });
      } catch (e) {
        console.error('Error sending notification:', e);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      showToast.success('OS validada com sucesso!');
    },
    onError: (error) => {
      console.error('Error validating service order:', error);
      showToast.error('Erro ao validar ordem de serviço');
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
          status: 'correction_requested' as any,
          description: observations
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      showToast.success('Correção solicitada!');
    },
    onError: (error) => {
      console.error('Error requesting correction:', error);
      showToast.error('Erro ao solicitar correção');
    },
  });
}
