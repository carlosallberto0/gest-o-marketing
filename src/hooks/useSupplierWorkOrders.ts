import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

export interface SupplierWorkOrder {
  id: string;
  package_id: string;
  supplier_id: string;
  assigned_by: string;
  assigned_at: string;
  status: 'pending' | 'in_progress' | 'completed' | 'validated';
  completed_at: string | null;
  validated_at: string | null;
  validated_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  supplier?: { name: string; cnpj: string; phone: string; email: string };
  package?: { id: string; observations: string | null; reviewed_at: string | null };
  items?: SupplierWorkOrderItem[];
}

export interface SupplierWorkOrderItem {
  id: string;
  work_order_id: string;
  outdoor_id: string;
  package_item_id: string | null;
  original_photo_url: string | null;
  execution_photo_url: string | null;
  executed: boolean;
  executed_at: string | null;
  observations: string | null;
  created_at: string;
  outdoor?: {
    code: string;
    location: string;
    width: number;
    height: number;
    photo_url: string | null;
    non_operational_reason: string | null;
    pdv?: { name: string; city: string; state: string };
  };
}

// Fetch all work orders (admin view)
export function useSupplierWorkOrders(statusFilter?: string) {
  return useQuery({
    queryKey: ['supplier-work-orders', statusFilter],
    queryFn: async (): Promise<SupplierWorkOrder[]> => {
      let query = supabase
        .from('supplier_work_orders')
        .select(`
          *,
          supplier:suppliers(name, cnpj, phone, email),
          package:maintenance_approval_packages(id, observations, reviewed_at),
          items:supplier_work_order_items(
            *,
            outdoor:outdoors(code, location, width, height, photo_url, non_operational_reason, pdv:pdvs(name, city, state))
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SupplierWorkOrder[];
    },
  });
}

// Fetch work orders for current supplier user
export function useMySupplierWorkOrders() {
  return useQuery({
    queryKey: ['my-supplier-work-orders'],
    queryFn: async (): Promise<SupplierWorkOrder[]> => {
      const { data, error } = await supabase
        .from('supplier_work_orders')
        .select(`
          *,
          supplier:suppliers(name, cnpj, phone, email),
          package:maintenance_approval_packages(id, observations, reviewed_at),
          items:supplier_work_order_items(
            *,
            outdoor:outdoors(code, location, width, height, photo_url, non_operational_reason, pdv:pdvs(name, city, state))
          )
        `)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SupplierWorkOrder[];
    },
  });
}

// Assign work order to supplier (admin action)
interface AssignWorkOrderInput {
  package_id: string;
  supplier_id: string;
  items: Array<{
    outdoor_id: string;
    package_item_id?: string;
    original_photo_url?: string;
  }>;
}

export function useAssignWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignWorkOrderInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: workOrder, error: woError } = await supabase
        .from('supplier_work_orders')
        .insert({
          package_id: input.package_id,
          supplier_id: input.supplier_id,
          assigned_by: user.id,
        } as any)
        .select()
        .single();

      if (woError) throw woError;

      const itemsToInsert = input.items.map(item => ({
        work_order_id: (workOrder as any).id,
        outdoor_id: item.outdoor_id,
        package_item_id: item.package_item_id || null,
        original_photo_url: item.original_photo_url || null,
      }));

      const { error: itemsError } = await supabase
        .from('supplier_work_order_items')
        .insert(itemsToInsert as any);

      if (itemsError) throw itemsError;

      // Update package status
      await supabase
        .from('maintenance_approval_packages')
        .update({ status: 'sent_to_supplier' } as any)
        .eq('id', input.package_id);

      return workOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-packages'] });
      showToast.success('Pacote enviado ao fornecedor!');
    },
    onError: (error) => {
      console.error('Error assigning work order:', error);
      showToast.error('Erro ao enviar pacote ao fornecedor');
    },
  });
}

// Supplier marks item as executed
export function useMarkItemExecuted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, executionPhotoUrl, observations, outdoorId }: { 
      itemId: string; 
      executionPhotoUrl?: string;
      observations?: string;
      outdoorId?: string;
    }) => {
      const updates: Record<string, unknown> = {
        executed: true,
        executed_at: new Date().toISOString(),
      };
      if (executionPhotoUrl) updates.execution_photo_url = executionPhotoUrl;
      if (observations) updates.observations = observations;

      const { data, error } = await supabase
        .from('supplier_work_order_items')
        .update(updates as any)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      // Atualizar foto principal do outdoor com a foto de execução via RPC segura
      if (executionPhotoUrl && outdoorId) {
        await supabase.rpc('update_outdoor_photo_from_supplier', {
          p_outdoor_id: outdoorId,
          p_photo_url: executionPhotoUrl,
        } as any);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-supplier-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['outdoors'] });
      showToast.success('Item marcado como executado!');
    },
    onError: (error) => {
      console.error('Error marking item:', error);
      showToast.error('Erro ao marcar item');
    },
  });
}

// Supplier submits completed work order
export function useSubmitWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workOrderId: string) => {
      const { data, error } = await supabase
        .from('supplier_work_orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        } as any)
        .eq('id', workOrderId)
        .select()
        .single();

      if (error) throw error;

      // Fetch supplier name and items count for rich notification
      let supplierName = 'Fornecedor';
      let itemCount = 0;
      try {
        const wo = data as any;
        const { data: woFull } = await supabase
          .from('supplier_work_orders')
          .select('supplier:suppliers(name), items:supplier_work_order_items(id)')
          .eq('id', workOrderId)
          .single();
        supplierName = (woFull as any)?.supplier?.name || 'Fornecedor';
        itemCount = (woFull as any)?.items?.length || 0;
      } catch {}

      // Notify admin
      try {
        await supabase.rpc('notificar_por_role', {
          p_role: 'super_admin' as any,
          p_tipo: 'work_order_completed',
          p_modulo: 'media',
          p_titulo: `${supplierName} concluiu manutenção`,
          p_mensagem: `${supplierName} concluiu manutenção de ${itemCount} outdoor(s) - aguardando validação`,
          p_url_acao: '/service-orders',
          p_id_referencia: workOrderId,
          p_tipo_referencia: 'supplier_work_order'
        });
      } catch (e) {
        console.error('Error sending notification:', e);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-supplier-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-work-orders'] });
      showToast.success('Ordem enviada para validação!');
    },
    onError: (error) => {
      console.error('Error submitting work order:', error);
      showToast.error('Erro ao enviar ordem');
    },
  });
}

// Admin deletes a work order and its related test data (cascade)
export function useDeleteWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workOrderId: string) => {
      // 1. Get work order to find package_id
      const { data: wo, error: woErr } = await supabase
        .from('supplier_work_orders')
        .select('id, package_id')
        .eq('id', workOrderId)
        .single();
      if (woErr) throw woErr;

      // 2. Delete work order items
      await supabase
        .from('supplier_work_order_items')
        .delete()
        .eq('work_order_id', workOrderId);

      // 3. Delete work order
      await supabase
        .from('supplier_work_orders')
        .delete()
        .eq('id', workOrderId);

      // 4. Delete package items
      await supabase
        .from('maintenance_package_items')
        .delete()
        .eq('package_id', (wo as any).package_id);

      // 5. Delete the package
      await supabase
        .from('maintenance_approval_packages')
        .delete()
        .eq('id', (wo as any).package_id);

      return wo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-packages'] });
      showToast.success('Dados de teste excluídos com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting work order:', error);
      showToast.error('Erro ao excluir dados de teste');
    },
  });
}

// Super Admin reverts item execution back to pending
export function useRevertItemExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      // 1. Revert the item
      const { data: item, error } = await supabase
        .from('supplier_work_order_items')
        .update({
          executed: false,
          executed_at: null,
          execution_photo_url: null,
        } as any)
        .eq('id', itemId)
        .select('work_order_id')
        .single();

      if (error) throw error;

      // 2. Check if all items in the work order are now non-executed
      const { data: allItems } = await supabase
        .from('supplier_work_order_items')
        .select('id, executed')
        .eq('work_order_id', (item as any).work_order_id);

      const anyExecuted = (allItems || []).some((i: any) => i.executed);

      // 3. If no items are executed, revert work order to pending
      if (!anyExecuted) {
        await supabase
          .from('supplier_work_orders')
          .update({
            status: 'pending',
            completed_at: null,
          } as any)
          .eq('id', (item as any).work_order_id);
      } else {
        // Some items still executed but not all — revert to in_progress
        await supabase
          .from('supplier_work_orders')
          .update({
            status: 'in_progress',
            completed_at: null,
          } as any)
          .eq('id', (item as any).work_order_id);
      }

      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-supplier-work-orders'] });
      showToast.success('Execução revertida! Item voltou para o fornecedor.');
    },
    onError: (error) => {
      console.error('Error reverting item execution:', error);
      showToast.error('Erro ao reverter execução do item');
    },
  });
}

// Admin validates completed work order
export function useValidateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workOrderId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('supplier_work_orders')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
        } as any)
        .eq('id', workOrderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-work-orders'] });
      showToast.success('Ordem validada com sucesso!');
    },
    onError: (error) => {
      console.error('Error validating work order:', error);
      showToast.error('Erro ao validar ordem');
    },
  });
}
