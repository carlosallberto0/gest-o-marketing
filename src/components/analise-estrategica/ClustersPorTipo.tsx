// Compartilhado entre as telas de rota /analise-estrategica/clusters/conveniencia
// e /clusters/outdoors (parametrizado por tipoPdv) — mesmo filtro, mesma
// tabela, mesmo gráfico; só o tipo consultado muda. Cada rota continua sendo
// um arquivo de página próprio (só repassa tipoPdv/título/descrição).
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAnaliseClustersCalculo } from "@/hooks/useAnaliseEstrategica";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClusterBadge, ClusterDistribuicaoChart } from "@/components/analise-estrategica/ClusterVisual";
import { agruparPorCluster } from "@/lib/analise-estrategica";

export function ClustersPorTipo({
  tipoPdv,
  titulo,
  descricao,
}: {
  tipoPdv: "POS" | "CONV";
  titulo: string;
  descricao: string;
}) {
  const [clusterFiltroId, setClusterFiltroId] = useState("todos");
  const query = useAnaliseClustersCalculo({ tipoPdv });

  const dados = query.data ?? [];
  const clustersDisponiveis = Array.from(
    new Map(
      dados
        .filter((item) => item.cluster_id && item.cluster)
        .map((item) => [item.cluster_id as string, { id: item.cluster_id as string, nome: item.cluster!.nome }]),
    ).values(),
  );
  const dadosFiltrados =
    clusterFiltroId === "todos" ? dados : dados.filter((item) => item.cluster_id === clusterFiltroId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{titulo}</h1>
        <p className="text-muted-foreground">{descricao}</p>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-10 w-full max-w-xs" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : query.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-destructive">
            {query.error instanceof Error ? query.error.message : "Não foi possível carregar os clusters."}
          </p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : dados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">Nenhum cálculo realizado ainda para este tipo de PDV.</p>
          <Button asChild>
            <Link to="/analise-estrategica/dashboard">Ir para o painel e recalcular</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* ADR-002: "Dados atualizados em" precisa aparecer no dashboard E
              nas telas de cluster, pra todo papel que entrar direto aqui sem
              passar pelo dashboard não ver número sem saber se está
              desatualizado. */}
          <p className="text-sm text-muted-foreground">
            Dados atualizados em {new Date(dados[0].data_calculo).toLocaleString("pt-BR")}.
          </p>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por cluster</CardTitle>
            </CardHeader>
            <CardContent>
              <ClusterDistribuicaoChart dados={agruparPorCluster(dados)} />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:w-64">
            <Label htmlFor="clusters-filtro-cluster">Filtrar por cluster</Label>
            <Select value={clusterFiltroId} onValueChange={setClusterFiltroId}>
              <SelectTrigger id="clusters-filtro-cluster">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os clusters</SelectItem>
                {clustersDisponiveis.map((cluster) => (
                  <SelectItem key={cluster.id} value={cluster.id}>
                    {cluster.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {dadosFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum PDV neste cluster.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <caption className="sr-only">Pontuação por PDV — {titulo}</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>PDV</TableHead>
                    <TableHead>Mídia</TableHead>
                    <TableHead>Merchandising</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Gap</TableHead>
                    <TableHead>Cluster</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosFiltrados.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.pdv ? `${item.pdv.codigo} — ${item.pdv.nome}` : "—"}</TableCell>
                      <TableCell>{item.score_midia.toFixed(1)}</TableCell>
                      <TableCell>{item.score_merch !== null ? item.score_merch.toFixed(1) : "—"}</TableCell>
                      <TableCell>{item.pontuacao_total.toFixed(1)}</TableCell>
                      <TableCell>{item.gap_midia_merch.toFixed(1)}</TableCell>
                      <TableCell>
                        {item.cluster ? (
                          <ClusterBadge nome={item.cluster.nome} cor={item.cluster.cor_hex} />
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem cluster</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
