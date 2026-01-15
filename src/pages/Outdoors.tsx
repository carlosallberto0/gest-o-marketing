import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useOutdoors } from '@/hooks/useOutdoorData';
import { useSystemOptions } from '@/hooks/useSystemOptions';
import { getStatusColor, getStatusLabel } from '@/lib/helpers';
import { toGoogleMapsUrl } from '@/lib/googleMaps';
import { convertGoogleDriveUrl } from '@/lib/googleDriveUtils';
import { generateOutdoorListPDF, OutdoorPDFData } from '@/lib/pdfGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Megaphone, 
  Search, 
  Plus, 
  MapPin, 
  Maximize,
  Filter,
  Eye,
  Loader2,
  ExternalLink,
  Upload,
  Trash2,
  X,
  ImagePlus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  FileText
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NewOutdoorDialog } from '@/components/dialogs/NewOutdoorDialog';
import { BulkImportDialog } from '@/components/map/BulkImportDialog';
import { usePDVs } from '@/hooks/usePDVs';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';
import { toast } from 'sonner';
import { useBulkOutdoorActions } from '@/hooks/useBulkOutdoorActions';
import { useReportSettings } from '@/hooks/useReportSettings';

export default function Outdoors() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pdvFilter, setPdvFilter] = useState<string>('all');
  const [descriptionTypeFilter, setDescriptionTypeFilter] = useState<string>('all');
  const [isNewOutdoorOpen, setIsNewOutdoorOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedOutdoors, setSelectedOutdoors] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [bulkStatusAction, setBulkStatusAction] = useState<'operational' | 'non_operational' | 'pending_evaluation' | null>(null);
  const [showStatusConfirmDialog, setShowStatusConfirmDialog] = useState(false);

  const { profile } = useAuth();
  const bulkActionMutation = useBulkOutdoorActions();
  const { data: outdoors = [], isLoading, refetch } = useOutdoors();
  const { data: pdvs = [] } = usePDVs();
  const { data: descriptionTypes = [] } = useSystemOptions('outdoor_description_type');
  const { data: reportSettings } = useReportSettings();
  
  const isSuperAdmin = profile?.role === 'super_admin';

  const filteredOutdoors = outdoors.filter(outdoor => {
    const matchesSearch = outdoor.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         outdoor.pdvName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         outdoor.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || outdoor.status === statusFilter;
    const matchesPdv = pdvFilter === 'all' || outdoor.pdvId === pdvFilter;
    const matchesDescriptionType = descriptionTypeFilter === 'all' || outdoor.descriptionType === descriptionTypeFilter;
    return matchesSearch && matchesStatus && matchesPdv && matchesDescriptionType;
  });

  const stats = {
    total: outdoors.length,
    operational: outdoors.filter(o => o.status === 'operational').length,
    nonOperational: outdoors.filter(o => o.status === 'non_operational').length,
    pending: outdoors.filter(o => o.status === 'pending_evaluation').length,
  };

  const toggleSelection = (id: string) => {
    setSelectedOutdoors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOutdoors.size === filteredOutdoors.length && filteredOutdoors.length > 0) {
      setSelectedOutdoors(new Set());
    } else {
      setSelectedOutdoors(new Set(filteredOutdoors.map(o => o.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOutdoors.size === 0) return;
    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedOutdoors);
      
      const { error } = await supabase
        .from('outdoors')
        .delete()
        .in('id', idsToDelete);
      
      if (error) throw error;
      
      showToast.success(`${idsToDelete.length} outdoor(s) excluído(s) com sucesso!`);
      setSelectedOutdoors(new Set());
      refetch();
    } catch (error: any) {
      showToast.error('Erro ao excluir: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatusAction || selectedOutdoors.size === 0) return;
    
    await bulkActionMutation.mutateAsync({
      outdoorIds: Array.from(selectedOutdoors),
      action: bulkStatusAction,
      validadeHoras: 24,
    });
    
    setSelectedOutdoors(new Set());
    setBulkStatusAction(null);
    setShowStatusConfirmDialog(false);
    refetch();
  };

  const handleGeneratePDF = async () => {
    if (selectedOutdoors.size === 0) {
      showToast.warning('Selecione pelo menos um outdoor para gerar o relatório');
      return;
    }
    
    setIsGeneratingPDF(true);
    const toastId = toast.loading('Gerando PDF...');
    
    try {
      const selectedOutdoorsList = filteredOutdoors.filter(o => selectedOutdoors.has(o.id));
      
      const pdfData: OutdoorPDFData[] = selectedOutdoorsList.map(outdoor => ({
        code: outdoor.code,
        pdvName: outdoor.pdvName,
        city: outdoor.pdvCity || '',
        photoUrl: outdoor.photoUrl ? convertGoogleDriveUrl(outdoor.photoUrl) : undefined,
        width: outdoor.width,
        height: outdoor.height,
        area: outdoor.area,
        locationUrl: outdoor.locationUrl,
        location: outdoor.location,
        status: outdoor.status,
      }));
      
      await generateOutdoorListPDF(pdfData, reportSettings || undefined);
      toast.success('PDF gerado com sucesso!', { id: toastId });
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF: ' + error.message, { id: toastId });
    } finally {
      setIsGeneratingPDF(false);
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
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Outdoors</h1>
            <p className="text-muted-foreground mt-1">Gestão de mídia externa</p>
          </div>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <Button variant="outline" onClick={() => navigate('/bulk-image-upload')}>
                <ImagePlus className="h-4 w-4 mr-2" />
                Carga de Imagens
              </Button>
            )}
            {isSuperAdmin && (
              <>
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar CSV
                </Button>
                <Button onClick={() => setIsNewOutdoorOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Outdoor
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-success/10 rounded-xl p-4 border border-success/20">
            <p className="text-sm text-success">Operacionais</p>
            <p className="text-2xl font-bold text-success">{stats.operational}</p>
          </div>
          <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
            <p className="text-sm text-destructive">Não Operacionais</p>
            <p className="text-2xl font-bold text-destructive">{stats.nonOperational}</p>
          </div>
          <div className="bg-warning/10 rounded-xl p-4 border border-warning/20">
            <p className="text-sm text-warning">Pendentes</p>
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
          </div>
        </div>

        {/* Bulk Action Bar - Super Admin only */}
        {isSuperAdmin && selectedOutdoors.size > 0 && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Checkbox 
                checked={selectedOutdoors.size === filteredOutdoors.length && filteredOutdoors.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium text-foreground">
                {selectedOutdoors.size} outdoor(s) selecionado(s)
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedOutdoors(new Set())}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Alterar Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border border-border">
                  <DropdownMenuItem onClick={() => {
                    setBulkStatusAction('operational');
                    setShowStatusConfirmDialog(true);
                  }}>
                    <CheckCircle className="h-4 w-4 mr-2 text-success" />
                    Operacional
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setBulkStatusAction('non_operational');
                    setShowStatusConfirmDialog(true);
                  }}>
                    <XCircle className="h-4 w-4 mr-2 text-destructive" />
                    Não Operacional
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setBulkStatusAction('pending_evaluation');
                    setShowStatusConfirmDialog(true);
                  }}>
                    <Clock className="h-4 w-4 mr-2 text-warning" />
                    Aguardando Avaliação
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Gerar PDF
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isDeleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Selecionados
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {selectedOutdoors.size} outdoor(s)?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Todos os outdoors selecionados 
                      e suas avaliações serão removidos permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {isSuperAdmin && (
            <div className="flex items-center gap-3">
              <Checkbox 
                id="select-all"
                checked={filteredOutdoors.length > 0 && selectedOutdoors.size === filteredOutdoors.length}
                onCheckedChange={toggleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
                Selecionar todos
              </label>
            </div>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por código, PDV ou localização..." 
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
              <SelectItem value="operational">Operacional</SelectItem>
              <SelectItem value="non_operational">Não Operacional</SelectItem>
              <SelectItem value="pending_evaluation">Pendente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={pdvFilter} onValueChange={setPdvFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="PDV" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os PDVs</SelectItem>
              {pdvs.filter(p => p.active_modules?.includes('media')).map(pdv => (
                <SelectItem key={pdv.id} value={pdv.id}>{pdv.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={descriptionTypeFilter} onValueChange={setDescriptionTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {descriptionTypes.map(type => (
                <SelectItem key={type.option_key} value={type.option_key}>
                  {type.option_label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Outdoors Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOutdoors.map((outdoor, index) => (
            <div 
              key={outdoor.id}
              className={cn(
                "bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-300",
                index < 6 && "animate-slide-up",
                selectedOutdoors.has(outdoor.id) ? "border-primary ring-2 ring-primary/20" : "border-border"
              )}
              style={index < 6 ? { animationDelay: `${index * 50}ms` } : undefined}
            >
              <div className="aspect-video bg-muted relative">
                {/* Selection Checkbox - Super Admin only */}
                {isSuperAdmin && (
                  <div 
                    className="absolute top-3 left-3 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedOutdoors.has(outdoor.id)}
                      onCheckedChange={() => toggleSelection(outdoor.id)}
                      className="bg-background border-2 h-5 w-5"
                    />
                  </div>
                )}
                <img 
                  src={convertGoogleDriveUrl(outdoor.photoUrl) || '/placeholder.svg'} 
                  alt={outdoor.code}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
                <Badge className={cn(
                  "absolute top-3 right-3",
                  getStatusColor(outdoor.status)
                )}>
                  {getStatusLabel(outdoor.status)}
                </Badge>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{outdoor.code}</h3>
                    <p className="text-sm text-muted-foreground">{outdoor.pdvName}</p>
                  </div>
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                
                <div className="space-y-2 text-sm">
                  {outdoor.locationUrl ? (
                    <a
                      href={toGoogleMapsUrl(outdoor.locationUrl) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline text-left"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate max-w-[200px]">{outdoor.locationUrl}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : outdoor.location ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate max-w-[200px]">{outdoor.location}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Maximize className="h-4 w-4" />
                    <span>{outdoor.width}m x {outdoor.height}m ({outdoor.area}m²)</span>
                  </div>
                  {outdoor.direction && (
                    <p className="text-xs text-muted-foreground">
                      Sentido: {outdoor.direction}
                    </p>
                  )}
                </div>

                {outdoor.nonOperationalReason && (
                  <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                    {outdoor.nonOperationalReason}
                  </p>
                )}

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate(`/outdoor/${outdoor.id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalhes
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredOutdoors.length === 0 && (
          <div className="text-center py-12">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Nenhum outdoor encontrado</p>
          </div>
        )}
      </div>

      <NewOutdoorDialog open={isNewOutdoorOpen} onOpenChange={setIsNewOutdoorOpen} />
      <BulkImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} onSuccess={() => refetch()} />
      
      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={showStatusConfirmDialog} onOpenChange={setShowStatusConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alteração de Status</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a alterar o status de <strong>{selectedOutdoors.size}</strong> outdoor(s) para{' '}
              <strong>
                {bulkStatusAction === 'operational' && 'Operacional'}
                {bulkStatusAction === 'non_operational' && 'Não Operacional'}
                {bulkStatusAction === 'pending_evaluation' && 'Aguardando Avaliação'}
              </strong>
              . Esta ação será registrada no log de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkStatusAction(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkStatusChange}
              disabled={bulkActionMutation.isPending}
            >
              {bulkActionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
