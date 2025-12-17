import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  usePendingValidationServiceOrders,
  useValidateServiceOrder,
  useUpdateServiceOrder,
  ServiceOrder
} from '@/hooks/useServiceOrders';
import { 
  Clock, 
  CheckCircle, 
  Loader2,
  FileText,
  Building,
  Wrench,
  MapPin,
  RefreshCcw,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GerenteValidacoes() {
  const { data: serviceOrders = [], isLoading } = usePendingValidationServiceOrders();
  
  const validateServiceOrder = useValidateServiceOrder();
  const updateServiceOrder = useUpdateServiceOrder();

  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenDialog, setShowReopenDialog] = useState(false);

  const handleValidateOrder = async (id: string) => {
    await validateServiceOrder.mutateAsync(id);
    setSelectedOrder(null);
  };

  const handleReopenOrder = async () => {
    if (!selectedOrder || !reopenReason.trim()) return;
    
    await updateServiceOrder.mutateAsync({ 
      id: selectedOrder.id, 
      status: 'in_progress',
      observations: reopenReason
    });
    
    setShowReopenDialog(false);
    setReopenReason('');
    setSelectedOrder(null);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Validações Pendentes</h1>
          <p className="text-muted-foreground">Valide os serviços concluídos pelos fornecedores</p>
        </div>

        {/* Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              OS Aguardando Validação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{serviceOrders.length}</div>
          </CardContent>
        </Card>

        {/* Orders Grid */}
        {serviceOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma ordem aguardando validação</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {serviceOrders.map((order) => (
              <Card 
                key={order.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-emerald-500"
                onClick={() => setSelectedOrder(order)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className="bg-emerald-500 text-white">
                      <Check className="h-3 w-3 mr-1" />
                      Concluída
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {order.completed_at && format(new Date(order.completed_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium text-lg">{order.number}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wrench className="h-3 w-3" />
                      {order.outdoor?.code}
                    </div>

                    {order.outdoor?.pdv && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {order.outdoor.pdv.name}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building className="h-3 w-3" />
                      {order.supplier?.name}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Order Detail Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Validar OS - {selectedOrder?.number}
              </DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                  <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium">
                    O fornecedor marcou este serviço como concluído. Verifique a qualidade e valide ou solicite ajustes.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Outdoor</p>
                    <p className="font-medium">{selectedOrder.outdoor?.code}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">PDV</p>
                    <p className="font-medium">{selectedOrder.outdoor?.pdv?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fornecedor</p>
                    <p className="font-medium">{selectedOrder.supplier?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Concluído em</p>
                    <p className="font-medium">
                      {selectedOrder.completed_at && format(new Date(selectedOrder.completed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm mb-1">Descrição do Serviço</p>
                  <p className="bg-muted p-3 rounded-md">{selectedOrder.description}</p>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowReopenDialog(true)}
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Solicitar Ajustes
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleValidateOrder(selectedOrder.id)}
                    disabled={validateServiceOrder.isPending}
                  >
                    {validateServiceOrder.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Validar e Encerrar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reopen Dialog */}
        <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Ajustes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Descreva os ajustes necessários. A OS será devolvida para o fornecedor.
              </p>
              <div>
                <Label>Observações *</Label>
                <Textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Descreva os ajustes ou correções necessárias..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReopenDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleReopenOrder}
                disabled={!reopenReason.trim() || updateServiceOrder.isPending}
              >
                {updateServiceOrder.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
