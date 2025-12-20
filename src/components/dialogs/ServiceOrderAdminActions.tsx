import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle, UserCog, Loader2 } from 'lucide-react';
import { useSuppliers, useUpdateServiceOrder, ServiceOrderStatus } from '@/hooks/useServiceOrders';
import { useCreateAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';

interface ServiceOrderAdminActionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    number: string;
    status: ServiceOrderStatus;
    supplier_id: string;
  };
  onSuccess?: () => void;
}

type AdminAction = 'reassign_supplier' | 'force_approval' | 'reopen' | 'cancel';

export function ServiceOrderAdminActions({ 
  open, 
  onOpenChange, 
  order,
  onSuccess
}: ServiceOrderAdminActionsProps) {
  const [selectedAction, setSelectedAction] = useState<AdminAction | null>(null);
  const [newSupplierId, setNewSupplierId] = useState<string>('');
  const [justification, setJustification] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: suppliers = [] } = useSuppliers();
  const updateOrder = useUpdateServiceOrder();
  const createAuditLog = useCreateAuditLog();

  const handleExecuteAction = async () => {
    if (!selectedAction || !justification.trim()) {
      toast.error('Por favor, preencha a justificativa');
      return;
    }

    setIsProcessing(true);

    try {
      let newStatus: ServiceOrderStatus | undefined;
      let actionDescription = '';

      switch (selectedAction) {
        case 'reassign_supplier':
          if (!newSupplierId) {
            toast.error('Selecione um fornecedor');
            setIsProcessing(false);
            return;
          }
          // Note: This would need a separate mutation to update supplier_id
          // For now we just log the intent
          actionDescription = 'Reatribuição de fornecedor';
          break;

        case 'force_approval':
          newStatus = 'director_approved';
          actionDescription = 'Aprovação forçada pela diretoria';
          break;

        case 'reopen':
          newStatus = 'pending';
          actionDescription = 'OS reaberta pelo administrador';
          break;

        case 'cancel':
          newStatus = 'cancelled';
          actionDescription = 'OS cancelada pelo administrador';
          break;
      }

      if (newStatus) {
        await updateOrder.mutateAsync({ 
          id: order.id, 
          status: newStatus 
        });
      }

      // Log the admin action
      await createAuditLog.mutateAsync({
        action: `admin_${selectedAction}`,
        entityType: 'service_order',
        entityId: order.id,
        oldData: { status: order.status },
        newData: { 
          status: newStatus || order.status, 
          action: selectedAction,
          supplier_id: selectedAction === 'reassign_supplier' ? newSupplierId : undefined
        },
      });

      toast.success(`${actionDescription} - OS ${order.number}`);
      onOpenChange(false);
      onSuccess?.();
      resetForm();
    } catch (error) {
      console.error('Error executing admin action:', error);
      toast.error('Erro ao executar ação administrativa');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedAction(null);
    setNewSupplierId('');
    setJustification('');
  };

  const actionConfig = {
    reassign_supplier: {
      title: 'Reatribuir Fornecedor',
      icon: UserCog,
      color: 'text-blue-600',
      description: 'Atribuir esta OS a um novo fornecedor',
    },
    force_approval: {
      title: 'Forçar Aprovação Diretoria',
      icon: CheckCircle,
      color: 'text-green-600',
      description: 'Aprovar diretamente, ignorando o fluxo normal',
    },
    reopen: {
      title: 'Reabrir Solicitação',
      icon: RefreshCw,
      color: 'text-orange-600',
      description: 'Voltar status para pendente',
    },
    cancel: {
      title: 'Cancelar OS',
      icon: XCircle,
      color: 'text-red-600',
      description: 'Cancelar permanentemente esta OS',
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Ações Administrativas - OS {order.number}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Action Selection */}
          <div className="space-y-2">
            <Label>Selecione a ação</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(actionConfig) as [AdminAction, typeof actionConfig[AdminAction]][]).map(([action, config]) => {
                const Icon = config.icon;
                const isDisabled = 
                  (action === 'force_approval' && (order.status === 'director_approved' || order.status === 'completed' || order.status === 'validated')) ||
                  (action === 'reopen' && order.status === 'pending') ||
                  (action === 'cancel' && order.status === 'cancelled');
                  
                return (
                  <button
                    key={action}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setSelectedAction(action)}
                    className={`
                      p-3 rounded-lg border text-left transition-all
                      ${selectedAction === action 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'}
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span className="font-medium text-sm">{config.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Supplier Selection (for reassign action) */}
          {selectedAction === 'reassign_supplier' && (
            <div className="space-y-2">
              <Label>Novo Fornecedor</Label>
              <Select value={newSupplierId} onValueChange={setNewSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers
                    .filter(s => s.id !== order.supplier_id)
                    .map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Justification (required for all actions) */}
          {selectedAction && (
            <div className="space-y-2">
              <Label>Justificativa (obrigatória)</Label>
              <Textarea
                placeholder="Descreva o motivo desta ação administrativa..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Warning message */}
          {selectedAction && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <p className="text-sm text-warning flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Esta ação será registrada no log de auditoria.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExecuteAction}
            disabled={!selectedAction || !justification.trim() || isProcessing}
            variant={selectedAction === 'cancel' ? 'destructive' : 'default'}
          >
            {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Executar Ação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
