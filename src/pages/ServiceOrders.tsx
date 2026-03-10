import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Loader2,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Play,
  Trash2,
  Wrench,
  Download,
  Shield,
  MapPin,
  Building,
  Package,
  Send,
  Image as ImageIcon
} from 'lucide-react';
import { useServiceOrders, useUpdateServiceOrder, useDeleteServiceOrder, statusConfig as serviceStatusConfig, ServiceOrderStatus } from '@/hooks/useServiceOrders';
import { useReadyForServiceOrderPackages } from '@/hooks/useMaintenancePackages';
import { useSupplierWorkOrders, useValidateWorkOrder, useDeleteWorkOrder } from '@/hooks/useSupplierWorkOrders';
import { NewServiceOrderDialog } from '@/components/dialogs/NewServiceOrderDialog';
import { ServiceOrderAdminActions } from '@/components/dialogs/ServiceOrderAdminActions';
import { AssignToSupplierDialog } from '@/components/dialogs/AssignToSupplierDialog';
import { generateServiceOrderPDF, generateMaintenanceApprovalPDF, MaintenanceApprovalPDFData } from '@/lib/pdfGenerator';
import { convertGoogleDriveUrl } from '@/lib/googleDriveUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pendente Admin', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Aprovada', color: 'bg-blue-500', icon: CheckCircle },
  pending_director: { label: 'Aguardando Diretoria', color: 'bg-orange-500', icon: Clock },
  director_approved: { label: 'Aprovada Diretoria', color: 'bg-green-500', icon: CheckCircle },
  in_progress: { label: 'Em Execução', color: 'bg-purple-500', icon: Play },
  completed: { label: 'Concluída', color: 'bg-emerald-500', icon: CheckCircle },
  validated: { label: 'Validada', color: 'bg-green-600', icon: CheckCircle },
  cancelled: { label: 'Cancelada', color: 'bg-red-500', icon: XCircle },
  correction_requested: { label: 'Correção Solicitada', color: 'bg-amber-500', icon: Clock },
};

const typeConfig = {
  installation: { label: 'Instalação', color: 'bg-emerald-100 text-emerald-700' },
  maintenance: { label: 'Manutenção', color: 'bg-blue-100 text-blue-700' },
  removal: { label: 'Remoção', color: 'bg-red-100 text-red-700' },
  replacement: { label: 'Substituição', color: 'bg-orange-100 text-orange-700' },
};

