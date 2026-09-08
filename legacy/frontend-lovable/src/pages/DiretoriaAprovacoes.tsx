import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { 
  usePendingDirectorServiceOrders,
  useDirectorApproveServiceOrder,
  useRequestServiceOrderCorrection,
  ServiceOrder
} from '@/hooks/useServiceOrders';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  FileText,
  Building,
  Wrench,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Navigate } from 'react-router-dom';

export default function DiretoriaAprovacoes() {
  const { profile } = useAuth();
  const { data: serviceOrders = [], isLoading } = usePendingDirectorServiceOrders();
  
  const approveServiceOrder = useDirectorApproveServiceOrder();
  const requestCorrection = useRequestServiceOrderCorrection();

  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  // Check if user has permission to approve OS
  const canApprove = profile?.role === 'super_admin' || 
                     profile?.role === 'admin' || 
                     (profile?.role === 'director' && profile?.pode_aprovar_os);

  if (!canApprove) {
    return <Navigate to="/modules" replace />;
  }

  const handleApproveOrder = async (id: string) => {
    await approveServiceOrder.mutateAsync(id);
    setSelectedOrder(null);
  };

  const handleReject = async () => {
    if (!selectedOrder || !rejectionReason.trim()) return;
    
    await requestCorrection.mutateAsync({ id: selectedOrder.id, observations: rejectionReason });
    
    setShowRejectionDialog(false);
    setRejectionReason('');
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
          <h1 className="text-2xl font-bold text-foreground">Aprovações da Diretoria</h1>
          <p className="text-muted-foreground">Ordens de serviço aguardando aprovação</p>
        </div>

        {/* Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              OS Aguardando Aprovação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{serviceOrders.length}</div>
          </CardContent>
        </Card>

        {/* Orders Grid */}
        {serviceOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma ordem pendente de aprovação</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {serviceOrders.map((order) => (
              <Card 
                key={order.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-orange-500"
                onClick={() => setSelectedOrder(order)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className="bg-orange-500 text-white">
                      <Clock className="h-3 w-3 mr-1" />
                      Aguardando Diretoria
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ptBR })}
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
                        {order.outdoor.pdv.name} - {order.outdoor.pdv.city}/{order.outdoor.pdv.state}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building className="h-3 w-3" />
                      {order.supplier?.name}
                    </div>

                    <div className="text-lg font-bold text-primary mt-2">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_cost)}
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
                Ordem de Serviço - {selectedOrder?.number}
              </DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                    Esta OS foi aprovada pelo Admin e aguarda sua aprovação para ser enviada ao fornecedor.
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
                    <p className="text-muted-foreground">Localização</p>
                    <p className="font-medium">{selectedOrder.outdoor?.pdv?.city}/{selectedOrder.outdoor?.pdv?.state}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Endereço</p>
                    <p className="font-medium text-xs">{selectedOrder.outdoor?.pdv?.address}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Fornecedor</p>
                      <p className="font-medium">{selectedOrder.supplier?.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedOrder.supplier?.cnpj}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor Total</p>
                      <p className="font-bold text-xl text-primary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.total_cost)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm mb-1">Descrição do Serviço</p>
                  <p className="bg-muted p-3 rounded-md">{selectedOrder.description}</p>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setShowRejectionDialog(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Solicitar Correção
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleApproveOrder(selectedOrder.id)}
                    disabled={approveServiceOrder.isPending}
                  >
                    {approveServiceOrder.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Aprovar e Enviar
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
              <DialogTitle>Solicitar Correção</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Descreva as correções necessárias. A OS será devolvida para o Admin.
              </p>
              <div>
                <Label>Observações *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Descreva as correções ou ajustes necessários..."
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
                disabled={!rejectionReason.trim() || requestCorrection.isPending}
              >
                {requestCorrection.isPending ? (
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
