import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClusterCalculo } from '@/types/analise-estrategica';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  ZAxis
} from 'recharts';

interface ScoreComparisonChartProps {
  data: ClusterCalculo[];
  title?: string;
}

export function ScoreComparisonChart({ 
  data, 
  title = "Comparativo Mídia x Merchandising"
}: ScoreComparisonChartProps) {
  const chartData = data.map(d => ({
    x: d.pontuacao_midia,
    y: d.pontuacao_merchandising,
    z: d.pontuacao_total,
    name: d.pdv?.name || 'PDV',
    tipo: d.pdv_tipo,
    cluster: d.cluster?.nome || 'Não classificado',
    color: d.cluster?.cor_hex || '#888888'
  }));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Mídia" 
                domain={[0, 100]}
                label={{ value: 'Score Mídia', position: 'bottom', offset: 0 }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Merchandising" 
                domain={[0, 100]}
                label={{ value: 'Score Merchandising', angle: -90, position: 'insideLeft' }}
              />
              <ZAxis type="number" dataKey="z" range={[50, 200]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium mb-2">{data.name}</p>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="text-muted-foreground">Tipo:</span>{' '}
                            {data.tipo === 'conveniencia' ? 'Conveniência' : 'Outdoor'}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Cluster:</span>{' '}
                            <span style={{ color: data.color }}>{data.cluster}</span>
                          </p>
                          <p className="text-blue-500">
                            Mídia: {data.x.toFixed(1)}
                          </p>
                          <p className="text-purple-500">
                            Merchandising: {data.y.toFixed(1)}
                          </p>
                          <p className="font-medium">
                            Total: {data.z.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Reference line for balance */}
              <ReferenceLine 
                segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
              />
              <Scatter 
                data={chartData} 
                fill="hsl(var(--primary))"
                shape={(props: { cx: number; cy: number; payload: { color: string } }) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={6} 
                      fill={payload.color} 
                      stroke="white" 
                      strokeWidth={1}
                      opacity={0.8}
                    />
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Linha tracejada = equilíbrio perfeito entre módulos
        </p>
      </CardContent>
    </Card>
  );
}