export default function ServiceOrders() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedApprovedItems, setSelectedApprovedItems] = useState<Set<string>>(new Set());
  const [isGeneratingApprovalPDF, setIsGeneratingApprovalPDF] = useState(false);
  const [adminActionDialog, setAdminActionDialog] = useState<{
    open: boolean;
    order: any | null;
  }>({ open: false, order: null });
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean;
    packageId: string;
    items: Array<{ outdoor_id: string; package_item_id?: string; original_photo_url?: string }>;
  }>({ open: false, packageId: '', items: [] });
  
  const { profile } = useAuth();
  const { data: orders = [], isLoading, refetch } = useServiceOrders();
  const { data: readyPackages = [], isLoading: loadingPackages } = useReadyForServiceOrderPackages();
  const { data: supplierWorkOrders = [], isLoading: loadingWorkOrders, refetch: refetchWorkOrders } = useSupplierWorkOrders();
  const updateOrder = useUpdateServiceOrder();
  const deleteOrder = useDeleteServiceOrder();
  const validateWorkOrder = useValidateWorkOrder();
  const deleteWorkOrder = useDeleteWorkOrder();
  const [isInsertingTest, setIsInsertingTest] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin';

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.outdoor?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  const handleInsertTestData = async () => {
    if (!confirm('Inserir dados fictícios de teste? Poderá excluí-los depois.')) return;
    setIsInsertingTest(true);
    const toastId = toast.loading('Inserindo dados de teste...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // 1. Create test package
      const { data: pkg, error: pkgErr } = await supabase
        .from('maintenance_approval_packages')
        .insert({
          created_by: user.id,
          status: 'approved',
          ready_for_service_order: true,
          observations: '[TESTE] Pacote fictício para teste do fluxo fornecedor',
          reviewed_at: new Date().toISOString(),
        } as any)
        .select()
        .single();
      if (pkgErr) throw pkgErr;

      const outdoorIds = [
        '13917080-7bc7-4dcc-8799-65ec60aa0807', // OUT-42
        '15f400fb-5764-41c6-9e31-a49e351beef1', // OUT-47
        '089d162a-cb26-4049-83eb-f5a6d52c45f5', // OUT-37
      ];

      // 2. Create package items
      const pkgItems = outdoorIds.map(oid => ({
        package_id: (pkg as any).id,
        outdoor_id: oid,
        status: 'approved',
      }));
      const { data: insertedItems, error: itemsErr } = await supabase
        .from('maintenance_package_items')
        .insert(pkgItems as any)
        .select();
      if (itemsErr) throw itemsErr;

      const supplierId = '013c2ec6-e846-47f9-b65f-1c6ce902d140'; // Digidoor

      // 3. Create work order
      const { data: wo, error: woErr } = await supabase
        .from('supplier_work_orders')
        .insert({
          package_id: (pkg as any).id,
          supplier_id: supplierId,
          assigned_by: user.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: '[TESTE] Ordem fictícia para teste',
        } as any)
        .select()
        .single();
      if (woErr) throw woErr;

      // 4. Create work order items
      const woItems = outdoorIds.map((oid, i) => ({
        work_order_id: (wo as any).id,
        outdoor_id: oid,
        package_item_id: (insertedItems as any)?.[i]?.id || null,
        executed: true,
        executed_at: new Date().toISOString(),
        observations: '[TESTE] Manutenção fictícia executada',
      }));
      const { error: woItemsErr } = await supabase
        .from('supplier_work_order_items')
        .insert(woItems as any);
      if (woItemsErr) throw woItemsErr;

      toast.success('Dados de teste inseridos com sucesso!', { id: toastId });
      refetchWorkOrders();
    } catch (error: any) {
      console.error('Erro ao inserir teste:', error);
      toast.error('Erro: ' + error.message, { id: toastId });
    } finally {
      setIsInsertingTest(false);
    }
  };

  const handleUpdateStatus = (id: string, status: ServiceOrderStatus) => {
    updateOrder.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta ordem de serviço?')) {
      deleteOrder.mutate(id);
    }
  };

  const handleExportPDF = (order: typeof orders[0]) => {
    try {
      generateServiceOrderPDF({
        number: order.number,
        type: order.type,
        status: order.status,
        description: order.description,
        total_cost: order.total_cost,
        created_at: order.created_at,
        approved_at: order.approved_at,
        completed_at: order.completed_at,
        outdoor: order.outdoor ? {
          code: order.outdoor.code,
          location: order.outdoor.location,
          width: order.outdoor.width,
          height: order.outdoor.height,
          area: order.outdoor.area,
          pdv: order.outdoor.pdv ? {
            name: order.outdoor.pdv.name,
            address: order.outdoor.pdv.address,
            city: order.outdoor.pdv.city,
            state: order.outdoor.pdv.state,
          } : undefined,
        } : undefined,
        supplier: order.supplier ? {
          name: order.supplier.name,
          cnpj: order.supplier.cnpj,
          phone: order.supplier.phone,
          email: order.supplier.email,
          address: order.supplier.address,
        } : undefined,
      });
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  // Count all approved items from ready packages
  const allApprovedItems = readyPackages.flatMap(pkg => 
    (pkg.items || []).map(item => ({ ...item, package: pkg }))
  );

  const toggleApprovedItem = (itemId: string) => {
    setSelectedApprovedItems(prev => {
      const n = new Set(prev);
      n.has(itemId) ? n.delete(itemId) : n.add(itemId);
      return n;
    });
  };

  const toggleSelectAllApproved = () => {
    if (selectedApprovedItems.size === allApprovedItems.length) {
      setSelectedApprovedItems(new Set());
    } else {
      setSelectedApprovedItems(new Set(allApprovedItems.map(i => i.id)));
    }
  };

  const handleGenerateApprovalPDF = async () => {
    if (selectedApprovedItems.size === 0) {
      toast.warning('Selecione pelo menos um outdoor para gerar o PDF');
      return;
    }

    setIsGeneratingApprovalPDF(true);
    const toastId = toast.loading('Gerando PDF de Manutenção Aprovada...');

    try {
      const selectedItems = allApprovedItems.filter(i => selectedApprovedItems.has(i.id));

      // Fetch evaluation photos for each outdoor
      const outdoorIds = selectedItems.map(i => i.outdoor_id);
      
      const { data: newestEvals } = await supabase
        .from('media_evaluations')
        .select('outdoor_id, id')
        .in('outdoor_id', outdoorIds)
        .order('evaluated_at', { ascending: false });

      const { data: oldestEvals } = await supabase
        .from('media_evaluations')
        .select('outdoor_id, id')
        .in('outdoor_id', outdoorIds)
        .order('evaluated_at', { ascending: true });

      const newestEvalMap = new Map<string, string>();
      newestEvals?.forEach(ev => {
        if (!newestEvalMap.has(ev.outdoor_id)) newestEvalMap.set(ev.outdoor_id, ev.id);
      });

      const oldestEvalMap = new Map<string, string>();
      oldestEvals?.forEach(ev => {
        if (!oldestEvalMap.has(ev.outdoor_id)) oldestEvalMap.set(ev.outdoor_id, ev.id);
      });

      const allEvalIds = new Set<string>();
      newestEvalMap.forEach(v => allEvalIds.add(v));
      oldestEvalMap.forEach(v => allEvalIds.add(v));

      const photoMap = new Map<string, string>();
      if (allEvalIds.size > 0) {
        const { data: photos } = await supabase
          .from('media_evaluation_photos')
          .select('evaluation_id, photo_url')
          .in('evaluation_id', Array.from(allEvalIds));
        photos?.forEach(p => {
          if (!photoMap.has(p.evaluation_id)) photoMap.set(p.evaluation_id, p.photo_url);
        });
      }

      const pdfData: MaintenanceApprovalPDFData[] = selectedItems.map(item => {
        const oldestId = oldestEvalMap.get(item.outdoor_id);
        const newestId = newestEvalMap.get(item.outdoor_id);
        const registryPhoto = oldestId ? photoMap.get(oldestId) : undefined;
        const currentPhoto = newestId ? photoMap.get(newestId) : undefined;
        const pdv = item.outdoor?.pdv as any;

        return {
          code: item.outdoor?.code || 'N/A',
          pdvName: pdv?.name || 'N/A',
          city: pdv?.city || '',
          state: pdv?.state || '',
          location: item.outdoor?.location || '',
          nonOperationalReason: item.outdoor?.non_operational_reason || null,
          directorName: (item.package as any)?.director?.name || 'Diretoria',
          directorNotes: item.director_notes || null,
          reviewedAt: (item.package as any)?.reviewed_at || null,
          registryPhotoUrl: registryPhoto ? convertGoogleDriveUrl(registryPhoto) : (item.outdoor?.photo_url ? convertGoogleDriveUrl(item.outdoor.photo_url) : undefined),
          currentPhotoUrl: currentPhoto ? convertGoogleDriveUrl(currentPhoto) : undefined,
        };
      });

      await generateMaintenanceApprovalPDF(pdfData);
      toast.success('PDF gerado com sucesso!', { id: toastId });
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF: ' + error.message, { id: toastId });
    } finally {
      setIsGeneratingApprovalPDF(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ordens de Serviço</h1>
            <p className="text-muted-foreground">Gerencie as ordens de serviço para outdoors</p>
          </div>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <Button variant="outline" onClick={handleInsertTestData} disabled={isInsertingTest}>
                {isInsertingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                🧪 Inserir Teste
              </Button>
            )}
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Ordem
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.in_progress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Concluídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="orders">Ordens de Serviço</TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="approved">
                Manutenção Aprovada
                {allApprovedItems.length > 0 && (
                  <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">
                    {allApprovedItems.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="executed">
                Ordens Executadas
                {supplierWorkOrders.length > 0 && (
                  <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">
                    {supplierWorkOrders.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="orders">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, outdoor ou fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Pendente Admin</SelectItem>
                  <SelectItem value="pending_director">Aguardando Diretoria</SelectItem>
                  <SelectItem value="director_approved">Aprovada Diretoria</SelectItem>
                  <SelectItem value="in_progress">Em Execução</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="validated">Validada</SelectItem>
                  <SelectItem value="correction_requested">Correção Solicitada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <Wrench className="h-12 w-12 mb-4 opacity-50" />
                    <p>Nenhuma ordem de serviço encontrada</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Número</TableHead>
                          <TableHead>Outdoor</TableHead>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => {
                          const statusInfo = statusConfig[order.status];
                          const typeInfo = typeConfig[order.type];
                          const StatusIcon = statusInfo.icon;
                          
                          return (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">{order.number}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{order.outdoor?.code}</p>
                                  <p className="text-xs text-muted-foreground">{order.outdoor?.pdv?.name}</p>
                                </div>
                              </TableCell>
                              <TableCell>{order.supplier?.name}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={cn("text-xs", typeInfo.color)}>
                                  {typeInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={cn("text-white", statusInfo.color)}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Intl.NumberFormat('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                }).format(order.total_cost)}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {order.status === 'pending' && (
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'approved')}>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Aprovar
                                      </DropdownMenuItem>
                                    )}
                                    {order.status === 'approved' && (
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'in_progress')}>
                                        <Play className="h-4 w-4 mr-2" />
                                        Iniciar
                                      </DropdownMenuItem>
                                    )}
                                    {order.status === 'in_progress' && (
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'completed')}>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Concluir
                                      </DropdownMenuItem>
                                    )}
                                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                                          className="text-destructive"
                                        >
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Cancelar
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleExportPDF(order)}>
                                      <Download className="h-4 w-4 mr-2" />
                                      Exportar PDF
                                    </DropdownMenuItem>
                                    {isSuperAdmin && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          onClick={() => setAdminActionDialog({ open: true, order })}
                                        >
                                          <Shield className="h-4 w-4 mr-2" />
                                          Ações Administrativas
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(order.id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approved Maintenance Tab */}
          {isSuperAdmin && (
            <TabsContent value="approved">
              <div className="space-y-4">
                {/* Bulk action bar */}
                {selectedApprovedItems.size > 0 && (
                  <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <span className="text-sm font-medium">
                      {selectedApprovedItems.size} outdoor(s) selecionado(s)
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleGenerateApprovalPDF}
                        disabled={isGeneratingApprovalPDF}
                        variant="outline"
                      >
                        {isGeneratingApprovalPDF ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        Gerar PDF
                      </Button>
                      <Button 
                        onClick={() => {
                          // Group selected items by package
                          const selectedItemsList = allApprovedItems.filter(i => selectedApprovedItems.has(i.id));
                          if (selectedItemsList.length === 0) return;
                          const pkg = selectedItemsList[0].package as any;
                          setAssignDialog({
                            open: true,
                            packageId: pkg?.id || '',
                            items: selectedItemsList.map(i => ({
                              outdoor_id: i.outdoor_id,
                              package_item_id: i.id,
                              original_photo_url: i.outdoor?.photo_url || undefined,
                            })),
                          });
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Enviar para Fornecedor
                      </Button>
                    </div>
                  </div>
                )}

                {loadingPackages ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : allApprovedItems.length === 0 ? (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">Nenhum outdoor aprovado pendente</h3>
                        <p className="text-muted-foreground mt-1">
                          Outdoors aprovados pela diretoria aparecerão aqui para geração de OS
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-2">
                      <Checkbox
                        checked={selectedApprovedItems.size === allApprovedItems.length && allApprovedItems.length > 0}
                        onCheckedChange={toggleSelectAllApproved}
                      />
                      <span className="text-sm text-muted-foreground">Selecionar todos</span>
                    </div>
                    <div className="grid gap-3">
                      {allApprovedItems.map((item) => {
                        const pdv = item.outdoor?.pdv as any;
                        const pkg = item.package as any;
                        return (
                          <Card key={item.id} className={cn(
                            "border-2 transition-colors",
                            selectedApprovedItems.has(item.id) ? "border-primary bg-primary/5" : "border-border"
                          )}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <Checkbox
                                  checked={selectedApprovedItems.has(item.id)}
                                  onCheckedChange={() => toggleApprovedItem(item.id)}
                                  className="mt-1"
                                />
                                {item.outdoor?.photo_url && (
                                  <div className="w-20 h-16 rounded overflow-hidden flex-shrink-0">
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
                                    <Badge variant="success" className="text-[10px]">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Aprovado
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Building className="h-3 w-3" />
                                    {pdv?.name || 'PDV'} - {pdv?.city || ''}
                                  </p>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {item.outdoor?.location}
                                  </p>
                                  {item.outdoor?.non_operational_reason && (
                                    <p className="text-xs text-destructive mt-1">
                                      Motivo: {item.outdoor.non_operational_reason}
                                    </p>
                                  )}
                                  {item.director_notes && (
                                    <p className="text-xs text-muted-foreground mt-1 italic">
                                      Obs. diretoria: {item.director_notes}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Aprovado por: {pkg?.director?.name || 'Diretoria'} em {pkg?.reviewed_at ? format(new Date(pkg.reviewed_at), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          )}

          {/* Executed Orders Tab */}
          {isSuperAdmin && (
            <TabsContent value="executed">
              <div className="space-y-4">
                {loadingWorkOrders ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : supplierWorkOrders.length === 0 ? (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">Nenhuma ordem executada pendente</h3>
                        <p className="text-muted-foreground mt-1">
                          Ordens concluídas pelos fornecedores aparecerão aqui para validação
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  supplierWorkOrders.map((wo) => (
                    <Card key={wo.id} className="border-2">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base">
                            Fornecedor: {wo.supplier?.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            Concluída em {wo.completed_at ? format(new Date(wo.completed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}
                            {' • '}{(wo.items || []).length} outdoor(s)
                          </p>
                        </div>
                        <Button 
                          onClick={() => validateWorkOrder.mutate(wo.id)}
                          disabled={validateWorkOrder.isPending}
                        >
                          {validateWorkOrder.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Validar
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {(wo.items || []).map((item) => {
                            const pdv = item.outdoor?.pdv as any;
                            return (
                              <div key={item.id} className="border rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <h4 className="font-medium text-sm">{item.outdoor?.code}</h4>
                                  <span className="text-xs text-muted-foreground">
                                    {pdv?.name} — {item.outdoor?.location}
                                  </span>
                                  {item.executed && (
                                    <Badge variant="success" className="text-[10px]">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Executado {item.executed_at ? format(new Date(item.executed_at), 'dd/MM HH:mm', { locale: ptBR }) : ''}
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Antes</p>
                                    <div className="w-full h-40 rounded overflow-hidden bg-muted flex items-center justify-center">
                                      {(item.original_photo_url || item.outdoor?.photo_url) ? (
                                        <img
                                          src={convertGoogleDriveUrl(item.original_photo_url || item.outdoor?.photo_url || '')}
                                          alt="Antes"
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Depois</p>
                                    <div className="w-full h-40 rounded overflow-hidden bg-muted flex items-center justify-center">
                                      {item.execution_photo_url ? (
                                        <img
                                          src={item.execution_photo_url}
                                          alt="Depois"
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {item.observations && (
                                  <p className="text-xs text-muted-foreground mt-2 italic">
                                    Obs: {item.observations}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <NewServiceOrderDialog open={showNewDialog} onOpenChange={setShowNewDialog} />

      {/* Assign to Supplier Dialog */}
      <AssignToSupplierDialog
        open={assignDialog.open}
        onOpenChange={(open) => setAssignDialog(prev => ({ ...prev, open }))}
        packageId={assignDialog.packageId}
        items={assignDialog.items}
      />

      {/* Admin Actions Dialog */}
      {adminActionDialog.order && (
        <ServiceOrderAdminActions
          open={adminActionDialog.open}
          onOpenChange={(open) => setAdminActionDialog({ open, order: open ? adminActionDialog.order : null })}
          order={adminActionDialog.order}
          onSuccess={() => refetch()}
        />
      )}
    </AppLayout>
  );
}