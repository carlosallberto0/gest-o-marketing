import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Fuel, Store, Flag } from 'lucide-react';

export function MapLegend() {
  return (
    <Card className="w-64 shadow-lg">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">Legenda</CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-4 space-y-4">
        {/* PDV Icons */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">PDVs</h4>
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Posto de Combustível</span>
          </div>
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Conveniência</span>
          </div>
        </div>

        {/* PDV Status Colors */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status PDV</h4>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-sm">Avaliação em dia</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-sm">Avaliação pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-sm">Score crítico (&lt;60%)</span>
          </div>
        </div>

        {/* Outdoor Icons */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Outdoors</h4>
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-green-500" />
            <span className="text-sm">Operacional</span>
          </div>
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">Pendente avaliação</span>
          </div>
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-red-500" />
            <span className="text-sm">Não operacional</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
