import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, TrendingUp, AlertTriangle, Lightbulb, BarChart3, Store, Megaphone } from 'lucide-react';
import { useAnaliseKPIs, useClusterDistribution, useInsights } from '@/hooks/useAnaliseEstrategica';
import { useRecalcularClusters } from '@/hooks/useClusterizacao';
import { useRegenerarInsights } from '@/hooks/useInsightsGeneration';
import { ClusterDistributionChart } from '@/components/analise/ClusterDistributionChart';
import { InsightCard } from '@/components/analise/InsightCard';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

export default function DashboardAnalise() {
  const navigate = useNavigate();
  const { data: kpis, isLoading: kpisLoading } = useAnaliseKPIs();
  const { data: convenienciaDistribution, isLoading: convLoading } = useClusterDistribution('conveniencia');
  const { data: outdoorDistribution, isLoading: outLoading } = useClusterDistribution('outdoor');
  const { data: insights, isLoading: insightsLoading } = useInsights();
  const recalcularClusters = useRecalcularClusters();
  const regenerarInsights = useRegenerarInsights();

  const isLoading = kpisLoading || convLoading || outLoading || insightsLoading;

  const handleRecalcular = async () => {
    await recalcularClusters.mutateAsync();
    await regenerarInsights.mutateAsync();
  };

  const handleMarkAsRead = async (insightId: string) => {
    const { error } = await supabase
      .from('analise_insights')
      .update({ lido: true })
      .eq('id', insightId);

    if (error) {
      showToast.error('Erro ao marcar insight como lido');
    }
  };

  const recentInsights = insights?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Estratégico</h1>
          <p className="text-muted-foreground">Visão geral da análise de clusters e insights</p>
        </div>
        <Button 
          onClick={handleRecalcular}
          disabled={recalcularClusters.isPending || regenerarInsights.isPending}
        >
          {(recalcularClusters.isPending || regenerarInsights.isPending) ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Recalcular Clusters
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total PDVs Analisados</p>
                <p className="text-2xl font-bold">{kpis?.totalPDVs || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Score Médio</p>
                <p className="text-2xl font-bold">{kpis?.scoreMedio?.toFixed(1) || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clusters Críticos</p>
                <p className="text-2xl font-bold">{kpis?.clustersCriticos || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Lightbulb className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Insights Não Lidos</p>
                <p className="text-2xl font-bold">{kpis?.insightsNaoLidos || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-emerald-500" />
              <h3 className="font-semibold">Conveniência</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/analise-estrategica/clusters/conveniencia')}>
              Ver detalhes
            </Button>
          </div>
          <ClusterDistributionChart 
            data={convenienciaDistribution || []} 
            title="Distribuição - Conveniência"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Outdoors</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/analise-estrategica/clusters/outdoors')}>
              Ver detalhes
            </Button>
          </div>
          <ClusterDistributionChart 
            data={outdoorDistribution || []} 
            title="Distribuição - Outdoors"
          />
        </div>
      </div>

      {/* Recent Insights */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights Recentes
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/analise-estrategica/insights')}>
            Ver todos
          </Button>
        </CardHeader>
        <CardContent>
          {recentInsights.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum insight gerado ainda. Clique em "Recalcular Clusters" para gerar insights.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentInsights.map((insight) => (
                <InsightCard 
                  key={insight.id} 
                  insight={insight} 
                  onMarkAsRead={() => handleMarkAsRead(insight.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/analise-estrategica/clusters/comparativo')}
        >
          <CardContent className="pt-6 text-center">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h4 className="font-semibold">Comparativo</h4>
            <p className="text-sm text-muted-foreground">Análise lado a lado</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/analise-estrategica/insights')}
        >
          <CardContent className="pt-6 text-center">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <h4 className="font-semibold">Insights</h4>
            <p className="text-sm text-muted-foreground">Recomendações automáticas</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/analise-estrategica/relatorios')}
        >
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <h4 className="font-semibold">Relatórios</h4>
            <p className="text-sm text-muted-foreground">Exportar análises</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
