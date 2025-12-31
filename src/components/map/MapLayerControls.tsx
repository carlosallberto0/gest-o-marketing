import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MapPin, Radio, AlertTriangle } from 'lucide-react';

interface MapLayerControlsProps {
  showPDVs: boolean;
  showOutdoors: boolean;
  showAlerts: boolean;
  onTogglePDVs: (value: boolean) => void;
  onToggleOutdoors: (value: boolean) => void;
  onToggleAlerts: (value: boolean) => void;
}

export function MapLayerControls({
  showPDVs,
  showOutdoors,
  showAlerts,
  onTogglePDVs,
  onToggleOutdoors,
  onToggleAlerts,
}: MapLayerControlsProps) {
  return (
    <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
      <h3 className="font-semibold text-xs text-foreground mb-2">Camadas</h3>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-500" />
            <Label htmlFor="layer-pdvs" className="text-xs cursor-pointer">
              PDVs
            </Label>
          </div>
          <Switch
            id="layer-pdvs"
            checked={showPDVs}
            onCheckedChange={onTogglePDVs}
            className="scale-90"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-blue-500" />
            <Label htmlFor="layer-outdoors" className="text-xs cursor-pointer">
              Outdoors
            </Label>
          </div>
          <Switch
            id="layer-outdoors"
            checked={showOutdoors}
            onCheckedChange={onToggleOutdoors}
            className="scale-90"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <Label htmlFor="layer-alerts" className="text-xs cursor-pointer">
              Alertas
            </Label>
          </div>
          <Switch
            id="layer-alerts"
            checked={showAlerts}
            onCheckedChange={onToggleAlerts}
            className="scale-90"
          />
        </div>

        {/* Legend */}
        <div className="pt-2 border-t border-border space-y-1.5">
          <p className="text-[10px] text-muted-foreground font-medium">Legenda PDVs</p>
          <div className="grid grid-cols-3 gap-1 text-[9px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span>OK</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span>Pend.</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span>Crítico</span>
            </div>
          </div>
          
          <p className="text-[10px] text-muted-foreground font-medium pt-1">Legenda Outdoors</p>
          <div className="grid grid-cols-3 gap-1 text-[9px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              <span>Ativo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span>Inativo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span>Pend.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
