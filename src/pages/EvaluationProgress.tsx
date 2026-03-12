import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useOutdoors } from '@/hooks/useOutdoorData';
import { usePDVs } from '@/hooks/usePDVs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Building,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Search,
  Loader2,
  BarChart3,
  Megaphone,
  Users,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'pending' | 'complete';

export default function EvaluationProgress() {
  const { data: outdoors = [], isLoading: loadingOutdoors } = useOutdoors();
  const { data: pdvsData = [], isLoading: loadingPDVs } = usePDVs();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const pdvsWithProgress = useMemo(() => {
    const managerMap = new Map<string, string>();
    pdvsData.forEach(p => {
      if (p.manager) managerMap.set(p.id, p.manager.name);
    });

    const pdvMap = new Map<string, {
      pdvId: string;
      pdvName: string;
      managerName: string;
      totalOutdoors: number;
      evaluatedCount: number;
      pendingCount: number;
      progressPercent: number;
    }>();

    outdoors.forEach(outdoor => {
      const isEvaluated = outdoor.status !== 'pending_evaluation';
      const existing = pdvMap.get(outdoor.pdvId);
      if (existing) {
        existing.totalOutdoors++;
        if (isEvaluated) existing.evaluatedCount++;
        else existing.pendingCount++;
        existing.progressPercent = Math.round((existing.evaluatedCount / existing.totalOutdoors) * 100);
      } else {
        pdvMap.set(outdoor.pdvId, {
          pdvId: outdoor.pdvId,
          pdvName: outdoor.pdvName,
          managerName: managerMap.get(outdoor.pdvId) || 'Sem gerente',
          totalOutdoors: 1,
          evaluatedCount: isEvaluated ? 1 : 0,
          pendingCount: isEvaluated ? 0 : 1,
          progressPercent: isEvaluated ? 100 : 0,
        });
      }
    });

    return Array.from(pdvMap.values()).sort((a, b) => {
      if (a.pendingCount > 0 && b.pendingCount === 0) return -1;
      if (a.pendingCount === 0 && b.pendingCount > 0) return 1;
      return b.pendingCount - a.pendingCount;
    });
  }, [outdoors, pdvsData]);

  const globalStats = useMemo(() => {
    const totalPDVs = pdvsWithProgress.length;
    const pdvsWithPending = pdvsWithProgress.filter(p => p.pendingCount > 0).length;
    const pdvsComplete = pdvsWithProgress.filter(p => p.pendingCount === 0).length;
    const totalOutdoors = outdoors.length;
    const totalEvaluated = outdoors.filter(o => o.status !== 'pending_evaluation').length;
    const totalPending = totalOutdoors - totalEvaluated;
    const globalRate = totalOutdoors > 0 ? Math.round((totalEvaluated / totalOutdoors) * 100) : 0;
    return { totalPDVs, pdvsWithPending, pdvsComplete, totalOutdoors, totalEvaluated, totalPending, globalRate };
  }, [pdvsWithProgress, outdoors]);

  const filteredPDVs = useMemo(() => {
    let list = pdvsWithProgress;
    if (filter === 'pending') list = list.filter(p => p.pendingCount > 0);
    if (filter === 'complete') list = list.filter(p => p.pendingCount === 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.pdvName.toLowerCase().includes(q) || p.managerName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [pdvsWithProgress, filter, search]);

  const isLoading = loadingOutdoors || loadingPDVs;

  const getStatusBadge = (pending: number, total: number) => {
    if (total === 0) return <Badge variant="outline" className="text-muted-foreground border-border">Sem outdoors</Badge>;
    if (pending === 0) return <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90"><CheckCircle className="h-3 w-3 mr-1" />Completo</Badge>;
    if (pending === total) return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Crítico</Badge>;
    return <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning))]/90"><AlertTriangle className="h-3 w-3 mr-1" />Pendente</Badge>;
  };

  const getProgressColor = (percent: number) => {
    if (percent === 100) return 'bg-[hsl(var(--success))]';
    if (percent >= 50) return 'bg-[hsl(var(--warning))]';
    return 'bg-[hsl(var(--destructive))]';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Progresso de Avaliações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe o status das avaliações de outdoors por posto
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{globalStats.totalPDVs}</p>
                      <p className="text-xs text-muted-foreground">Total de PDVs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[hsl(var(--warning))]/10 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{globalStats.pdvsWithPending}</p>
                      <p className="text-xs text-muted-foreground">PDVs com pendências</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-[hsl(var(--success))]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{globalStats.globalRate}%</p>
                      <p className="text-xs text-muted-foreground">Taxa de conclusão</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[hsl(var(--destructive))]/10 flex items-center justify-center">
                      <Megaphone className="h-5 w-5 text-[hsl(var(--destructive))]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{globalStats.totalPending}</p>
                      <p className="text-xs text-muted-foreground">Outdoors pendentes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Global Progress */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Progresso global</span>
                  <span className="text-sm text-muted-foreground">
                    {globalStats.totalEvaluated} / {globalStats.totalOutdoors} avaliados
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", getProgressColor(globalStats.globalRate))}
                    style={{ width: `${globalStats.globalRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por posto ou gerente..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {([
                  { key: 'all' as FilterType, label: 'Todos', count: pdvsWithProgress.length },
                  { key: 'pending' as FilterType, label: 'Pendentes', count: globalStats.pdvsWithPending },
                  { key: 'complete' as FilterType, label: 'Completos', count: globalStats.pdvsComplete },
                ]).map(f => (
                  <Button
                    key={f.key}
                    variant={filter === f.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(f.key)}
                    className="gap-1.5"
                  >
                    {f.label}
                    <Badge variant="secondary" className={cn(
                      "text-xs px-1.5 py-0 h-5",
                      filter === f.key ? "bg-primary-foreground/20 text-primary-foreground" : ""
                    )}>
                      {f.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>

            {/* PDV List */}
            <div className="space-y-3">
              {filteredPDVs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Filter className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Nenhum posto encontrado com os filtros aplicados.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredPDVs.map(pdv => (
                  <Card key={pdv.pdvId} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        {/* PDV Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground truncate">{pdv.pdvName}</h3>
                            {getStatusBadge(pdv.pendingCount, pdv.totalOutdoors)}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{pdv.managerName}</span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="sm:w-60 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {pdv.evaluatedCount}/{pdv.totalOutdoors} avaliados
                            </span>
                            <span className="font-medium text-foreground">{pdv.progressPercent}%</span>
                          </div>
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", getProgressColor(pdv.progressPercent))}
                              style={{ width: `${pdv.progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Pending count */}
                        {pdv.pendingCount > 0 && (
                          <div className="flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--destructive))] sm:w-28 sm:justify-end">
                            <AlertTriangle className="h-4 w-4" />
                            {pdv.pendingCount} pendente{pdv.pendingCount > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
