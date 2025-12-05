import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useModule } from '@/contexts/ModuleContext';
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  MapPin,
  Calendar,
  Building,
  BarChart3,
  PieChart,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Reports() {
  const { activeModule } = useModule();
  const [period, setPeriod] = useState('30');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');

  // Fetch media evaluations
  const { data: mediaEvaluations = [], isLoading: loadingMedia } = useQuery({
    queryKey: ['media-evaluations-report', period],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const { data, error } = await supabase
        .from('media_evaluations')
        .select(`
          *,
          outdoors(code, location, width, height, area),
          pdvs(name, city, state),
          profiles(name)
        `)
        .gte('evaluated_at', startDate.toISOString())
        .order('evaluated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: activeModule === 'media',
  });

  // Fetch merch evaluations
  const { data: merchEvaluations = [], isLoading: loadingMerch } = useQuery({
    queryKey: ['merch-evaluations-report', period],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const { data, error } = await supabase
        .from('merch_evaluations')
        .select(`
          *,
          pdvs(name, city, state),
          profiles(name)
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: activeModule === 'merchandising',
  });

  // Fetch PDV summary
  const { data: pdvSummary = [] } = useQuery({
    queryKey: ['pdv-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdvs')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingMedia || loadingMerch;

  // Calculate stats for media module
  const mediaStats = {
    total: mediaEvaluations.length,
    operational: mediaEvaluations.filter(e => e.status === 'operational').length,
    nonOperational: mediaEvaluations.filter(e => e.status === 'non_operational').length,
    pending: mediaEvaluations.filter(e => e.status === 'pending_evaluation').length,
  };

  // Calculate stats for merch module
  const merchStats = {
    total: merchEvaluations.length,
    completed: merchEvaluations.filter(e => e.status === 'completed').length,
    draft: merchEvaluations.filter(e => e.status === 'draft').length,
    averageScore: merchEvaluations.length > 0
      ? Math.round(merchEvaluations.reduce((acc, e) => acc + Number(e.percentage_score), 0) / merchEvaluations.length)
      : 0,
  };

  // Group evaluations by PDV for heatmap
  const pdvScores = merchEvaluations.reduce((acc, evaluation) => {
    const pdvName = (evaluation as any).pdvs?.name || 'Desconhecido';
    if (!acc[pdvName]) {
      acc[pdvName] = { scores: [], count: 0 };
    }
    acc[pdvName].scores.push(Number(evaluation.percentage_score));
    acc[pdvName].count++;
    return acc;
  }, {} as Record<string, { scores: number[]; count: number }>);

  const pdvAverages = Object.entries(pdvScores).map(([name, data]) => ({
    name,
    average: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
    count: data.count,
  }));

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-success text-success-foreground';
    if (score >= 70) return 'bg-warning text-warning-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'non_operational':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const handleExport = () => {
    // In a real implementation, this would generate PDF/Excel
    // For now, we'll create a simple CSV download
    const data = activeModule === 'media' ? mediaEvaluations : merchEvaluations;
    
    if (data.length === 0) {
      return;
    }

    let csvContent = '';
    
    if (activeModule === 'media') {
      csvContent = 'Data,Outdoor,PDV,Local,Status,Avaliador,Observações\n';
      mediaEvaluations.forEach(e => {
        csvContent += `${format(new Date(e.evaluated_at), 'dd/MM/yyyy', { locale: ptBR })},${(e as any).outdoors?.code || ''},${(e as any).pdvs?.name || ''},${(e as any).outdoors?.location || ''},${e.status},${(e as any).profiles?.name || ''},${e.observations || ''}\n`;
      });
    } else {
      csvContent = 'Data,PDV,Cidade,Estado,Score (%),Status,Avaliador\n';
      merchEvaluations.forEach(e => {
        csvContent += `${format(new Date(e.created_at), 'dd/MM/yyyy', { locale: ptBR })},${(e as any).pdvs?.name || ''},${(e as any).pdvs?.city || ''},${(e as any).pdvs?.state || ''},${e.percentage_score}%,${e.status},${(e as any).profiles?.name || ''}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-${activeModule}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground mt-1">
              {activeModule === 'media' 
                ? 'Análise de avaliações de mídia externa'
                : 'Análise de avaliações de merchandising'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {activeModule === 'media' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total de Avaliações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold">{mediaStats.total}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Operacionais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-2xl font-bold text-success">{mediaStats.operational}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Não Operacionais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-destructive" />
                      <span className="text-2xl font-bold text-destructive">{mediaStats.nonOperational}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Aguardando</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-warning" />
                      <span className="text-2xl font-bold text-warning">{mediaStats.pending}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total de Avaliações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold">{merchStats.total}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Completas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-2xl font-bold text-success">{merchStats.completed}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Rascunhos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-warning" />
                      <span className="text-2xl font-bold text-warning">{merchStats.draft}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Score Médio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold">{merchStats.averageScore}%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* PDV Performance Heatmap (Merch only) */}
            {activeModule === 'merchandising' && pdvAverages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Mapa de Calor por PDV
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {pdvAverages.map((pdv) => (
                      <div
                        key={pdv.name}
                        className={`p-3 rounded-lg text-center ${getScoreColor(pdv.average)}`}
                      >
                        <p className="text-xs font-medium truncate">{pdv.name}</p>
                        <p className="text-lg font-bold">{pdv.average}%</p>
                        <p className="text-xs opacity-80">{pdv.count} avaliações</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-success" />
                      <span>≥85% Excelente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-warning" />
                      <span>70-84% Regular</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-destructive" />
                      <span>&lt;70% Crítico</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Evaluations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Avaliações Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(activeModule === 'media' ? mediaEvaluations : merchEvaluations).length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma avaliação encontrada no período selecionado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Data</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                            {activeModule === 'media' ? 'Outdoor' : 'PDV'}
                          </th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Local</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                            {activeModule === 'media' ? 'Status' : 'Score'}
                          </th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Avaliador</th>
                          {activeModule === 'media' && (
                            <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Observações</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {activeModule === 'media' ? (
                          mediaEvaluations.slice(0, 10).map((evaluation) => (
                            <tr key={evaluation.id} className="border-b border-border hover:bg-muted/50">
                              <td className="py-3 px-2 text-sm">
                                {format(new Date(evaluation.evaluated_at), 'dd/MM/yyyy', { locale: ptBR })}
                              </td>
                              <td className="py-3 px-2 text-sm font-medium">
                                {(evaluation as any).outdoors?.code || '-'}
                              </td>
                              <td className="py-3 px-2 text-sm text-muted-foreground">
                                {(evaluation as any).pdvs?.name || '-'} - {(evaluation as any).outdoors?.location || ''}
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(evaluation.status)}
                                  <span className="text-sm capitalize">
                                    {evaluation.status === 'operational' ? 'Operacional' : 
                                     evaluation.status === 'non_operational' ? 'Não Operacional' : 'Pendente'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-sm">
                                {(evaluation as any).profiles?.name || '-'}
                              </td>
                              <td className="py-3 px-2 text-sm text-muted-foreground max-w-[200px] truncate">
                                {evaluation.observations || '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          merchEvaluations.slice(0, 10).map((evaluation) => (
                            <tr key={evaluation.id} className="border-b border-border hover:bg-muted/50">
                              <td className="py-3 px-2 text-sm">
                                {format(new Date(evaluation.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                              </td>
                              <td className="py-3 px-2 text-sm font-medium">
                                {(evaluation as any).pdvs?.name || '-'}
                              </td>
                              <td className="py-3 px-2 text-sm text-muted-foreground">
                                {(evaluation as any).pdvs?.city || ''}, {(evaluation as any).pdvs?.state || ''}
                              </td>
                              <td className="py-3 px-2">
                                <Badge className={getScoreColor(Number(evaluation.percentage_score))}>
                                  {evaluation.percentage_score}%
                                </Badge>
                              </td>
                              <td className="py-3 px-2 text-sm">
                                {(evaluation as any).profiles?.name || '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PDV Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Resumo de PDVs Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pdvSummary.slice(0, 6).map((pdv) => (
                    <div key={pdv.id} className="p-4 border border-border rounded-lg">
                      <h4 className="font-medium text-foreground">{pdv.name}</h4>
                      <p className="text-sm text-muted-foreground">{pdv.code}</p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{pdv.city}, {pdv.state}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pdv.active_modules?.map((mod: string) => (
                          <Badge key={mod} variant="secondary" className="text-xs">
                            {mod === 'media' ? 'Mídia' : 'Merchandising'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {pdvSummary.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Nenhum PDV cadastrado</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}