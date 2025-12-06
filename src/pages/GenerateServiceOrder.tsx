import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useApprovedMaintenanceRequests, useConsolidateMaintenanceRequests, MaintenanceRequest } from '@/hooks/useMaintenanceRequests';
import { useActiveSuppliers } from '@/hooks/useSuppliers';
import { useCreateServiceOrder } from '@/hooks/useServiceOrders';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  FileText, 
  MapPin, 
  AlertTriangle,
  CheckCircle,
  Send,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function GenerateServiceOrder() {
  const navigate = useNavigate();
  const { data: approvedRequests, isLoading: loadingRequests } = useApprovedMaintenanceRequests();
  const { data: suppliers, isLoading: loadingSuppliers } = useActiveSuppliers();
  const consolidateRequests = useConsolidateMaintenanceRequests();

  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleRequest = (requestId: string) => {
    setSelectedRequests(prev => 
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRequests.length === approvedRequests?.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(approvedRequests?.map(r => r.id) || []);
    }
  };

  const calculateTotalCost = () => {
    // Estimate cost based on number of outdoors (you can customize this logic)
    return selectedRequests.length * 500; // R$ 500 per outdoor as example
  };

  const handleGenerateOrder = async () => {
    if (!selectedSupplier || selectedRequests.length === 0) {
      toast.error('Selecione pelo menos uma solicitação e um fornecedor');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the first outdoor from the selected requests for the main service order
      const firstRequest = approvedRequests?.find(r => r.id === selectedRequests[0]);
      if (!firstRequest) throw new Error('Request not found');

      // Generate order number
      const { count } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true });

      const orderNumber = `OS-${String((count || 0) + 1).padStart(4, '0')}`;

      // Create the service order
      const { data: serviceOrder, error: orderError } = await supabase
        .from('service_orders')
        .insert({
          number: orderNumber,
          outdoor_id: firstRequest.outdoor_id,
          supplier_id: selectedSupplier,
          type: 'maintenance',
          description: `Ordem de manutenção consolidada com ${selectedRequests.length} outdoor(s). ${additionalNotes}`,
          total_cost: calculateTotalCost(),
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create service order items for each outdoor
      const items = selectedRequests.map(requestId => {
        const request = approvedRequests?.find(r => r.id === requestId);
        return {
          service_order_id: serviceOrder.id,
          outdoor_id: request?.outdoor_id,
          maintenance_request_id: requestId,
          observations: request?.observations || request?.reason,
        };
      });

      const { error: itemsError } = await supabase
        .from('service_order_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // Update maintenance requests to consolidated status
      await consolidateRequests.mutateAsync({
        requestIds: selectedRequests,
        serviceOrderId: serviceOrder.id,
      });

      toast.success(`Ordem de serviço ${orderNumber} gerada com sucesso!`);
      navigate('/service-orders');
    } catch (error) {
      console.error('Error generating service order:', error);
      toast.error('Erro ao gerar ordem de serviço');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = loadingRequests || loadingSuppliers;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const selectedRequestsData = approvedRequests?.filter(r => selectedRequests.includes(r.id)) || [];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerar Ordem de Serviço</h1>
          <p className="text-muted-foreground">
            Consolide solicitações aprovadas em uma única ordem de serviço para o fornecedor
          </p>
        </div>

        {approvedRequests?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma solicitação pendente</h3>
              <p className="text-muted-foreground mb-4">
                Todas as solicitações aprovadas já foram consolidadas em ordens de serviço.
              </p>
              <Button variant="outline" onClick={() => navigate('/maintenance-requests')}>
                Ver Solicitações
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Request Selection */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Solicitações Aprovadas</CardTitle>
                      <CardDescription>
                        Selecione as solicitações para incluir na ordem de serviço
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      {selectedRequests.length === approvedRequests?.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {approvedRequests?.map(request => (
                      <div
                        key={request.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedRequests.includes(request.id)
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => handleToggleRequest(request.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedRequests.includes(request.id)}
                            onCheckedChange={() => handleToggleRequest(request.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                              <span className="font-medium">{request.outdoor?.code}</span>
                              <Badge variant="secondary" className="text-xs">
                                {request.outdoor?.width}x{request.outdoor?.height}m
                              </Badge>
                            </div>
                            
                            {request.outdoor?.pdv && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                <MapPin className="h-3 w-3" />
                                {request.outdoor.pdv.name} - {request.outdoor.pdv.city}/{request.outdoor.pdv.state}
                              </div>
                            )}
                            
                            <p className="text-sm line-clamp-2">{request.reason}</p>
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Solicitante: {request.requester?.name}</span>
                              <span>
                                {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Order Details */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Resumo da Ordem
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-center">
                      {selectedRequests.length}
                    </div>
                    <div className="text-sm text-muted-foreground text-center">
                      outdoor(s) selecionado(s)
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Fornecedor *</Label>
                    <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers?.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações Adicionais</Label>
                    <Textarea
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="Instruções especiais para o fornecedor..."
                      rows={3}
                    />
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Custo estimado</span>
                      <span className="font-medium">
                        R$ {calculateTotalCost().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleGenerateOrder}
                    disabled={isSubmitting || selectedRequests.length === 0 || !selectedSupplier}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Gerar Ordem de Serviço
                  </Button>
                </CardContent>
              </Card>

              {/* Selected Summary */}
              {selectedRequestsData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Outdoors Selecionados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {selectedRequestsData.map(request => (
                        <li key={request.id} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{request.outdoor?.code}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
