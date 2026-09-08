import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface EvolutionData {
  period: string;
  merchScore: number;
  operationalRate: number;
}

export interface CriticalItem {
  id: string;
  question: string;
  category: string;
  noCount: number;
  totalEvaluations: number;
  failRate: number;
}

export interface ContractAlert {
  id: string;
  farmerName: string;
  outdoorCode: string;
  endDate: string;
  daysRemaining: number;
}

export function useEvolutionData() {
  return useQuery({
    queryKey: ['evolution-data'],
    queryFn: async (): Promise<EvolutionData[]> => {
      const months: EvolutionData[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
        
        // Fetch merch evaluations for this month
        const { data: merchData } = await supabase
          .from('merch_evaluations')
          .select('percentage_score')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString())
          .eq('status', 'completed');
        
        // Fetch outdoor evaluations for this month
        const { data: mediaData } = await supabase
          .from('media_evaluations')
          .select('status')
          .gte('evaluated_at', monthStart.toISOString())
          .lte('evaluated_at', monthEnd.toISOString());
        
        const merchScore = merchData && merchData.length > 0
          ? Math.round(merchData.reduce((acc, e) => acc + e.percentage_score, 0) / merchData.length)
          : 0;
        
        const operationalCount = mediaData?.filter(e => e.status === 'operational').length || 0;
        const operationalRate = mediaData && mediaData.length > 0
          ? Math.round((operationalCount / mediaData.length) * 100)
          : 0;
        
        months.push({
          period: format(monthDate, 'MMM/yy', { locale: ptBR }),
          merchScore,
          operationalRate,
        });
      }
      
      return months;
    },
  });
}

export function useCriticalItems() {
  return useQuery({
    queryKey: ['critical-items'],
    queryFn: async (): Promise<CriticalItem[]> => {
      // Fetch questions with categories
      const { data: questions, error: questionsError } = await supabase
        .from('checklist_questions')
        .select('id, text, checklist_categories(name)');
      
      if (questionsError) throw questionsError;
      
      // Fetch all answers from recent evaluations
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: answers, error: answersError } = await supabase
        .from('evaluation_answers')
        .select('question_id, value, merch_evaluations!inner(created_at)')
        .gte('merch_evaluations.created_at', thirtyDaysAgo.toISOString());
      
      if (answersError) throw answersError;
      
      // Calculate fail rates
      const questionStats = new Map<string, { noCount: number; total: number }>();
      
      answers?.forEach(answer => {
        if (!answer.value) return;
        
        const current = questionStats.get(answer.question_id) || { noCount: 0, total: 0 };
        current.total++;
        if (answer.value === 'no') current.noCount++;
        questionStats.set(answer.question_id, current);
      });
      
      // Build critical items list
      const criticalItems: CriticalItem[] = [];
      
      questions?.forEach(q => {
        const stats = questionStats.get(q.id);
        if (!stats || stats.total === 0) return;
        
        const failRate = Math.round((stats.noCount / stats.total) * 100);
        if (failRate >= 30) { // Items with 30%+ fail rate are critical
          criticalItems.push({
            id: q.id,
            question: q.text,
            category: (q.checklist_categories as any)?.name || 'Sem categoria',
            noCount: stats.noCount,
            totalEvaluations: stats.total,
            failRate,
          });
        }
      });
      
      // Sort by fail rate descending
      return criticalItems.sort((a, b) => b.failRate - a.failRate);
    },
  });
}

export function useExpiringContracts() {
  return useQuery({
    queryKey: ['expiring-contracts'],
    queryFn: async (): Promise<ContractAlert[]> => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          farmer_name,
          end_date,
          outdoors!inner(code)
        `)
        .eq('status', 'active')
        .lte('end_date', thirtyDaysFromNow.toISOString())
        .gte('end_date', new Date().toISOString())
        .order('end_date', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(contract => ({
        id: contract.id,
        farmerName: contract.farmer_name,
        outdoorCode: (contract.outdoors as any)?.code || '-',
        endDate: contract.end_date,
        daysRemaining: differenceInDays(new Date(contract.end_date), new Date()),
      }));
    },
  });
}
