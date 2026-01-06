import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useSupplierAssignments, useSupplierStats } from '@/hooks/useSupplierAssignments';
import { useApprovedMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { AssignSupplierDialog } from '@/components/dialogs/AssignSupplierDialog';
import { 
  Building, 
  Search, 
  Loader2, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Wrench,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Aguardando', color: 'bg-yellow-500' },
  accepted: { label: 'Aceita', color: 'bg-blue-500' },
  in_progress: { label: 'Em Andamento', color: 'bg-orange-500' },
  completed: { label: 'Concluída', color: 'bg-green-500' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500' },
};

export default function SupplierManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState('');
  const [selectedOutdoorCode, setSelectedOutdoorCode] = useState('');
  const [selectedReason, setSelectedReason] = useState('');

  const { data: suppliers, isLoading: loadingSuppliers } = useSuppliers();
  const { data: assignments, isLoading: loadingAssignments } = useSupplierAssignments();
  const { data: approvedRequests, isLoading: loadingApproved } = useApprovedMaintenanceRequests();
  const { data: globalStats } = useSupplierStats();

  // Requests without supplier assigned
  const unassignedRequests = useMemo(() => {
    if (!approvedRequests || !assignments) return [];
    const assignedIds = new Set(assignments.map(a => a.maintenance_request_id));
    return approvedRequests.filter(r => !assignedIds.has(r.id));
  }, [approvedRequests, assignments]);

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliers, searchTerm]);

  // Calculate supplier metrics
  const supplierMetrics = useMemo(() => {
    if (!suppliers || !assignments) return new Map();
    const metrics = new Map<string, { pending: number; inProgress: number; completed: number; overdue: number }>();
    
    suppliers.forEach(s => {
      metrics.set(s.id, { pending: 0, inProgress: 0, completed: 0, overdue: 0 });
    });

    assignments.forEach(a => {
      const m = metrics.get(a.supplier_id);
      if (m) {
        if (a.status === 'pending' || a.status === 'accepted') m.pending++;
        if (a.status === 'in_progress') m.inProgress++;
        if (a.status === 'completed') m.completed++;
        if (a.deadline_date && new Date(a.deadline_date) < new Date() && a.status !== 'completed' && a.status !== 'cancelled') {
          m.overdue++;
        }
      }
    });

    return metrics;
  }, [suppliers, assignments]);

  const handleAssign = (requestId: string, outdoorCode?: string, reason?: string) => {
    setSelectedMaintenanceId(requestId);
    setSelectedOutdoorCode(outdoorCode || '');
    setSelectedReason(reason || '');
    setAssignDialogOpen(true);
  };

  const isLoading = loadingSuppliers || loadingAssignments || loadingApproved;

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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Fornecedores</h1>
          <p className="text-muted-foreground">
            Atribua manutenções a fornecedores e acompanhe prazos
          </p>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Fornecedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{suppliers?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {globalStats?.pending || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {globalStats?.inProgress || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Atrasados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {globalStats?.overdue || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Taxa no Prazo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {globalStats?.onTimeRate || 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="unassigned">
          <TabsList>
            <TabsTrigger value="unassigned">
              Aguardando Atribuição ({unassignedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="suppliers">
              Fornecedores ({suppliers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="all">
              Todas as Atribuições ({assignments?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Unassigned requests */}
          <TabsContent value="unassigned" className="space-y-4 mt-4">
            {unassignedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="font-semibold text-lg">Tudo atribuído!</h3>
                  <p className="text-muted-foreground">
                    Todas as manutenções aprovadas já possuem fornecedor.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {unassignedRequests.map(request => (
                  <Card key={request.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{request.outdoor?.code}</h4>
                          <p className="text-sm text-muted-foreground">
                            {request.outdoor?.pdv?.name}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {request.urgency && (
                            <Badge variant="outline" className="text-xs">
                              {request.urgency}
                            </Badge>
                          )}
                          {request.maintenance_type && (
                            <Badge variant="outline" className="text-xs">
                              {request.maintenance_type === 'corretiva' ? '🔧' : '🛡️'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {request.reason}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                        <Button 
                          size="sm" 
                          onClick={() => handleAssign(
                            request.id, 
                            request.outdoor?.code, 
                            request.reason
                          )}
                        >
                          <Building className="h-4 w-4 mr-1" />
                          Atribuir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Suppliers list */}
          <TabsContent value="suppliers" className="space-y-4 mt-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSuppliers.map(supplier => {
                const metrics = supplierMetrics.get(supplier.id);
                return (
                  <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{supplier.name}</h4>
                          <Badge 
                            variant={supplier.status === 'active' ? 'default' : 'secondary'}
                            className="mt-1"
                          >
                            {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <Building className="h-5 w-5 text-muted-foreground" />
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {supplier.phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {supplier.email}
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded p-2">
                          <div className="font-bold text-yellow-600">
                            {metrics?.pending || 0}
                          </div>
                          <div className="text-muted-foreground">Pendente</div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-950/20 rounded p-2">
                          <div className="font-bold text-orange-600">
                            {metrics?.inProgress || 0}
                          </div>
                          <div className="text-muted-foreground">Andamento</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/20 rounded p-2">
                          <div className="font-bold text-green-600">
                            {metrics?.completed || 0}
                          </div>
                          <div className="text-muted-foreground">Concluída</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950/20 rounded p-2">
                          <div className="font-bold text-red-600">
                            {metrics?.overdue || 0}
                          </div>
                          <div className="text-muted-foreground">Atrasada</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* All assignments */}
          <TabsContent value="all" className="space-y-4 mt-4">
            {assignments && assignments.length > 0 ? (
              <div className="grid gap-4">
                {assignments.map(assignment => (
                  <Card key={assignment.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${statusLabels[assignment.status]?.color} text-white`}>
                              {statusLabels[assignment.status]?.label}
                            </Badge>
                            <span className="font-semibold">
                              {assignment.maintenance_request?.outdoor?.code}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Fornecedor: <span className="font-medium">{assignment.supplier?.name}</span>
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {assignment.maintenance_request?.reason}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          {assignment.deadline_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className={
                                new Date(assignment.deadline_date) < new Date() && 
                                assignment.status !== 'completed'
                                  ? 'text-red-600 font-medium'
                                  : ''
                              }>
                                {format(new Date(assignment.deadline_date), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                              {assignment.deadline_days && (
                                <span className="text-muted-foreground">
                                  ({assignment.deadline_days} dias)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg">Nenhuma atribuição</h3>
                  <p className="text-muted-foreground">
                    Ainda não há fornecedores atribuídos a manutenções.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Assign dialog */}
        <AssignSupplierDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          maintenanceRequestId={selectedMaintenanceId}
          outdoorCode={selectedOutdoorCode}
          reason={selectedReason}
        />
      </div>
    </AppLayout>
  );
}
