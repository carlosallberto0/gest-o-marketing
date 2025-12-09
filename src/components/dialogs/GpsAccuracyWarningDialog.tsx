import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Satellite, RefreshCw } from 'lucide-react';

interface GpsAccuracyWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accuracy: number;
  onRetry: () => void;
  onContinue: () => void;
}

export function GpsAccuracyWarningDialog({
  open,
  onOpenChange,
  accuracy,
  onRetry,
  onContinue,
}: GpsAccuracyWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
              <Satellite className="h-6 w-6 text-warning" />
            </div>
            <div>
              <DialogTitle className="text-lg">Baixa Precisão do GPS</DialogTitle>
              <DialogDescription className="text-sm">
                A precisão do GPS está em ±{accuracy.toFixed(0)} metros
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Para melhor validação da localização, recomendamos:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Mova-se para uma área aberta
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Aguarde alguns segundos para o GPS estabilizar
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Verifique se o GPS está ativo nas configurações
            </li>
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button 
            onClick={onRetry}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Melhorar GPS
          </Button>
          <Button 
            variant="outline" 
            onClick={onContinue}
            className="w-full"
          >
            Continuar com Precisão Atual
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
