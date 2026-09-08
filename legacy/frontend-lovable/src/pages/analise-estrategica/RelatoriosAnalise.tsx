import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileBarChart, Download, Plus, Calendar, Loader2, FileText, Table2 } from 'lucide-react';
import { useClusterCalculos, useInsights, useClusterDistribution } from '@/hooks/useAnaliseEstrategica';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { showToast } from '@/lib/toast';

export default function RelatoriosAnalise() {
  const [tipoRelatorio, setTipoRelatorio] = useState<string>('completo');
  const [pdvTipo, setPdvTipo] = useState<string>('todos');
  const [isExporting, setIsExporting] = useState(false);

  const { data: convCalc } = useClusterCalculos('conveniencia');
  const { data: outCalc } = useClusterCalculos('outdoor');
  const { data: convDist } = useClusterDistribution('conveniencia');
  const { data: outDist } = useClusterDistribution('outdoor');
  const { data: insights } = useInsights();

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      let data = [];
      let filename = '';

      if (pdvTipo === 'todos' || pdvTipo === 'conveniencia') {
        const convData = convCalc?.map(item => ({
          'PDV': item.pdv?.name || 'N/A',
          'Tipo': 'Conveniência',
          'Cluster': item.cluster?.nome || 'Não classificado',
          'Score Total': item.pontuacao_total.toFixed(2),
          'Score Mídia': item.pontuacao_midia.toFixed(2),
          'Score Merchandising': item.pontuacao_merchandising.toFixed(2),
          'Gap': item.gap_midia_merch.toFixed(2),
          'Potencial': item.potencial_aproveitamento.toFixed(2),
          'Data Cálculo': format(new Date(item.data_calculo), 'dd/MM/yyyy', { locale: ptBR }),
        })) || [];
        data = [...data, ...convData];
      }

      if (pdvTipo === 'todos' || pdvTipo === 'outdoor') {
        const outData = outCalc?.map(item => ({
          'PDV': item.pdv?.name || 'N/A',
          'Tipo': 'Outdoor',
          'Cluster': item.cluster?.nome || 'Não classificado',
          'Score Total': item.pontuacao_total.toFixed(2),
          'Score Mídia': item.pontuacao_midia.toFixed(2),
          'Score Merchandising': item.pontuacao_merchandising.toFixed(2),
          'Gap': item.gap_midia_merch.toFixed(2),
          'Potencial': item.potencial_aproveitamento.toFixed(2),
          'Data Cálculo': format(new Date(item.data_calculo), 'dd/MM/yyyy', { locale: ptBR }),
        })) || [];
        data = [...data, ...outData];
      }

      if (data.length === 0) {
        showToast.error('Nenhum dado para exportar');
        return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
      ].join('\n');

      // Download
      filename = `analise-estrategica-${pdvTipo}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      showToast.success('Relatório exportado com sucesso!');
    } catch (error) {
      showToast.error('Erro ao exportar relatório');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportInsights = async () => {
    setIsExporting(true);
    try {
      if (!insights?.length) {
        showToast.error('Nenhum insight para exportar');
        return;
      }

      const data = insights.map(item => ({
        'Título': item.titulo,
        'Tipo': item.tipo,
        'Descrição': item.descricao,
        'Módulo Foco': item.modulo_foco,
        'Tipo PDV': item.pdv_tipo,
        'Impacto Estimado': item.impacto_estimado.toFixed(0),
        'Ações Recomendadas': Array.isArray(item.acoes_recomendadas) 
          ? item.acoes_recomendadas.join('; ')
          : '',
        'Lido': item.lido ? 'Sim' : 'Não',
        'Data Geração': format(new Date(item.data_geracao), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      }));

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
      ].join('\n');

      const filename = `insights-estrategicos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      showToast.success('Insights exportados com sucesso!');
    } catch (error) {
      showToast.error('Erro ao exportar insights');
    } finally {
      setIsExporting(false);
    }
  };

  const totalConv = convCalc?.length || 0;
  const totalOut = outCalc?.length || 0;
  const totalInsights = insights?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileBarChart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Relatórios Estratégicos</h1>
          <p className="text-muted-foreground">Exporte análises e insights para tomada de decisão</p>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clusters Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              Relatório de Clusters
            </CardTitle>
            <CardDescription>
              Exporte os dados de clusterização e scores dos PDVs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de PDV</Label>
              <Select value={pdvTipo} onValueChange={setPdvTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos ({totalConv + totalOut})</SelectItem>
                  <SelectItem value="conveniencia">Conveniência ({totalConv})</SelectItem>
                  <SelectItem value="outdoor">Outdoor ({totalOut})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleExportCSV} 
                disabled={isExporting}
                className="flex-1"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Exportar CSV
              </Button>
            </div>

            <div className="text-xs text-muted-foreground pt-2">
              Inclui: PDV, Cluster, Scores, Gap, Potencial de Aproveitamento
            </div>
          </CardContent>
        </Card>

        {/* Insights Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatório de Insights
            </CardTitle>
            <CardDescription>
              Exporte todos os insights e recomendações gerados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold">{totalInsights}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-destructive">
                    {insights?.filter(i => i.tipo === 'alerta').length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Alertas</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-500">
                    {insights?.filter(i => i.tipo === 'oportunidade').length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Oportunidades</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleExportInsights} 
              disabled={isExporting || !totalInsights}
              className="w-full"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exportar Insights
            </Button>

            <div className="text-xs text-muted-foreground pt-2">
              Inclui: Título, Tipo, Descrição, Ações Recomendadas, Impacto
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo dos Dados Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-emerald-600">{totalConv}</p>
              <p className="text-sm text-muted-foreground">PDVs Conveniência</p>
            </div>
            <div className="p-4 bg-blue-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{totalOut}</p>
              <p className="text-sm text-muted-foreground">PDVs Outdoor</p>
            </div>
            <div className="p-4 bg-amber-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-amber-600">{totalInsights}</p>
              <p className="text-sm text-muted-foreground">Insights Gerados</p>
            </div>
            <div className="p-4 bg-purple-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">
                {(convDist?.length || 0) + (outDist?.length || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Clusters Configurados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future Features Placeholder */}
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Em Breve: Relatórios Agendados</h3>
          <p className="text-muted-foreground">
            Configure relatórios automáticos para serem gerados e enviados periodicamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
