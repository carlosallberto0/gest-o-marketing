import { MapKPIs } from '@/hooks/useStrategicMapData';
import { MapPin, Radio, AlertTriangle, Clock, FileWarning, Wrench } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MapKPIPanelProps {
  kpis: MapKPIs;
}

export function MapKPIPanel({ kpis }: MapKPIPanelProps) {
  return (
    <TooltipProvider>
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <h3 className="font-semibold text-xs text-foreground mb-2">Indicadores</h3>
        
        <div className="space-y-2">
          {/* PDVs */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>PDVs</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-emerald-500/10 text-emerald-600 px-1.5 py-1 rounded text-center cursor-default">
                    <div className="font-bold text-sm">{kpis.totalPDVs}</div>
                    <div className="text-[9px] leading-tight truncate">Total</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Total de PDVs</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-amber-500/10 text-amber-600 px-1.5 py-1 rounded text-center cursor-default">
                    <div className="font-bold text-sm">{kpis.pdvsWithPendingEvaluation}</div>
                    <div className="text-[9px] leading-tight truncate">Pend.</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>PDVs com avaliação pendente</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-red-500/10 text-red-600 px-1.5 py-1 rounded text-center cursor-default">
                    <div className="font-bold text-sm">{kpis.pdvsCritical}</div>
                    <div className="text-[9px] leading-tight truncate">Crít.</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>PDVs com score crítico</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Outdoors */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Radio className="h-3 w-3" />
              <span>Outdoors ({kpis.totalOutdoors})</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-blue-500/10 text-blue-600 px-1.5 py-1 rounded text-center cursor-default">
                    <div className="font-bold text-sm">{kpis.operationalOutdoors}</div>
                    <div className="text-[9px] leading-tight truncate">Oper.</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Outdoors operacionais</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-amber-500/10 text-amber-600 px-1.5 py-1 rounded text-center cursor-default">
                    <div className="font-bold text-sm">{kpis.pendingEvaluationOutdoors}</div>
                    <div className="text-[9px] leading-tight truncate">Pend.</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Outdoors com avaliação pendente</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-red-500/10 text-red-600 px-1.5 py-1 rounded text-center cursor-default">
                    <div className="font-bold text-sm">{kpis.nonOperationalOutdoors}</div>
                    <div className="text-[9px] leading-tight truncate">Inat.</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Outdoors inativos</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Manutenção */}
          <div className="space-y-1 pt-1.5 border-t border-border">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Wrench className="h-3 w-3" />
              <span>Manutenção</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-orange-500/10 text-orange-600 px-1.5 py-1 rounded text-center cursor-default">
                    <div className="font-bold text-sm">{kpis.pendingMaintenanceRequests}</div>
                    <div className="text-[9px] leading-tight truncate">Pend.</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Manutenções pendentes</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-purple-500/10 text-purple-600 px-1.5 py-1 rounded text-center cursor-default">
                    <div className="font-bold text-sm">{kpis.reviewedThisMonth}</div>
                    <div className="text-[9px] leading-tight truncate">Aval.</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Avaliados este mês</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Alertas */}
          <div className="space-y-1 pt-1.5 border-t border-border">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              <span>Alertas</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] bg-amber-500/10 px-1.5 py-1 rounded">
                <div className="flex items-center gap-1 text-amber-600 min-w-0">
                  <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                  <span className="truncate">Contratos (30d)</span>
                </div>
                <span className="font-bold text-amber-600 ml-1">{kpis.contractsExpiringSoon}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] bg-red-500/10 px-1.5 py-1 rounded">
                <div className="flex items-center gap-1 text-red-600 min-w-0">
                  <FileWarning className="h-2.5 w-2.5 flex-shrink-0" />
                  <span className="truncate">Sem aval. (&gt;45d)</span>
                </div>
                <span className="font-bold text-red-600 ml-1">{kpis.pdvsWithPendingEvaluation}</span>
              </div>
              {kpis.needsMaintenanceThisMonth > 0 && (
                <div className="flex items-center justify-between text-[10px] bg-orange-500/10 px-1.5 py-1 rounded">
                  <div className="flex items-center gap-1 text-orange-600 min-w-0">
                    <Wrench className="h-2.5 w-2.5 flex-shrink-0" />
                    <span className="truncate">Manutenção</span>
                  </div>
                  <span className="font-bold text-orange-600 ml-1">{kpis.needsMaintenanceThisMonth}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
