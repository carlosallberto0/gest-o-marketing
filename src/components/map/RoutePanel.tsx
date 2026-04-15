import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Route, useRoutes, useRouteDetails, useCompleteRoute, useActivateRoute } from '@/hooks/useRoutes';
import { X, Route as RouteIcon, MapPin, Calendar, CheckCircle, Loader2, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RoutePanelProps {
  activeRouteId: string | null;
  onSelectRoute: (routeId: string | null) => void;
  onClose: () => void;
}

export function RoutePanel({ activeRouteId, onSelectRoute, onClose }: RoutePanelProps) {
  const [expanded, setExpanded] = useState(true);
  const { data: routes = [], isLoading } = useRoutes();
  const { data: activeRoute } = useRouteDetails(activeRouteId || undefined);
  const completeRoute = useCompleteRoute();
  const activateRoute = useActivateRoute();

  const activeRoutes = routes.filter(r => r.status === 'active' || r.status === 'draft');

  const priorityLabel = (p: string) => {
    if (p === 'critical') return 'Crítico';
    if (p === 'pending') return 'Pendente';
    return 'Preventivo';
  };

  const priorityColor = (p: string) => {
    if (p === 'critical') return 'destructive';
    if (p === 'pending') return 'warning';
    return 'secondary';
  };

  const statusLabel = (s: string) => {
    if (s === 'draft') return 'Rascunho';
    if (s === 'active') return 'Ativa';
    return 'Concluída';
  };

  return (
    <Card className="w-full sm:w-64 bg-background/95 backdrop-blur-sm shadow-lg border max-h-[60vh] sm:max-h-none">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <RouteIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">Rotas</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="p-3 pt-0 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activeRoutes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhuma rota ativa</p>
          ) : (
            <>
              <Select value={activeRouteId || ''} onValueChange={(v) => onSelectRoute(v || null)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione uma rota" />
                </SelectTrigger>
                <SelectContent>
                  {activeRoutes.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      <span className="text-xs truncate">{r.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeRoute && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">
                      {statusLabel(activeRoute.status)}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {activeRoute.total_distance_km} km
                    </span>
                  </div>

                  {activeRoute.deadline && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="truncate">Prazo: {format(new Date(activeRoute.deadline), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </p>
                  )}

                  <ScrollArea className="h-[200px] sm:h-[300px]">
                    <div className="space-y-1.5">
                      {/* Origin */}
                      <div className="flex items-center gap-2 p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0">🏁</div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium truncate">{activeRoute.origin_label}</p>
                          <p className="text-[9px] text-muted-foreground">Ponto de partida</p>
                        </div>
                      </div>

                      {(activeRoute.points || []).map(point => (
                        <div key={point.id} className="flex items-start gap-2 p-1.5 rounded border border-border hover:bg-accent/50">
                          <Badge variant={priorityColor(point.priority) as any} className="text-[9px] px-1 py-0 min-w-[20px] justify-center shrink-0">
                            {point.sequence}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium truncate">{point.outdoor?.code}</p>
                            <p className="text-[9px] text-muted-foreground truncate">
                              {point.outdoor?.pdv?.name}
                            </p>
                            {point.scheduled_date && (
                              <p className="text-[9px] text-muted-foreground">
                                📅 {format(new Date(point.scheduled_date), 'dd/MM', { locale: ptBR })}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[8px] px-1 shrink-0">
                            {priorityLabel(point.priority)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="flex flex-col sm:flex-row gap-1">
                    {activeRoute.status === 'draft' && (
                      <Button size="sm" className="h-7 text-xs flex-1" onClick={() => activateRoute.mutate(activeRoute.id)}>
                        <Play className="h-3 w-3 mr-1" />
                        Ativar
                      </Button>
                    )}
                    {activeRoute.status === 'active' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => completeRoute.mutate(activeRoute.id)}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Concluir
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
