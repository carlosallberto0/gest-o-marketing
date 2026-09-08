import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useOutdoors } from '@/hooks/useOutdoorData';
import { useBulkOutdoorActions } from '@/hooks/useBulkOutdoorActions';
import { 
  useOutdoorCycleConfig, 
  calculateVerificationStatus, 
  getVerificationStatusLabel, 
  getVerificationStatusColor,
  VerificationStatus 
} from '@/hooks/useOutdoorCycleConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock,
  Loader2,
  ImageIcon,
  Building,
  MapPin,
  AlertTriangle,
  Settings2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getStatusLabel, getStatusColor } from '@/lib/helpers';

type BulkAction = 'operational' | 'non_operational' | 'pending_evaluation' | '';

export default function OutdoorStatusControl() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data: outdoors = [], isLoading } = useOutdoors();
  const { data: cycleConfig } = useOutdoorCycleConfig();
  const bulkActionMutation = useBulkOutdoorActions();

  // Calculate verification status for each outdoor
  const outdoorsWithStatus = useMemo(() => {
    return outdoors.map(outdoor => ({
      ...outdoor,
      verificationStatus: calculateVerificationStatus(
        outdoor.avaliacaoValidaAte || null,
        outdoor.lastEvaluation || null,
        cycleConfig?.validade_horas || 24
      ),
    }));
  }, [outdoors, cycleConfig]);

  // Filter outdoors
  const filteredOutdoors = useMemo(() => {
    return outdoorsWithStatus.filter(outdoor => {
      const matchesSearch = 
        outdoor.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        outdoor.pdvName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        outdoor.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || outdoor.status === statusFilter;
      const matchesVerification = verificationFilter === 'all' || outdoor.verificationStatus === verificationFilter;
      
      return matchesSearch && matchesStatus && matchesVerification;
    });
  }, [outdoorsWithStatus, searchTerm, statusFilter, verificationFilter]);

  // Stats
  const stats = useMemo(() => {
    const byVerification = {
      avaliado: 0,
      pendente_reavaliacao: 0,
      nunca_avaliado: 0,
      expirado_48h: 0,
    };

    outdoorsWithStatus.forEach(outdoor => {
      byVerification[outdoor.verificationStatus]++;
    });

    return byVerification;
  }, [outdoorsWithStatus]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredOutdoors.map(o => o.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleApplyBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;

    await bulkActionMutation.mutateAsync({
      outdoorIds: Array.from(selectedIds),
      action: bulkAction,
      validadeHoras: cycleConfig?.validade_horas || 24,
    });

    setSelectedIds(new Set());
    setBulkAction('');
    setShowConfirmDialog(false);
  };

  const allSelected = filteredOutdoors.length > 0 && selectedIds.size === filteredOutdoors.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredOutdoors.length;

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
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Settings2 className="h-8 w-8" />
              Controle de Status de Outdoors
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie o status de avaliação de todos os outdoors da rede
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setVerificationFilter('avaliado')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avaliado}</p>
                  <p className="text-xs text-muted-foreground">Avaliados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setVerificationFilter('pendente_reavaliacao')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendente_reavaliacao}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setVerificationFilter('expirado_48h')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.expirado_48h}</p>
                  <p className="text-xs text-muted-foreground">Atrasados (+48h)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setVerificationFilter('nunca_avaliado')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.nunca_avaliado}</p>
                  <p className="text-xs text-muted-foreground">Nunca Avaliados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, posto ou localização..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status Operacional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="operational">Operacional</SelectItem>
                  <SelectItem value="non_operational">Não Operacional</SelectItem>
                  <SelectItem value="pending_evaluation">Pendente</SelectItem>
                </SelectContent>
              </Select>
              <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Status Verificação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Verificações</SelectItem>
                  <SelectItem value="avaliado">Avaliado</SelectItem>
                  <SelectItem value="pendente_reavaliacao">Pendente Reavaliação</SelectItem>
                  <SelectItem value="expirado_48h">Atrasado (+48h)</SelectItem>
                  <SelectItem value="nunca_avaliado">Nunca Avaliado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Outdoors ({filteredOutdoors.length})</CardTitle>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.size} selecionado(s)
                  </span>
                  <Select value={bulkAction} onValueChange={(v) => setBulkAction(v as BulkAction)}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Ação em massa..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operational">✅ Marcar Operacional</SelectItem>
                      <SelectItem value="non_operational">❌ Marcar Não Operacional</SelectItem>
                      <SelectItem value="pending_evaluation">🟡 Marcar Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={!bulkAction || bulkActionMutation.isPending}
                  >
                    {bulkActionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Aplicar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Selecionar todos"
                        className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                      />
                    </TableHead>
                    <TableHead className="w-[80px]">Foto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Posto</TableHead>
                    <TableHead>Status Operacional</TableHead>
                    <TableHead>Status Verificação</TableHead>
                    <TableHead>Última Avaliação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOutdoors.map((outdoor) => (
                    <TableRow key={outdoor.id} className={selectedIds.has(outdoor.id) ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.has(outdoor.id)}
                          onCheckedChange={(checked) => handleSelectOne(outdoor.id, !!checked)}
                          aria-label={`Selecionar ${outdoor.code}`}
                        />
                      </TableCell>
                      <TableCell>
                        {outdoor.photoUrl ? (
                          <img 
                            src={outdoor.photoUrl} 
                            alt={outdoor.code}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{outdoor.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">{outdoor.pdvName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(outdoor.status)}>
                          {getStatusLabel(outdoor.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getVerificationStatusColor(outdoor.verificationStatus)}>
                          {getVerificationStatusLabel(outdoor.verificationStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {outdoor.lastEvaluation 
                          ? format(new Date(outdoor.lastEvaluation), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredOutdoors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum outdoor encontrado com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Confirm Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Ação em Massa</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a alterar o status de <strong>{selectedIds.size}</strong> outdoor(s) para{' '}
                <strong>
                  {bulkAction === 'operational' && 'Operacional'}
                  {bulkAction === 'non_operational' && 'Não Operacional'}
                  {bulkAction === 'pending_evaluation' && 'Pendente de Avaliação'}
                </strong>
                . Esta ação será registrada no log de auditoria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleApplyBulkAction}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
