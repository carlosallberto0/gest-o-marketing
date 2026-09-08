import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Insight } from '@/types/analise-estrategica';
import { 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InsightCardProps {
  insight: Insight;
  onMarkAsRead?: () => void;
  onClick?: () => void;
}

const tipoConfig = {
  tendencia: {
    icon: TrendingUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    label: 'Tendência'
  },
  alerta: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    label: 'Alerta'
  },
  oportunidade: {
    icon: Lightbulb,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    label: 'Oportunidade'
  }
};

const moduloFocoLabels = {
  midia: 'Mídia Externa',
  merchandising: 'Merchandising',
  integrado: 'Integrado'
};

export function InsightCard({ insight, onMarkAsRead, onClick }: InsightCardProps) {
  const config = tipoConfig[insight.tipo];
  const Icon = config.icon;
  
  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-md",
        !insight.lido && "border-l-4",
        !insight.lido && config.borderColor,
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg", config.bgColor)}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            <div>
              <CardTitle className="text-base leading-tight">
                {insight.titulo}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {config.label}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {moduloFocoLabels[insight.modulo_foco]}
                </Badge>
                {insight.pdv_tipo !== 'ambos' && (
                  <Badge variant="secondary" className="text-xs">
                    {insight.pdv_tipo === 'conveniencia' ? 'Conveniência' : 'Outdoor'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {!insight.lido && onMarkAsRead && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead();
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          {insight.descricao}
        </p>
        
        {insight.acoes_recomendadas.length > 0 && (
          <div className="space-y-1 mb-3">
            <span className="text-xs font-medium text-muted-foreground">Ações recomendadas:</span>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {insight.acoes_recomendadas.slice(0, 2).map((acao, i) => (
                <li key={i} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  {acao}
                </li>
              ))}
              {insight.acoes_recomendadas.length > 2 && (
                <li className="text-primary">
                  +{insight.acoes_recomendadas.length - 2} mais...
                </li>
              )}
            </ul>
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Impacto estimado: <strong className={config.color}>{insight.impacto_estimado}</strong>
          </span>
          <span>
            {formatDistanceToNow(new Date(insight.data_geracao), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
