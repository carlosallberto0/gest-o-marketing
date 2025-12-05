import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface EvaluationWithPDV {
  id: string;
  pdv_id: string;
  percentage_score: number;
  evaluation_date: string;
  category_scores: Record<string, number>;
  pdv: {
    id: string;
    name: string;
    code: string;
    city: string;
    state: string;
  } | null;
  evaluator: {
    name: string;
  } | null;
}

export function useMerchEvaluations(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['merch-evaluations', dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('merch_evaluations')
        .select(`
          id,
          pdv_id,
          percentage_score,
          evaluation_date,
          category_scores,
          pdv:pdvs(id, name, code, city, state),
          evaluator:profiles!merch_evaluations_evaluator_id_fkey(name)
        `)
        .eq('status', 'completed')
        .order('evaluation_date', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('evaluation_date', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        query = query.lte('evaluation_date', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EvaluationWithPDV[];
    },
  });
}

export function usePDVScoreSummary(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['pdv-score-summary', dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('merch_evaluations')
        .select(`
          pdv_id,
          percentage_score,
          evaluation_date,
          pdv:pdvs(id, name, code)
        `)
        .eq('status', 'completed')
        .order('evaluation_date', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('evaluation_date', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        query = query.lte('evaluation_date', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by PDV and calculate averages
      const pdvMap = new Map<string, {
        pdvId: string;
        pdvName: string;
        pdvCode: string;
        scores: number[];
        dates: string[];
        latestScore: number;
        averageScore: number;
      }>();

      data?.forEach((eval_) => {
        const pdvId = eval_.pdv_id;
        const pdv = eval_.pdv as { id: string; name: string; code: string } | null;
        
        if (!pdv) return;

        if (!pdvMap.has(pdvId)) {
          pdvMap.set(pdvId, {
            pdvId,
            pdvName: pdv.name,
            pdvCode: pdv.code,
            scores: [],
            dates: [],
            latestScore: 0,
            averageScore: 0,
          });
        }

        const entry = pdvMap.get(pdvId)!;
        entry.scores.push(eval_.percentage_score);
        entry.dates.push(eval_.evaluation_date);
      });

      // Calculate averages and latest scores
      pdvMap.forEach((entry) => {
        entry.latestScore = entry.scores[0] || 0;
        entry.averageScore = Math.round(
          entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length
        );
      });

      return Array.from(pdvMap.values());
    },
  });
}

export function useScoreOverTime(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['score-over-time', dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('merch_evaluations')
        .select(`
          evaluation_date,
          percentage_score,
          pdv:pdvs(name)
        `)
        .eq('status', 'completed')
        .order('evaluation_date', { ascending: true });

      if (dateRange?.from) {
        query = query.gte('evaluation_date', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        query = query.lte('evaluation_date', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by month
      const monthMap = new Map<string, { total: number; count: number }>();

      data?.forEach((eval_) => {
        const date = new Date(eval_.evaluation_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, { total: 0, count: 0 });
        }

        const entry = monthMap.get(monthKey)!;
        entry.total += eval_.percentage_score;
        entry.count += 1;
      });

      return Array.from(monthMap.entries()).map(([month, { total, count }]) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        averageScore: Math.round(total / count),
        evaluationCount: count,
      }));
    },
  });
}
