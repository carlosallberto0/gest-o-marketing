import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PhotoUpload } from '@/components/ui/photo-upload';
import { useOutdoors } from '@/hooks/useOutdoorData';
import { useCreateMonthlyReview, useIsOutdoorReviewedThisMonth } from '@/hooks/useOutdoorMonthlyReviews';
import { useCreateMaintenanceRequest } from '@/hooks/useMaintenanceRequests';
import { Loader2, CheckCircle, AlertTriangle, Camera, Image } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MonthlyOutdoorReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MonthlyOutdoorReviewDialog({ open, onOpenChange }: MonthlyOutdoorReviewDialogProps) {
  const { data: outdoors, isLoading: loadingOutdoors } = useOutdoors();
  const createReview = useCreateMonthlyReview();
  const createMaintenanceRequest = useCreateMaintenanceRequest();

  const [selectedOutdoorId, setSelectedOutdoorId] = useState('');
  const [status, setStatus] = useState<'approved' | 'needs_maintenance'>('approved');
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState('');
  const [reason, setReason] = useState('');
  const [observations, setObservations] = useState('');

  const { data: isAlreadyReviewed, isLoading: checkingReview } = useIsOutdoorReviewedThisMonth(selectedOutdoorId);

  const selectedOutdoor = outdoors?.find(o => o.id === selectedOutdoorId);

  // Filter outdoors available for review (all statuses)
  const availableOutdoors = outdoors?.filter(
    o => o.status === 'operational' || o.status === 'non_operational' || o.status === 'pending_evaluation'
  ) || [];

  const resetForm = () => {
    setSelectedOutdoorId('');
    setStatus('approved');
    setCurrentPhotoUrl('');
    setReason('');
    setObservations('');
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedOutdoorId) return;

    // Se precisa de manutenção, a foto atual é obrigatória
    if (status === 'needs_maintenance' && !currentPhotoUrl) {
      return;
    }

    try {
      // Criar revisão mensal
      await createReview.mutateAsync({
        outdoor_id: selectedOutdoorId,
        status,
        current_photo_url: currentPhotoUrl || undefined,
        observations: observations || undefined,
      });

      // Se precisa de manutenção, criar também a solicitação de manutenção
      if (status === 'needs_maintenance' && reason) {
        await createMaintenanceRequest.mutateAsync({
          outdoor_id: selectedOutdoorId,
          reason,
          observations: observations || undefined,
          current_photo_url: currentPhotoUrl || undefined,
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const isSubmitting = createReview.isPending || createMaintenanceRequest.isPending;
  const canSubmit = selectedOutdoorId && 
    !isAlreadyReviewed && 
    (status === 'approved' || (status === 'needs_maintenance' && currentPhotoUrl && reason));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisão Mensal de Outdoor</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção do Outdoor */}
          <div className="space-y-2">
            <Label>Outdoor *</Label>
            <Select 
              value={selectedOutdoorId} 
              onValueChange={setSelectedOutdoorId}
              disabled={loadingOutdoors}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o outdoor para avaliar" />
              </SelectTrigger>
              <SelectContent>
                {availableOutdoors.map(outdoor => (
                  <SelectItem key={outdoor.id} value={outdoor.id}>
                    {outdoor.pdvName} – {outdoor.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {checkingReview && selectedOutdoorId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Verificando...
              </div>
            )}
            
            {isAlreadyReviewed && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                Este outdoor já foi avaliado neste mês
              </Badge>
            )}
          </div>

          {/* Comparativo de Fotos */}
          {selectedOutdoor && !isAlreadyReviewed && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Comparativo de Fotos</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Foto de Cadastro */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm text-muted-foreground">Foto de Cadastro</Label>
                  </div>
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                    {selectedOutdoor.photoUrl ? (
                      <img 
                        src={selectedOutdoor.photoUrl} 
                        alt="Foto de cadastro" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <span className="text-sm">Sem foto de cadastro</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Foto Atual */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-primary" />
                    <Label className="text-sm">
                      Foto Atual {status === 'needs_maintenance' && <span className="text-destructive">*</span>}
                    </Label>
                  </div>
                  <PhotoUpload
                    value={currentPhotoUrl}
                    onChange={setCurrentPhotoUrl}
                    folder="outdoor-reviews"
                    placeholder="Tire uma foto do outdoor"
                    className="aspect-video"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Status do Outdoor */}
          {selectedOutdoor && !isAlreadyReviewed && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Status do Outdoor</Label>
              <RadioGroup 
                value={status} 
                onValueChange={(v) => setStatus(v as 'approved' | 'needs_maintenance')}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                <div 
                  className={cn(
                    "flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors",
                    status === 'approved' 
                      ? "border-green-500 bg-green-50 dark:bg-green-950/20" 
                      : "border-border hover:border-muted-foreground/50"
                  )}
                  onClick={() => setStatus('approved')}
                >
                  <RadioGroupItem value="approved" id="approved" />
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <Label htmlFor="approved" className="cursor-pointer font-medium">
                      Outdoor em bom estado
                    </Label>
                  </div>
                </div>
                
                <div 
                  className={cn(
                    "flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors",
                    status === 'needs_maintenance' 
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20" 
                      : "border-border hover:border-muted-foreground/50"
                  )}
                  onClick={() => setStatus('needs_maintenance')}
                >
                  <RadioGroupItem value="needs_maintenance" id="needs_maintenance" />
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <Label htmlFor="needs_maintenance" className="cursor-pointer font-medium">
                      Precisa de manutenção
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Campos de Manutenção */}
          {selectedOutdoor && !isAlreadyReviewed && status === 'needs_maintenance' && (
            <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-950/10 rounded-lg border border-orange-200 dark:border-orange-900">
              <div className="space-y-2">
                <Label>Motivo da Manutenção *</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva detalhadamente o que precisa ser reparado..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Observações Adicionais</Label>
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Informações extras que podem ajudar na manutenção..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Observações para aprovação */}
          {selectedOutdoor && !isAlreadyReviewed && status === 'approved' && (
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Alguma observação sobre o outdoor..."
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit || isSubmitting}
            className={status === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {status === 'approved' ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar Outdoor
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Solicitar Manutenção
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
