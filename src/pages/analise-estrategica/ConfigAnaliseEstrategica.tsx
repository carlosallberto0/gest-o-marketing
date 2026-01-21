import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Settings, Store, Megaphone, Save, Loader2, RefreshCw } from 'lucide-react';
import { useClustersConfig, useUpdateClusterConfig } from '@/hooks/useAnaliseConfig';
import { useRecalcularClusters } from '@/hooks/useClusterizacao';
import { showToast } from '@/lib/toast';

export default function ConfigAnaliseEstrategica() {
  const [activeTab, setActiveTab] = useState('conveniencia');
  
  const { data: convClusters, isLoading: convLoading } = useClustersConfig('conveniencia');
  const { data: outClusters, isLoading: outLoading } = useClustersConfig('outdoor');
  const updateCluster = useUpdateClusterConfig();
  const recalcularClusters = useRecalcularClusters();

  const isLoading = convLoading || outLoading;

  const handleUpdateCluster = async (clusterId: string, field: string, value: number) => {
    try {
      await updateCluster.mutateAsync({
        id: clusterId,
        [field]: value,
      });
    } catch (error) {
      showToast.error('Erro ao atualizar configuração');
    }
  };

  const handleRecalcular = async () => {
    await recalcularClusters.mutateAsync();
    showToast.success('Clusters recalculados com sucesso!');
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
          <div className="p-2 rounded-lg bg-primary/10">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">Configure pesos, critérios e faixas de clusters</p>
          </div>
        </div>
        <Button 
          onClick={handleRecalcular}
          disabled={recalcularClusters.isPending}
        >
          {recalcularClusters.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Recalcular Clusters
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="conveniencia" className="gap-2">
            <Store className="h-4 w-4" />
            Conveniência
          </TabsTrigger>
          <TabsTrigger value="outdoor" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Outdoors
          </TabsTrigger>
        </TabsList>

        {/* Conveniência Tab */}
        <TabsContent value="conveniencia" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-emerald-500" />
                Pesos - Conveniência
              </CardTitle>
              <CardDescription>
                Conveniência: 40% Mídia / 60% Merchandising
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-emerald-500/10 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-emerald-600">40%</p>
                    <p className="text-sm text-muted-foreground">Peso Mídia</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-emerald-600">60%</p>
                    <p className="text-sm text-muted-foreground">Peso Merchandising</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clusters Configurados</CardTitle>
              <CardDescription>
                Ajuste as faixas de pontuação para cada cluster
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {convClusters?.map((cluster) => (
                  <div 
                    key={cluster.id} 
                    className="p-4 border rounded-lg space-y-4"
                    style={{ borderLeftColor: cluster.cor_hex, borderLeftWidth: 4 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: cluster.cor_hex }}
                        />
                        <span className="font-semibold">{cluster.nome}</span>
                      </div>
                      <Badge variant="outline">
                        {cluster.faixa_min} - {cluster.faixa_max} pontos
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Faixa Mínima</Label>
                        <Input
                          type="number"
                          value={cluster.faixa_min}
                          onChange={(e) => handleUpdateCluster(cluster.id, 'faixa_min', Number(e.target.value))}
                          min={0}
                          max={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Faixa Máxima</Label>
                        <Input
                          type="number"
                          value={cluster.faixa_max}
                          onChange={(e) => handleUpdateCluster(cluster.id, 'faixa_max', Number(e.target.value))}
                          min={0}
                          max={100}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {(!convClusters || convClusters.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum cluster configurado para Conveniência
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outdoor Tab */}
        <TabsContent value="outdoor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-blue-500" />
                Pesos - Outdoors
              </CardTitle>
              <CardDescription>
                Outdoors: 70% Mídia / 30% Merchandising
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-blue-500/10 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-blue-600">70%</p>
                    <p className="text-sm text-muted-foreground">Peso Mídia</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-blue-600">30%</p>
                    <p className="text-sm text-muted-foreground">Peso Merchandising</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clusters Configurados</CardTitle>
              <CardDescription>
                Ajuste as faixas de pontuação para cada cluster
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {outClusters?.map((cluster) => (
                  <div 
                    key={cluster.id} 
                    className="p-4 border rounded-lg space-y-4"
                    style={{ borderLeftColor: cluster.cor_hex, borderLeftWidth: 4 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: cluster.cor_hex }}
                        />
                        <span className="font-semibold">{cluster.nome}</span>
                      </div>
                      <Badge variant="outline">
                        {cluster.faixa_min} - {cluster.faixa_max} pontos
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Faixa Mínima</Label>
                        <Input
                          type="number"
                          value={cluster.faixa_min}
                          onChange={(e) => handleUpdateCluster(cluster.id, 'faixa_min', Number(e.target.value))}
                          min={0}
                          max={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Faixa Máxima</Label>
                        <Input
                          type="number"
                          value={cluster.faixa_max}
                          onChange={(e) => handleUpdateCluster(cluster.id, 'faixa_max', Number(e.target.value))}
                          min={0}
                          max={100}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {(!outClusters || outClusters.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum cluster configurado para Outdoors
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Settings className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Sobre a Clusterização</p>
              <p>
                Os clusters são calculados com base nos scores de Mídia e Merchandising, 
                ponderados de acordo com o tipo de PDV. Após alterar as configurações, 
                clique em "Recalcular Clusters" para aplicar as mudanças a todos os PDVs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
