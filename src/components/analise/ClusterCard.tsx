import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ClusterConfig, ClusterDistribution } from '@/types/analise-estrategica';
import { cn } from '@/lib/utils';

interface ClusterCardProps {
  distribution: ClusterDistribution;
  onClick?: () => void;
}

export function ClusterCard({ distribution, onClick }: ClusterCardProps) {
  const { cluster, count, percentage } = distribution;
  
  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow",
        onClick && "hover:border-primary/50"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: cluster.cor_hex }}
            />
            <CardTitle className="text-base">{cluster.nome}</CardTitle>
          </div>
          <Badge variant="secondary" className="font-mono">
            {count}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Faixa: {cluster.faixa_min} - {cluster.faixa_max}
            </span>
            <span className="font-medium">{percentage.toFixed(1)}%</span>
          </div>
          <Progress 
            value={percentage} 
            className="h-2"
            style={{ 
              '--progress-background': cluster.cor_hex 
            } as React.CSSProperties}
          />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Mídia: {(cluster.peso_midia * 100).toFixed(0)}%</span>
            <span>Merch: {(cluster.peso_merchandising * 100).toFixed(0)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ClusterBadgeProps {
  cluster: ClusterConfig | null | undefined;
  size?: 'sm' | 'md';
}

export function ClusterBadge({ cluster, size = 'md' }: ClusterBadgeProps) {
  if (!cluster) {
    return (
      <Badge variant="outline" className={cn(size === 'sm' && 'text-xs')}>
        Não classificado
      </Badge>
    );
  }
  
  return (
    <Badge 
      className={cn(
        "text-white",
        size === 'sm' && 'text-xs'
      )}
      style={{ backgroundColor: cluster.cor_hex }}
    >
      {cluster.nome}
    </Badge>
  );
}
