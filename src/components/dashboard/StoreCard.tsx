import { PDV } from '@/types';
import { getScoreBgColor } from '@/data/mockData';
import { MapPin, Calendar, ChevronRight, Fuel, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PDVCardProps {
  pdv: PDV;
  onClick?: () => void;
}

export function PDVCard({ pdv, onClick }: PDVCardProps) {
  const score = pdv.lastMerchScore;
  
  const TypeIcon = pdv.type === 'posto' ? Fuel : pdv.type === 'conveniencia' ? Store : Fuel;
  
  return (
    <div 
      className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TypeIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground truncate">{pdv.name}</h3>
          </div>
          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{pdv.city}, {pdv.state}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {score !== undefined && (
            <div className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-bold text-white",
              getScoreBgColor(score)
            )}>
              {score}%
            </div>
          )}
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
      
      {/* Modules badges */}
      <div className="flex items-center gap-2 mt-3">
        {pdv.activeModules.includes('media') && (
          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Mídia Externa
          </span>
        )}
        {pdv.activeModules.includes('merchandising') && (
          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Merchandising
          </span>
        )}
      </div>
      
      {pdv.lastMerchEvaluation && (
        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Última avaliação: {new Date(pdv.lastMerchEvaluation).toLocaleDateString('pt-BR')}</span>
        </div>
      )}
      
      {score !== undefined && (
        <div className="mt-3">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-500", getScoreBgColor(score))}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Keep backward compatibility
export { PDVCard as StoreCard };
