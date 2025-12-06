import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Wrench
} from 'lucide-react';
import { useServiceOrders, useUpdateServiceOrder, useDeleteServiceOrder } from '@/hooks/useServiceOrders';
import { NewServiceOrderDialog } from '@/components/dialogs/NewServiceOrderDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Aprovada', color: 'bg-blue-500', icon: CheckCircle },
  in_progress: { label: 'Em Andamento', color: 'bg-purple-500', icon: Play },
  completed: { label: 'Concluída', color: 'bg-green-500', icon: CheckCircle },
  cancelled: { label: 'Cancelada', color: 'bg-red-500', icon: XCircle },
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
  
  const { data: orders = [], isLoading } = useServiceOrders();
  const updateOrder = useUpdateServiceOrder();
  const deleteOrder = useDeleteServiceOrder();

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

  const handleUpdateStatus = (id: string, status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled') => {
    updateOrder.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta ordem de serviço?')) {
      deleteOrder.mutate(id);
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
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
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="approved">Aprovada</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
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
            )}
          </CardContent>
        </Card>
      </div>

      <NewServiceOrderDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </AppLayout>
  );
}