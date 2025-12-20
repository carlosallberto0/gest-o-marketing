import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Search, 
  Plus, 
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Loader2,
  MessageSquare,
  Edit,
  PackageCheck,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RequestMaterialDialog } from '@/components/dialogs/RequestMaterialDialog';
import { useMaterialRequests, useUpdateMaterialRequest } from '@/hooks/useMaterialRequests';
import { usePDVs } from '@/hooks/usePDVs';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    pending: {
      label: 'Pendente',
      icon: <Clock className="h-3 w-3" />,
      className: 'bg-warning/10 text-warning border-warning/20',
    },
    approved: {
      label: 'Aprovado',
      icon: <CheckCircle className="h-3 w-3" />,
      className: 'bg-success/10 text-success border-success/20',
    },
    rejected: {
      label: 'Rejeitado',
      icon: <XCircle className="h-3 w-3" />,
      className: 'bg-destructive/10 text-destructive border-destructive/20',
    },
    delivered: {
      label: 'Entregue',
      icon: <Truck className="h-3 w-3" />,
      className: 'bg-primary/10 text-primary border-primary/20',
    },
    separated: {
      label: 'Separado',
      icon: <PackageCheck className="h-3 w-3" />,
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    },
    cancelled: {
      label: 'Cancelado',
      icon: <XCircle className="h-3 w-3" />,
      className: 'bg-muted text-muted-foreground border-muted',
    },
  };
  return configs[status] || configs.pending;
};

