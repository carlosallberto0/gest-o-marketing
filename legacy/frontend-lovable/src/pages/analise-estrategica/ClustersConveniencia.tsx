import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, Search, Store } from 'lucide-react';
import { useClusterCalculos, useClusterDistribution } from '@/hooks/useAnaliseEstrategica';
import { useRecalcularClusters } from '@/hooks/useClusterizacao';
import { ClusterCard, ClusterBadge } from '@/components/analise/ClusterCard';
import { ClusterDistributionChart } from '@/components/analise/ClusterDistributionChart';

export default function ClustersConveniencia() {
  const [search, setSearch] = useState('');
  const [clusterFilter, setClusterFilter] = useState<string>('all');
  
  const { data: calculos, isLoading: calculosLoading } = useClusterCalculos('conveniencia');
  const { data: distribution, isLoading: distLoading } = useClusterDistribution('conveniencia');
  const recalcularClusters = useRecalcularClusters();

  const isLoading = calculosLoading || distLoading;

  // Get unique clusters for filter
  const clusters = distribution?.map(d => d.cluster) || [];

  // Filter data
  const filteredData = calculos?.filter(item => {
    const matchesSearch = item.pdv?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesCluster = clusterFilter === 'all' || item.cluster_id === clusterFilter;
    return matchesSearch && matchesCluster;
  }) || [];

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
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Store className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Clusters Conveniência</h1>
            <p className="text-muted-foreground">Peso: 40% Mídia / 60% Merchandising</p>
          </div>
        </div>
        <Button 
          onClick={() => recalcularClusters.mutate()}
          disabled={recalcularClusters.isPending}
        >
          {recalcularClusters.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Recalcular
        </Button>
      </div>

      {/* Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {distribution?.map((dist) => (
          <ClusterCard 
            key={dist.cluster.id} 
            distribution={dist}
            onClick={() => setClusterFilter(dist.cluster.id)}
          />
        ))}
      </div>

      {/* Chart */}
      <ClusterDistributionChart 
        data={distribution || []} 
        title="Distribuição de Clusters - Conveniência"
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>PDVs Classificados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar PDV..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={clusterFilter} onValueChange={setClusterFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por cluster" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clusters</SelectItem>
                {clusters.map((cluster) => (
                  <SelectItem key={cluster.id} value={cluster.id}>
                    {cluster.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PDV</TableHead>
                  <TableHead>Cluster</TableHead>
                  <TableHead className="text-right">Score Total</TableHead>
                  <TableHead className="text-right">Score Mídia</TableHead>
                  <TableHead className="text-right">Score Merchandising</TableHead>
                  <TableHead className="text-right">Gap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum PDV encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.pdv?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <ClusterBadge cluster={item.cluster} size="sm" />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.pontuacao_total.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.pontuacao_midia.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.pontuacao_merchandising.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={Math.abs(item.gap_midia_merch) > 20 ? 'destructive' : 'secondary'}
                        >
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
