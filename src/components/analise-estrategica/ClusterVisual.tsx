// Peças visuais compartilhadas entre Dashboard, Clusters (Conveniência/Outdoor)
// e Comparativo: badge de cluster com a cor configurada pelo admin (dado, não
// hardcode) e o gráfico de distribuição. Mesma técnica de indicador colorido
// via style inline já usada em src/components/ui/chart.tsx (ChartLegendContent)
// para o mesmo problema — cor vinda de dado, não de classe Tailwind fixa.
// Só componentes neste arquivo — o agrupamento (agruparPorCluster) mora em
// src/lib/analise-estrategica.ts, não aqui.
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { ClusterContagem } from "@/lib/analise-estrategica";

export function ClusterBadge({ nome, cor }: { nome: string; cor: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} aria-hidden="true" />
      {nome}
    </span>
  );
}

const chartConfig = {
  quantidade: { label: "PDVs" },
} satisfies ChartConfig;

export function ClusterDistribuicaoChart({ dados }: { dados: ClusterContagem[] }) {
  return (
    <div>
      <ChartContainer config={chartConfig} className="h-64 w-full">
        <BarChart data={dados} layout="vertical" margin={{ left: 12, right: 12 }}>
          <XAxis type="number" allowDecimals={false} hide />
          <YAxis type="category" dataKey="nome" width={140} tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="quantidade" radius={4}>
            {dados.map((entry) => (
              <Cell key={entry.clusterId} fill={entry.cor} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      {/* Alternativa textual ao gráfico — leitor de tela não navega SVG do recharts. */}
      <ul className="sr-only">
        {dados.map((item) => (
          <li key={item.clusterId}>
            {item.nome}: {item.quantidade} pdv(s)
          </li>
        ))}
      </ul>
    </div>
  );
}
