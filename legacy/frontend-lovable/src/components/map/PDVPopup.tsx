import { MapPDV } from '@/hooks/useStrategicMapData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Package, MapPin, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PDVPopupProps {
  pdv: MapPDV;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export function PDVPopup({ pdv, onClose, onNavigate }: PDVPopupProps) {
  const getStatusBadge = () => {
    switch (pdv.evaluationStatus) {
      case 'ok':
        return <Badge className="bg-emerald-500">OK</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500">Avaliação Pendente</Badge>;
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
    }
  };

  const handleViewEvaluations = () => {
    onClose();
    onNavigate(`/pdv/${pdv.id}`);
  };

  const handleRequestMaterial = () => {
    onClose();
    onNavigate(`/material-requests?pdv=${pdv.id}`);
  };

  return (
    <div className="min-w-[280px] p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{pdv.name}</h3>
          <p className="text-xs text-muted-foreground">{pdv.code}</p>
        </div>
        {getStatusBadge()}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-foreground">{pdv.address}</p>
            <p className="text-muted-foreground">{pdv.city}, {pdv.state}</p>
          </div>
        </div>

        {pdv.managerName && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{pdv.managerName}</span>
          </div>
        )}

        {pdv.lastEvaluationDate && (
          <div className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1.5 rounded">
            <span className="text-muted-foreground">Última avaliação:</span>
            <span className="font-medium">
              {format(parseISO(pdv.lastEvaluationDate), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
        )}

        {pdv.lastScore !== null && (
          <div className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1.5 rounded">
            <span className="text-muted-foreground">Score:</span>
            <span className={`font-bold ${pdv.lastScore >= 80 ? 'text-emerald-600' : pdv.lastScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {pdv.lastScore.toFixed(0)}%
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1.5 rounded">
          <span className="text-muted-foreground">Outdoors:</span>
          <span className="font-medium">{pdv.outdoorCount}</span>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={handleViewEvaluations}
        >
          <ClipboardCheck className="h-4 w-4 mr-1" />
          Avaliações
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={handleRequestMaterial}
        >
          <Package className="h-4 w-4 mr-1" />
          Material
        </Button>
      </div>
    </div>
  );
}
