import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type CampaignType = Database['public']['Enums']['campaign_type'];

interface CreateCampaignInput {
  name: string;
  type: CampaignType;
  description?: string;
  startDate: string;
  endDate: string;
  targetScore?: number;
  targetCoverage?: number;
}

async function generateCampaignCode(): Promise<string> {
  const { data } = await supabase
    .from('campaigns')
    .select('code')
    .order('created_at', { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastCode = data[0].code;
    const match = lastCode.match(/CAMP-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `CAMP-${nextNumber.toString().padStart(4, '0')}`;
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const code = await generateCampaignCode();
      
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          code,
          name: input.name,
          type: input.type,
          description: input.description || null,
          start_date: input.startDate,
          end_date: input.endDate,
          status: 'draft',
          kpi_targets: {
            targetScore: input.targetScore || 85,
            targetCoverage: input.targetCoverage || 90,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campanha criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating campaign:', error);
      toast.error('Erro ao criar campanha');
    },
  });
}
