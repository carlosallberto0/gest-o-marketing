import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
          requester:profiles!maintenance_requests_requester_id_fkey(name, email),
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
          requester:profiles!maintenance_requests_requester_id_fkey(name, email),
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
          requester:profiles!maintenance_requests_requester_id_fkey(name, email),
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
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      toast.success('Solicitação de manutenção criada!');
    },
    onError: (error) => {
      console.error('Error creating maintenance request:', error);
      toast.error('Erro ao criar solicitação');
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
      toast.success('Solicitação aprovada!');
    },
    onError: (error) => {
      console.error('Error approving maintenance request:', error);
      toast.error('Erro ao aprovar solicitação');
    },
  });
}

export function useRejectMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .update({ status: 'rejected' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      toast.success('Solicitação rejeitada');
    },
    onError: (error) => {
      console.error('Error rejecting maintenance request:', error);
      toast.error('Erro ao rejeitar solicitação');
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
      toast.success('Solicitações consolidadas na ordem de serviço!');
    },
    onError: (error) => {
      console.error('Error consolidating maintenance requests:', error);
      toast.error('Erro ao consolidar solicitações');
    },
  });
}
