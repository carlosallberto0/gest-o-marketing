import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useOutdoors } from '@/hooks/useOutdoorData';
import {
  useMaintenanceRequests,
  usePendingMaintenanceRequests,
  useCreateMaintenanceRequest,
  useApproveMaintenanceRequest,
  useRejectMaintenanceRequest,
  MaintenanceRequest,
} from '@/hooks/useMaintenanceRequests';
import { 
  Plus, 
  Search, 
  Loader2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText,
  MapPin,
  User,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending_review: { label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Aprovada', color: 'bg-green-500', icon: CheckCircle },
  rejected: { label: 'Rejeitada', color: 'bg-red-500', icon: XCircle },
  consolidated: { label: 'Consolidada', color: 'bg-blue-500', icon: FileText },
};

export default function MaintenanceRequests() {
  const { profile } = useAuth();
  const { data: allRequests, isLoading } = useMaintenanceRequests();
  const { data: pendingRequests } = usePendingMaintenanceRequests();
  const { data: outdoors } = useOutdoors();
  const createRequest = useCreateMaintenanceRequest();
  const approveRequest = useApproveMaintenanceRequest();
  const rejectRequest = useRejectMaintenanceRequest();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);

  const [formData, setFormData] = useState({
    outdoor_id: '',
    reason: '',
    observations: '',
  });

  const isDirector = profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'director';

  const filterRequests = (requests: MaintenanceRequest[] | undefined, status?: string) => {
    if (!requests) return [];
    return requests.filter(req => {
      const matchesSearch = 
        req.outdoor?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.outdoor?.pdv?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.reason.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !status || req.status === status;
      return matchesSearch && matchesStatus;
    });
  };

  const handleCreate = async () => {
    await createRequest.mutateAsync({
      outdoor_id: formData.outdoor_id,
      reason: formData.reason,
      observations: formData.observations || undefined,
    });
    setIsCreateDialogOpen(false);
    setFormData({ outdoor_id: '', reason: '', observations: '' });
  };

  const handleApprove = async (id: string) => {
    await approveRequest.mutateAsync(id);
    setSelectedRequest(null);
  };

  const handleReject = async (id: string) => {
    await rejectRequest.mutateAsync(id);
    setSelectedRequest(null);
  };

  // Show all operational and non-operational outdoors for maintenance requests
  const outdoorsAvailableForMaintenance = outdoors?.filter(
    o => o.status === 'operational' || o.status === 'non_operational'
  ) || [];

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

  const RequestCard = ({ request }: { request: MaintenanceRequest }) => {
    const status = statusConfig[request.status] || statusConfig.pending_review;
    const StatusIcon = status.icon;

    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setSelectedRequest(request)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge className={`${status.color} text-white`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="font-medium">{request.outdoor?.code}</span>
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Solicitações de Manutenção</h1>
            <p className="text-muted-foreground">Gerencie as solicitações de manutenção de outdoors</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Solicitação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Solicitação de Manutenção</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Outdoor *</Label>
                  <Select 
                    value={formData.outdoor_id} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, outdoor_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o outdoor" />
                    </SelectTrigger>
                    <SelectContent>
                      {outdoorsAvailableForMaintenance.map(outdoor => (
                        <SelectItem key={outdoor.id} value={outdoor.id}>
                          {outdoor.pdvName} – {outdoor.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Motivo da Manutenção *</Label>
                  <Textarea
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Descreva o motivo da solicitação..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observations}
                    onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                    placeholder="Observações adicionais..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={createRequest.isPending || !formData.outdoor_id || !formData.reason}
                >
                  {createRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Criar Solicitação
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por outdoor, PDV ou motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="pending_review">Pendentes ({stats.pending})</TabsTrigger>
            <TabsTrigger value="approved">Aprovadas ({stats.approved})</TabsTrigger>
            <TabsTrigger value="consolidated">Consolidadas</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterRequests(allRequests).map(request => (
                <RequestCard key={request.id} request={request} />
              ))}
              {filterRequests(allRequests).length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  Nenhuma solicitação encontrada
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pending_review" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterRequests(allRequests, 'pending_review').map(request => (
                <RequestCard key={request.id} request={request} />
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
                <RequestCard key={request.id} request={request} />
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
                <RequestCard key={request.id} request={request} />
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
          <DialogContent className="max-w-lg">
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
                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      className="flex-1" 
                      variant="destructive"
                      onClick={() => handleReject(selectedRequest.id)}
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
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
