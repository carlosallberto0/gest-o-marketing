import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  // Merchandising
  totalPDVs: number;
  pdvsWithMerch: number;
  avgMerchScore: number;
  criticalPDVs: number;
  totalMerchEvaluations: number;
  // Media
  totalOutdoors: number;
  operationalOutdoors: number;
  nonOperationalOutdoors: number;
  pendingEvaluations: number;
  operationalRate: number;
  activeContracts: number;
}

export interface PDVWithStats {
  id: string;
  code: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  status: string;
  active_modules: string[];
  lastMerchScore: number | null;
  lastMerchEvaluation: string | null;
  totalOutdoors: number;
  operationalOutdoors: number;
}

export interface CategoryAverage {
  name: string;
  score: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Fetch PDVs
      const { data: pdvs, error: pdvsError } = await supabase
        .from('pdvs')
        .select('id, active_modules');
      
      if (pdvsError) throw pdvsError;

      // Fetch outdoors
      const { data: outdoors, error: outdoorsError } = await supabase
        .from('outdoors')
        .select('id, status, contract_id');
      
      if (outdoorsError) throw outdoorsError;

      // Fetch merch evaluations for this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: merchEvaluations, error: merchError } = await supabase
        .from('merch_evaluations')
        .select('id, pdv_id, percentage_score, created_at')
        .gte('created_at', startOfMonth.toISOString());
      
      if (merchError) throw merchError;

      // Calculate stats
      const totalPDVs = pdvs?.length || 0;
      const pdvsWithMerch = pdvs?.filter(p => 
        p.active_modules.includes('merchandising')
      ).length || 0;

      const totalOutdoors = outdoors?.length || 0;
      const operationalOutdoors = outdoors?.filter(o => o.status === 'operational').length || 0;
      const nonOperationalOutdoors = outdoors?.filter(o => o.status === 'non_operational').length || 0;
      const pendingEvaluations = outdoors?.filter(o => o.status === 'pending_evaluation').length || 0;
      const activeContracts = outdoors?.filter(o => o.contract_id).length || 0;

      // Calculate average score from latest evaluations per PDV
      const latestScoresByPDV = new Map<string, number>();
      merchEvaluations?.forEach(eval_ => {
        latestScoresByPDV.set(eval_.pdv_id, eval_.percentage_score);
      });
      
      const scores = Array.from(latestScoresByPDV.values());
      const avgMerchScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      
      const criticalPDVs = scores.filter(s => s < 70).length;

      return {
        totalPDVs,
        pdvsWithMerch,
        avgMerchScore,
        criticalPDVs,
        totalMerchEvaluations: merchEvaluations?.length || 0,
        totalOutdoors,
        operationalOutdoors,
        nonOperationalOutdoors,
        pendingEvaluations,
        operationalRate: totalOutdoors > 0 ? Math.round((operationalOutdoors / totalOutdoors) * 100) : 0,
        activeContracts,
      };
    },
  });
}

export function usePDVsWithStats(moduleFilter?: 'media' | 'merchandising') {
  return useQuery({
    queryKey: ['pdvs-with-stats', moduleFilter],
    queryFn: async (): Promise<PDVWithStats[]> => {
      // Fetch PDVs
      let query = supabase.from('pdvs').select('*').eq('status', 'active');
      
      const { data: pdvs, error: pdvsError } = await query;
      if (pdvsError) throw pdvsError;

      // Fetch latest merch evaluations
      const { data: merchEvaluations, error: merchError } = await supabase
        .from('merch_evaluations')
        .select('pdv_id, percentage_score, created_at')
        .order('created_at', { ascending: false });
      
      if (merchError) throw merchError;

      // Fetch outdoor counts
      const { data: outdoors, error: outdoorsError } = await supabase
        .from('outdoors')
        .select('pdv_id, status');
      
      if (outdoorsError) throw outdoorsError;

      // Build stats map
      const latestEvalByPDV = new Map<string, { score: number; date: string }>();
      merchEvaluations?.forEach(eval_ => {
        if (!latestEvalByPDV.has(eval_.pdv_id)) {
          latestEvalByPDV.set(eval_.pdv_id, {
            score: eval_.percentage_score,
            date: eval_.created_at,
          });
        }
      });

      const outdoorsByPDV = new Map<string, { total: number; operational: number }>();
      outdoors?.forEach(outdoor => {
        const existing = outdoorsByPDV.get(outdoor.pdv_id) || { total: 0, operational: 0 };
        existing.total++;
        if (outdoor.status === 'operational') existing.operational++;
        outdoorsByPDV.set(outdoor.pdv_id, existing);
      });

      // Filter and map PDVs
      let filteredPDVs = pdvs || [];
      if (moduleFilter) {
        filteredPDVs = filteredPDVs.filter(p => p.active_modules.includes(moduleFilter));
      }

      return filteredPDVs.map(pdv => {
        const evalData = latestEvalByPDV.get(pdv.id);
        const outdoorData = outdoorsByPDV.get(pdv.id) || { total: 0, operational: 0 };

        return {
          id: pdv.id,
          code: pdv.code,
          name: pdv.name,
          type: pdv.type,
          address: pdv.address,
          city: pdv.city,
          state: pdv.state,
          status: pdv.status,
          active_modules: pdv.active_modules,
          lastMerchScore: evalData?.score || null,
          lastMerchEvaluation: evalData?.date || null,
          totalOutdoors: outdoorData.total,
          operationalOutdoors: outdoorData.operational,
        };
      });
    },
  });
}

export function useCategoryAverages() {
  return useQuery({
    queryKey: ['category-averages'],
    queryFn: async (): Promise<CategoryAverage[]> => {
      // Fetch categories
      const { data: categories, error: catError } = await supabase
        .from('checklist_categories')
        .select('id, name')
        .order('sort_order');
      
      if (catError) throw catError;

      // Fetch recent evaluations with category scores
      const { data: evaluations, error: evalError } = await supabase
        .from('merch_evaluations')
        .select('category_scores')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (evalError) throw evalError;

      // Calculate averages per category
      const categoryScores = new Map<string, number[]>();
      
      evaluations?.forEach(eval_ => {
        const scores = eval_.category_scores as Record<string, number>;
        if (scores) {
          Object.entries(scores).forEach(([catId, score]) => {
            const existing = categoryScores.get(catId) || [];
            existing.push(score);
            categoryScores.set(catId, existing);
          });
        }
      });

      return (categories || []).map(cat => {
        const scores = categoryScores.get(cat.id) || [];
        const avgScore = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;

        return {
          name: cat.name.split(' ')[0],
          score: avgScore,
        };
      });
    },
  });
}
