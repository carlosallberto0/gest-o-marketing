import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useContracts, useDeleteContract } from '@/hooks/useContracts';
import { useAuth } from '@/hooks/useAuth';
import { useSystemOptions } from '@/hooks/useSystemOptions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Search, 
  Plus, 
  RefreshCw,
  ExternalLink,
  Filter,
  Edit,
  Eye,
  Loader2,
  Trash2
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NewContractDialog } from '@/components/dialogs/NewContractDialog';
import { EditContractDialog } from '@/components/dialogs/EditContractDialog';
import { ViewContractDialog } from '@/components/dialogs/ViewContractDialog';
import { useQueryClient } from '@tanstack/react-query';

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

// Helper to get display text for linked outdoors
const getOutdoorDisplay = (contract: any) => {
  // Check new structure first
  if (contract.contract_outdoors && contract.contract_outdoors.length > 0) {
    const codes = contract.contract_outdoors.map((co: any) => co.outdoor?.code).filter(Boolean);
    if (codes.length === 1) return codes[0];
    if (codes.length > 1) return `${codes[0]} +${codes.length - 1}`;
  }
  // Fallback to legacy structure
  return contract.outdoors?.code || '-';
};

export default function Contracts() {
  const [searchParams] = useSearchParams();
  const outdoorFilter = searchParams.get('outdoor');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [viewingContract, setViewingContract] = useState<any>(null);
  const [deletingContract, setDeletingContract] = useState<any>(null);
  
  const { data: contracts = [], isLoading, refetch } = useContracts();
  const { data: paymentOptions = [] } = useSystemOptions('contract_payment_method');
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const deleteContract = useDeleteContract();

  const canEdit = profile?.role === 'super_admin' || profile?.role === 'admin';

  const handleDeleteContract = async () => {
    if (!deletingContract) return;
    await deleteContract.mutateAsync(deletingContract.id);
    setDeletingContract(null);
  };

  // Helper to open legacy PDF in new tab
  const handleViewLegacyPDF = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Helper function to get payment method label from dynamic options
  const getPaymentMethodLabel = (method: string) => {
    const option = paymentOptions.find(o => o.option_key === method);
    if (option) return option.option_label;
    // Fallback for legacy values
    switch (method) {
      case 'cash': return 'Dinheiro';
      case 'fuel': return 'Combustível';
      case 'both': return 'Misto';
      case 'pix': return 'PIX';
      default: return method;
    }
  };

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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    refetch();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando contratos...</p>
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} title="Recarregar">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setIsNewContractOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Contrato
            </Button>
          </div>
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
        {filteredContracts.length > 0 ? (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Outdoor(s)</TableHead>
                    <TableHead>Proprietário</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead>Valor Mensal</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract, index) => {
                    const hasImages = contract.contract_images && contract.contract_images.length > 0;
                    const hasLegacyPDF = contract.document_url && !hasImages;
                    
                    return (
                      <TableRow 
                        key={contract.id}
                        className={index < 10 ? "animate-slide-up" : ""}
                        style={index < 10 ? { animationDelay: `${index * 30}ms` } : undefined}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium">{getOutdoorDisplay(contract)}</span>
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
                            {canEdit && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setEditingContract(contract)}
                                  title="Editar contrato"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setDeletingContract(contract)}
                                  title="Excluir contrato"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setViewingContract(contract)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            
                            {/* Show PDF button if has legacy PDF */}
                            {hasLegacyPDF && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewLegacyPDF(contract.document_url!)}
                                title="Abrir PDF em nova aba"
                              >
                                <ExternalLink className="h-4 w-4 text-primary" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-foreground">Nenhum contrato cadastrado</p>
            <p className="text-muted-foreground mt-1">Clique em "Novo Contrato" para começar</p>
            <Button onClick={() => setIsNewContractOpen(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Novo Contrato
            </Button>
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-foreground">Nenhum contrato encontrado</p>
            <p className="text-muted-foreground mt-1">Tente ajustar os filtros de busca</p>
            <Button 
              variant="outline" 
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }} 
              className="mt-4"
            >
              Limpar filtros
            </Button>
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

      <AlertDialog open={!!deletingContract} onOpenChange={(open) => !open && setDeletingContract(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contrato de <strong>{deletingContract?.farmer_name}</strong>?
              Esta ação não pode ser desfeita e o vínculo com o(s) outdoor(s) será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteContract.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteContract}
              disabled={deleteContract.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteContract.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
