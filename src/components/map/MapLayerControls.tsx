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
    <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
      <h3 className="font-semibold text-sm text-foreground mb-3">Camadas</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-500" />
            <Label htmlFor="layer-pdvs" className="text-sm cursor-pointer">
              PDVs
            </Label>
          </div>
          <Switch
            id="layer-pdvs"
            checked={showPDVs}
            onCheckedChange={onTogglePDVs}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-blue-500" />
            <Label htmlFor="layer-outdoors" className="text-sm cursor-pointer">
              Outdoors
            </Label>
          </div>
          <Switch
            id="layer-outdoors"
            checked={showOutdoors}
            onCheckedChange={onToggleOutdoors}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <Label htmlFor="layer-alerts" className="text-sm cursor-pointer">
              Alertas
            </Label>
          </div>
          <Switch
            id="layer-alerts"
            checked={showAlerts}
            onCheckedChange={onToggleAlerts}
          />
        </div>

        {/* Legend */}
        <div className="pt-3 border-t border-border space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Legenda PDVs</p>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>OK</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Pendente</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Crítico</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground font-medium pt-1">Legenda Outdoors</p>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Ativo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Inativo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Pendente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
