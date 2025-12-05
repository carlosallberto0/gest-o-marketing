import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhotoUpload, MultiPhotoUpload } from '@/components/ui/photo-upload';
import { Loader2 } from 'lucide-react';
import { usePDVs } from '@/hooks/usePDVs';
import { useCreateOutdoor } from '@/hooks/useCreateOutdoor';

interface NewOutdoorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewOutdoorDialog({ open, onOpenChange }: NewOutdoorDialogProps) {
  const { data: pdvs } = usePDVs();
  const createOutdoor = useCreateOutdoor();
  const [formData, setFormData] = useState({
    code: '',
    pdvId: '',
    location: '',
    width: '',
    height: '',
    photoUrl: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createOutdoor.mutateAsync({
      code: formData.code,
      pdvId: formData.pdvId,
      location: formData.location,
      width: parseFloat(formData.width),
      height: parseFloat(formData.height),
      photoUrl: formData.photoUrl || undefined,
    });
    
    onOpenChange(false);
    setFormData({
      code: '',
      pdvId: '',
      location: '',
      width: '',
      height: '',
      photoUrl: '',
    });
  };

  const mediaPDVs = pdvs?.filter(pdv => pdv.active_modules?.includes('media')) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Outdoor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Foto do Outdoor</Label>
            <PhotoUpload
              value={formData.photoUrl || null}
              onChange={(url) => setFormData({ ...formData, photoUrl: url || '' })}
              folder="outdoors"
              placeholder="Adicionar foto do outdoor"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="OUT-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdvId">PDV</Label>
              <Select value={formData.pdvId} onValueChange={(v) => setFormData({ ...formData, pdvId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o PDV" />
                </SelectTrigger>
                <SelectContent>
                  {mediaPDVs.map(pdv => (
                    <SelectItem key={pdv.id} value={pdv.id}>{pdv.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Localização do Outdoor</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ex: Entrada principal, fachada lateral, rodovia km 123..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">Largura (m)</Label>
              <Input
                id="width"
                type="number"
                step="0.1"
                min="0"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                placeholder="0.0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Altura (m)</Label>
              <Input
                id="height"
                type="number"
                step="0.1"
                min="0"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                placeholder="0.0"
                required
              />
            </div>
          </div>

          {formData.width && formData.height && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Área total: <span className="font-semibold text-foreground">{(parseFloat(formData.width) * parseFloat(formData.height)).toFixed(2)} m²</span>
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createOutdoor.isPending}>
              {createOutdoor.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Outdoor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
