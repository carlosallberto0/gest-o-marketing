import { ChecklistCategory } from '@/types';
import { cn } from '@/lib/utils';
import { Store, Building2, LayoutGrid, Users, CreditCard, LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Store,
  Building2,
  LayoutGrid,
  Users,
  CreditCard,
};

interface CategoryTabProps {
  category: ChecklistCategory;
  isActive: boolean;
  score?: number;
  answeredCount: number;
  totalCount: number;
  onClick: () => void;
}

export function CategoryTab({ 
  category, 
  isActive, 
  score, 
  answeredCount, 
  totalCount,
  onClick 
}: CategoryTabProps) {
  const Icon = iconMap[category.icon] || Store;
  const progress = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;
  const isComplete = answeredCount === totalCount;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all min-w-[80px]",
        isActive 
          ? "bg-primary text-primary-foreground shadow-md" 
          : "bg-card border border-border hover:bg-accent text-foreground"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
        isActive ? "bg-primary-foreground/20" : "bg-muted"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-xs font-medium text-center leading-tight">
        {category.name.split(' ')[0]}
      </span>
      <div className="flex items-center gap-1">
        <span className={cn(
          "text-[10px] font-medium",
          isActive ? "text-primary-foreground/80" : "text-muted-foreground"
        )}>
          {answeredCount}/{totalCount}
        </span>
        {score !== undefined && isComplete && (
          <span className={cn(
            "text-[10px] font-bold",
            isActive ? "text-primary-foreground" : (score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive")
          )}>
            {score}%
          </span>
        )}
      </div>
      {/* Mini progress bar */}
      <div className={cn(
        "w-full h-1 rounded-full overflow-hidden",
        isActive ? "bg-primary-foreground/20" : "bg-muted"
      )}>
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-300",
            isActive ? "bg-primary-foreground" : (isComplete ? "bg-success" : "bg-primary")
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </button>
  );
}
