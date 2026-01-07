import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { showToast } from '@/lib/toast';

export interface ActionPlan {
  id: string;
  evaluation_id: string;
  answer_id: string;
  description: string;
  responsible_id: string | null;
  due_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  created_by: string;
  responsible?: {
    name: string;
  };
  creator?: {
    name: string;
  };
}

export interface NonCompliantItem {
  answer_id: string;
  question_id: string;
  question_text: string;
  category_name: string;
  observation: string | null;
  photo_url: string | null;
  evaluation_id: string;
  pdv_name: string;
  evaluation_date: string;
}

export function useActionPlans(evaluationId?: string) {
  return useQuery({
    queryKey: ['action-plans', evaluationId],
    queryFn: async () => {
      let query = supabase
        .from('action_plans')
        .select(`
          *,
          responsible:profiles!action_plans_responsible_id_fkey(name),
          creator:profiles!action_plans_created_by_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (evaluationId) {
        query = query.eq('evaluation_id', evaluationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActionPlan[];
    },
  });
}

export function useNonCompliantItems(evaluationId: string) {
  return useQuery({
    queryKey: ['non-compliant-items', evaluationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_answers')
        .select(`
          id,
          question_id,
          observation,
          photo_url,
          evaluation_id,
          question:checklist_questions(
            text,
            category:checklist_categories(name)
          ),
          evaluation:merch_evaluations(
            evaluation_date,
            pdv:pdvs(name)
          )
        `)
        .eq('evaluation_id', evaluationId)
        .eq('value', 'no');

      if (error) throw error;

      return (data || []).map((item: any) => ({
        answer_id: item.id,
        question_id: item.question_id,
        question_text: item.question?.text || '',
        category_name: item.question?.category?.name || '',
        observation: item.observation,
        photo_url: item.photo_url,
        evaluation_id: item.evaluation_id,
        pdv_name: item.evaluation?.pdv?.name || '',
        evaluation_date: item.evaluation?.evaluation_date || '',
      })) as NonCompliantItem[];
    },
    enabled: !!evaluationId,
  });
}

export function useCreateActionPlan() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      evaluation_id: string;
      answer_id: string;
      description: string;
      responsible_id: string | null;
      due_date: string;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('action_plans')
        .insert({
          evaluation_id: input.evaluation_id,
          answer_id: input.answer_id,
          description: input.description,
          responsible_id: input.responsible_id,
          due_date: input.due_date,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['action-plans'] });
      queryClient.invalidateQueries({ queryKey: ['action-plans', variables.evaluation_id] });
      showToast.success('Plano de ação criado com sucesso');
    },
    onError: () => {
      showToast.error('Erro ao criar plano de ação');
    },
  });
}

export function useUpdateActionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      status?: string;
      notes?: string;
      completed_at?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('action_plans')
        .update({
          status: input.status,
          notes: input.notes,
          completed_at: input.completed_at,
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-plans'] });
      showToast.success('Plano de ação atualizado');
    },
    onError: () => {
      showToast.error('Erro ao atualizar plano de ação');
    },
  });
}

export function useDeleteActionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('action_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-plans'] });
      showToast.success('Plano de ação excluído');
    },
    onError: () => {
      showToast.error('Erro ao excluir plano de ação');
    },
  });
}
