import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Send } from 'lucide-react';
import { useSuppliers } from '@/hooks/useServiceOrders';
import { useAssignWorkOrder } from '@/hooks/useSupplierWorkOrders';

interface AssignToSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageId: string;
  items: Array<{
    outdoor_id: string;
    package_item_id?: string;
    original_photo_url?: string;
  }>;
}

export function AssignToSupplierDialog({ open, onOpenChange, packageId, items }: AssignToSupplierDialogProps) {
  const [supplierId, setSupplierId] = useState('');
  const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers();
  const assignWorkOrder = useAssignWorkOrder();

  const handleSubmit = () => {
    if (!supplierId) return;

    assignWorkOrder.mutate({
      package_id: packageId,
      supplier_id: supplierId,
      items,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setSupplierId('');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar para Fornecedor</DialogTitle>
          <DialogDescription>
            Selecione o fornecedor que executará a manutenção de {items.length} outdoor(s).
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">Fornecedor</label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar fornecedor..." />
            </SelectTrigger>
            <SelectContent>
              {loadingSuppliers ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                suppliers.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.cnpj}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!supplierId || assignWorkOrder.isPending}>
            {assignWorkOrder.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
