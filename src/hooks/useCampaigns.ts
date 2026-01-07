import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

export interface Campaign {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: 'promotional' | 'institutional' | 'seasonal' | 'launch' | 'partnership';
  status: string;
  start_date: string;
  end_date: string;
  target_pdv_ids: string[];
  required_materials: any[];
  kpi_targets: {
    targetScore: number;
    targetCoverage: number;
  };
  created_at: string;
  updated_at: string;
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async (): Promise<Campaign[]> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(campaign => ({
        id: campaign.id,
        code: campaign.code,
        name: campaign.name,
        description: campaign.description,
        type: campaign.type,
        status: campaign.status,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        target_pdv_ids: campaign.target_pdv_ids || [],
        required_materials: (campaign.required_materials as any[]) || [],
        kpi_targets: campaign.kpi_targets as { targetScore: number; targetCoverage: number },
        created_at: campaign.created_at,
        updated_at: campaign.updated_at,
      }));
    },
  });
}

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('campaigns')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      showToast.success('Status da campanha atualizado!');
    },
    onError: (error) => {
      console.error('Error updating campaign status:', error);
      showToast.error('Erro ao atualizar status da campanha');
    },
  });
}
