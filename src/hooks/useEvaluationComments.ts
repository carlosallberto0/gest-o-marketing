import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { showToast } from '@/lib/toast';

export interface EvaluationComment {
  id: string;
  evaluation_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: {
    name: string;
    role: string;
  };
}

export function useEvaluationComments(evaluationId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['evaluation-comments', evaluationId],
    queryFn: async (): Promise<EvaluationComment[]> => {
      if (!evaluationId) return [];

      const { data, error } = await supabase
        .from('evaluation_comments')
        .select(`
          *,
          author:profiles!evaluation_comments_author_id_fkey(name, role)
        `)
        .eq('evaluation_id', evaluationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(comment => ({
        id: comment.id,
        evaluation_id: comment.evaluation_id,
        author_id: comment.author_id,
        content: comment.content,
        created_at: comment.created_at,
        author: comment.author ? {
          name: comment.author.name,
          role: comment.author.role
        } : undefined
      }));
    },
    enabled: !!evaluationId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!evaluationId) return;

    const channel = supabase
      .channel(`comments-${evaluationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'evaluation_comments',
          filter: `evaluation_id=eq.${evaluationId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['evaluation-comments', evaluationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [evaluationId, queryClient]);

  return query;
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ evaluationId, content }: { evaluationId: string; content: string }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('evaluation_comments')
        .insert({
          evaluation_id: evaluationId,
          author_id: user.id,
          content: content.trim()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-comments', variables.evaluationId] });
      showToast.success('Comentário adicionado!');
    },
    onError: (error) => {
      console.error('Error creating comment:', error);
      showToast.error('Erro ao adicionar comentário');
    }
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, evaluationId }: { commentId: string; evaluationId: string }) => {
      const { error } = await supabase
        .from('evaluation_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      return { evaluationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-comments', data.evaluationId] });
      showToast.success('Comentário removido!');
    },
    onError: (error) => {
      console.error('Error deleting comment:', error);
      showToast.error('Erro ao remover comentário');
    }
  });
}
