import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOutdoors } from '@/hooks/useOutdoorData';
import { 
  useOutdoorCycleConfig, 
  calculateVerificationStatus 
} from '@/hooks/useOutdoorCycleConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCcw, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Settings,
  ListChecks,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CycleHealthWidgetProps {
  showActions?: boolean;
}

export function CycleHealthWidget({ showActions = true }: CycleHealthWidgetProps) {
  const navigate = useNavigate();
  const { data: outdoors = [] } = useOutdoors();
  const { data: cycleConfig } = useOutdoorCycleConfig();

  const stats = useMemo(() => {
    const result = {
      total: outdoors.length,
      avaliado: 0,
      pendente_reavaliacao: 0,
      nunca_avaliado: 0,
      expirado_48h: 0,
      expirandoEm6h: 0,
    };

    const now = new Date();
    const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    outdoors.forEach(outdoor => {
      const status = calculateVerificationStatus(
        outdoor.avaliacaoValidaAte || null,
        outdoor.lastEvaluation || null,
        cycleConfig?.validade_horas || 24
      );

      result[status]++;

      // Check if expiring in next 6 hours
      if (outdoor.avaliacaoValidaAte) {
        const validUntil = new Date(outdoor.avaliacaoValidaAte);
        if (validUntil > now && validUntil <= sixHoursFromNow) {
          result.expirandoEm6h++;
        }
      }
    });

    return result;
  }, [outdoors, cycleConfig]);

  const healthPercentage = stats.total > 0 
    ? Math.round((stats.avaliado / stats.total) * 100) 
    : 0;

  const getHealthColor = (percentage: number) => {
    if (percentage >= 80) return 'text-success';
    if (percentage >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-success';
    if (percentage >= 50) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" />
            Saúde do Ciclo de Avaliação
          </span>
          <Badge variant="outline" className="text-xs">
            Validade: {cycleConfig?.validade_horas || 24}h
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Score */}
        <div className="text-center py-2">
          <p className={cn("text-4xl font-bold", getHealthColor(healthPercentage))}>
            {healthPercentage}%
          </p>
          <p className="text-sm text-muted-foreground">dos outdoors em dia</p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <Progress 
            value={healthPercentage} 
            className="h-2"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10">
            <CheckCircle className="h-4 w-4 text-success" />
            <div>
              <p className="font-semibold text-sm">{stats.avaliado}</p>
              <p className="text-xs text-muted-foreground">Avaliados</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10">
            <Clock className="h-4 w-4 text-warning" />
            <div>
              <p className="font-semibold text-sm">{stats.expirandoEm6h}</p>
              <p className="text-xs text-muted-foreground">Expirando em 6h</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10">
            <Clock className="h-4 w-4 text-orange-500" />
            <div>
              <p className="font-semibold text-sm">{stats.pendente_reavaliacao}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <div>
              <p className="font-semibold text-sm">{stats.expirado_48h}</p>
              <p className="text-xs text-muted-foreground">Atrasados</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {showActions && (
          <div className="flex flex-col gap-2 pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => navigate('/admin/controle-status-outdoors')}
            >
              <ListChecks className="h-4 w-4 mr-2" />
              Controle em Massa
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => navigate('/settings?tab=cycle')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar Ciclo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
