import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { showToast } from '@/lib/toast';

export interface SupplierAssignment {
  id: string;
  maintenance_request_id: string;
  supplier_id: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  deadline_days: number | null;
  deadline_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  quoted_value: number | null;
  approved_value: number | null;
  approved_by: string | null;
  approved_at: string | null;
  supplier_notes: string | null;
  admin_notes: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
  supplier?: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  maintenance_request?: {
    id: string;
    reason: string;
    status: string;
    urgency: string | null;
    maintenance_type: string | null;
    outdoor?: {
      id: string;
      code: string;
      location: string;
      pdv?: {
        id: string;
        name: string;
        city: string;
        state: string;
      };
    };
  };
}

export function useSupplierAssignments() {
  return useQuery({
    queryKey: ['supplier-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_maintenance_assignments')
        .select(`
          *,
          supplier:suppliers(id, name, phone, email),
          maintenance_request:maintenance_requests(
            id, reason, status, urgency, maintenance_type,
            outdoor:outdoors(
              id, code, location,
              pdv:pdvs(id, name, city, state)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SupplierAssignment[];
    },
  });
}

export function useAssignmentsBySupplier(supplierId: string) {
  return useQuery({
    queryKey: ['supplier-assignments', 'supplier', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_maintenance_assignments')
        .select(`
          *,
          supplier:suppliers(id, name, phone, email),
          maintenance_request:maintenance_requests(
            id, reason, status, urgency, maintenance_type,
            outdoor:outdoors(
              id, code, location,
              pdv:pdvs(id, name, city, state)
            )
          )
        `)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SupplierAssignment[];
    },
    enabled: !!supplierId,
  });
}

export function useAssignmentsByMaintenance(maintenanceRequestId: string) {
  return useQuery({
    queryKey: ['supplier-assignments', 'maintenance', maintenanceRequestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_maintenance_assignments')
        .select(`
          *,
          supplier:suppliers(id, name, phone, email)
        `)
        .eq('maintenance_request_id', maintenanceRequestId)
        .maybeSingle();

      if (error) throw error;
      return data as SupplierAssignment | null;
    },
    enabled: !!maintenanceRequestId,
  });
}

export function usePendingAssignments() {
  return useQuery({
    queryKey: ['supplier-assignments', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_maintenance_assignments')
        .select(`
          *,
          supplier:suppliers(id, name, phone, email),
          maintenance_request:maintenance_requests(
            id, reason, status, urgency, maintenance_type,
            outdoor:outdoors(
              id, code, location,
              pdv:pdvs(id, name, city, state)
            )
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SupplierAssignment[];
    },
  });
}

interface AssignSupplierInput {
  maintenance_request_id: string;
  supplier_id: string;
  admin_notes?: string;
  deadline_days?: number;
}

export function useAssignSupplierToMaintenance() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: AssignSupplierInput) => {
      const deadlineDate = input.deadline_days 
        ? new Date(Date.now() + input.deadline_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('supplier_maintenance_assignments')
        .insert({
          maintenance_request_id: input.maintenance_request_id,
          supplier_id: input.supplier_id,
          admin_notes: input.admin_notes,
          deadline_days: input.deadline_days,
          deadline_date: deadlineDate,
          assigned_by: profile?.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Also record in deadline history if deadline was set
      if (input.deadline_days && data) {
        await supabase.from('supplier_deadline_history').insert({
          assignment_id: data.id,
          deadline_type: 'initial',
          deadline_days: input.deadline_days,
          deadline_date: deadlineDate,
          reason: 'Prazo inicial definido pelo admin',
          set_by: profile?.id,
        });
      }

      return data;
    },
    onSuccess: () => {
      showToast.success('Fornecedor atribuído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['supplier-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
    },
    onError: (error: Error) => {
      console.error('Error assigning supplier:', error);
      showToast.error('Erro ao atribuir fornecedor');
    },
  });
}

interface SetDeadlineInput {
  assignment_id: string;
  deadline_days: number;
  reason?: string;
}

export function useSetDeadline() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: SetDeadlineInput) => {
      const deadlineDate = new Date(Date.now() + input.deadline_days * 24 * 60 * 60 * 1000).toISOString();

      // Update assignment
      const { data, error } = await supabase
        .from('supplier_maintenance_assignments')
        .update({
          deadline_days: input.deadline_days,
          deadline_date: deadlineDate,
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.assignment_id)
        .select()
        .single();

      if (error) throw error;

      // Record in history
      await supabase.from('supplier_deadline_history').insert({
        assignment_id: input.assignment_id,
        deadline_type: 'adjusted',
        deadline_days: input.deadline_days,
        deadline_date: deadlineDate,
        reason: input.reason || 'Prazo definido pelo fornecedor',
        set_by: profile?.id,
      });

      return data;
    },
    onSuccess: () => {
      showToast.success('Prazo definido com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['supplier-assignments'] });
    },
    onError: (error: Error) => {
      console.error('Error setting deadline:', error);
      showToast.error('Erro ao definir prazo');
    },
  });
}

interface UpdateStatusInput {
  assignment_id: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
}

export function useUpdateAssignmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateStatusInput) => {
      const updates: Record<string, unknown> = {
        status: input.status,
        updated_at: new Date().toISOString(),
      };

      if (input.status === 'in_progress') {
        updates.started_at = new Date().toISOString();
      } else if (input.status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('supplier_maintenance_assignments')
        .update(updates)
        .eq('id', input.assignment_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showToast.success('Status atualizado!');
      queryClient.invalidateQueries({ queryKey: ['supplier-assignments'] });
    },
    onError: (error: Error) => {
      console.error('Error updating status:', error);
      showToast.error('Erro ao atualizar status');
    },
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('supplier_maintenance_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      showToast.success('Atribuição removida!');
      queryClient.invalidateQueries({ queryKey: ['supplier-assignments'] });
    },
    onError: (error: Error) => {
      console.error('Error deleting assignment:', error);
      showToast.error('Erro ao remover atribuição');
    },
  });
}

// Stats for suppliers
export function useSupplierStats(supplierId?: string) {
  return useQuery({
    queryKey: ['supplier-stats', supplierId],
    queryFn: async () => {
      let query = supabase
        .from('supplier_maintenance_assignments')
        .select('status, deadline_date, completed_at');

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter(d => d.status === 'pending').length,
        accepted: data.filter(d => d.status === 'accepted').length,
        inProgress: data.filter(d => d.status === 'in_progress').length,
        completed: data.filter(d => d.status === 'completed').length,
        cancelled: data.filter(d => d.status === 'cancelled').length,
        overdue: data.filter(d => 
          d.deadline_date && 
          new Date(d.deadline_date) < new Date() && 
          d.status !== 'completed' && 
          d.status !== 'cancelled'
        ).length,
        onTimeRate: 0,
      };

      // Calculate on-time rate
      const completedWithDeadline = data.filter(d => 
        d.status === 'completed' && d.deadline_date && d.completed_at
      );
      if (completedWithDeadline.length > 0) {
        const onTime = completedWithDeadline.filter(d => 
          new Date(d.completed_at!) <= new Date(d.deadline_date!)
        ).length;
        stats.onTimeRate = Math.round((onTime / completedWithDeadline.length) * 100);
      }

      return stats;
    },
  });
}
