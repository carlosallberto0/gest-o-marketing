import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuditLogs } from '@/hooks/useAuditLog';
import { exportAuditLogsToExcel } from '@/lib/excelExport';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Clock,
  User,
  Activity,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

const entityTypeLabels: Record<string, string> = {
  user: 'Usuário',
  pdv: 'PDV',
  outdoor: 'Outdoor',
  contract: 'Contrato',
  evaluation: 'Avaliação',
  campaign: 'Campanha',
  material: 'Material',
  service_order: 'Ordem de Serviço',
  action_plan: 'Plano de Ação',
};

const actionLabels: Record<string, string> = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  login: 'Login',
  logout: 'Logout',
  status_change: 'Mudança de Status',
  export: 'Exportação',
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'create':
      return 'bg-success/10 text-success';
    case 'delete':
      return 'bg-destructive/10 text-destructive';
    case 'update':
    case 'status_change':
      return 'bg-warning/10 text-warning';
    default:
      return 'bg-primary/10 text-primary';
  }
};

export function AuditLogsContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: logs = [], isLoading } = useAuditLogs({
    entityType: entityFilter !== 'all' ? entityFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.user?.name?.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      log.entity_type.toLowerCase().includes(search)
    );
  });

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }
    exportAuditLogsToExcel(filteredLogs);
    toast.success('Arquivo Excel exportado com sucesso!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Logs de Auditoria</h1>
            <p className="text-muted-foreground mt-1">
              Rastreamento de ações importantes do sistema
            </p>
          </div>
          <Button onClick={handleExportExcel} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Total de Logs</p>
            <p className="text-2xl font-bold text-foreground">{logs.length}</p>
          </div>
          <div className="bg-success/10 rounded-xl p-4 border border-success/20">
            <p className="text-sm text-success">Criações</p>
            <p className="text-2xl font-bold text-success">
              {logs.filter(l => l.action === 'create').length}
            </p>
          </div>
          <div className="bg-warning/10 rounded-xl p-4 border border-warning/20">
            <p className="text-sm text-warning">Atualizações</p>
            <p className="text-2xl font-bold text-warning">
              {logs.filter(l => l.action === 'update').length}
            </p>
          </div>
          <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
            <p className="text-sm text-destructive">Exclusões</p>
            <p className="text-2xl font-bold text-destructive">
              {logs.filter(l => l.action === 'delete').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuário ou ação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas entidades</SelectItem>
              {Object.entries(entityTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full sm:w-40"
            placeholder="Data início"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full sm:w-40"
            placeholder="Data fim"
          />
        </div>

        {/* Logs Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum log encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {format(new Date(log.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'HH:mm:ss', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{log.user?.name || 'Sistema'}</p>
                          {log.user?.email && (
                            <p className="text-xs text-muted-foreground">{log.user.email}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionColor(log.action)}>
                        {actionLabels[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {entityTypeLabels[log.entity_type] || log.entity_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.entity_id && (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.entity_id.slice(0, 8)}...
                        </code>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}

export default function AuditLogs() {
  return (
    <AppLayout>
      <AuditLogsContent />
    </AppLayout>
  );
}
