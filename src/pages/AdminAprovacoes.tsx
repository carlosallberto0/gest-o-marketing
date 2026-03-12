import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  usePendingMaintenanceRequests,
  useApproveMaintenanceRequest,
  useRejectMaintenanceRequest,
  MaintenanceRequest
} from '@/hooks/useMaintenanceRequests';
import { 
  usePendingAdminServiceOrders,
  useAdminApproveServiceOrder,
  useRequestServiceOrderCorrection,
  ServiceOrder
} from '@/hooks/useServiceOrders';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle,
  MapPin,
  User,
  Wrench,
  FileText,
  Building
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminAprovacoes() {
  const { data: maintenanceRequests = [], isLoading: loadingMaintenance } = usePendingMaintenanceRequests();
  const { data: serviceOrders = [], isLoading: loadingOrders } = usePendingAdminServiceOrders();
  
  const approveMaintenanceRequest = useApproveMaintenanceRequest();
  const rejectMaintenanceRequest = useRejectMaintenanceRequest();
  const approveServiceOrder = useAdminApproveServiceOrder();
  const requestCorrection = useRequestServiceOrderCorrection();

  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceRequest | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [rejectionTarget, setRejectionTarget] = useState<{ type: 'maintenance' | 'order'; id: string } | null>(null);

  const isLoading = loadingMaintenance || loadingOrders;

  const handleApproveMaintenance = async (id: string) => {
    await approveMaintenanceRequest.mutateAsync(id);
    setSelectedMaintenance(null);
  };

  const handleApproveOrder = async (id: string) => {
    await approveServiceOrder.mutateAsync(id);
    setSelectedOrder(null);
  };

  const handleReject = async () => {
    if (!rejectionTarget || !rejectionReason.trim()) return;
    
    if (rejectionTarget.type === 'maintenance') {
      await rejectMaintenanceRequest.mutateAsync({ id: rejectionTarget.id, rejection_reason: rejectionReason });
    } else {
      await requestCorrection.mutateAsync({ id: rejectionTarget.id, observations: rejectionReason });
    }
    
    setShowRejectionDialog(false);
    setRejectionReason('');
    setRejectionTarget(null);
    setSelectedMaintenance(null);
    setSelectedOrder(null);
  };

  const openRejectionDialog = (type: 'maintenance' | 'order', id: string) => {
    setRejectionTarget({ type, id });
    setShowRejectionDialog(true);
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
          <h1 className="text-2xl font-bold text-foreground">Aprovações Pendentes</h1>
          <p className="text-muted-foreground">Gerencie solicitações de manutenção e ordens de serviço</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Manutenções Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{maintenanceRequests.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                OS Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{serviceOrders.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="maintenance">
          <TabsList>
            <TabsTrigger value="maintenance">
              Manutenções ({maintenanceRequests.length})
            </TabsTrigger>
            <TabsTrigger value="orders">
              Ordens de Serviço ({serviceOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="maintenance" className="mt-4">
            {maintenanceRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {maintenanceRequests.map((request) => (
                  <Card 
                    key={request.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedMaintenance(request)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Badge className="bg-yellow-500 text-white">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-primary" />
                          <span className="font-medium">{request.outdoor?.code}</span>
                        </div>
                        
                        {request.outdoor?.pdv && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {request.outdoor.pdv.name}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          {request.requester?.name}
                        </div>

                        <p className="text-sm line-clamp-2 text-foreground/80">{request.reason}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            {serviceOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Nenhuma OS pendente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {serviceOrders.map((order) => (
                  <Card 
                    key={order.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Badge className="bg-yellow-500 text-white">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="font-medium">{order.number}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Wrench className="h-3 w-3" />
                          {order.outdoor?.code}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building className="h-3 w-3" />
                          {order.supplier?.name}
                        </div>

                        <div className="text-sm font-medium text-primary">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_cost)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Maintenance Detail Dialog */}
        <Dialog open={!!selectedMaintenance} onOpenChange={(open) => !open && setSelectedMaintenance(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Solicitação de Manutenção</DialogTitle>
            </DialogHeader>
            {selectedMaintenance && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Outdoor</p>
                    <p className="font-medium">{selectedMaintenance.outdoor?.code}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">PDV</p>
                    <p className="font-medium">{selectedMaintenance.outdoor?.pdv?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Solicitante</p>
                    <p className="font-medium">{selectedMaintenance.requester?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-medium">
                      {format(new Date(selectedMaintenance.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm mb-1">Motivo</p>
                  <p className="bg-muted p-3 rounded-md">{selectedMaintenance.reason}</p>
                </div>

                {selectedMaintenance.observations && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Observações</p>
                    <p className="bg-muted p-3 rounded-md">{selectedMaintenance.observations}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    variant="destructive"
                    className="flex-1"
                    onClick={() => openRejectionDialog('maintenance', selectedMaintenance.id)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => handleApproveMaintenance(selectedMaintenance.id)}
                    disabled={approveMaintenanceRequest.isPending}
                  >
                    {approveMaintenanceRequest.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Aprovar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Order Detail Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Ordem de Serviço - {selectedOrder?.number}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
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
                    <p className="text-muted-foreground">Valor</p>
                    <p className="font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.total_cost)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm mb-1">Descrição</p>
                  <p className="bg-muted p-3 rounded-md">{selectedOrder.description}</p>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    variant="destructive"
                    className="flex-1"
                    onClick={() => openRejectionDialog('order', selectedOrder.id)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Solicitar Correção
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => handleApproveOrder(selectedOrder.id)}
                    disabled={approveServiceOrder.isPending}
                  >
                    {approveServiceOrder.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Enviar p/ Diretoria
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Motivo da Rejeição/Correção</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Observações *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Descreva o motivo da rejeição ou correções necessárias..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
