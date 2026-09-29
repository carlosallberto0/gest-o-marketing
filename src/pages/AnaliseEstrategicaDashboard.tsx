// Painel da Análise Estratégica — KPIs e distribuição são agregação client-side
// em cima do snapshot já buscado por useAnaliseClustersCalculo() (dataset
// pequeno, sem RPC nova). "Recalcular agora" só aparece pra quem tem o grant
// analise/clusters/recalcular/rede_toda (super_admin, não director — ver
// ADR-002 e docs/decisions/ADR-002-recalculo-diretor.md): diretor visualiza,
// não recalcula.
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useAnaliseClustersCalculo,
  useAnaliseInsights,
  useAnaliseRecalcular,
  type AnaliseClusterCalculo,
  type AnaliseInsight,
  type AnaliseInsightTipo,
} from "@/hooks/useAnaliseEstrategica";
import { useHasPermission } from "@/hooks/useHasPermission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { ClusterDistribuicaoChart } from "@/components/analise-estrategica/ClusterVisual";
import { agruparPorCluster } from "@/lib/analise-estrategica";
import { PageHeader } from "@/components/layout/PageHeader";

const INSIGHT_TIPO_LABEL: Record<AnaliseInsightTipo, string> = {
  alerta: "Alerta",
  oportunidade: "Oportunidade",
  tendencia: "Tendência",
};

const INSIGHT_TIPO_BADGE_VARIANT: Record<AnaliseInsightTipo, BadgeProps["variant"]> = {
  alerta: "soft-danger",
  oportunidade: "soft-success",
  tendencia: "soft-info",
};

export default function AnaliseEstrategicaDashboard() {
  const clustersQuery = useAnaliseClustersCalculo();
  const insightsQuery = useAnaliseInsights();
  const insightsNaoLidosQuery = useAnaliseInsights({ lido: false });
  const recalcular = useAnaliseRecalcular();
  const podeRecalcular = useHasPermission("analise", "clusters", "recalcular", "rede_toda");
  const [recalcularErro, setRecalcularErro] = useState<string | null>(null);

  // Mesmo padrão inline (sem toast) já usado no projeto pra mutation disparada
  // por clique — ver handleFinalizar/handleExportar em EstudioColaborador.tsx.
  // Sucesso é silencioso: a invalidação de cache já atualiza os dados e o
  // texto "Dados atualizados em" muda sozinho, sem precisar de mensagem à parte.
  async function handleRecalcular() {
    if (recalcular.isPending) return;
    setRecalcularErro(null);
    try {
      await recalcular.mutateAsync();
    } catch (err) {
      setRecalcularErro(err instanceof Error ? err.message : "Não foi possível recalcular a análise.");
    }
  }

  const dados = clustersQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          breadcrumbs={[{ label: "Inteligência" }, { label: "Dashboard" }]}
          title="Análise Estratégica"
          description="Clusterização de PDVs combinando score de mídia e merchandising."
        />
        {podeRecalcular.data && dados.length > 0 && (
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Button type="button" disabled={recalcular.isPending} onClick={handleRecalcular} className="sm:w-auto">
              {recalcular.isPending ? "Recalculando…" : "Recalcular agora"}
            </Button>
            {recalcularErro && (
              <p role="alert" className="text-sm text-destructive">
                {recalcularErro}
              </p>
            )}
          </div>
        )}
      </div>

      {clustersQuery.isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-5 w-64" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : clustersQuery.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-destructive">
            {clustersQuery.error instanceof Error ? clustersQuery.error.message : "Não foi possível carregar a análise."}
          </p>
          <Button variant="outline" size="sm" onClick={() => clustersQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <DashboardConteudo
          dados={dados}
          insights={insightsQuery.data ?? []}
          insightsNaoLidos={insightsNaoLidosQuery.data?.length ?? 0}
          podeRecalcular={!!podeRecalcular.data}
          onRecalcular={handleRecalcular}
          recalculando={recalcular.isPending}
          recalcularErro={recalcularErro}
        />
      )}
    </div>
  );
}

// Fora do corpo do componente pai por convenção do arquivo (evita um segundo
// componente de função aninhado dentro de AnaliseEstrategicaDashboard); não
// guarda estado de input, mas mantém o padrão do projeto.
function DashboardConteudo({
  dados,
  insights,
  insightsNaoLidos,
  podeRecalcular,
  onRecalcular,
  recalculando,
  recalcularErro,
}: {
  dados: AnaliseClusterCalculo[];
  insights: AnaliseInsight[];
  insightsNaoLidos: number;
  podeRecalcular: boolean;
  onRecalcular: () => void;
  recalculando: boolean;
  recalcularErro: string | null;
}) {
  if (dados.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
        <p className="text-muted-foreground">Nenhum cálculo realizado ainda.</p>
        {podeRecalcular && (
          <>
            <Button type="button" disabled={recalculando} onClick={onRecalcular}>
              {recalculando ? "Recalculando…" : "Recalcular agora"}
            </Button>
            {recalcularErro && (
              <p role="alert" className="text-sm text-destructive">
                {recalcularErro}
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  const total = dados.length;
  const dadosPos = dados.filter((item) => item.tipo_pdv === "POS");
  const dadosConv = dados.filter((item) => item.tipo_pdv === "CONV");
  const media = (lista: typeof dados) =>
    lista.length > 0 ? lista.reduce((acc, item) => acc + item.pontuacao_total, 0) / lista.length : null;

  const scoreMedioGeral = dados.reduce((acc, item) => acc + item.pontuacao_total, 0) / total;
  const scoreMedioPos = media(dadosPos);
  const scoreMedioConv = media(dadosConv);
  const criticos = dados.filter((item) => (item.cluster?.faixa_max ?? Infinity) <= 50).length;
  const gapMedioAbsoluto = dados.reduce((acc, item) => acc + Math.abs(item.gap_midia_merch), 0) / total;
  const dataCalculo = new Date(dados[0].data_calculo).toLocaleString("pt-BR");

  return (
    <>
      <p className="text-sm text-muted-foreground">Dados atualizados em {dataCalculo}.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard titulo="PDVs analisados" valor={String(total)} detalhe={`${dadosPos.length} outdoor · ${dadosConv.length} conveniência`} />
        <KpiCard titulo="Score médio geral" valor={scoreMedioGeral.toFixed(1)} />
        <KpiCard
          titulo="Score médio por tipo"
          valor={scoreMedioPos !== null ? scoreMedioPos.toFixed(1) : "—"}
          detalhe={`Outdoor · Conveniência: ${scoreMedioConv !== null ? scoreMedioConv.toFixed(1) : "—"}`}
        />
        <KpiCard titulo="PDVs em cluster crítico" valor={String(criticos)} />
        <KpiCard titulo="Insights não lidos" valor={String(insightsNaoLidos)} />
        <KpiCard titulo="Gap médio (mídia x merchandising)" valor={gapMedioAbsoluto.toFixed(1)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por cluster</CardTitle>
        </CardHeader>
        <CardContent>
          <ClusterDistribuicaoChart dados={agruparPorCluster(dados)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Insights recentes</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/analise-estrategica/insights">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum insight gerado no último recálculo.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {insights.slice(0, 5).map((insight) => (
                <li key={insight.id} className="flex flex-col gap-1 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{insight.titulo}</span>
                    <Badge variant={INSIGHT_TIPO_BADGE_VARIANT[insight.tipo]}>{INSIGHT_TIPO_LABEL[insight.tipo]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.descricao}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
