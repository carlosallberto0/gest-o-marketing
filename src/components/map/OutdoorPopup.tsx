import { MapOutdoor } from '@/hooks/useStrategicMapData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, MapPin, AlertTriangle, Calendar, Ruler, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OutdoorPopupProps {
  outdoor: MapOutdoor;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export function OutdoorPopup({ outdoor, onClose, onNavigate }: OutdoorPopupProps) {
  const getStatusBadge = () => {
    switch (outdoor.status) {
      case 'operational':
        return <Badge className="bg-blue-500">Operacional</Badge>;
      case 'non_operational':
        return <Badge variant="destructive">Não Operacional</Badge>;
      case 'pending_evaluation':
        return <Badge className="bg-amber-500">Pendente</Badge>;
    }
  };

  const handleRequestMaintenance = () => {
    onClose();
    onNavigate(`/maintenance-requests?outdoor=${outdoor.id}`);
  };

  const handleViewDetails = () => {
    onClose();
    onNavigate(`/outdoor/${outdoor.id}`);
  };

  const handleOpenLocation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outdoor.location) {
      window.open(outdoor.location, '_blank', 'noopener,noreferrer');
    }
  };

  const hasContractAlert = outdoor.daysUntilContractEnd !== null && outdoor.daysUntilContractEnd <= 30 && outdoor.daysUntilContractEnd > 0;
  const hasInactiveAlert = outdoor.daysSinceEvaluation !== null && outdoor.daysSinceEvaluation > 15;

  return (
    <div className="min-w-[280px] p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{outdoor.code}</h3>
          <p className="text-xs text-muted-foreground">{outdoor.pdvName}</p>
        </div>
        {getStatusBadge()}
      </div>

      {outdoor.photo_url && (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          <img 
            src={outdoor.photo_url} 
            alt={outdoor.code}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="space-y-2 text-sm">
        <a 
          href={outdoor.location}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleOpenLocation}
          className="flex items-center gap-2 text-primary hover:underline cursor-pointer"
        >
          <MapPin className="h-4 w-4" />
          <span>Ver no Google Maps</span>
          <ExternalLink className="h-3 w-3" />
        </a>

        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">{outdoor.width}m x {outdoor.height}m ({(outdoor.width * outdoor.height).toFixed(1)}m²)</span>
        </div>

        {outdoor.lastEvaluation && (
          <div className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1.5 rounded">
            <span className="text-muted-foreground">Última avaliação:</span>
            <span className="font-medium">
              {format(parseISO(outdoor.lastEvaluation), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
        )}

        {/* Alerts */}
        {(hasContractAlert || hasInactiveAlert) && (
          <div className="space-y-1 pt-1">
            {hasContractAlert && (
              <div className="flex items-center gap-2 text-xs bg-amber-500/10 text-amber-600 px-2 py-1.5 rounded">
                <AlertTriangle className="h-3 w-3" />
                <span>Contrato vence em {outdoor.daysUntilContractEnd} dias</span>
              </div>
            )}
            {hasInactiveAlert && outdoor.status !== 'operational' && (
              <div className="flex items-center gap-2 text-xs bg-red-500/10 text-red-600 px-2 py-1.5 rounded">
                <Calendar className="h-3 w-3" />
                <span>Inativo há {outdoor.daysSinceEvaluation} dias</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={handleViewDetails}
        >
          Detalhes
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={handleRequestMaintenance}
        >
          <Wrench className="h-4 w-4 mr-1" />
          Manutenção
        </Button>
      </div>
    </div>
  );
}
