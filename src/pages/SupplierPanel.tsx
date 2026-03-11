import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  Wrench, 
  CheckCircle, 
  Upload, 
  Send,
  MapPin,
  Building,
  Clock,
  Image as ImageIcon
} from 'lucide-react';
import { 
  useMySupplierWorkOrders, 
  useMarkItemExecuted, 
  useSubmitWorkOrder,
  SupplierWorkOrderItem 
} from '@/hooks/useSupplierWorkOrders';
import { supabase } from '@/integrations/supabase/client';
import { convertGoogleDriveUrl } from '@/lib/googleDriveUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function SupplierPanel() {
  const [activeTab, setActiveTab] = useState('services');
  const [selectedWorkOrders, setSelectedWorkOrders] = useState<Set<string>>(new Set());
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);

  const { data: workOrders = [], isLoading } = useMySupplierWorkOrders();
  const markExecuted = useMarkItemExecuted();
  const submitWorkOrder = useSubmitWorkOrder();

  const allItems = workOrders.flatMap(wo => 
    (wo.items || []).map(item => ({ ...item, workOrder: wo }))
  );

  const pendingItems = allItems.filter(item => !item.executed);
  const executedItems = allItems.filter(item => item.executed);

  const handlePhotoUpload = async (itemId: string, file: File) => {
    setUploadingItem(itemId);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `execution-photos/${itemId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      // Buscar outdoor_id do item para atualizar a foto principal
      const itemData = allItems.find(i => i.id === itemId);
      await markExecuted.mutateAsync({ 
        itemId, 
        executionPhotoUrl: publicUrl,
        outdoorId: itemData?.outdoor_id,
      });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setUploadingItem(null);
    }
  };

  const handleMarkExecuted = (itemId: string) => {
    const itemData = allItems.find(i => i.id === itemId);
    markExecuted.mutate({ itemId, outdoorId: itemData?.outdoor_id });
  };

  const handleSubmitWorkOrders = () => {
    if (selectedWorkOrders.size === 0) {
      toast.warning('Selecione pelo menos uma ordem para enviar');
      return;
    }

    const completableOrders = workOrders.filter(wo => {
      if (!selectedWorkOrders.has(wo.id)) return false;
      const allExecuted = (wo.items || []).every(item => item.executed);
      return allExecuted;
    });

    if (completableOrders.length === 0) {
      toast.warning('Todas as manutenções devem ser executadas antes de enviar');
      return;
    }

    completableOrders.forEach(wo => {
      submitWorkOrder.mutate(wo.id);
    });
    setSelectedWorkOrders(new Set());
  };

  const toggleWorkOrderSelection = (id: string) => {
    setSelectedWorkOrders(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel do Fornecedor</h1>
          <p className="text-muted-foreground">Gerencie seus serviços de manutenção</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Ordens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workOrders.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Itens Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pendingItems.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Itens Executados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{executedItems.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Prontos para Envio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {workOrders.filter(wo => (wo.items || []).every(i => i.executed)).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="services">
              Serviços em Andamento
              {pendingItems.length > 0 && (
                <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">
                  {pendingItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="outdoors">Relação de Outdoors</TabsTrigger>
          </TabsList>

          {/* Services Tab */}
          <TabsContent value="services">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : workOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Nenhum serviço pendente</h3>
                    <p className="text-muted-foreground mt-1">
                      Quando houver manutenções atribuídas, elas aparecerão aqui
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Submit bar */}
                {selectedWorkOrders.size > 0 && (
                  <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <span className="text-sm font-medium">
                      {selectedWorkOrders.size} ordem(ns) selecionada(s)
                    </span>
                    <Button onClick={handleSubmitWorkOrders} disabled={submitWorkOrder.isPending}>
                      {submitWorkOrder.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Enviar Ordens Executadas
                    </Button>
                  </div>
                )}

                {workOrders.map((wo) => {
                  const allExecuted = (wo.items || []).every(i => i.executed);
                  return (
                    <Card key={wo.id} className={cn(
                      "border-2 transition-colors",
                      selectedWorkOrders.has(wo.id) ? "border-primary bg-primary/5" : "border-border"
                    )}>
                      <CardHeader className="flex flex-row items-center gap-3">
                        {allExecuted && (
                          <Checkbox
                            checked={selectedWorkOrders.has(wo.id)}
                            onCheckedChange={() => toggleWorkOrderSelection(wo.id)}
                          />
                        )}
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            Ordem de Manutenção
                            <Badge variant={allExecuted ? 'success' : 'secondary'}>
                              {allExecuted ? 'Pronto para envio' : `${(wo.items || []).filter(i => i.executed).length}/${(wo.items || []).length} executados`}
                            </Badge>
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            Recebida em {format(new Date(wo.assigned_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {(wo.items || []).map((item) => (
                            <WorkOrderItemCard
                              key={item.id}
                              item={item}
                              onUploadPhoto={handlePhotoUpload}
                              onMarkExecuted={handleMarkExecuted}
                              isUploading={uploadingItem === item.id}
                              isMarking={markExecuted.isPending}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Outdoors Tab */}
          <TabsContent value="outdoors">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : allItems.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    Nenhum outdoor atribuído
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {allItems.map((item) => {
                  const pdv = item.outdoor?.pdv as any;
                  return (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {item.outdoor?.photo_url && (
                            <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                              <img
                                src={convertGoogleDriveUrl(item.outdoor.photo_url)}
                                alt={item.outdoor.code}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{item.outdoor?.code}</h4>
                              <Badge variant={item.executed ? 'success' : 'secondary'}>
                                {item.executed ? 'Executado' : 'Pendente'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {pdv?.name} - {pdv?.city}/{pdv?.state}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {item.outdoor?.location}
                            </p>
                            {item.executed_at && (
                              <p className="text-xs text-success flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                Executado em {format(new Date(item.executed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// Sub-component for each work order item
function WorkOrderItemCard({ 
  item, 
  onUploadPhoto, 
  onMarkExecuted, 
  isUploading, 
  isMarking 
}: {
  item: SupplierWorkOrderItem;
  onUploadPhoto: (itemId: string, file: File) => void;
  onMarkExecuted: (itemId: string) => void;
  isUploading: boolean;
  isMarking: boolean;
}) {
  const pdv = item.outdoor?.pdv as any;

  return (
    <div className={cn(
      "border rounded-lg p-4 transition-colors",
      item.executed ? "bg-success/5 border-success/30" : "bg-card border-border"
    )}>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Original photo */}
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">Foto Original</p>
          <div className="w-full h-48 rounded overflow-hidden bg-muted flex items-center justify-center">
            {(item.original_photo_url || item.outdoor?.photo_url) ? (
              <img
                src={convertGoogleDriveUrl(item.original_photo_url || item.outdoor?.photo_url || '')}
                alt="Original"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
            )}
          </div>
        </div>

        {/* Execution photo */}
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">Foto da Execução</p>
          <div className="w-full h-48 rounded overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
            {item.execution_photo_url ? (
              <img
                src={item.execution_photo_url}
                alt="Execução"
                className="w-full h-full object-cover"
              />
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground">
                {isUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-8 w-8" />
                    <span className="text-xs">Carregar foto</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploading || item.executed}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadPhoto(item.id, file);
                  }}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Item info */}
      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {item.outdoor?.code} — {pdv?.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.outdoor?.location} • {pdv?.city}/{pdv?.state}
          </p>
          {item.outdoor?.non_operational_reason && (
            <p className="text-xs text-destructive mt-0.5">
              Motivo: {item.outdoor.non_operational_reason}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {item.executed ? (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>
                Executado em {item.executed_at ? format(new Date(item.executed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : ''}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`exec-${item.id}`}
                onCheckedChange={(checked) => {
                  if (checked) onMarkExecuted(item.id);
                }}
                disabled={isMarking}
              />
              <label htmlFor={`exec-${item.id}`} className="text-sm cursor-pointer">
                Serviço Executado
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
