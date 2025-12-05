import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PDVWithStats {
  id: string;
  code: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  status: string;
  active_modules: string[];
  manager: { name: string } | null;
  lastMerchScore?: number;
  totalOutdoors?: number;
  operationalOutdoors?: number;
}

export function usePDVs() {
  return useQuery({
    queryKey: ['pdvs'],
    queryFn: async () => {
      // Get PDVs with manager info
      const { data: pdvs, error: pdvError } = await supabase
        .from('pdvs')
        .select(`
          id,
          code,
          name,
          type,
          address,
          city,
          state,
          status,
          active_modules,
          manager:profiles!pdvs_manager_id_fkey(name)
        `)
        .order('name');

      if (pdvError) throw pdvError;

      // Get latest merch scores for each PDV
      const { data: evaluations, error: evalError } = await supabase
        .from('merch_evaluations')
        .select('pdv_id, percentage_score, evaluation_date')
        .eq('status', 'completed')
        .order('evaluation_date', { ascending: false });

      if (evalError) throw evalError;

      // Get outdoor stats
      const { data: outdoors, error: outError } = await supabase
        .from('outdoors')
        .select('pdv_id, status');

      if (outError) throw outError;

      // Build stats map for merch scores (latest per PDV)
      const merchScoreMap = new Map<string, number>();
      evaluations?.forEach(eval_ => {
        if (!merchScoreMap.has(eval_.pdv_id)) {
          merchScoreMap.set(eval_.pdv_id, eval_.percentage_score);
        }
      });

      // Build stats map for outdoors
      const outdoorStatsMap = new Map<string, { total: number; operational: number }>();
      outdoors?.forEach(outdoor => {
        if (!outdoorStatsMap.has(outdoor.pdv_id)) {
          outdoorStatsMap.set(outdoor.pdv_id, { total: 0, operational: 0 });
        }
        const stats = outdoorStatsMap.get(outdoor.pdv_id)!;
        stats.total++;
        if (outdoor.status === 'operational') stats.operational++;
      });

      // Combine data
      const pdvsWithStats: PDVWithStats[] = pdvs?.map(pdv => {
        const outdoorStats = outdoorStatsMap.get(pdv.id);
        return {
          ...pdv,
          lastMerchScore: merchScoreMap.get(pdv.id),
          totalOutdoors: outdoorStats?.total,
          operationalOutdoors: outdoorStats?.operational,
        };
      }) || [];

      return pdvsWithStats;
    },
  });
}
