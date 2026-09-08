import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Fuel, Store, Flag, Info, ChevronDown, ChevronUp } from 'lucide-react';

export function MapLegend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-card/95 backdrop-blur-sm border-border shadow-lg hover:bg-card h-8"
        >
          <Info className="h-4 w-4 mr-1.5" />
          Legenda
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 ml-1.5" />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="absolute bottom-full left-0 mb-2">
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3 space-y-3 animate-fade-in min-w-[200px]">
          {/* PDV Types */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Tipos de PDV
            </h4>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Fuel className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-xs text-foreground">Posto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <Store className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs text-foreground">Conveniência</span>
            </div>
          </div>

          {/* PDV Status Colors */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Status PDV
            </h4>
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 rounded-full bg-emerald-500 shadow-sm flex-shrink-0" />
              <span className="text-xs text-foreground">Em dia</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 rounded-full bg-amber-500 shadow-sm flex-shrink-0" />
              <span className="text-xs text-foreground">Pendente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 rounded-full bg-red-500 shadow-sm flex-shrink-0" />
              <span className="text-xs text-foreground">Crítico</span>
            </div>
          </div>

          {/* Outdoor Status */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Status Outdoor
            </h4>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Flag className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs text-foreground">Operacional</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                <Flag className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs text-foreground">Pendente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <Flag className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs text-foreground">Não operac.</span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
