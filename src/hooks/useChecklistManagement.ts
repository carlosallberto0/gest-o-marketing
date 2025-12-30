import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type MaterialType = Database['public']['Enums']['material_type'];

export interface ChecklistQuestionInput {
  category_id: string;
  text: string;
  tip?: string | null;
  sort_order?: number;
  requires_photo?: boolean;
  requires_comment?: boolean;
  is_critical?: boolean;
  requires_material?: boolean;
  material_type?: MaterialType | null;
}

export interface ChecklistQuestionUpdate extends Partial<ChecklistQuestionInput> {
  id: string;
}

export function useCreateChecklistQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ChecklistQuestionInput) => {
      // Get max sort_order for the category
      const { data: existingQuestions } = await supabase
        .from('checklist_questions')
        .select('sort_order')
        .eq('category_id', data.category_id)
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxSortOrder = existingQuestions?.[0]?.sort_order ?? 0;

      const { data: newQuestion, error } = await supabase
        .from('checklist_questions')
        .insert({
          ...data,
          sort_order: data.sort_order ?? maxSortOrder + 1,
          requires_photo: data.requires_photo ?? false,
          requires_comment: data.requires_comment ?? false,
          is_critical: data.is_critical ?? false,
          requires_material: data.requires_material ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return newQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-categories'] });
      toast.success('Pergunta criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating question:', error);
      toast.error('Erro ao criar pergunta');
    },
  });
}

export function useUpdateChecklistQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: ChecklistQuestionUpdate) => {
      const { data: updated, error } = await supabase
        .from('checklist_questions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-categories'] });
      toast.success('Pergunta atualizada!');
    },
    onError: (error) => {
      console.error('Error updating question:', error);
      toast.error('Erro ao atualizar pergunta');
    },
  });
}

export function useDeleteChecklistQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('checklist_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-categories'] });
      toast.success('Pergunta excluída!');
    },
    onError: (error) => {
      console.error('Error deleting question:', error);
      toast.error('Erro ao excluir pergunta');
    },
  });
}
