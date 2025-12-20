import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Outdoor } from '@/types';

interface EditOutdoorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outdoor: Outdoor | null;
  onSuccess?: () => void;
}

export function EditOutdoorDialog({
  open,
  onOpenChange,
  outdoor,
  onSuccess,
}: EditOutdoorDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    location: '',
    width: 3,
    height: 2,
    lat: '',
    lng: '',
    status: 'pending_evaluation' as string,
    non_operational_reason: '',
  });

  useEffect(() => {
    if (outdoor) {
      setFormData({
        code: outdoor.code,
        location: outdoor.location,
        width: outdoor.width,
        height: outdoor.height,
        lat: outdoor.lat?.toString() || '',
        lng: outdoor.lng?.toString() || '',
        status: outdoor.status,
        non_operational_reason: outdoor.nonOperationalReason || '',
      });
    }
  }, [outdoor]);

  const handleSubmit = async () => {
    if (!outdoor) return;

    setIsLoading(true);
    try {
      const updateData: any = {
        code: formData.code,
        location: formData.location,
        width: formData.width,
        height: formData.height,
        area: formData.width * formData.height,
        status: formData.status,
        non_operational_reason: formData.status === 'non_operational' 
          ? formData.non_operational_reason 
          : null,
      };

      if (formData.lat) updateData.lat = parseFloat(formData.lat);
      if (formData.lng) updateData.lng = parseFloat(formData.lng);

      const { error } = await supabase
        .from('outdoors')
        .update(updateData)
        .eq('id', outdoor.id);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        action: 'UPDATE',
        entity_type: 'outdoor',
        entity_id: outdoor.id,
        old_data: outdoor as any,
        new_data: updateData,
      });

      toast.success('Outdoor atualizado com sucesso!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating outdoor:', error);
      toast.error('Erro ao atualizar outdoor: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Outdoor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operational">Operacional</SelectItem>
                  <SelectItem value="non_operational">Não Operacional</SelectItem>
                  <SelectItem value="pending_evaluation">Pendente Avaliação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Localização</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Largura (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Altura (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                placeholder="-23.5505"
              />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                placeholder="-46.6333"
              />
            </div>
          </div>

          {formData.status === 'non_operational' && (
            <div className="space-y-2">
              <Label>Motivo da Não Operação</Label>
              <Textarea
                value={formData.non_operational_reason}
                onChange={(e) => setFormData({ ...formData, non_operational_reason: e.target.value })}
                placeholder="Descreva o motivo..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
