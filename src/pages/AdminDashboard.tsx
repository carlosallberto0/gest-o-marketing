import { AppLayout } from '@/components/layout/AppLayout';
import { useMerchEvaluations, usePDVScoreSummary, useScoreOverTime } from '@/hooks/useMerchEvaluations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3, 
  Activity,
  Building2,
  ClipboardCheck,
  AlertTriangle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

function getScoreColor(score: number): string {
  if (score >= 90) return 'hsl(var(--success))';
  if (score >= 75) return 'hsl(152, 69%, 50%)';
  if (score >= 60) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

function getScoreBadgeClass(score: number): string {
  if (score >= 90) return 'bg-success/10 text-success border-success/20';
  if (score >= 75) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
  if (score >= 60) return 'bg-warning/10 text-warning border-warning/20';
  return 'bg-destructive/10 text-destructive border-destructive/20';
}

export default function AdminDashboard() {
  const { data: evaluations, isLoading: loadingEvals } = useMerchEvaluations();
  const { data: pdvSummary, isLoading: loadingPDV } = usePDVScoreSummary();
  const { data: scoreOverTime, isLoading: loadingOverTime } = useScoreOverTime();

  // Calculate stats
  const totalEvaluations = evaluations?.length || 0;
  const averageScore = evaluations?.length 
    ? Math.round(evaluations.reduce((a, b) => a + b.percentage_score, 0) / evaluations.length)
    : 0;
  const criticalPDVs = pdvSummary?.filter(p => p.latestScore < 70).length || 0;
  const excellentPDVs = pdvSummary?.filter(p => p.latestScore >= 90).length || 0;

  // Chart data for PDV scores
  const pdvChartData = pdvSummary?.slice(0, 10).map(pdv => ({
    name: pdv.pdvName.replace('Posto ', '').replace('Conveniência ', '').substring(0, 15),
    score: pdv.latestScore,
    average: pdv.averageScore,
  })) || [];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Dashboard Administrativo
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão geral das avaliações de merchandising por PDV
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Score Médio</p>
                  {loadingEvals ? (
                    <Skeleton className="h-9 w-16 mt-2" />
                  ) : (
                    <p className="text-3xl font-bold text-foreground mt-2">{averageScore}%</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Todas avaliações</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Avaliações</p>
                  {loadingEvals ? (
                    <Skeleton className="h-9 w-16 mt-2" />
                  ) : (
                    <p className="text-3xl font-bold text-foreground mt-2">{totalEvaluations}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Completadas</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center">
                  <ClipboardCheck className="h-6 w-6 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">PDVs Excelentes</p>
                  {loadingPDV ? (
                    <Skeleton className="h-9 w-16 mt-2" />
                  ) : (
                    <p className="text-3xl font-bold text-success mt-2">{excellentPDVs}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Score ≥ 90%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border border-destructive/30">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">PDVs Críticos</p>
                  {loadingPDV ? (
                    <Skeleton className="h-9 w-16 mt-2" />
                  ) : (
                    <p className="text-3xl font-bold text-destructive mt-2">{criticalPDVs}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Score &lt; 70%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Score Over Time */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Evolução do Score</CardTitle>
                  <p className="text-sm text-muted-foreground">Média mensal ao longo do tempo</p>
                </div>
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingOverTime ? (
                <Skeleton className="h-64 w-full" />
              ) : scoreOverTime && scoreOverTime.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={scoreOverTime}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Score Médio']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="averageScore" 
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorScore)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhuma avaliação encontrada
                </div>
              )}
            </CardContent>
          </Card>

          {/* PDV Scores Bar Chart */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Score por PDV</CardTitle>
                  <p className="text-sm text-muted-foreground">Última avaliação de cada PDV</p>
                </div>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingPDV ? (
                <Skeleton className="h-64 w-full" />
              ) : pdvChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pdvChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        type="number" 
                        domain={[0, 100]} 
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={100} 
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Score']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {pdvChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhum PDV avaliado
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* PDV Table */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Detalhamento por PDV</CardTitle>
            <p className="text-sm text-muted-foreground">Scores e evolução de todos os PDVs avaliados</p>
          </CardHeader>
          <CardContent>
            {loadingPDV ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : pdvSummary && pdvSummary.length > 0 ? (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>PDV</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead className="text-center">Último Score</TableHead>
                      <TableHead className="text-center">Média Geral</TableHead>
                      <TableHead className="text-center">Avaliações</TableHead>
                      <TableHead className="text-center">Tendência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pdvSummary.map((pdv) => {
                      const trend = pdv.scores.length > 1 
                        ? pdv.scores[0] - pdv.scores[1]
                        : 0;
                      
                      return (
                        <TableRow key={pdv.pdvId}>
                          <TableCell className="font-medium">{pdv.pdvName}</TableCell>
                          <TableCell className="text-muted-foreground">{pdv.pdvCode}</TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="outline" 
                              className={cn("font-semibold", getScoreBadgeClass(pdv.latestScore))}
                            >
                              {pdv.latestScore}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-muted-foreground">{pdv.averageScore}%</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-muted-foreground">{pdv.scores.length}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {trend !== 0 ? (
                              <div className={cn(
                                "inline-flex items-center gap-1 text-sm font-medium",
                                trend > 0 ? "text-success" : "text-destructive"
                              )}>
                                {trend > 0 ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                )}
                                {Math.abs(trend)}%
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                Nenhuma avaliação encontrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
