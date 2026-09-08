import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { QuestionAnswer, ChecklistCategory } from '@/types';

interface CreateMerchEvaluationInput {
  pdvId: string;
  answers: Record<string, QuestionAnswer>;
  categories: ChecklistCategory[];
  signatureUrl?: string;
}

export function useCreateMerchEvaluation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateMerchEvaluationInput) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Calculate scores
      const allAnswers = Object.values(input.answers).filter(a => a?.value !== null && a?.value !== undefined);
      const yesCount = allAnswers.filter(a => a.value === 'yes' || a.value === 'na').length;
      const totalScore = yesCount;
      const totalPossiblePoints = allAnswers.length;
      const percentageScore = totalPossiblePoints > 0 ? Math.round((totalScore / totalPossiblePoints) * 100) : 0;

      // Calculate category scores
      const categoryScores: Record<string, number> = {};
      input.categories.forEach(cat => {
        const catAnswers = cat.questions.map(q => input.answers[q.id]).filter(a => a?.value !== null && a?.value !== undefined);
        const catYes = catAnswers.filter(a => a.value === 'yes' || a.value === 'na').length;
        categoryScores[cat.id] = catAnswers.length > 0 ? Math.round((catYes / catAnswers.length) * 100) : 0;
      });

      // Create evaluation
      const { data: evaluation, error: evalError } = await supabase
        .from('merch_evaluations')
        .insert({
          pdv_id: input.pdvId,
          evaluator_id: user.id,
          status: 'completed',
          total_score: totalScore,
          total_possible_points: totalPossiblePoints,
          percentage_score: percentageScore,
          category_scores: categoryScores,
          signature_url: input.signatureUrl || null,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (evalError) throw evalError;

      // Insert answers
      const answerInserts = Object.values(input.answers)
        .filter(a => a?.value !== null && a?.value !== undefined)
        .map(answer => ({
          evaluation_id: evaluation.id,
          question_id: answer.questionId,
          value: answer.value,
          observation: answer.observation || null,
          photo_url: answer.photoUrl || null,
          materials_used: answer.materialUsed || null,
        }));

      if (answerInserts.length > 0) {
        const { error: answerError } = await supabase
          .from('evaluation_answers')
          .insert(answerInserts);

        if (answerError) throw answerError;
      }

      return evaluation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merch-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['pdvs'] });
    },
  });
}
