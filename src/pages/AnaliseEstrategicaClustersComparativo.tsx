// Visão de alto nível lado a lado entre os dois tipos de PDV — não repete a
// tabela detalhada (isso já está nas telas dedicadas de Conveniência/Outdoor).
import { useAnaliseClustersCalculo } from "@/hooks/useAnaliseEstrategica";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ClusterBadge } from "@/components/analise-estrategica/ClusterVisual";
import { agruparPorCluster } from "@/lib/analise-estrategica";

const TIPOS: { tipoPdv: "CONV" | "POS"; titulo: string }[] = [
  { tipoPdv: "CONV", titulo: "Conveniência" },
  { tipoPdv: "POS", titulo: "Outdoor" },
];

// Fora do corpo do componente pai: cada resumo tem sua própria query e não
// deve perder estado de carregamento a cada render da tela.
function ResumoTipo({ tipoPdv, titulo }: { tipoPdv: "CONV" | "POS"; titulo: string }) {
  const query = useAnaliseClustersCalculo({ tipoPdv });
  const dados = query.data ?? [];
  const scoreMedio = dados.length > 0 ? dados.reduce((acc, item) => acc + item.pontuacao_total, 0) / dados.length : 0;
  const porCluster = agruparPorCluster(dados);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : query.isError ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-sm text-destructive">
              {query.error instanceof Error ? query.error.message : `Não foi possível carregar ${titulo}.`}
            </p>
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : dados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cálculo realizado ainda para este tipo.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* ADR-002: mesmo texto do dashboard, pro caso de quem entra
                direto nesta tela sem passar por lá. */}
            <p className="text-sm text-muted-foreground">
              Dados atualizados em {new Date(dados[0].data_calculo).toLocaleString("pt-BR")}.
            </p>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">PDVs analisados</span>
              <span className="text-2xl font-semibold text-foreground">{dados.length}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Score médio</span>
              <span className="text-2xl font-semibold text-foreground">{scoreMedio.toFixed(1)}</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">Contagem por cluster</span>
              <ul className="flex flex-col gap-1.5">
                {porCluster.map((cluster) => (
                  <li key={cluster.clusterId} className="flex items-center justify-between gap-2">
                    <ClusterBadge nome={cluster.nome} cor={cluster.cor} />
                    <span className="text-sm font-medium text-foreground">{cluster.quantidade}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnaliseEstrategicaClustersComparativo() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clusters — Comparativo</h1>
          <p className="text-muted-foreground">Visão lado a lado entre Conveniência e Outdoor.</p>
        </div>
        <Button asChild variant="outline" size="sm" className="sm:w-auto">
          <Link to="/analise-estrategica/dashboard">Ver painel completo</Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {TIPOS.map((tipo) => (
          <ResumoTipo key={tipo.tipoPdv} tipoPdv={tipo.tipoPdv} titulo={tipo.titulo} />
        ))}
      </div>
    </div>
  );
}
