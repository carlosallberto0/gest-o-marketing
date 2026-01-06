import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PDVDetails {
  id: string;
  name: string;
  code: string;
  type: string;
  address: string;
  city: string;
  state: string;
  status: string;
  active_modules: string[];
  photo_url: string | null;
  manager: { name: string } | null;
}

interface PDVOutdoor {
  id: string;
  code: string;
  location: string;
  width: number;
  height: number;
  status: string;
  description_type: string | null;
  photo_url: string | null;
}

interface EvaluationHistory {
  id: string;
  evaluation_date: string;
  percentage_score: number;
  total_score: number;
  total_possible_points: number;
  category_scores: Record<string, number>;
  evaluator: { name: string } | null;
}

interface CategoryBreakdown {
  id: string;
  name: string;
  icon: string;
  averageScore: number;
  evaluationCount: number;
  scores: number[];
}

export function usePDVDetails(pdvId: string) {
  return useQuery({
    queryKey: ['pdv-details', pdvId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdvs')
        .select(`
          id,
          name,
          code,
          type,
          address,
          city,
          state,
          status,
          active_modules,
          photo_url,
          manager:profiles!pdvs_manager_id_fkey(name)
        `)
        .eq('id', pdvId)
        .maybeSingle();

      if (error) throw error;
      return data as PDVDetails | null;
    },
    enabled: !!pdvId,
  });
}

export function usePDVOutdoors(pdvId: string) {
  return useQuery({
    queryKey: ['pdv-outdoors', pdvId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outdoors')
        .select('id, code, location, width, height, status, description_type, photo_url')
        .eq('pdv_id', pdvId)
        .order('code');

      if (error) throw error;
      return data as PDVOutdoor[];
    },
    enabled: !!pdvId,
  });
}

export function usePDVEvaluationHistory(pdvId: string) {
  return useQuery({
    queryKey: ['pdv-evaluation-history', pdvId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merch_evaluations')
        .select(`
          id,
          evaluation_date,
          percentage_score,
          total_score,
          total_possible_points,
          category_scores,
          evaluator:profiles!merch_evaluations_evaluator_id_fkey(name)
        `)
        .eq('pdv_id', pdvId)
        .eq('status', 'completed')
        .order('evaluation_date', { ascending: false });

      if (error) throw error;
      return data as EvaluationHistory[];
    },
    enabled: !!pdvId,
  });
}

export function usePDVCategoryBreakdown(pdvId: string) {
  return useQuery({
    queryKey: ['pdv-category-breakdown', pdvId],
    queryFn: async () => {
      // Get all categories
      const { data: categories, error: catError } = await supabase
        .from('checklist_categories')
        .select('id, name, icon')
        .order('sort_order');

      if (catError) throw catError;

      // Get all evaluations for this PDV
      const { data: evaluations, error: evalError } = await supabase
        .from('merch_evaluations')
        .select('category_scores')
        .eq('pdv_id', pdvId)
        .eq('status', 'completed');

      if (evalError) throw evalError;

      // Calculate category breakdowns
      const breakdowns: CategoryBreakdown[] = categories?.map(cat => {
        const scores: number[] = [];
        
        evaluations?.forEach(eval_ => {
          const catScores = eval_.category_scores as Record<string, number>;
          if (catScores && catScores[cat.id] !== undefined) {
            scores.push(catScores[cat.id]);
          }
        });

        return {
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          averageScore: scores.length > 0 
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
            : 0,
          evaluationCount: scores.length,
          scores,
        };
      }) || [];

      return breakdowns.filter(b => b.evaluationCount > 0);
    },
    enabled: !!pdvId,
  });
}
