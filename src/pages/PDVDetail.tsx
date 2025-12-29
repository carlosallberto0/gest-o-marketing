import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePDVDetails, usePDVEvaluationHistory, usePDVCategoryBreakdown, usePDVOutdoors } from '@/hooks/usePDVDetails';
import { useSystemOptions } from '@/hooks/useSystemOptions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Area, AreaChart
} from 'recharts';
import { 
  ArrowLeft, 
  MapPin, 
  Building2, 
  User, 
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  ClipboardCheck,
  Calendar,
  Monitor,
  ChevronRight,
  Image as ImageIcon,
  Plus
} from 'lucide-react';
import { useState } from 'react';
import { NewOutdoorDialog } from '@/components/dialogs/NewOutdoorDialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    posto: 'Posto',
    conveniencia: 'Conveniência',
    both: 'Posto + Conveniência',
  };
  return labels[type] || type;
}

// getDescriptionTypeLabel is now handled dynamically via useSystemOptions

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    operational: 'Operacional',
    non_operational: 'Não Operacional',
    pending_evaluation: 'Pendente',
  };
  return labels[status] || status;
}

function getStatusBadgeClass(status: string): string {
  if (status === 'operational') return 'bg-success/10 text-success border-success/20';
  if (status === 'non_operational') return 'bg-destructive/10 text-destructive border-destructive/20';
  return 'bg-warning/10 text-warning border-warning/20';
}

