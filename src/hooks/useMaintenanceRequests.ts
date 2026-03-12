import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';
import { notificarPorRole } from '@/hooks/useNotificacoes';

export interface MaintenanceRequest {
  id: string;
  outdoor_id: string;
  requester_id: string;
  evaluation_id: string | null;
  reason: string;
  observations: string | null;
  photos: string[];
  current_photo_url: string | null;
  status: 'pending_review' | 'approved' | 'rejected' | 'consolidated';
  approved_by: string | null;
  approved_at: string | null;
  service_order_id: string | null;
  created_at: string;
  updated_at: string;
  urgency: 'baixa' | 'normal' | 'alta' | 'emergencial' | null;
  maintenance_type: 'preventiva' | 'corretiva' | null;
  // Joined data
  outdoor?: {
    code: string;
    location: string;
    width: number;
    height: number;
    photo_url: string | null;
    pdv?: {
      name: string;
      city: string;
      state: string;
    };
  };
  requester?: {
    id: string;
    name: string;
    email: string;
  };
  approver?: {
    name: string;
  };
}

export function useMaintenanceRequests() {
  return useQuery({
    queryKey: ['maintenance-requests'],
    queryFn: async (): Promise<MaintenanceRequest[]> => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          outdoor:outdoors(code, location, width, height, photo_url, pdv:pdvs(name, city, state)),
          requester:profiles!maintenance_requests_requester_id_fkey(id, name, email),
          approver:profiles!maintenance_requests_approved_by_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as MaintenanceRequest[];
    },
  });
}

export function usePendingMaintenanceRequests() {
  return useQuery({
    queryKey: ['maintenance-requests', 'pending'],
    queryFn: async (): Promise<MaintenanceRequest[]> => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          outdoor:outdoors(code, location, width, height, photo_url, pdv:pdvs(name, city, state)),
          requester:profiles!maintenance_requests_requester_id_fkey(id, name, email),
          approver:profiles!maintenance_requests_approved_by_fkey(name)
        `)
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as MaintenanceRequest[];
    },
  });
}

export function useApprovedMaintenanceRequests() {
  return useQuery({
    queryKey: ['maintenance-requests', 'approved'],
    queryFn: async (): Promise<MaintenanceRequest[]> => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          outdoor:outdoors(code, location, width, height, photo_url, pdv:pdvs(name, city, state)),
          requester:profiles!maintenance_requests_requester_id_fkey(id, name, email),
          approver:profiles!maintenance_requests_approved_by_fkey(name)
        `)
        .eq('status', 'approved')
        .is('service_order_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as MaintenanceRequest[];
    },
  });
}

export interface CreateMaintenanceRequestInput {
  outdoor_id: string;
  evaluation_id?: string;
  reason: string;
  observations?: string;
  photos?: string[];
  current_photo_url?: string;
  urgency?: 'baixa' | 'normal' | 'alta' | 'emergencial';
  maintenance_type?: 'preventiva' | 'corretiva';
}

export function useCreateMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMaintenanceRequestInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert({
          ...input,
          requester_id: user.id,
          photos: input.photos || [],
          urgency: input.urgency || 'normal',
          maintenance_type: input.maintenance_type || 'corretiva',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      showToast.success('Solicitação de manutenção criada!');
      
      // Build urgency label for notification
      const urgencyLabels: Record<string, string> = {
        baixa: '🟢 Baixa',
        normal: '🟡 Normal',
        alta: '🟠 Alta',
        emergencial: '🔴 Emergencial',
      };
      const urgencyLabel = urgencyLabels[variables.urgency || 'normal'];
      const typeLabel = variables.maintenance_type === 'preventiva' ? 'Preventiva' : 'Corretiva';
      
      // Fetch outdoor code and PDV name for rich notification
      let outdoorCode = '';
      let pdvName = '';
      try {
        const { data: outdoorInfo } = await supabase
          .from('outdoors')
          .select('code, pdvs:pdv_id(name)')
          .eq('id', variables.outdoor_id)
          .single();
        outdoorCode = (outdoorInfo as any)?.code || '';
        pdvName = (outdoorInfo as any)?.pdvs?.name || '';
      } catch {}
      
      const locationLabel = pdvName ? `${outdoorCode} (${pdvName})` : outdoorCode;
      
      // Notify super_admin about new maintenance request
      try {
        await notificarPorRole(
          'super_admin',
          'maintenance_request',
          'media',
          `Nova Solicitação [${urgencyLabel}] - ${outdoorCode}`,
          `Manutenção ${typeLabel} em ${locationLabel}: ${variables.reason}`,
          '/maintenance-requests',
          data.id,
          'maintenance_request'
        );
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    },
    onError: (error) => {
      console.error('Error creating maintenance request:', error);
      showToast.error('Erro ao criar solicitação');
    },
  });
}

export function useApproveMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('maintenance_requests')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      showToast.success('Solicitação aprovada!');
    },
    onError: (error) => {
      console.error('Error approving maintenance request:', error);
      showToast.error('Erro ao aprovar solicitação');
    },
  });
}

export function useRejectMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, rejection_reason }: { id: string; rejection_reason: string }) => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .update({ status: 'rejected', observations: rejection_reason })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      showToast.success('Solicitação rejeitada');
    },
    onError: (error) => {
      console.error('Error rejecting maintenance request:', error);
      showToast.error('Erro ao rejeitar solicitação');
    },
  });
}

export function useConsolidateMaintenanceRequests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestIds, serviceOrderId }: { requestIds: string[]; serviceOrderId: string }) => {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          status: 'consolidated',
          service_order_id: serviceOrderId,
        })
        .in('id', requestIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      showToast.success('Solicitações consolidadas na ordem de serviço!');
    },
    onError: (error) => {
      console.error('Error consolidating maintenance requests:', error);
      showToast.error('Erro ao consolidar solicitações');
    },
  });
}
