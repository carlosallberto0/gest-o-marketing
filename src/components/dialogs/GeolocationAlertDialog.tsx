import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MapPin, Navigation, RefreshCw, X } from 'lucide-react';
import { ValidationResult } from '@/hooks/useGeolocation';

interface GeolocationAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validationResult: ValidationResult | null;
  onRetry: () => void;
  onContinue: () => void;
  onCancel: () => void;
}

export function GeolocationAlertDialog({
  open,
  onOpenChange,
  validationResult,
  onRetry,
  onContinue,
  onCancel,
}: GeolocationAlertDialogProps) {
  if (!validationResult) return null;

  const distancePercent = validationResult.distance 
    ? Math.min((validationResult.distance / (validationResult.maxAllowedDistance * 2)) * 100, 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <div>
              <DialogTitle className="text-lg">Localização Não Correspondente</DialogTitle>
              <DialogDescription className="text-sm">
                A foto não foi tirada no local do outdoor
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Distance indicator */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-muted-foreground" />
                Sua localização
              </span>
              <span className="font-medium text-destructive">
                {validationResult.distance?.toFixed(0)}m de distância
              </span>
            </div>

            {/* Visual distance bar */}
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-destructive to-warning transition-all duration-300"
                  style={{ width: `${distancePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Outdoor
                </span>
                <span>Raio permitido: {validationResult.maxAllowedDistance.toFixed(0)}m</span>
              </div>
            </div>

            {/* Accuracy info */}
            <div className="text-xs text-muted-foreground">
              Precisão do GPS: ±{validationResult.accuracy.toFixed(0)}m
            </div>
          </div>

          {/* Instructions */}
          <p className="text-sm text-muted-foreground">
            Aproxime-se do outdoor e tente novamente, ou continue sabendo que a foto será marcada como suspeita.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button 
            onClick={onRetry}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tirar Nova Foto
          </Button>
          <Button 
            variant="outline" 
            onClick={onContinue}
            className="w-full"
          >
            Continuar Mesmo Assim
          </Button>
          <Button 
            variant="ghost" 
            onClick={onCancel}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