export default function PDVDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isNewOutdoorOpen, setIsNewOutdoorOpen] = useState(false);
  
  const { data: pdv, isLoading: loadingPDV } = usePDVDetails(id || '');
  const { data: history, isLoading: loadingHistory } = usePDVEvaluationHistory(id || '');
  const { data: categoryBreakdown, isLoading: loadingCategories } = usePDVCategoryBreakdown(id || '');
  const { data: outdoors, isLoading: loadingOutdoors } = usePDVOutdoors(id || '');
  const { data: descriptionTypes = [] } = useSystemOptions('outdoor_description_type');

  const getDescriptionTypeLabel = (type: string | null): string => {
    if (!type) return '';
    const found = descriptionTypes.find(t => t.option_key === type);
    return found?.option_label || type;
  };

  // Calculate stats
  const latestScore = history?.[0]?.percentage_score || 0;
  const previousScore = history?.[1]?.percentage_score || 0;
  const scoreTrend = history && history.length > 1 ? latestScore - previousScore : 0;
  const averageScore = history?.length 
    ? Math.round(history.reduce((a, b) => a + b.percentage_score, 0) / history.length)
    : 0;

  // Chart data for score evolution
  const scoreEvolutionData = history?.slice().reverse().map(eval_ => ({
    date: format(new Date(eval_.evaluation_date), 'dd/MM', { locale: ptBR }),
    score: eval_.percentage_score,
  })) || [];

  // Category chart data
  const categoryChartData = categoryBreakdown?.map(cat => ({
    name: cat.name.split(' ')[0],
    score: cat.averageScore,
  })) || [];

  if (!id) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">PDV não encontrado</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* PDV Photo Thumbnail */}
          {pdv?.photo_url && (
            <div className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted flex-shrink-0">
              <img 
                src={pdv.photo_url} 
                alt={pdv.name} 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {!loadingPDV && !pdv?.photo_url && (
            <div className="w-16 h-16 rounded-lg border border-border bg-muted flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1">
            {loadingPDV ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-48" />
              </div>
            ) : pdv ? (
              <>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {pdv.name}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <MapPin className="h-4 w-4" />
                  <span>{pdv.city}, {pdv.state}</span>
                  <span className="text-border">•</span>
                  <span>{pdv.code}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">PDV não encontrado</p>
            )}
          </div>
          {pdv && (
            <Badge variant="outline" className={cn(
              pdv.status === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'
            )}>
              {pdv.status === 'active' ? 'Ativo' : 'Inativo'}
            </Badge>
          )}
        </div>

        {/* PDV Info Cards */}
        {loadingPDV ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : pdv ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Último Score</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{latestScore}%</p>
                    {scoreTrend !== 0 && (
                      <div className={cn(
                        "flex items-center gap-1 text-sm mt-1",
                        scoreTrend > 0 ? "text-success" : "text-destructive"
                      )}>
                        {scoreTrend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {Math.abs(scoreTrend)}%
                      </div>
                    )}
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
                    <p className="text-sm font-medium text-muted-foreground">Média Geral</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{averageScore}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{history?.length || 0} avaliações</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-secondary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                    <p className="text-lg font-bold text-foreground mt-2">{getTypeLabel(pdv.type)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{pdv.address}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gerente</p>
                    <p className="text-lg font-bold text-foreground mt-2 truncate">
                      {pdv.manager?.name || 'Não atribuído'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pdv.active_modules?.join(', ') || 'Nenhum módulo'}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Outdoors do PDV */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Outdoors do PDV</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {loadingOutdoors ? 'Carregando...' : `${outdoors?.length || 0} outdoors cadastrados`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setIsNewOutdoorOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Outdoor
                </Button>
                <Monitor className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingOutdoors ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : outdoors && outdoors.length > 0 ? (
              <div className="space-y-3">
                {outdoors.map(outdoor => (
                  <div 
                    key={outdoor.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/outdoor/${outdoor.id}`)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Monitor className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{outdoor.code}</p>
                        <p className="text-sm text-muted-foreground truncate">{outdoor.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground hidden sm:block">
                        {outdoor.width}m x {outdoor.height}m
                      </span>
                      {outdoor.description_type && (
                        <Badge variant="outline" className="hidden md:flex">
                          {getDescriptionTypeLabel(outdoor.description_type)}
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getStatusBadgeClass(outdoor.status))}
                      >
                        {getStatusLabel(outdoor.status)}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum outdoor cadastrado para este PDV</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Score Evolution */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Evolução do Score</CardTitle>
                  <p className="text-sm text-muted-foreground">Histórico de avaliações</p>
                </div>
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <Skeleton className="h-64 w-full" />
              ) : scoreEvolutionData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={scoreEvolutionData}>
                      <defs>
                        <linearGradient id="colorScorePDV" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
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
                        formatter={(value: number) => [`${value}%`, 'Score']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorScorePDV)"
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

          {/* Category Breakdown */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Performance por Categoria</CardTitle>
                  <p className="text-sm text-muted-foreground">Média de scores por categoria</p>
                </div>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingCategories ? (
                <Skeleton className="h-64 w-full" />
              ) : categoryChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} layout="vertical">
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
                        width={80} 
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Média']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhuma categoria avaliada
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category Details */}
        {categoryBreakdown && categoryBreakdown.length > 0 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Detalhamento por Categoria</CardTitle>
              <p className="text-sm text-muted-foreground">Performance média em cada categoria de avaliação</p>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryBreakdown.map((cat) => (
                  <div 
                    key={cat.id} 
                    className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-foreground">{cat.name}</span>
                      <Badge 
                        variant="outline" 
                        className={cn("font-semibold", getScoreBadgeClass(cat.averageScore))}
                      >
                        {cat.averageScore}%
                      </Badge>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${cat.averageScore}%`,
                          backgroundColor: getScoreColor(cat.averageScore)
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {cat.evaluationCount} avaliações
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evaluation History Table */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Histórico de Avaliações</CardTitle>
                <p className="text-sm text-muted-foreground">Todas as avaliações realizadas neste PDV</p>
              </div>
              <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : history && history.length > 0 ? (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Data</TableHead>
                      <TableHead>Avaliador</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Pontos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((eval_, index) => (
                      <TableRow key={eval_.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(eval_.evaluation_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {eval_.evaluator?.name || 'Não informado'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline" 
                            className={cn("font-semibold", getScoreBadgeClass(eval_.percentage_score))}
                          >
                            {eval_.percentage_score}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {eval_.total_score}/{eval_.total_possible_points}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                Nenhuma avaliação encontrada para este PDV
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NewOutdoorDialog 
        open={isNewOutdoorOpen} 
        onOpenChange={setIsNewOutdoorOpen} 
        initialPdvId={id}
      />
    </AppLayout>
  );
}
