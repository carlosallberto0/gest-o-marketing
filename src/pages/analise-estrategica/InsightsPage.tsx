import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, Lightbulb, CheckCircle2, Filter } from 'lucide-react';
import { useInsights } from '@/hooks/useAnaliseEstrategica';
import { useRegenerarInsights } from '@/hooks/useInsightsGeneration';
import { useRecalcularClusters } from '@/hooks/useClusterizacao';
import { InsightCard } from '@/components/analise/InsightCard';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';

export default function InsightsPage() {
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [moduloFilter, setModuloFilter] = useState<string>('all');
  const [pdvTipoFilter, setPdvTipoFilter] = useState<string>('all');

  const queryClient = useQueryClient();
  const { data: insights, isLoading } = useInsights();
  const regenerarInsights = useRegenerarInsights();
  const recalcularClusters = useRecalcularClusters();

  // Filter insights
  const filteredInsights = insights?.filter(insight => {
    const matchesTipo = tipoFilter === 'all' || insight.tipo === tipoFilter;
    const matchesModulo = moduloFilter === 'all' || insight.modulo_foco === moduloFilter;
    const matchesPdvTipo = pdvTipoFilter === 'all' || insight.pdv_tipo === pdvTipoFilter;
    return matchesTipo && matchesModulo && matchesPdvTipo;
  }) || [];

  const unreadCount = insights?.filter(i => !i.lido).length || 0;

  const handleRegenerar = async () => {
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
    } else {
      queryClient.invalidateQueries({ queryKey: ['analise-insights'] });
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = insights?.filter(i => !i.lido).map(i => i.id) || [];
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('analise_insights')
      .update({ lido: true })
      .in('id', unreadIds);

    if (error) {
      showToast.error('Erro ao marcar insights como lidos');
    } else {
      showToast.success(`${unreadIds.length} insights marcados como lidos`);
      queryClient.invalidateQueries({ queryKey: ['analise-insights'] });
    }
  };

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
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Lightbulb className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Insights Estratégicos</h1>
            <p className="text-muted-foreground">
              Recomendações automáticas baseadas na análise de clusters
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount} não lido{unreadCount > 1 ? 's' : ''}
                </Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Marcar todos como lidos
            </Button>
          )}
          <Button 
            onClick={handleRegenerar}
            disabled={regenerarInsights.isPending || recalcularClusters.isPending}
          >
            {(regenerarInsights.isPending || recalcularClusters.isPending) ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Gerar Novos Insights
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de Insight" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="tendencia">Tendência</SelectItem>
                <SelectItem value="alerta">Alerta</SelectItem>
                <SelectItem value="oportunidade">Oportunidade</SelectItem>
              </SelectContent>
            </Select>

            <Select value={moduloFilter} onValueChange={setModuloFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Módulo Foco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os módulos</SelectItem>
                <SelectItem value="midia">Mídia</SelectItem>
                <SelectItem value="merchandising">Merchandising</SelectItem>
                <SelectItem value="integrado">Integrado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={pdvTipoFilter} onValueChange={setPdvTipoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de PDV" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os PDVs</SelectItem>
                <SelectItem value="conveniencia">Conveniência</SelectItem>
                <SelectItem value="outdoor">Outdoor</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Insights Grid */}
      {filteredInsights.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum insight encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {insights?.length === 0 
                ? 'Clique em "Gerar Novos Insights" para criar recomendações baseadas nos dados atuais.'
                : 'Tente ajustar os filtros para ver mais insights.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInsights.map((insight) => (
            <InsightCard 
              key={insight.id} 
              insight={insight}
              onMarkAsRead={() => handleMarkAsRead(insight.id)}
            />
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {insights && insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">{insights.length}</p>
              <p className="text-sm text-muted-foreground">Total de Insights</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-blue-500">
                {insights.filter(i => i.tipo === 'tendencia').length}
              </p>
              <p className="text-sm text-muted-foreground">Tendências</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-destructive">
                {insights.filter(i => i.tipo === 'alerta').length}
              </p>
              <p className="text-sm text-muted-foreground">Alertas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-emerald-500">
                {insights.filter(i => i.tipo === 'oportunidade').length}
              </p>
              <p className="text-sm text-muted-foreground">Oportunidades</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
