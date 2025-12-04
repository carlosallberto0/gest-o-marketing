import { Store } from '@/types/checklist';
import { getScoreColor, getScoreBgColor, getScoreLabel } from '@/data/mockData';
import { MapPin, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoreCardProps {
  store: Store;
  onClick?: () => void;
}

export function StoreCard({ store, onClick }: StoreCardProps) {
  return (
    <div 
      className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{store.name}</h3>
          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{store.region}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {store.lastScore !== undefined && (
            <div className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-bold text-white",
              getScoreBgColor(store.lastScore)
            )}>
              {store.lastScore}%
            </div>
          )}
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
      
      {store.lastEvaluation && (
        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Última avaliação: {new Date(store.lastEvaluation).toLocaleDateString('pt-BR')}</span>
        </div>
      )}
      
      {store.lastScore !== undefined && (
        <div className="mt-3">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-500", getScoreBgColor(store.lastScore))}
              style={{ width: `${store.lastScore}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
