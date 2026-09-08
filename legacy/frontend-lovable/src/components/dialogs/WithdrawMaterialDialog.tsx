import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, Minus, AlertTriangle, Loader2 } from 'lucide-react';
import { useCreateStockMovement } from '@/hooks/useStockMovements';

interface Material {
  id: string;
  name: string;
  code: string;
  current_stock: number;
  type: string;
}

interface WithdrawMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
}

export function WithdrawMaterialDialog({ open, onOpenChange, material }: WithdrawMaterialDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [justification, setJustification] = useState('');
  const createMovement = useCreateStockMovement();

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setJustification('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!material) return;
    
    if (justification.length < 10) {
      return;
    }

    if (quantity > material.current_stock) {
      return;
    }

    await createMovement.mutateAsync({
      materialId: material.id,
      movementType: 'withdrawal',
      quantity,
      previousStock: material.current_stock,
      justification,
    });

    onOpenChange(false);
  };

  if (!material) return null;

  const isValid = quantity > 0 && quantity <= material.current_stock && justification.length >= 10;
  const newStock = material.current_stock - quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Minus className="h-5 w-5 text-warning" />
            Retirar do Estoque
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Material Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{material.name}</p>
              <p className="text-sm text-muted-foreground">{material.code}</p>
            </div>
          </div>

          {/* Current Stock */}
          <div className="flex justify-between items-center p-3 bg-card border border-border rounded-lg">
            <span className="text-sm text-muted-foreground">Estoque Atual</span>
            <span className="font-semibold text-lg">{material.current_stock} unidades</span>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade a Retirar *</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={material.current_stock}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
            />
            {quantity > material.current_stock && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Quantidade excede o estoque disponível
              </p>
            )}
          </div>

          {/* New Stock Preview */}
          <div className="flex justify-between items-center p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <span className="text-sm text-warning">Estoque Após Retirada</span>
            <span className="font-semibold text-lg text-warning">{Math.max(0, newStock)} unidades</span>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label htmlFor="justification">Justificativa * (mínimo 10 caracteres)</Label>
            <Textarea
              id="justification"
              placeholder="Descreva o motivo da retirada..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {justification.length}/10 caracteres mínimos
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || createMovement.isPending}
            className="bg-warning hover:bg-warning/90 text-warning-foreground"
          >
            {createMovement.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Retirada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
