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
  Package
} from 'lucide-react';
import { useServiceOrders, useUpdateServiceOrder, useDeleteServiceOrder, statusConfig as serviceStatusConfig, ServiceOrderStatus } from '@/hooks/useServiceOrders';
import { useReadyForServiceOrderPackages } from '@/hooks/useMaintenancePackages';
import { NewServiceOrderDialog } from '@/components/dialogs/NewServiceOrderDialog';
import { ServiceOrderAdminActions } from '@/components/dialogs/ServiceOrderAdminActions';
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
  
  const { profile } = useAuth();
  const { data: orders = [], isLoading, refetch } = useServiceOrders();
  const { data: readyPackages = [], isLoading: loadingPackages } = useReadyForServiceOrderPackages();
  const updateOrder = useUpdateServiceOrder();
  const deleteOrder = useDeleteServiceOrder();

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
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Ordem
          </Button>
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
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.in_progress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Concluídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
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
      </div>

      <NewServiceOrderDialog open={showNewDialog} onOpenChange={setShowNewDialog} />

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