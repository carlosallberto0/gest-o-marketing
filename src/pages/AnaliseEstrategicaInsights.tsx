// Lista completa de insights, com filtro por tipo e por lido/não lido. Sem
// ação de "regenerar": neste schema, insight é sempre recalculado junto do
// cluster, na mesma transação de analise_recalcular() (ver migration) — só um
// link apontando para o painel, sem botão de recálculo duplicado aqui.
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useAnaliseInsights,
  useMarcarInsightLido,
  type AnaliseInsight,
  type AnaliseInsightTipo,
} from "@/hooks/useAnaliseEstrategica";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";

const TIPO_LABEL: Record<AnaliseInsightTipo, string> = {
  alerta: "Alerta",
  oportunidade: "Oportunidade",
  tendencia: "Tendência",
};

const TIPO_BADGE_VARIANT: Record<AnaliseInsightTipo, BadgeProps["variant"]> = {
  alerta: "soft-danger",
  oportunidade: "soft-success",
  tendencia: "soft-info",
};

const TIPO_PDV_LABEL: Record<string, string> = {
  POS: "Outdoor",
  CONV: "Conveniência",
};

// Fora do corpo do componente pai: cada card dispara a própria mutation de
// "marcar lido" e não pode perder esse estado a cada render da lista.
function InsightCard({ insight }: { insight: AnaliseInsight }) {
  const marcarLido = useMarcarInsightLido();

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{insight.titulo}</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge variant={TIPO_BADGE_VARIANT[insight.tipo]}>{TIPO_LABEL[insight.tipo]}</Badge>
          {insight.tipo_pdv && (
            <Badge variant="outline">{TIPO_PDV_LABEL[insight.tipo_pdv] ?? insight.tipo_pdv}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{insight.descricao}</p>
        {!insight.lido && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            disabled={marcarLido.isPending}
            onClick={() => {
              if (marcarLido.isPending) return;
              marcarLido.mutate(insight.id);
            }}
          >
            {marcarLido.isPending ? "Marcando…" : "Marcar como lido"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnaliseEstrategicaInsights() {
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [lidoFiltro, setLidoFiltro] = useState("todos");

  const filtros: { tipo?: string; lido?: boolean } = {};
  if (tipoFiltro !== "todos") filtros.tipo = tipoFiltro;
  if (lidoFiltro !== "todos") filtros.lido = lidoFiltro === "lido";

  const insightsQuery = useAnaliseInsights(filtros);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Inteligência" }, { label: "Insights" }]}
        title="Insights"
        description="Alertas, oportunidades e tendências do último recálculo. Use 'Recalcular agora' no painel para atualizar."
      />

      <Button asChild variant="link" className="w-fit">
        <Link to="/analise-estrategica/dashboard">Ver painel completo</Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-col gap-2 sm:w-52">
          <Label htmlFor="insights-filtro-tipo">Tipo</Label>
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger id="insights-filtro-tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="alerta">Alerta</SelectItem>
              <SelectItem value="oportunidade">Oportunidade</SelectItem>
              <SelectItem value="tendencia">Tendência</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 sm:w-52">
          <Label htmlFor="insights-filtro-lido">Status</Label>
          <Select value={lidoFiltro} onValueChange={setLidoFiltro}>
            <SelectTrigger id="insights-filtro-lido">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="nao-lido">Não lidos</SelectItem>
              <SelectItem value="lido">Lidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {insightsQuery.isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : insightsQuery.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-destructive">
            {insightsQuery.error instanceof Error ? insightsQuery.error.message : "Não foi possível carregar os insights."}
          </p>
          <Button variant="outline" size="sm" onClick={() => insightsQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (insightsQuery.data ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">Nenhum insight encontrado com este filtro.</p>
          <Button asChild variant="outline">
            <Link to="/analise-estrategica/dashboard">Ir para o painel</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {(insightsQuery.data ?? []).map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}
