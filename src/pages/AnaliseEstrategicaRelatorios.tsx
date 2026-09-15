// Relatórios da Análise Estratégica — exportação CSV client-side, sem
// biblioteca nova: geração de string CSV (cabeçalho + linhas, escape básico)
// e download via Blob + URL.createObjectURL (API nativa do navegador).
// Acessível a quem já lê o módulo — RLS decide o que cada query retorna,
// este botão só formata o que já veio.
import {
  useAnaliseClustersCalculo,
  useAnaliseInsights,
  type AnaliseClusterCalculo,
  type AnaliseInsight,
} from "@/hooks/useAnaliseEstrategica";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TIPO_PDV_LABEL: Record<string, string> = {
  POS: "Outdoor",
  CONV: "Conveniência",
};

function escaparCampoCsv(valor: string): string {
  if (/[",\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

function gerarCsv(cabecalho: string[], linhas: string[][]): string {
  return [cabecalho, ...linhas].map((linha) => linha.map(escaparCampoCsv).join(",")).join("\n");
}

function baixarCsv(nomeArquivo: string, conteudo: string) {
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportarClustersCsv(dados: AnaliseClusterCalculo[]) {
  const cabecalho = ["Código PDV", "Nome PDV", "Tipo", "Score mídia", "Score merchandising", "Pontuação total", "Gap", "Cluster"];
  const linhas = dados.map((item) => [
    item.pdv?.codigo ?? "",
    item.pdv?.nome ?? "",
    TIPO_PDV_LABEL[item.tipo_pdv] ?? item.tipo_pdv,
    String(item.score_midia),
    item.score_merch !== null ? String(item.score_merch) : "",
    String(item.pontuacao_total),
    String(item.gap_midia_merch),
    item.cluster?.nome ?? "",
  ]);
  baixarCsv("analise-clusters.csv", gerarCsv(cabecalho, linhas));
}

function exportarInsightsCsv(dados: AnaliseInsight[]) {
  const cabecalho = ["Título", "Descrição", "Tipo", "Tipo de PDV", "Lido", "Data"];
  const linhas = dados.map((item) => [
    item.titulo,
    item.descricao,
    item.tipo,
    item.tipo_pdv ? TIPO_PDV_LABEL[item.tipo_pdv] ?? item.tipo_pdv : "",
    item.lido ? "sim" : "não",
    new Date(item.created_at).toLocaleString("pt-BR"),
  ]);
  baixarCsv("analise-insights.csv", gerarCsv(cabecalho, linhas));
}

export default function AnaliseEstrategicaRelatorios() {
  const clustersQuery = useAnaliseClustersCalculo();
  const insightsQuery = useAnaliseInsights();

  const clusters = clustersQuery.data ?? [];
  const insights = insightsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Relatórios da Análise</h1>
        <p className="text-muted-foreground">Exportação em CSV dos dados do último recálculo.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clusters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {clustersQuery.isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : clustersQuery.isError ? (
              <div className="flex flex-col items-start gap-2">
                <p role="alert" className="text-sm text-destructive">
                  {clustersQuery.error instanceof Error
                    ? clustersQuery.error.message
                    : "Não foi possível carregar os clusters."}
                </p>
                <Button variant="outline" size="sm" onClick={() => clustersQuery.refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : clusters.length === 0 ? (
              <p className="text-sm text-muted-foreground">Não há dados de cluster para exportar.</p>
            ) : (
              <Button
                type="button"
                onClick={() => exportarClustersCsv(clusters)}
                className="sm:w-auto"
              >
                Exportar clusters (CSV)
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {insightsQuery.isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : insightsQuery.isError ? (
              <div className="flex flex-col items-start gap-2">
                <p role="alert" className="text-sm text-destructive">
                  {insightsQuery.error instanceof Error
                    ? insightsQuery.error.message
                    : "Não foi possível carregar os insights."}
                </p>
                <Button variant="outline" size="sm" onClick={() => insightsQuery.refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">Não há insights para exportar.</p>
            ) : (
              <Button
                type="button"
                onClick={() => exportarInsightsCsv(insights)}
                className="sm:w-auto"
              >
                Exportar insights (CSV)
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
