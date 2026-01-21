import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeftRight, Store, Megaphone, TrendingUp, TrendingDown } from 'lucide-react';
import { useClusterCalculos, useClusterDistribution, useGapAnalysis } from '@/hooks/useAnaliseEstrategica';
import { ClusterDistributionChart } from '@/components/analise/ClusterDistributionChart';
import { GapAnalysisChart } from '@/components/analise/GapAnalysisChart';
import { ScoreComparisonChart } from '@/components/analise/ScoreComparisonChart';
import { ClusterBadge } from '@/components/analise/ClusterCard';

export default function ComparativoClusters() {
  const { data: convCalc, isLoading: convCalcLoading } = useClusterCalculos('conveniencia');
  const { data: outCalc, isLoading: outCalcLoading } = useClusterCalculos('outdoor');
  const { data: convDist, isLoading: convDistLoading } = useClusterDistribution('conveniencia');
  const { data: outDist, isLoading: outDistLoading } = useClusterDistribution('outdoor');
  const { data: gapData, isLoading: gapLoading } = useGapAnalysis(15);

  const isLoading = convCalcLoading || outCalcLoading || convDistLoading || outDistLoading || gapLoading;

  // Calculate averages
  const convAvg = convCalc?.length 
    ? {
        total: convCalc.reduce((a, b) => a + b.pontuacao_total, 0) / convCalc.length,
        midia: convCalc.reduce((a, b) => a + b.pontuacao_midia, 0) / convCalc.length,
        merch: convCalc.reduce((a, b) => a + b.pontuacao_merchandising, 0) / convCalc.length,
        gap: convCalc.reduce((a, b) => a + Math.abs(b.gap_midia_merch), 0) / convCalc.length,
      }
    : { total: 0, midia: 0, merch: 0, gap: 0 };

  const outAvg = outCalc?.length 
    ? {
        total: outCalc.reduce((a, b) => a + b.pontuacao_total, 0) / outCalc.length,
        midia: outCalc.reduce((a, b) => a + b.pontuacao_midia, 0) / outCalc.length,
        merch: outCalc.reduce((a, b) => a + b.pontuacao_merchandising, 0) / outCalc.length,
        gap: outCalc.reduce((a, b) => a + Math.abs(b.gap_midia_merch), 0) / outCalc.length,
      }
    : { total: 0, midia: 0, merch: 0, gap: 0 };

  // Top 10 gaps
  const topGaps = gapData?.slice(0, 10) || [];

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
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <ArrowLeftRight className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Comparativo de Clusters</h1>
          <p className="text-muted-foreground">Análise lado a lado entre Conveniência e Outdoors</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Conveniência Summary */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Store className="h-5 w-5 text-emerald-500" />
              Conveniência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Score Médio</p>
                <p className="text-2xl font-bold">{convAvg.total.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gap Médio</p>
                <p className="text-2xl font-bold">{convAvg.gap.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mídia</p>
                <p className="text-lg font-semibold">{convAvg.midia.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Merchandising</p>
                <p className="text-lg font-semibold">{convAvg.merch.toFixed(1)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Total PDVs: <span className="font-semibold text-foreground">{convCalc?.length || 0}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Outdoors Summary */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Megaphone className="h-5 w-5 text-blue-500" />
              Outdoors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Score Médio</p>
                <p className="text-2xl font-bold">{outAvg.total.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gap Médio</p>
                <p className="text-2xl font-bold">{outAvg.gap.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mídia</p>
                <p className="text-lg font-semibold">{outAvg.midia.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Merchandising</p>
                <p className="text-lg font-semibold">{outAvg.merch.toFixed(1)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Total PDVs: <span className="font-semibold text-foreground">{outCalc?.length || 0}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClusterDistributionChart 
          data={convDist || []} 
          title="Distribuição - Conveniência"
        />
        <ClusterDistributionChart 
          data={outDist || []} 
          title="Distribuição - Outdoors"
        />
      </div>

      {/* Score Comparison */}
      <ScoreComparisonChart 
        data={[...(convCalc || []), ...(outCalc || [])]} 
        title="Comparativo Mídia x Merchandising (Todos os PDVs)"
      />

      {/* Gap Analysis */}
      <GapAnalysisChart 
        data={[...(convCalc || []), ...(outCalc || [])]} 
        title="PDVs com Maiores Gaps"
        maxItems={15}
      />

      {/* Top 10 Gaps Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Maiores Gaps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PDV</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cluster</TableHead>
                  <TableHead className="text-right">Score Mídia</TableHead>
                  <TableHead className="text-right">Score Merchandising</TableHead>
                  <TableHead className="text-right">Gap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topGaps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum PDV com gap significativo
                    </TableCell>
                  </TableRow>
                ) : (
                  topGaps.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.pdv?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.pdv_tipo === 'conveniencia' ? (
                            <><Store className="h-3 w-3 mr-1" /> Conv.</>
                          ) : (
                            <><Megaphone className="h-3 w-3 mr-1" /> Outdoor</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ClusterBadge cluster={item.cluster} size="sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        {item.pontuacao_midia.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.pontuacao_merchandising.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="gap-1">
                          {item.gap_midia_merch > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {item.gap_midia_merch > 0 ? '+' : ''}{item.gap_midia_merch.toFixed(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
