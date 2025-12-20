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
          className="bg-card/95 backdrop-blur-sm border-border shadow-lg hover:bg-card"
        >
          <Info className="h-4 w-4 mr-2" />
          Legenda
          {isOpen ? (
            <ChevronDown className="h-4 w-4 ml-2" />
          ) : (
            <ChevronUp className="h-4 w-4 ml-2" />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2">
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-4 space-y-4 animate-fade-in">
          {/* PDV Types */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Tipos de PDV
            </h4>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Fuel className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm text-foreground">Posto de Combustível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Store className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm text-foreground">Conveniência</span>
            </div>
          </div>

          {/* PDV Status Colors */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Status PDV
            </h4>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-primary shadow-sm" />
              <span className="text-sm text-foreground">Avaliação em dia</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-warning shadow-sm" />
              <span className="text-sm text-foreground">Avaliação pendente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-destructive shadow-sm" />
              <span className="text-sm text-foreground">Score crítico (&lt;60%)</span>
            </div>
          </div>

          {/* Outdoor Status */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Status Outdoor
            </h4>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                <Flag className="h-3.5 w-3.5 text-success-foreground" />
              </div>
              <span className="text-sm text-foreground">Operacional</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-warning flex items-center justify-center">
                <Flag className="h-3.5 w-3.5 text-warning-foreground" />
              </div>
              <span className="text-sm text-foreground">Pendente avaliação</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
                <Flag className="h-3.5 w-3.5 text-destructive-foreground" />
              </div>
              <span className="text-sm text-foreground">Não operacional</span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
