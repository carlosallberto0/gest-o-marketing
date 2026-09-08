import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveSuppliers } from '@/hooks/useSuppliers';
import { useAssignSupplierToMaintenance } from '@/hooks/useSupplierAssignments';
import { Loader2, Building, Phone, Mail, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AssignSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenanceRequestId: string;
  outdoorCode?: string;
  reason?: string;
}

export function AssignSupplierDialog({
  open,
  onOpenChange,
  maintenanceRequestId,
  outdoorCode,
  reason,
}: AssignSupplierDialogProps) {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const { data: suppliers, isLoading: loadingSuppliers } = useActiveSuppliers();
  const assignMutation = useAssignSupplierToMaintenance();

  const selectedSupplierData = suppliers?.find(s => s.id === selectedSupplier);

  const handleSubmit = async () => {
    if (!selectedSupplier) return;

    await assignMutation.mutateAsync({
      maintenance_request_id: maintenanceRequestId,
      supplier_id: selectedSupplier,
      deadline_days: deadlineDays ? parseInt(deadlineDays) : undefined,
      admin_notes: adminNotes || undefined,
    });

    // Reset form
    setSelectedSupplier('');
    setDeadlineDays('');
    setAdminNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Atribuir Fornecedor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context info */}
          {outdoorCode && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium">Outdoor: {outdoorCode}</p>
              {reason && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  Motivo: {reason}
                </p>
              )}
            </div>
          )}

          {/* Supplier selection */}
          <div className="space-y-2">
            <Label>Fornecedor *</Label>
            {loadingSuppliers ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando fornecedores...
              </div>
            ) : (
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      <div className="flex items-center gap-2">
                        <span>{supplier.name}</span>
                        {supplier.service_types && supplier.service_types.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {supplier.service_types.length} serviço(s)
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Supplier details */}
          {selectedSupplierData && (
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">{selectedSupplierData.name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                {selectedSupplierData.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3 w-3" />
                {selectedSupplierData.email}
              </div>
            </div>
          )}

          {/* Deadline (optional) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Prazo sugerido (dias)</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Opcional. O fornecedor pode ajustar o prazo após aceitar o serviço.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              min="1"
              placeholder="Ex: 7"
              value={deadlineDays}
              onChange={e => setDeadlineDays(e.target.value)}
            />
          </div>

          {/* Admin notes */}
          <div className="space-y-2">
            <Label>Observações para o fornecedor</Label>
            <Textarea
              placeholder="Instruções especiais, detalhes do serviço..."
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedSupplier || assignMutation.isPending}
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Atribuindo...
              </>
            ) : (
              'Atribuir Fornecedor'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
