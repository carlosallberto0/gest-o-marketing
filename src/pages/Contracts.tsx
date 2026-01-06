import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useContracts } from '@/hooks/useContracts';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Search, 
  Plus, 
  RefreshCw,
  Download,
  Filter,
  Edit,
  Eye,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { NewContractDialog } from '@/components/dialogs/NewContractDialog';
import { EditContractDialog } from '@/components/dialogs/EditContractDialog';
import { ViewContractDialog } from '@/components/dialogs/ViewContractDialog';

const getContractStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-success/10 text-success border-success/20';
    case 'expiring': return 'bg-warning/10 text-warning border-warning/20';
    case 'expired': return 'bg-destructive/10 text-destructive border-destructive/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getContractStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Ativo';
    case 'expiring': return 'Vencendo';
    case 'expired': return 'Vencido';
    default: return status;
  }
};

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'cash': return 'Dinheiro';
    case 'fuel': return 'Combustível';
    case 'both': return 'Misto';
    default: return method;
  }
};

export default function Contracts() {
  const [searchParams] = useSearchParams();
  const outdoorFilter = searchParams.get('outdoor');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [viewingContract, setViewingContract] = useState<any>(null);
  
  const { data: contracts = [], isLoading } = useContracts();
  const { user } = useAuth();

  const canEdit = user?.role === 'super_admin' || user?.role === 'admin';

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.outdoors?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.farmer_cpf.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    const matchesOutdoor = !outdoorFilter || contract.outdoor_id === outdoorFilter;
    return matchesSearch && matchesStatus && matchesOutdoor;
  });

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    expiring: contracts.filter(c => c.status === 'expiring').length,
    expired: contracts.filter(c => c.status === 'expired').length,
    totalValue: contracts.reduce((acc, c) => acc + Number(c.annual_value), 0),
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
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Contratos</h1>
            <p className="text-muted-foreground mt-1">Gestão de contratos de locação de área</p>
          </div>
          <Button onClick={() => setIsNewContractOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Contrato
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-success/10 rounded-xl p-4 border border-success/20">
            <p className="text-sm text-success">Ativos</p>
            <p className="text-2xl font-bold text-success">{stats.active}</p>
          </div>
          <div className="bg-warning/10 rounded-xl p-4 border border-warning/20">
            <p className="text-sm text-warning">Vencendo</p>
            <p className="text-2xl font-bold text-warning">{stats.expiring}</p>
          </div>
          <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
            <p className="text-sm text-destructive">Vencidos</p>
            <p className="text-2xl font-bold text-destructive">{stats.expired}</p>
          </div>
          <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
            <p className="text-sm text-primary">Valor Total/Ano</p>
            <p className="text-xl font-bold text-primary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalValue)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por proprietário, outdoor ou CPF..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="expiring">Vencendo</SelectItem>
              <SelectItem value="expired">Vencidos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contracts Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Outdoor</TableHead>
                <TableHead>Proprietário</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Valor Mensal</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract, index) => (
                <TableRow 
                  key={contract.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium">{contract.outdoors?.code || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{contract.farmer_name}</p>
                      <p className="text-xs text-muted-foreground">{contract.farmer_cpf}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                      <p className="text-muted-foreground">até {format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(contract.monthly_value))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getPaymentMethodLabel(contract.payment_method)}
                      {contract.auto_renewal && (
                        <span title="Renovação automática">
                          <RefreshCw className="h-3 w-3 text-success" />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getContractStatusColor(contract.status)}>
                      {getContractStatusLabel(contract.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setViewingContract(contract)}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setEditingContract(contract)}
                          title="Editar contrato"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {contract.document_url && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => window.open(contract.document_url, '_blank')}
                          title="Baixar documento"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>

        {filteredContracts.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Nenhum contrato encontrado</p>
          </div>
        )}
      </div>

      <NewContractDialog open={isNewContractOpen} onOpenChange={setIsNewContractOpen} />
      <EditContractDialog 
        open={!!editingContract} 
        onOpenChange={(open) => !open && setEditingContract(null)} 
        contract={editingContract}
      />
      <ViewContractDialog
        open={!!viewingContract}
        onOpenChange={(open) => !open && setViewingContract(null)}
        contract={viewingContract}
      />
    </AppLayout>
  );
}
