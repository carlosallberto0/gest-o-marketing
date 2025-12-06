import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMerchEvaluations } from '@/hooks/useMerchEvaluations';
import { Calendar, User, ChevronRight, Search, Loader2, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CommentsSection } from '@/components/evaluations/CommentsSection';

const getScoreBgColor = (score: number) => {
  if (score >= 85) return 'bg-success';
  if (score >= 70) return 'bg-warning';
  return 'bg-destructive';
};

export default function History() {
  const { data: evaluations = [], isLoading } = useMerchEvaluations();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvaluation, setSelectedEvaluation] = useState<any | null>(null);

  const filteredEvaluations = evaluations.filter(evaluation =>
    (evaluation.pdv?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Avaliações</h1>
          <p className="text-muted-foreground mt-1">
            Consulte todas as avaliações de merchandising realizadas
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por PDV..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Evaluations List */}
        <div className="space-y-3">
          {filteredEvaluations.map((evaluation, index) => (
            <div
              key={evaluation.id}
              onClick={() => setSelectedEvaluation(evaluation)}
              className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-all cursor-pointer group animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{evaluation.pdv?.name || 'PDV'}</h3>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-bold text-white",
                      getScoreBgColor(Number(evaluation.percentage_score))
                    )}>
                      {evaluation.percentage_score}%
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(evaluation.evaluation_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {evaluation.evaluator?.name || 'Avaliador'}
                    </span>
                  </div>

                  {/* Category scores preview */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {evaluation.category_scores && Object.entries(evaluation.category_scores as Record<string, number>).slice(0, 4).map(([key, score]) => (
                      <span 
                        key={key}
                        className="px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground"
                      >
                        {key.charAt(0).toUpperCase() + key.slice(1)}: {String(score)}%
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredEvaluations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma avaliação encontrada</p>
          </div>
        )}
      </div>

      {/* Evaluation Detail Dialog */}
      <Dialog open={!!selectedEvaluation} onOpenChange={() => setSelectedEvaluation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Avaliação</DialogTitle>
          </DialogHeader>
          
          {selectedEvaluation && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedEvaluation.pdv?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedEvaluation.evaluation_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Avaliador: {selectedEvaluation.evaluator?.name}
                  </p>
                </div>
                <div className={cn(
                  "px-4 py-2 rounded-xl text-2xl font-bold text-white",
                  getScoreBgColor(Number(selectedEvaluation.percentage_score))
                )}>
                  {selectedEvaluation.percentage_score}%
                </div>
              </div>

              {/* Category Scores */}
              <div>
                <h4 className="font-medium mb-3">Pontuação por Categoria</h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedEvaluation.category_scores && Object.entries(selectedEvaluation.category_scores as Record<string, number>).map(([category, score]) => (
                    <div 
                      key={category}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="text-sm font-medium capitalize">{category}</span>
                      <Badge className={cn(
                        "text-white",
                        getScoreBgColor(Number(score))
                      )}>
                        {String(score)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedEvaluation.status === 'completed' ? 'default' : 'secondary'}>
                    {selectedEvaluation.status === 'completed' ? 'Concluída' : 'Rascunho'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pontuação Total</p>
                  <p className="font-semibold">{selectedEvaluation.total_score} / {selectedEvaluation.total_possible_points} pontos</p>
                </div>
              </div>

              <Separator />

              {/* Comments Section */}
              <CommentsSection evaluationId={selectedEvaluation.id} />

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedEvaluation(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}