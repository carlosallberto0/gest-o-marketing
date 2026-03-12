import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useOutdoors } from '@/hooks/useOutdoorData';
import {
  useMaintenanceRequests,
  usePendingMaintenanceRequests,
  useApproveMaintenanceRequest,
  useRejectMaintenanceRequest,
  MaintenanceRequest,
} from '@/hooks/useMaintenanceRequests';
import { useCreateMaintenancePackage } from '@/hooks/useMaintenancePackages';
import { useAssignmentsByMaintenance } from '@/hooks/useSupplierAssignments';
import { MonthlyOutdoorReviewDialog } from '@/components/dialogs/MonthlyOutdoorReviewDialog';
import { AssignSupplierDialog } from '@/components/dialogs/AssignSupplierDialog';
import { supabase } from '@/integrations/supabase/client';
import { generateMaintenanceRequestsPDF, MaintenanceRequestPDFData } from '@/lib/pdfGenerator';
import { 
  Plus, 
  Search, 
  Loader2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText,
  FileDown,
  MapPin,
  User,
  Calendar,
  AlertTriangle,
  Trash2,
  Filter,
  Image,
  Building,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending_review: { label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Aprovada', color: 'bg-green-500', icon: CheckCircle },
  rejected: { label: 'Rejeitada', color: 'bg-red-500', icon: XCircle },
  consolidated: { label: 'Consolidada', color: 'bg-blue-500', icon: FileText },
};

const urgencyConfig: Record<string, { label: string; color: string }> = {
  baixa: { label: '🟢 Baixa', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  normal: { label: '🟡 Normal', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  alta: { label: '🟠 Alta', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  emergencial: { label: '🔴 Emergencial', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

const maintenanceTypeConfig: Record<string, { label: string; color: string }> = {
  preventiva: { label: '🛡️ Preventiva', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  corretiva: { label: '🔧 Corretiva', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
};

export default function MaintenanceRequests() {
  const { profile } = useAuth();
  const { data: allRequests, isLoading, refetch } = useMaintenanceRequests();
  const { data: pendingRequests } = usePendingMaintenanceRequests();
  const { data: outdoors } = useOutdoors();
  const approveRequest = useApproveMaintenanceRequest();
  const rejectRequest = useRejectMaintenanceRequest();
  const createPackage = useCreateMaintenancePackage();

  const [searchTerm, setSearchTerm] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [directAssignRequest, setDirectAssignRequest] = useState<MaintenanceRequest | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectJustification, setRejectJustification] = useState('');
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  // Advanced filters
  const [monthFilter, setMonthFilter] = useState('all');
  const [requesterFilter, setRequesterFilter] = useState('all');
  const [outdoorFilter, setOutdoorFilter] = useState('all');

  const isSuperAdmin = profile?.role === 'super_admin';
  const isDirector = profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'director';

  // Get unique outdoors from requests for filter
  const uniqueOutdoors = useMemo(() => {
    const outdoorMap = new Map<string, { id: string; code: string; pdvName: string }>();
    allRequests?.forEach(req => {
      if (req.outdoor) {
        outdoorMap.set(req.outdoor_id, {
          id: req.outdoor_id,
          code: req.outdoor.code,
          pdvName: req.outdoor.pdv?.name || '',
        });
      }
    });
    return Array.from(outdoorMap.values());
  }, [allRequests]);

  // Get unique months from requests for filter
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    allRequests?.forEach(req => {
      const month = format(new Date(req.created_at), 'yyyy-MM');
      months.add(month);
    });
    return Array.from(months).sort().reverse();
  }, [allRequests]);

  // Get unique requesters from requests for filter
  const uniqueRequesters = useMemo(() => {
    const requesters = new Map<string, string>();
    allRequests?.forEach(req => {
      if (req.requester) {
        requesters.set(req.requester.id, req.requester.name);
      }
    });
    return Array.from(requesters.entries());
  }, [allRequests]);

  const filterRequests = (requests: MaintenanceRequest[] | undefined, status?: string) => {
    if (!requests) return [];
    return requests.filter(req => {
      // Search filter
      const matchesSearch = 
        req.outdoor?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.outdoor?.pdv?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.reason.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = !status || req.status === status;
      
      // Month filter
      let matchesMonth = true;
      if (monthFilter !== 'all') {
        const reqMonth = format(new Date(req.created_at), 'yyyy-MM');
        matchesMonth = reqMonth === monthFilter;
      }
      
      // Requester filter
      const matchesRequester = requesterFilter === 'all' || req.requester?.id === requesterFilter;
      
      // Outdoor filter
      const matchesOutdoor = outdoorFilter === 'all' || req.outdoor_id === outdoorFilter;
      
      return matchesSearch && matchesStatus && matchesMonth && matchesRequester && matchesOutdoor;
    });
  };

  const handleApprove = async (id: string) => {
    await approveRequest.mutateAsync(id);
    setSelectedRequest(null);
  };

  const handleOpenRejectDialog = (id: string) => {
    setRejectTargetId(id);
    setRejectJustification('');
    setShowRejectDialog(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetId || !rejectJustification.trim()) return;
    await rejectRequest.mutateAsync({ id: rejectTargetId, rejection_reason: rejectJustification.trim() });
    setShowRejectDialog(false);
    setRejectJustification('');
    setRejectTargetId(null);
    setSelectedRequest(null);
  };

  const handleDirectAssign = async (request: MaintenanceRequest) => {
    try {
      await approveRequest.mutateAsync(request.id);
      setSelectedRequest(null);
      setDirectAssignRequest(request);
      setAssignDialogOpen(true);
    } catch {
      // Error toast already shown by the hook
    }
  };

  const handleSendToDirector = async () => {
    if (selectedIds.size === 0 || !allRequests) return;
    const selectedRequests = allRequests.filter(r => selectedIds.has(r.id) && r.status === 'pending_review');
    if (selectedRequests.length === 0) {
      toast.error('Selecione ao menos uma solicitação pendente');
      return;
    }
    const items = selectedRequests.map(r => ({ outdoor_id: r.outdoor_id }));
    await createPackage.mutateAsync({ items });
    setSelectedIds(new Set());
  };

  const handleSelectAll = (requests: MaintenanceRequest[]) => {
    if (selectedIds.size === requests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(requests.map(r => r.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;
      
      toast.success(`${selectedIds.size} solicitação(ões) excluída(s)`);
      setSelectedIds(new Set());
      refetch();
    } catch (error) {
      console.error('Error deleting requests:', error);
      toast.error('Erro ao excluir solicitações');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Show all operational and non-operational outdoors for maintenance requests
  const outdoorsAvailableForMaintenance = outdoors?.filter(
    o => o.status === 'operational' || o.status === 'non_operational'
  ) || [];

  const handleGeneratePDF = async () => {
    if (selectedIds.size === 0 || !allRequests) return;
    setIsGeneratingPDF(true);
    try {
      const selected = allRequests.filter(r => selectedIds.has(r.id));
      const pdfData: MaintenanceRequestPDFData[] = selected.map(req => ({
        id: req.id,
        pdvName: req.outdoor?.pdv?.name || 'N/A',
        outdoorCode: req.outdoor?.code || 'N/A',
        location: req.outdoor?.location || 'Não informada',
        urgency: req.urgency || 'normal',
        maintenanceType: req.maintenance_type || 'corretiva',
        reason: req.reason,
        observations: req.observations,
        createdAt: req.created_at,
        registryPhotoUrl: req.outdoor?.photo_url,
        currentPhotoUrl: req.current_photo_url || (req.photos && req.photos.length > 0 ? req.photos[0] : null),
      }));
      await generateMaintenanceRequestsPDF(pdfData);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const stats = {
    total: allRequests?.length || 0,
    pending: allRequests?.filter(r => r.status === 'pending_review').length || 0,
    approved: allRequests?.filter(r => r.status === 'approved').length || 0,
    consolidated: allRequests?.filter(r => r.status === 'consolidated').length || 0,
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

  const RequestCard = ({ request, showCheckbox }: { request: MaintenanceRequest; showCheckbox?: boolean }) => {
    const status = statusConfig[request.status] || statusConfig.pending_review;
    const StatusIcon = status.icon;

    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => !showCheckbox && setSelectedRequest(request)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {showCheckbox && isSuperAdmin && (
                <Checkbox
                  checked={selectedIds.has(request.id)}
                  onCheckedChange={() => handleSelectOne(request.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <Badge className={`${status.color} text-white`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>

          <div className="space-y-2" onClick={() => setSelectedRequest(request)}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="font-medium">{request.outdoor?.code}</span>
            </div>

            {/* Urgency and Type badges */}
            <div className="flex flex-wrap gap-1">
              {request.urgency && urgencyConfig[request.urgency] && (
                <Badge className={`text-[10px] px-1.5 py-0.5 ${urgencyConfig[request.urgency].color}`}>
                  {urgencyConfig[request.urgency].label}
                </Badge>
              )}
              {request.maintenance_type && maintenanceTypeConfig[request.maintenance_type] && (
                <Badge className={`text-[10px] px-1.5 py-0.5 ${maintenanceTypeConfig[request.maintenance_type].color}`}>
                  {maintenanceTypeConfig[request.maintenance_type].label}
                </Badge>
              )}
            </div>

            {request.outdoor?.pdv && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {request.outdoor.pdv.name} - {request.outdoor.pdv.city}/{request.outdoor.pdv.state}
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              {request.requester?.name}
            </div>

            <p className="text-sm line-clamp-2">{request.reason}</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const currentFilteredRequests = filterRequests(allRequests);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Solicitações de Manutenção</h1>
            <p className="text-muted-foreground">Gerencie as solicitações de manutenção de outdoors</p>
          </div>
          <Button onClick={() => setIsReviewDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Revisão Mensal de Outdoor
          </Button>
        </div>

        {/* Monthly Review Dialog */}
        <MonthlyOutdoorReviewDialog 
          open={isReviewDialogOpen} 
          onOpenChange={(open) => {
            setIsReviewDialogOpen(open);
            if (!open) refetch();
          }} 
        />

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
              <CardTitle className="text-sm font-medium text-muted-foreground">Aprovadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Consolidadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.consolidated}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por outdoor, PDV ou motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {uniqueMonths.map(month => (
                  <SelectItem key={month} value={month}>
                    {format(new Date(month + '-01'), 'MMMM yyyy', { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={requesterFilter} onValueChange={setRequesterFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Solicitante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os solicitantes</SelectItem>
                {uniqueRequesters.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={outdoorFilter} onValueChange={setOutdoorFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Outdoor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os outdoors</SelectItem>
                {uniqueOutdoors.map(outdoor => (
                  <SelectItem key={outdoor.id} value={outdoor.id}>
                    {outdoor.code} - {outdoor.pdvName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <TabsList className="overflow-x-auto flex-nowrap justify-start h-auto p-1">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="pending_review">Pendentes ({stats.pending})</TabsTrigger>
              <TabsTrigger value="approved">Aprovadas ({stats.approved})</TabsTrigger>
              <TabsTrigger value="consolidated">Consolidadas</TabsTrigger>
            </TabsList>

            {isSuperAdmin && selectedIds.size > 0 && (
              <div className="flex items-center gap-2 flex-wrap ml-auto">
                <span className="text-sm font-medium text-muted-foreground">
                  {selectedIds.size} selecionada(s)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePDF}
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
                  Gerar PDF
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendToDirector}
                  disabled={createPackage.isPending}
                >
                  {createPackage.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Enviar para Diretoria
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="all" className="mt-4">
            {isSuperAdmin && currentFilteredRequests.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Checkbox
                  checked={selectedIds.size === currentFilteredRequests.length && currentFilteredRequests.length > 0}
                  onCheckedChange={() => handleSelectAll(currentFilteredRequests)}
                />
                <span className="text-sm text-muted-foreground">Selecionar todas</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentFilteredRequests.map(request => (
                <RequestCard key={request.id} request={request} showCheckbox={isSuperAdmin} />
              ))}
              {currentFilteredRequests.length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  Nenhuma solicitação encontrada
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pending_review" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterRequests(allRequests, 'pending_review').map(request => (
                <RequestCard key={request.id} request={request} showCheckbox={isSuperAdmin} />
              ))}
              {filterRequests(allRequests, 'pending_review').length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  Nenhuma solicitação pendente
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterRequests(allRequests, 'approved').map(request => (
                <RequestCard key={request.id} request={request} showCheckbox={isSuperAdmin} />
              ))}
              {filterRequests(allRequests, 'approved').length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  Nenhuma solicitação aprovada aguardando consolidação
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="consolidated" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterRequests(allRequests, 'consolidated').map(request => (
                <RequestCard key={request.id} request={request} showCheckbox={isSuperAdmin} />
              ))}
              {filterRequests(allRequests, 'consolidated').length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  Nenhuma solicitação consolidada
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Solicitação</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={`${statusConfig[selectedRequest.status]?.color} text-white`}>
                    {statusConfig[selectedRequest.status]?.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Outdoor</p>
                    <p className="font-medium">{selectedRequest.outdoor?.code}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">PDV</p>
                    <p className="font-medium">{selectedRequest.outdoor?.pdv?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Solicitante</p>
                    <p className="font-medium">{selectedRequest.requester?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-medium">
                      {format(new Date(selectedRequest.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {/* Comparativo de Fotos */}
                {(selectedRequest.outdoor?.photo_url || selectedRequest.current_photo_url) && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Comparativo de Fotos
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Foto de Cadastro</p>
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                          {selectedRequest.outdoor?.photo_url ? (
                            <img 
                              src={selectedRequest.outdoor.photo_url} 
                              alt="Foto de cadastro" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              Sem foto
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Foto da Avaliação</p>
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                          {selectedRequest.current_photo_url ? (
                            <img 
                              src={selectedRequest.current_photo_url} 
                              alt="Foto atual" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              Sem foto
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-muted-foreground text-sm mb-1">Motivo</p>
                  <p className="bg-muted p-3 rounded-md">{selectedRequest.reason}</p>
                </div>

                {selectedRequest.observations && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Observações</p>
                    <p className="bg-muted p-3 rounded-md">{selectedRequest.observations}</p>
                  </div>
                )}

                {selectedRequest.approver && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Aprovado por <span className="font-medium">{selectedRequest.approver.name}</span> em{' '}
                      {format(new Date(selectedRequest.approved_at!), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}

                {isDirector && selectedRequest.status === 'pending_review' && (
                  <div className="flex flex-col gap-2 pt-4 border-t">
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        variant="destructive"
                        onClick={() => handleOpenRejectDialog(selectedRequest.id)}
                        disabled={rejectRequest.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rejeitar
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={() => handleApprove(selectedRequest.id)}
                        disabled={approveRequest.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprovar
                      </Button>
                    </div>
                    {isSuperAdmin && (
                      <Button 
                        variant="outline-primary"
                        onClick={() => handleDirectAssign(selectedRequest)}
                        disabled={approveRequest.isPending}
                      >
                        <Building className="h-4 w-4 mr-2" />
                        Atribuir Fornecedor Direto
                      </Button>
                    )}
                  </div>
                )}

                {/* Assign supplier button for approved requests */}
                {isSuperAdmin && selectedRequest.status === 'approved' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      className="flex-1"
                      variant="outline"
                      onClick={() => {
                        setDirectAssignRequest(selectedRequest);
                        setAssignDialogOpen(true);
                      }}
                    >
                      <Building className="h-4 w-4 mr-2" />
                      Atribuir Fornecedor
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a excluir {selectedIds.size} solicitação(ões) de manutenção.
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBatchDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject Justification Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={(open) => {
          setShowRejectDialog(open);
          if (!open) {
            setRejectJustification('');
            setRejectTargetId(null);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Justificativa da Rejeição</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Informe o motivo da rejeição. O gerente será notificado com esta justificativa.
              </p>
              <Textarea
                placeholder="Descreva o motivo da rejeição..."
                value={rejectJustification}
                onChange={(e) => setRejectJustification(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={!rejectJustification.trim() || rejectRequest.isPending}
              >
                {rejectRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Confirmar Rejeição
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Supplier Dialog */}
        {directAssignRequest && (
          <AssignSupplierDialog
            open={assignDialogOpen}
            onOpenChange={(open) => {
              setAssignDialogOpen(open);
              if (!open) {
                setDirectAssignRequest(null);
                refetch();
              }
            }}
            maintenanceRequestId={directAssignRequest.id}
            outdoorCode={directAssignRequest.outdoor?.code}
            reason={directAssignRequest.reason}
          />
        )}
      </div>
    </AppLayout>
  );
}
