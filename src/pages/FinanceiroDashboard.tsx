import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Plus, 
  FileText, 
  BarChart3,
  ArrowUpRight,
  Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCustosExternosKPIs, useCustosExternos } from '@/hooks/useCustosExternos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function FinanceiroDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';
  
  // Get current month period
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const { data: kpis, isLoading: kpisLoading } = useCustosExternosKPIs({ 
    inicio: startOfMonth, 
    fim: endOfMonth 
  });
  
  const { data: custos, isLoading: custosLoading } = useCustosExternos();

  // Group costs by type for pie chart
  const custosPorTipo = custos?.reduce((acc, custo) => {
    const tipo = custo.tipo || 'Outros';
    if (!acc[tipo]) {
      acc[tipo] = 0;
    }
    acc[tipo] += custo.valor_total;
    return acc;
  }, {} as Record<string, number>) || {};

  const pieChartData = Object.entries(custosPorTipo).map(([name, value]) => ({
    name,
    value,
  }));

  // Get last 5 costs for recent activity
  const recentCustos = custos?.slice(0, 5) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Financeiro</h1>
            <p className="text-muted-foreground">
              Visão geral dos custos externos - {format(now, 'MMMM yyyy', { locale: ptBR })}
            </p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => navigate('/financeiro/custos/registrar')}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Custo
            </Button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Bruto */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bruto</p>
                  {kpisLoading ? (
                    <Skeleton className="h-8 w-28 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(kpis?.totalBruto || 0)}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-amber-500" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm text-muted-foreground">
                <FileText className="h-4 w-4 mr-1" />
                {kpis?.registros || 0} registros
              </div>
            </CardContent>
          </Card>

          {/* Perdas */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Perdas</p>
                  {kpisLoading ? (
                    <Skeleton className="h-8 w-28 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-destructive">
                      {formatCurrency(kpis?.totalPerdas || 0)}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-destructive" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {kpis?.comPerdas || 0} com perdas
              </div>
            </CardContent>
          </Card>

          {/* Total Líquido */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Líquido</p>
                  {kpisLoading ? (
                    <Skeleton className="h-8 w-28 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-success">
                      {formatCurrency(kpis?.totalLiquido || 0)}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm text-success">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Valor efetivo
              </div>
            </CardContent>
          </Card>

          {/* Média por Registro */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Média por Registro</p>
                  {kpisLoading ? (
                    <Skeleton className="h-8 w-28 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(kpis?.registros ? (kpis?.totalBruto || 0) / kpis.registros : 0)}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-lg bg-info/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-info" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 mr-1" />
                Por compra
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pie Chart - Distribution by Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
              <CardDescription>Como os custos estão distribuídos</CardDescription>
            </CardHeader>
            <CardContent>
              {custosLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Skeleton className="h-48 w-48 rounded-full" />
                </div>
              ) : pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Custos Recentes</CardTitle>
                <CardDescription>Últimos registros de custos</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/financeiro/custos')}>
                Ver todos
              </Button>
            </CardHeader>
            <CardContent>
              {custosLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentCustos.length > 0 ? (
                <div className="space-y-3">
                  {recentCustos.map((custo) => (
                    <div
                      key={custo.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate(`/financeiro/custos/${custo.id}/rateio`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{custo.descricao}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{format(new Date(custo.data_compra), 'dd/MM/yyyy')}</span>
                          <Badge variant="outline" className="text-xs">
                            {custo.tipo}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(custo.valor_total)}</p>
                        {custo.teve_perdas && (
                          <Badge variant="destructive" className="text-xs">
                            Perda: {formatCurrency(custo.perda_valor || 0)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                  <FileText className="h-10 w-10 mb-2 opacity-50" />
                  <p>Nenhum custo registrado</p>
                  {isSuperAdmin && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/financeiro/custos/registrar')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Registrar primeiro custo
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions for Super Admin */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={() => navigate('/financeiro/custos/registrar')}
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-sm">Novo Custo</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={() => navigate('/financeiro/custos')}
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-sm">Ver Custos</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={() => navigate('/suppliers')}
                >
                  <Building2 className="h-5 w-5" />
                  <span className="text-sm">Fornecedores</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={() => navigate('/reports')}
                >
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-sm">Relatórios</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
