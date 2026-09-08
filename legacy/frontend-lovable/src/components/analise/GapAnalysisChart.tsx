import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClusterCalculo } from '@/types/analise-estrategica';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';

interface GapAnalysisChartProps {
  data: ClusterCalculo[];
  title?: string;
  maxItems?: number;
}

export function GapAnalysisChart({ 
  data, 
  title = "Análise de Gap (Mídia vs Merchandising)",
  maxItems = 15
}: GapAnalysisChartProps) {
  // Sort by absolute gap and take top items
  const chartData = [...data]
    .sort((a, b) => Math.abs(b.gap_midia_merch) - Math.abs(a.gap_midia_merch))
    .slice(0, maxItems)
    .map(d => ({
      name: d.pdv?.name || 'PDV',
      gap: d.gap_midia_merch,
      midia: d.pontuacao_midia,
      merch: d.pontuacao_merchandising,
      isPositive: d.gap_midia_merch >= 0
    }));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis 
                type="number" 
                domain={[-50, 50]}
                tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}`}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={90}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium mb-2">{data.name}</p>
                        <div className="space-y-1 text-sm">
                          <p className="text-blue-500">
                            Mídia: {data.midia.toFixed(1)}
                          </p>
                          <p className="text-purple-500">
                            Merchandising: {data.merch.toFixed(1)}
                          </p>
                          <p className={data.gap >= 0 ? 'text-emerald-500' : 'text-amber-500'}>
                            Gap: {data.gap >= 0 ? '+' : ''}{data.gap.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine x={0} stroke="hsl(var(--border))" />
              <Bar dataKey="gap" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isPositive ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-4))'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[hsl(var(--chart-1))]" />
            <span className="text-muted-foreground">Mídia {'>'} Merchandising</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[hsl(var(--chart-4))]" />
            <span className="text-muted-foreground">Merchandising {'>'} Mídia</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
