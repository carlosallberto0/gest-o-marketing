import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePDVs } from '@/hooks/usePDVs';
import { useTogglePDVStatus, useDeletePDV } from '@/hooks/usePDVMutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Fuel, 
  Search, 
  Plus, 
  MapPin,
  Store,
  ShoppingBag,
  Megaphone,
  ClipboardCheck,
  User,
  Filter,
  MoreVertical,
  Eye,
  Pencil,
  Power,
  Trash2,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { NewPDVDialog } from '@/components/dialogs/NewPDVDialog';
import { EditPDVDialog } from '@/components/dialogs/EditPDVDialog';
import { useAuth } from '@/contexts/AuthContext';

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'posto': return 'Posto';
    case 'conveniencia': return 'Conveniência';
    case 'both': return 'Posto + Conv.';
    default: return type;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'conveniencia': return ShoppingBag;
    case 'posto':
    case 'both':
    default:
      return Fuel;
  }
};

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-success';
  if (score >= 75) return 'text-emerald-500';
  if (score >= 60) return 'text-warning';
  return 'text-destructive';
}

interface PDVForEdit {
  id: string;
  code: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  status: string;
  active_modules: string[];
  photo_url?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export default function PDVs() {
  const navigate = useNavigate();
  const { data: pdvs, isLoading } = usePDVs();
  const toggleStatus = useTogglePDVStatus();
  const deletePDV = useDeletePDV();
  const { profile } = useAuth();
  
  const isSuperAdmin = profile?.role === 'super_admin';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [isNewPDVOpen, setIsNewPDVOpen] = useState(false);
  const [editingPDV, setEditingPDV] = useState<PDVForEdit | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<{ id: string; name: string; status: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncManagers = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-pdv-managers');
      if (error) throw error;
      if (data?.success) {
        showToast.success(`${data.updated} PDV(s) atualizado(s) de ${data.total} sem gerente.`);
      } else {
        showToast.error(data?.error || 'Erro ao sincronizar');
      }
    } catch (err: any) {
      showToast.error('Erro ao sincronizar gerentes');
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredPDVs = pdvs?.filter(pdv => {
    const matchesSearch = pdv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pdv.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pdv.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || pdv.type === typeFilter;
    const matchesModule = moduleFilter === 'all' || pdv.active_modules?.includes(moduleFilter);
    return matchesSearch && matchesType && matchesModule;
  }) || [];

  const stats = {
    total: pdvs?.length || 0,
    active: pdvs?.filter(p => p.status === 'active').length || 0,
    withMedia: pdvs?.filter(p => p.active_modules?.includes('media')).length || 0,
    withMerch: pdvs?.filter(p => p.active_modules?.includes('merchandising')).length || 0,
  };

  const handleEdit = (pdv: PDVForEdit) => {
    setEditingPDV(pdv);
  };

  const handleToggleStatus = (id: string, name: string, status: string) => {
    setToggleConfirm({ id, name, status });
  };

  const confirmToggleStatus = async () => {
    if (toggleConfirm) {
      await toggleStatus.mutateAsync({ id: toggleConfirm.id, currentStatus: toggleConfirm.status });
      setToggleConfirm(null);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await deletePDV.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">PDVs</h1>
            <p className="text-muted-foreground mt-1">Gestão de pontos de venda</p>
          </div>
          {isSuperAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSyncManagers} disabled={isSyncing}>
                {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sincronizar Gerentes
              </Button>
              <Button onClick={() => setIsNewPDVOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo PDV
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Total de PDVs</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-success/10 rounded-xl p-4 border border-success/20">
            <p className="text-sm text-success">Ativos</p>
            <p className="text-2xl font-bold text-success">{stats.active}</p>
          </div>
          <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              <p className="text-sm text-primary">Com Mídia</p>
            </div>
            <p className="text-2xl font-bold text-primary">{stats.withMedia}</p>
          </div>
          <div className="bg-secondary rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-foreground" />
              <p className="text-sm text-foreground">Com Merch</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.withMerch}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome, código ou cidade..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="posto">Posto</SelectItem>
              <SelectItem value="conveniencia">Conveniência</SelectItem>
              <SelectItem value="both">Posto + Conv.</SelectItem>
            </SelectContent>
          </Select>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos módulos</SelectItem>
              <SelectItem value="media">Mídia Externa</SelectItem>
              <SelectItem value="merchandising">Merchandising</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* PDVs Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPDVs.map((pdv, index) => {
              const TypeIcon = getTypeIcon(pdv.type);
              return (
                <div 
                  key={pdv.id}
                  className="bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-all duration-300 animate-slide-up cursor-pointer"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate(`/pdv/${pdv.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <TypeIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{pdv.name}</h3>
                        <p className="text-xs text-muted-foreground">{pdv.code}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/pdv/${pdv.id}`); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(pdv as PDVForEdit); }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleStatus(pdv.id, pdv.name, pdv.status); }}>
                          <Power className="h-4 w-4 mr-2" />
                          {pdv.status === 'active' ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        {isSuperAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleDelete(pdv.id, pdv.name); }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{pdv.city}, {pdv.state}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Store className="h-4 w-4" />
                      <span>{getTypeLabel(pdv.type)}</span>
                    </div>

                    {pdv.manager?.name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{pdv.manager.name}</span>
                      </div>
                    )}

                    {/* Modules */}
                    <div className="flex gap-2 pt-2">
                      {pdv.active_modules?.includes('media') && (
                        <Badge variant="outline" className="text-xs">
                          <Megaphone className="h-3 w-3 mr-1" />
                          Mídia
                        </Badge>
                      )}
                      {pdv.active_modules?.includes('merchandising') && (
                        <Badge variant="outline" className="text-xs">
                          <ClipboardCheck className="h-3 w-3 mr-1" />
                          Merch
                        </Badge>
                      )}
                    </div>

                    {/* Scores */}
                    <div className="flex gap-3 pt-2 border-t border-border">
                      {pdv.lastMerchScore !== undefined && (
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Score Merch</p>
                          <p className={cn("text-lg font-bold", getScoreColor(pdv.lastMerchScore))}>
                            {pdv.lastMerchScore}%
                          </p>
                        </div>
                      )}
                      {pdv.active_modules?.includes('media') && (
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Outdoors</p>
                          <p className="text-lg font-bold text-foreground">
                            {pdv.operationalOutdoors ?? 0}/{pdv.totalOutdoors ?? 0}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && filteredPDVs.length === 0 && (
          <div className="text-center py-12">
            <Fuel className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Nenhum PDV encontrado</p>
          </div>
        )}
      </div>

      <NewPDVDialog open={isNewPDVOpen} onOpenChange={setIsNewPDVOpen} />
      
      <EditPDVDialog 
        open={!!editingPDV} 
        onOpenChange={(open) => !open && setEditingPDV(null)} 
        pdv={editingPDV}
      />

      {/* Toggle Status Confirmation */}
      <AlertDialog open={!!toggleConfirm} onOpenChange={(open) => !open && setToggleConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleConfirm?.status === 'active' ? 'Desativar' : 'Ativar'} PDV?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleConfirm?.status === 'active' 
                ? `O PDV "${toggleConfirm?.name}" será desativado e não aparecerá em listagens ativas.`
                : `O PDV "${toggleConfirm?.name}" será reativado.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleStatus}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir PDV?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O PDV "{deleteConfirm?.name}" será excluído permanentemente.
              {'\n\n'}
              Dados vinculados (avaliações, outdoors) podem impedir a exclusão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
