import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  usePendingMaintenancePackages, 
  useMaintenancePackages,
  useMaintenancePackageDetails, 
  useUpdatePackageItems,
  useMarkReadyForServiceOrder 
} from '@/hooks/useMaintenancePackages';
import { useAuth } from '@/contexts/AuthContext';
import { AssignToSupplierDialog } from '@/components/dialogs/AssignToSupplierDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Loader2,
  Package,
  MapPin,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  ChevronRight,
  Wrench,
  Building,
  PauseCircle,
  Send,
  Truck
} from 'lucide-react';

type ItemStatus = 'approved' | 'rejected' | 'held' | null;

export default function MaintenanceApproval() {
  const { user } = useAuth();
  const { data: packages = [], isLoading } = usePendingMaintenancePackages();
  const { data: allPackages = [] } = useMaintenancePackages();
  const updateItems = useUpdatePackageItems();
  const markReadyForSO = useMarkReadyForServiceOrder();
  
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, ItemStatus>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [itemReviewDates, setItemReviewDates] = useState<Record<string, string>>({});
  const [packageNotes, setPackageNotes] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [assignSupplierOpen, setAssignSupplierOpen] = useState(false);
  const [assignPackageId, setAssignPackageId] = useState<string>('');
  const [assignItems, setAssignItems] = useState<Array<{ outdoor_id: string; package_item_id?: string; original_photo_url?: string }>>([]);

  const [activeTab, setActiveTab] = useState('pending');

  const { data: packageDetails, isLoading: loadingDetails } = useMaintenancePackageDetails(selectedPackageId || undefined);

  const handleOpenPackage = (packageId: string) => {
    setSelectedPackageId(packageId);
    setSelectedItems({});
    setItemNotes({});
    setItemReviewDates({});
    setPackageNotes('');
  };

  const handleClosePackage = () => {
    setSelectedPackageId(null);
    setSelectedItems({});
    setItemNotes({});
    setItemReviewDates({});
    setPackageNotes('');
  };

  const handleToggleItem = (itemId: string, status: 'approved' | 'rejected' | 'held') => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: prev[itemId] === status ? null : status,
    }));
    // Clear notes and date when changing status
    if (status === 'approved') {
      setItemNotes(prev => ({ ...prev, [itemId]: '' }));
      setItemReviewDates(prev => ({ ...prev, [itemId]: '' }));
    }
  };

  const handleApproveAll = () => {
    if (!packageDetails?.items) return;
    const allApproved: Record<string, ItemStatus> = {};
    packageDetails.items.forEach(item => {
      allApproved[item.id] = 'approved';
    });
    setSelectedItems(allApproved);
    setItemNotes({});
    setItemReviewDates({});
  };

  const handleRejectAll = () => {
    if (!packageDetails?.items) return;
    const allRejected: Record<string, ItemStatus> = {};
    packageDetails.items.forEach(item => {
      allRejected[item.id] = 'rejected';
    });
    setSelectedItems(allRejected);
  };

  const handleSubmitReview = async () => {
    if (!packageDetails) return;

    // Validate justifications for rejected and held items
    for (const [itemId, status] of Object.entries(selectedItems)) {
      if ((status === 'rejected' || status === 'held') && !itemNotes[itemId]?.trim()) {
        toast.error(`Justificativa obrigatória para itens ${status === 'rejected' ? 'rejeitados' : 'segurados'}`);
        return;
      }
    }

    const items = Object.entries(selectedItems)
      .filter(([_, status]) => status !== null)
      .map(([itemId, status]) => ({
        itemId,
        status: status as 'approved' | 'rejected' | 'held',
        notes: itemNotes[itemId] || undefined,
        reviewDate: status === 'held' ? itemReviewDates[itemId] || undefined : undefined,
      }));

    if (items.length === 0) {
      toast.error('Selecione pelo menos um item para aprovar, rejeitar ou segurar');
      return;
    }

    // Check if all items have a decision
    const pendingItems = packageDetails.items?.filter(item => !selectedItems[item.id]);
    if (pendingItems && pendingItems.length > 0) {
      toast.error(`Ainda há ${pendingItems.length} item(ns) sem decisão`);
      return;
    }

    await updateItems.mutateAsync({
      packageId: packageDetails.id,
      items,
      packageNotes: packageNotes || undefined,
    });

    handleClosePackage();
  };

  const handleSendToServiceOrder = async (packageId: string) => {
    await markReadyForSO.mutateAsync(packageId);
  };

  // Reviewed packages (approved/partially_held) NOT yet sent to SO
  const reviewedPackages = allPackages.filter(
    p => (p.status === 'approved' || p.status === 'partially_held') && !p.ready_for_service_order
  );

  // Packages approved by director, ready for supplier assignment
  const readyForSOPackages = allPackages.filter(p => p.ready_for_service_order === true);

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const handleAssignSupplier = (pkg: any) => {
    const items = (pkg.items || [])
      .filter((item: any) => item.status === 'approved')
      .map((item: any) => ({
        outdoor_id: item.outdoor_id,
        package_item_id: item.id,
        original_photo_url: item.outdoor?.photo_url || undefined,
      }));
    
    if (items.length === 0) {
      toast.error('Nenhum item aprovado neste pacote');
      return;
    }
    
    setAssignPackageId(pkg.id);
    setAssignItems(items);
    setAssignSupplierOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_director':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning">Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">Rejeitado</Badge>;
      case 'held':
        return <Badge variant="outline" className="bg-info/10 text-info border-info">Segurada</Badge>;
      case 'partially_held':
        return <Badge variant="outline" className="bg-info/10 text-info border-info">Parcialmente Segurado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Aprovação de Manutenção
          </h1>
          <p className="text-muted-foreground mt-1">
            Revise e aprove os pacotes de manutenção enviados pelo administrador
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-warning/10">
                  <Package className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{packages.length}</p>
                  <p className="text-sm text-muted-foreground">Pacotes Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {packages.reduce((acc, pkg) => acc + (pkg.items?.length || 0), 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total de Outdoors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">Diretoria</p>
                  <p className="text-sm text-muted-foreground">Nível de Aprovação</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pendentes ({packages.length})
            </TabsTrigger>
            <TabsTrigger value="reviewed">
              Revisados ({reviewedPackages.length})
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="ready_for_so">
                Aprovados p/ OS ({readyForSOPackages.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="pending">
            {/* Pending Packages List */}
            {packages.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                    <h3 className="text-lg font-medium">Nenhum pacote pendente</h3>
                    <p className="text-muted-foreground mt-1">
                      Todos os pacotes de manutenção foram revisados
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {packages.map((pkg) => (
                  <Card key={pkg.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            <span className="font-medium">Pacote de Manutenção</span>
                            {getStatusBadge(pkg.status)}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(pkg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {(pkg as any).creator?.name || 'Admin'}
                            </span>
                          </div>
                          {pkg.observations && (
                            <p className="text-sm text-muted-foreground italic">
                              "{pkg.observations}"
                            </p>
                          )}
                        </div>
                        <Button onClick={() => handleOpenPackage(pkg.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Revisar
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviewed">
            {/* Reviewed Packages - Ready to send to OS */}
            {reviewedPackages.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Nenhum pacote aguardando envio</h3>
                    <p className="text-muted-foreground mt-1">
                      Pacotes revisados serão exibidos aqui para envio à Ordem de Serviço
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {reviewedPackages.map((pkg) => (
                  <Card key={pkg.id} className="hover:shadow-md transition-shadow border-success/30">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-success" />
                            <span className="font-medium">Pacote Revisado</span>
                            {getStatusBadge(pkg.status)}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Revisado em {pkg.reviewed_at ? format(new Date(pkg.reviewed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
                            </span>
                          </div>
                          {pkg.director_notes && (
                            <p className="text-sm text-muted-foreground italic">
                              "{pkg.director_notes}"
                            </p>
                          )}
                        </div>
                        <Button 
                          variant="success"
                          onClick={() => handleSendToServiceOrder(pkg.id)}
                          disabled={markReadyForSO.isPending}
                        >
                          {markReadyForSO.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Enviar para Ordem de Serviço
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Approved by director - ready for supplier assignment */}
          {isSuperAdmin && (
            <TabsContent value="ready_for_so">
              {readyForSOPackages.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">Nenhum pacote aprovado</h3>
                      <p className="text-muted-foreground mt-1">
                        Pacotes aprovados pela diretoria aparecerão aqui para atribuição de fornecedor
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {readyForSOPackages.map((pkg) => {
                    const approvedItems = (pkg as any).items?.filter((i: any) => i.status === 'approved') || [];
                    return (
                      <Card key={pkg.id} className="hover:shadow-md transition-shadow border-primary/30">
                        <CardContent className="p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-primary" />
                                <span className="font-medium">Pacote Aprovado pela Diretoria</span>
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                                  {approvedItems.length} outdoor(s)
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  Aprovado em {pkg.reviewed_at ? format(new Date(pkg.reviewed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
                                </span>
                                {pkg.director_notes && (
                                  <span className="italic">"{pkg.director_notes}"</span>
                                )}
                              </div>
                            </div>
                            <Button onClick={() => handleAssignSupplier(pkg)}>
                              <Truck className="h-4 w-4 mr-2" />
                              Atribuir Fornecedor
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Package Details Dialog */}
        <Dialog open={!!selectedPackageId} onOpenChange={() => handleClosePackage()}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Revisar Pacote de Manutenção
              </DialogTitle>
            </DialogHeader>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : packageDetails ? (
              <div className="space-y-6">
                {/* Package Info */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    <span>Enviado por: <strong>{(packageDetails as any).creator?.name || 'Admin'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Data: {format(new Date(packageDetails.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                  {packageDetails.observations && (
                    <p className="text-sm italic">"{packageDetails.observations}"</p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleApproveAll}>
                    <CheckCircle className="h-4 w-4 mr-2 text-success" />
                    Aprovar Todos
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRejectAll}>
                    <XCircle className="h-4 w-4 mr-2 text-destructive" />
                    Rejeitar Todos
                  </Button>
                </div>

                {/* Items List */}
                <div className="space-y-4">
                  <h4 className="font-medium">Outdoors para Manutenção ({packageDetails.items?.length || 0})</h4>
                  
                  {packageDetails.items?.map((item) => (
                    <Card key={item.id} className={`border-2 ${
                      selectedItems[item.id] === 'approved' 
                        ? 'border-success bg-success/5' 
                        : selectedItems[item.id] === 'rejected'
                          ? 'border-destructive bg-destructive/5'
                          : selectedItems[item.id] === 'held'
                            ? 'border-info bg-info/5'
                            : 'border-border'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Photo */}
                          <div 
                            className="w-24 h-24 rounded-lg bg-muted flex-shrink-0 overflow-hidden cursor-pointer"
                            onClick={() => item.outdoor?.photo_url && setImagePreview(item.outdoor.photo_url)}
                          >
                            {item.outdoor?.photo_url ? (
                              <img 
                                src={item.outdoor.photo_url} 
                                alt={item.outdoor.code}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <MapPin className="h-8 w-8" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h5 className="font-medium">{item.outdoor?.code || 'Outdoor'}</h5>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {(item.outdoor?.pdv as any)?.name || 'PDV'}
                                </p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {item.outdoor?.location}
                                </p>
                              </div>
                              <Badge variant="destructive">Não Operacional</Badge>
                            </div>

                            {item.outdoor?.non_operational_reason && (
                              <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
                                <strong>Motivo:</strong> {item.outdoor.non_operational_reason}
                              </div>
                            )}

                            {item.evaluation?.observations && (
                              <p className="text-sm text-muted-foreground">
                                <strong>Obs. da avaliação:</strong> {item.evaluation.observations}
                              </p>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-4 pt-2 flex-wrap">
                              <div 
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => handleToggleItem(item.id, 'approved')}
                              >
                                <Checkbox 
                                  checked={selectedItems[item.id] === 'approved'}
                                  className="border-success data-[state=checked]:bg-success"
                                />
                                <span className="text-sm text-success font-medium flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Aprovar
                                </span>
                              </div>
                              <div 
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => handleToggleItem(item.id, 'rejected')}
                              >
                                <Checkbox 
                                  checked={selectedItems[item.id] === 'rejected'}
                                  className="border-destructive data-[state=checked]:bg-destructive"
                                />
                                <span className="text-sm text-destructive font-medium flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Rejeitar
                                </span>
                              </div>
                              <div 
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => handleToggleItem(item.id, 'held')}
                              >
                                <Checkbox 
                                  checked={selectedItems[item.id] === 'held'}
                                  className="border-info data-[state=checked]:bg-info"
                                />
                                <span className="text-sm text-info font-medium flex items-center gap-1">
                                  <PauseCircle className="h-3 w-3" />
                                  Segurar
                                </span>
                              </div>
                            </div>

                            {/* Item Notes - Required for rejected and held */}
                            {(selectedItems[item.id] === 'rejected' || selectedItems[item.id] === 'held') && (
                              <div className="mt-2 space-y-2">
                                <Textarea
                                  placeholder={`Justificativa OBRIGATÓRIA para ${selectedItems[item.id] === 'rejected' ? 'rejeição' : 'segurar'}...`}
                                  value={itemNotes[item.id] || ''}
                                  onChange={(e) => setItemNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                                  className={`border-2 ${!itemNotes[item.id]?.trim() ? 'border-destructive/50' : 'border-border'}`}
                                  rows={2}
                                  required
                                />
                                {selectedItems[item.id] === 'held' && (
                                  <div className="flex items-center gap-2">
                                    <label className="text-sm text-muted-foreground">Data de Revisão (opcional):</label>
                                    <Input
                                      type="date"
                                      value={itemReviewDates[item.id] || ''}
                                      onChange={(e) => setItemReviewDates(prev => ({ ...prev, [item.id]: e.target.value }))}
                                      className="w-auto"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Optional notes for approved items */}
                            {selectedItems[item.id] === 'approved' && (
                              <Textarea
                                placeholder="Observação para este item (opcional)..."
                                value={itemNotes[item.id] || ''}
                                onChange={(e) => setItemNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                                className="mt-2"
                                rows={2}
                              />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Package Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Observações Gerais (opcional)</label>
                  <Textarea
                    placeholder="Adicione observações gerais sobre este pacote..."
                    value={packageNotes}
                    onChange={(e) => setPackageNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={handleClosePackage}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmitReview}
                disabled={updateItems.isPending}
              >
                {updateItems.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Enviar Decisão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Preview Dialog */}
        <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Foto do Outdoor</DialogTitle>
            </DialogHeader>
            {imagePreview && (
              <img src={imagePreview} alt="Outdoor" className="w-full h-auto rounded-lg" />
            )}
          </DialogContent>
        </Dialog>

        {/* Assign Supplier Dialog */}
        <AssignToSupplierDialog
          open={assignSupplierOpen}
          onOpenChange={setAssignSupplierOpen}
          packageId={assignPackageId}
          items={assignItems}
        />
      </div>
    </AppLayout>
  );
}
