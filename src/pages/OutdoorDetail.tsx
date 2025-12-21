import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useOutdoors } from '@/hooks/useOutdoorData';
import { useContractByOutdoor } from '@/hooks/useContracts';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStatusColor, getStatusLabel } from '@/lib/helpers';
import { ViewContractDialog } from '@/components/dialogs/ViewContractDialog';
import { EditOutdoorDialog } from '@/components/dialogs/EditOutdoorDialog';
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
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  MapPin, 
  Maximize, 
  Ruler, 
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
  ClipboardCheck,
  Edit,
  Power,
  Trash2,
  ExternalLink
} from 'lucide-react';

export default function OutdoorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: outdoors = [], isLoading, refetch } = useOutdoors();
  const { data: contract, isLoading: loadingContract } = useContractByOutdoor(id || null);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  
  const outdoor = outdoors.find(o => o.id === id);
  const isSuperAdmin = profile?.role === 'super_admin';

  const handleToggleStatus = async () => {
    if (!outdoor) return;
    setIsTogglingStatus(true);
    try {
      const newStatus = outdoor.status === 'operational' ? 'non_operational' : 'operational';
      const { error } = await supabase
        .from('outdoors')
        .update({ status: newStatus, non_operational_reason: null })
        .eq('id', outdoor.id);
      if (error) throw error;
      toast.success(`Outdoor ${newStatus === 'operational' ? 'ativado' : 'inativado'}!`);
      refetch();
    } catch (error: any) {
      toast.error('Erro ao alterar status');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!outdoor || deleteConfirmText.toUpperCase() !== 'EXCLUIR') return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('outdoors').delete().eq('id', outdoor.id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        action: 'DELETE',
        entity_type: 'outdoor',
        entity_id: outdoor.id,
        old_data: outdoor as any,
      });
      toast.success('Outdoor excluído!');
      navigate('/outdoors');
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setIsDeleting(false);
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

  if (!outdoor) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Outdoor não encontrado</h2>
          <p className="text-muted-foreground mb-4">O outdoor solicitado não existe ou foi removido.</p>
          <Button onClick={() => navigate('/outdoors')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Outdoors
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/outdoors')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{outdoor.code}</h1>
            <p className="text-muted-foreground">{outdoor.pdvName}</p>
          </div>
          <Badge className={getStatusColor(outdoor.status)}>
            {getStatusLabel(outdoor.status)}
          </Badge>
          
          {/* Super Admin Actions */}
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleStatus}
                disabled={isTogglingStatus}
              >
                <Power className="h-4 w-4 mr-1" />
                {outdoor.status === 'operational' ? 'Inativar' : 'Ativar'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Photo */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="aspect-video bg-muted">
              <img 
                src={outdoor.photoUrl || '/placeholder.svg'} 
                alt={outdoor.code}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h3 className="font-semibold text-foreground">Informações do Outdoor</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Localização</p>
                    <a 
                      href={outdoor.location}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline font-medium"
                    >
                      Ver no Google Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Maximize className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Dimensões</p>
                    <p className="font-medium text-foreground">{outdoor.width}m x {outdoor.height}m</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Ruler className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Área Total</p>
                    <p className="font-medium text-foreground">{outdoor.area} m²</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Última Avaliação</p>
                    <p className="font-medium text-foreground">
                      {outdoor.lastEvaluation 
                        ? new Date(outdoor.lastEvaluation).toLocaleDateString('pt-BR')
                        : 'Nunca avaliado'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {outdoor.nonOperationalReason && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">Motivo da não operação:</p>
                  <p className="text-sm text-destructive/80">{outdoor.nonOperationalReason}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => navigate('/outdoor-evaluation')}
                className="bg-primary hover:bg-primary/90"
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Avaliar Outdoor
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowContractDialog(true)}
                disabled={loadingContract}
              >
                {loadingContract ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {contract ? 'Ver Contrato' : 'Sem Contrato'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ViewContractDialog
        open={showContractDialog}
        onOpenChange={setShowContractDialog}
        contract={contract}
      />

      <EditOutdoorDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        outdoor={outdoor}
        onSuccess={() => refetch()}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Outdoor</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Digite <strong>EXCLUIR</strong> para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Digite EXCLUIR"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConfirmText.toUpperCase() !== 'EXCLUIR' || isDeleting}
              className="bg-destructive text-destructive-foreground"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
