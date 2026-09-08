import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Send, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEvaluationComments, useCreateComment, useDeleteComment } from '@/hooks/useEvaluationComments';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface CommentsSectionProps {
  evaluationId: string;
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  director: 'Diretor',
  manager: 'Gerente',
  collaborator: 'Colaborador',
  supplier: 'Fornecedor'
};

export function CommentsSection({ evaluationId }: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('');
  const { user, profile } = useAuth();
  const { data: comments, isLoading } = useEvaluationComments(evaluationId);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();

  const canComment = profile?.role && ['super_admin', 'admin', 'director', 'manager'].includes(profile.role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    await createComment.mutateAsync({ evaluationId, content: newComment });
    setNewComment('');
  };

  const handleDelete = async (commentId: string) => {
    await deleteComment.mutateAsync({ commentId, evaluationId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Comentários</h3>
        {comments && comments.length > 0 && (
          <Badge variant="secondary">{comments.length}</Badge>
        )}
      </div>

      <ScrollArea className="max-h-64">
        <div className="space-y-3 pr-4">
          {comments && comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum comentário ainda.
            </p>
          ) : (
            comments?.map((comment) => (
              <div
                key={comment.id}
                className={cn(
                  "p-3 rounded-lg border bg-card",
                  comment.author_id === user?.id && "border-primary/30 bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {comment.author?.name || 'Usuário'}
                      </span>
                      {comment.author?.role && (
                        <Badge variant="outline" className="text-xs">
                          {roleLabels[comment.author.role] || comment.author.role}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>
                  {comment.author_id === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleDelete(comment.id)}
                      disabled={deleteComment.isPending}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {canComment && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Adicionar comentário..."
            className="min-h-[60px] resize-none"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newComment.trim() || createComment.isPending}
            className="shrink-0"
          >
            {createComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
