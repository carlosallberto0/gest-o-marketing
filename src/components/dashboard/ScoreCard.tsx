import { cn } from '@/lib/utils';
import { getScoreBgColor, getScoreLabel } from '@/lib/helpers';

interface ScoreCardProps {
  title: string;
  score: number;
  subtitle?: string;
  trend?: number;
  icon?: React.ReactNode;
  className?: string;
  isPercentage?: boolean;
}

export function ScoreCard({ title, score, subtitle, trend, icon, className, isPercentage = true }: ScoreCardProps) {
  return (
    <div className={cn(
      "bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              {score}{isPercentage && '%'}
            </span>
            {trend !== undefined && (
              <span className={cn(
                "text-sm font-medium",
                trend >= 0 ? "text-success" : "text-destructive"
              )}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          getScoreBgColor(isPercentage ? score : 100)
        )}>
          {icon || (
            <span className="text-sm font-bold text-white">
              {getScoreLabel(isPercentage ? score : 100).charAt(0)}
            </span>
          )}
        </div>
      </div>
      
      {/* Progress bar - only for percentages */}
      {isPercentage && (
        <div className="mt-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-500", getScoreBgColor(score))}
              style={{ width: `${Math.min(score, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}