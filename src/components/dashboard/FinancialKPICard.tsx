import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancialStats } from '@/hooks/useFinancialStats';
import { formatCurrency } from '@/lib/costCalculator';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, BarChart3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialKPICardProps {
  showDetails?: boolean;
}

export function FinancialKPICard({ showDetails = true }: FinancialKPICardProps) {
  const { data: stats, isLoading } = useFinancialStats();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const variacao = stats?.variacaoMensal || 0;
  const isPositive = variacao > 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Investimento Mensal */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Investimento Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(stats?.investimentoMensal || 0)}
          </p>
          <div className={cn(
            "flex items-center gap-1 text-xs mt-1",
            isPositive ? "text-destructive" : "text-success"
          )}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{Math.abs(variacao).toFixed(1)}% vs mês anterior</span>
          </div>
        </CardContent>
      </Card>

      {/* Custo Médio */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Custo Médio/Outdoor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(stats?.custoMedioOutdoor || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Por ordem de serviço
          </p>
        </CardContent>
      </Card>

      {/* Serviços Atípicos */}
      <Card className={cn(
        "border",
        (stats?.totalServicosAtipicos || 0) > 0 ? "border-warning/50 bg-warning/5" : ""
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Serviços Atípicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn(
            "text-2xl font-bold",
            (stats?.totalServicosAtipicos || 0) > 0 ? "text-warning" : "text-foreground"
          )}>
            {stats?.totalServicosAtipicos || 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Acima de 150% da média
          </p>
        </CardContent>
      </Card>

      {/* Top Fornecedor */}
      {showDetails && stats?.topFornecedores?.[0] && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Fornecedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-foreground truncate">
              {stats.topFornecedores[0].name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.topFornecedores[0].quantidade} serviços • {formatCurrency(stats.topFornecedores[0].valor)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
