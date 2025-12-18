import { MapKPIs } from '@/hooks/useStrategicMapData';
import { MapPin, Radio, AlertTriangle, Clock, FileWarning } from 'lucide-react';

interface MapKPIPanelProps {
  kpis: MapKPIs;
}

export function MapKPIPanel({ kpis }: MapKPIPanelProps) {
  return (
    <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
      <h3 className="font-semibold text-sm text-foreground mb-3">Indicadores</h3>
      
      <div className="space-y-3">
        {/* PDVs */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>PDVs</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded text-center">
              <div className="font-bold">{kpis.totalPDVs}</div>
              <div className="text-[10px]">Total</div>
            </div>
            <div className="bg-amber-500/10 text-amber-600 px-2 py-1 rounded text-center">
              <div className="font-bold">{kpis.pdvsWithPendingEvaluation}</div>
              <div className="text-[10px]">Pendentes</div>
            </div>
            <div className="bg-red-500/10 text-red-600 px-2 py-1 rounded text-center">
              <div className="font-bold">{kpis.pdvsCritical}</div>
              <div className="text-[10px]">Críticos</div>
            </div>
          </div>
        </div>

        {/* Outdoors */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Radio className="h-3 w-3" />
            <span>Outdoors</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-blue-500/10 text-blue-600 px-2 py-1 rounded text-center">
              <div className="font-bold">{kpis.operationalOutdoors}</div>
              <div className="text-[10px]">Operacionais</div>
            </div>
            <div className="bg-red-500/10 text-red-600 px-2 py-1 rounded text-center">
              <div className="font-bold">{kpis.nonOperationalOutdoors}</div>
              <div className="text-[10px]">Inativos</div>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="space-y-1 pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3 w-3" />
            <span>Alertas</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs bg-amber-500/10 px-2 py-1.5 rounded">
              <div className="flex items-center gap-1.5 text-amber-600">
                <Clock className="h-3 w-3" />
                <span>Contratos a vencer (30d)</span>
              </div>
              <span className="font-bold text-amber-600">{kpis.contractsExpiringSoon}</span>
            </div>
            <div className="flex items-center justify-between text-xs bg-red-500/10 px-2 py-1.5 rounded">
              <div className="flex items-center gap-1.5 text-red-600">
                <FileWarning className="h-3 w-3" />
                <span>Sem avaliação (&gt;45d)</span>
              </div>
              <span className="font-bold text-red-600">{kpis.pdvsWithPendingEvaluation}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
