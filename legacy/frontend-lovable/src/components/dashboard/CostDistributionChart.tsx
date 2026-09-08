import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancialStats, serviceTypeLabels } from '@/hooks/useFinancialStats';
import { formatCurrency } from '@/lib/costCalculator';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--info))'];

interface CostDistributionChartProps {
  showDetails?: boolean;
}

export function CostDistributionChart({ showDetails = true }: CostDistributionChartProps) {
  const { data: stats, isLoading } = useFinancialStats();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Prepare regional data for pie chart
  const regionalData = (stats?.distribuicaoRegional || [])
    .map((item) => ({
      name: item.estado,
      value: item.valor,
      quantidade: item.quantidade
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Prepare service type data for bar chart
  const serviceData = (stats?.servicosPorTipo || [])
    .map((item) => ({
      name: serviceTypeLabels[item.tipo] || item.tipo,
      valor: item.valorTotal,
      quantidade: item.quantidade
    }));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Regional Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por Região</CardTitle>
        </CardHeader>
        <CardContent>
          {regionalData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={regionalData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {regionalData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {regionalData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum dado disponível
            </p>
          )}
        </CardContent>
      </Card>

      {/* Service Type Distribution */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Tipo de Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            {serviceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={serviceData} layout="vertical">
                  <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum dado disponível
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
