import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MaterialRequest {
  id: string;
  material_id: string;
  requester_id: string;
  pdv_id: string;
  quantity: number;
  justification: string;
  status: 'pending' | 'approved' | 'rejected' | 'delivered';
  approved_by: string | null;
  approved_at: string | null;
  delivered_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  material?: {
    name: string;
    code: string;
    type: string;
  };
  requester?: {
    name: string;
    email: string;
  };
  pdv?: {
    name: string;
    code: string;
  };
  approver?: {
    name: string;
  };
}

export function useMaterialRequests() {
  return useQuery({
    queryKey: ['material-requests'],
    queryFn: async (): Promise<MaterialRequest[]> => {
      const { data, error } = await supabase
        .from('material_requests')
        .select(`
          *,
          material:trade_materials!material_id (name, code, type),
          requester:profiles!requester_id (name, email),
          pdv:pdvs!pdv_id (name, code),
          approver:profiles!approved_by (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as MaterialRequest[];
    },
  });
}

interface CreateMaterialRequestItem {
  material_id: string;
  quantity: number;
}

interface CreateMaterialRequestData {
  items: CreateMaterialRequestItem[];
  pdv_id: string;
  justification: string;
}

export function useCreateMaterialRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMaterialRequestData) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const requests = data.items.map((item) => ({
        material_id: item.material_id,
        requester_id: userData.user.id,
        pdv_id: data.pdv_id,
        quantity: item.quantity,
        justification: data.justification,
      }));

      const { error } = await supabase
        .from('material_requests')
        .insert(requests);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      const count = variables.items.length;
      toast.success(
        count === 1
          ? 'Solicitação de material enviada com sucesso!'
          : `${count} solicitações de materiais enviadas com sucesso!`
      );
    },
    onError: (error) => {
      console.error('Error creating material request:', error);
      toast.error('Erro ao criar solicitação de material');
    },
  });
}

export function useUpdateMaterialRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      status: 'approved' | 'rejected' | 'delivered';
      admin_notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const updateData: Record<string, unknown> = {
        status: data.status,
        admin_notes: data.admin_notes,
      };

      if (data.status === 'approved' || data.status === 'rejected') {
        updateData.approved_by = userData.user.id;
        updateData.approved_at = new Date().toISOString();
      }

      if (data.status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('material_requests')
        .update(updateData)
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      const messages = {
        approved: 'Solicitação aprovada!',
        rejected: 'Solicitação rejeitada.',
        delivered: 'Material marcado como entregue!',
      };
      toast.success(messages[variables.status]);
    },
    onError: (error) => {
      console.error('Error updating material request:', error);
      toast.error('Erro ao atualizar solicitação');
    },
  });
}
