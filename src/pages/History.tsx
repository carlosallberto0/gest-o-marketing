import { AppLayout } from '@/components/layout/AppLayout';
import { mockMerchEvaluations, mockPDVs, getScoreBgColor, getScoreLabel } from '@/data/mockData';
import { Calendar, Store, User, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function History() {
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
          <Input placeholder="Buscar por PDV..." className="pl-10" />
        </div>

        {/* Evaluations List */}
        <div className="space-y-3">
          {mockMerchEvaluations.map((evaluation, index) => (
            <div
              key={evaluation.id}
              className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-all cursor-pointer group animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{evaluation.pdvName}</h3>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-bold text-white",
                      getScoreBgColor(evaluation.percentageScore)
                    )}>
                      {evaluation.percentageScore}%
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(evaluation.date).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {evaluation.evaluatorName}
                    </span>
                  </div>

                  {/* Category scores preview */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(evaluation.categoryScores).slice(0, 4).map(([key, score]) => (
                      <span 
                        key={key}
                        className="px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground"
                      >
                        {key.charAt(0).toUpperCase() + key.slice(1)}: {score}%
                      </span>
                    ))}
                  </div>
                </div>
                
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>
          ))}
        </div>

        {mockMerchEvaluations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma avaliação encontrada</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