export default function MaterialRequests() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pdvFilter, setPdvFilter] = useState<string>('all');
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    request: any;
    action: 'approve' | 'reject' | 'deliver' | 'separate' | 'cancel' | 'edit' | null;
  }>({ open: false, request: null, action: null });
  const [adminNotes, setAdminNotes] = useState('');
  const [editQuantity, setEditQuantity] = useState<number>(0);

  const { profile } = useAuth();
  const { data: requests = [], isLoading, refetch } = useMaterialRequests();
  const { data: allPDVs = [] } = usePDVs();
  const updateRequest = useUpdateMaterialRequest();

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.material?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.pdv?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requester?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesPDV = pdvFilter === 'all' || request.pdv_id === pdvFilter;
    return matchesSearch && matchesStatus && matchesPDV;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    delivered: requests.filter(r => r.status === 'delivered').length,
  };

  const handleAction = async () => {
    if (!actionDialog.request || !actionDialog.action) return;

    try {
      if (actionDialog.action === 'edit') {
        // Handle edit action
        const { error } = await supabase
          .from('material_requests')
          .update({ 
            quantity: editQuantity,
            admin_notes: adminNotes || undefined,
          })
          .eq('id', actionDialog.request.id);

        if (error) throw error;
        toast.success('Solicitação atualizada!');
        refetch();
      } else if (actionDialog.action === 'separate') {
        // Handle separate action
        const { error } = await supabase
          .from('material_requests')
          .update({ 
            status: 'approved',
            admin_notes: `[SEPARADO] ${adminNotes || 'Material separado para entrega'}`,
          })
          .eq('id', actionDialog.request.id);

        if (error) throw error;
        toast.success('Material marcado como separado!');
        refetch();
      } else if (actionDialog.action === 'cancel') {
        // Handle cancel action
        const { error } = await supabase
          .from('material_requests')
          .update({ 
            status: 'rejected',
            admin_notes: `[CANCELADO] ${adminNotes || 'Solicitação cancelada pelo administrador'}`,
          })
          .eq('id', actionDialog.request.id);

        if (error) throw error;
        toast.success('Solicitação cancelada!');
        refetch();
      } else {
        const statusMap = {
          approve: 'approved' as const,
          reject: 'rejected' as const,
          deliver: 'delivered' as const,
        };

        await updateRequest.mutateAsync({
          id: actionDialog.request.id,
          status: statusMap[actionDialog.action],
          admin_notes: adminNotes || undefined,
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao processar ação');
    }

    setActionDialog({ open: false, request: null, action: null });
    setAdminNotes('');
    setEditQuantity(0);
  };

  const openActionDialog = (request: any, action: 'approve' | 'reject' | 'deliver' | 'separate' | 'cancel' | 'edit') => {
    setActionDialog({ open: true, request, action });
    setAdminNotes('');
    if (action === 'edit') {
      setEditQuantity(request.quantity);
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Solicitações de Materiais</h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin ? 'Gerencie as solicitações de materiais' : 'Suas solicitações de materiais'}
            </p>
          </div>
          <Button onClick={() => setIsRequestDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Solicitação
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-warning/10 rounded-xl p-4 border border-warning/20">
            <p className="text-sm text-warning">Pendentes</p>
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
          </div>
          <div className="bg-success/10 rounded-xl p-4 border border-success/20">
            <p className="text-sm text-success">Aprovadas</p>
            <p className="text-2xl font-bold text-success">{stats.approved}</p>
          </div>
          <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
            <p className="text-sm text-primary">Entregues</p>
            <p className="text-2xl font-bold text-primary">{stats.delivered}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por material, PDV ou solicitante..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="approved">Aprovadas</SelectItem>
              <SelectItem value="rejected">Rejeitadas</SelectItem>
              <SelectItem value="delivered">Entregues</SelectItem>
            </SelectContent>
          </Select>
          {isSuperAdmin && (
            <Select value={pdvFilter} onValueChange={setPdvFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar PDV" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os PDVs</SelectItem>
                {allPDVs.map(pdv => (
                  <SelectItem key={pdv.id} value={pdv.id}>{pdv.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Requests Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>PDV</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead className="text-center">Qtd</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request, index) => {
                const statusConfig = getStatusConfig(request.status);
                return (
                  <TableRow 
                    key={request.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{request.material?.name}</p>
                          <p className="text-xs text-muted-foreground">{request.material?.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.pdv?.name}</p>
                        <p className="text-xs text-muted-foreground">{request.pdv?.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{request.requester?.name}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold">{request.quantity}</span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(request.created_at), 'HH:mm', { locale: ptBR })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConfig.className}>
                        {statusConfig.icon}
                        <span className="ml-1">{statusConfig.label}</span>
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {request.status === 'pending' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-success hover:text-success"
                                onClick={() => openActionDialog(request, 'approve')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aprovar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => openActionDialog(request, 'reject')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rejeitar
                              </Button>
                            </>
                          )}
                          {request.status === 'approved' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openActionDialog(request, 'deliver')}
                            >
                              <Truck className="h-4 w-4 mr-1" />
                              Marcar Entregue
                            </Button>
                          )}
                          {request.admin_notes && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              title={request.admin_notes}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Nenhuma solicitação encontrada</p>
          </div>
        )}
      </div>

      <RequestMaterialDialog 
        open={isRequestDialogOpen} 
        onOpenChange={setIsRequestDialogOpen} 
      />

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, request: null, action: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'approve' && 'Aprovar Solicitação'}
              {actionDialog.action === 'reject' && 'Rejeitar Solicitação'}
              {actionDialog.action === 'deliver' && 'Confirmar Entrega'}
            </DialogTitle>
          </DialogHeader>
          
          {actionDialog.request && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p><strong>Material:</strong> {actionDialog.request.material?.name}</p>
                <p><strong>Quantidade:</strong> {actionDialog.request.quantity} unidades</p>
                <p><strong>PDV:</strong> {actionDialog.request.pdv?.name}</p>
                <p><strong>Solicitante:</strong> {actionDialog.request.requester?.name}</p>
                <p><strong>Justificativa:</strong> {actionDialog.request.justification}</p>
              </div>

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  placeholder="Adicione observações sobre esta ação..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setActionDialog({ open: false, request: null, action: null })}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAction}
                  disabled={updateRequest.isPending}
                  variant={actionDialog.action === 'reject' ? 'destructive' : 'default'}
                >
                  {updateRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {actionDialog.action === 'approve' && 'Aprovar'}
                  {actionDialog.action === 'reject' && 'Rejeitar'}
                  {actionDialog.action === 'deliver' && 'Confirmar Entrega'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
