import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PhotoUpload } from '@/components/ui/photo-upload';
import { Loader2, MapPin } from 'lucide-react';
import { useUpdatePDV } from '@/hooks/usePDVMutations';
import { MapCoordinateSelector } from '@/components/map/MapCoordinateSelector';

interface PDV {
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

interface EditPDVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdv: PDV | null;
}

export function EditPDVDialog({ open, onOpenChange, pdv }: EditPDVDialogProps) {
  const updatePDV = useUpdatePDV();
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '' as 'posto' | 'conveniencia' | 'both' | '',
    address: '',
    city: '',
    state: '',
    modules: [] as ('media' | 'merchandising')[],
    photoUrl: '',
    lat: null as number | null,
    lng: null as number | null,
  });

  useEffect(() => {
    if (pdv && open) {
      setFormData({
        name: pdv.name,
        type: pdv.type as 'posto' | 'conveniencia' | 'both',
        address: pdv.address,
        city: pdv.city,
        state: pdv.state,
        modules: (pdv.active_modules || []) as ('media' | 'merchandising')[],
        photoUrl: pdv.photo_url || '',
        lat: pdv.lat ?? null,
        lng: pdv.lng ?? null,
      });
    }
  }, [pdv, open]);

  const handleModuleChange = (module: 'media' | 'merchandising', checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, modules: [...formData.modules, module] });
    } else {
      setFormData({ ...formData, modules: formData.modules.filter(m => m !== module) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pdv || !formData.type) return;

    if (formData.modules.includes('media') && (!formData.lat || !formData.lng)) {
      return;
    }

    await updatePDV.mutateAsync({
      id: pdv.id,
      name: formData.name,
      type: formData.type,
      address: formData.address,
      city: formData.city,
      state: formData.state.toUpperCase(),
      active_modules: formData.modules,
      photo_url: formData.photoUrl || null,
      lat: formData.lat,
      lng: formData.lng,
    });
    
    onOpenChange(false);
  };

  const handleCoordinateConfirm = (lat: number, lng: number) => {
    setFormData({ ...formData, lat, lng });
  };

  if (!pdv) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar PDV - {pdv.code}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Foto do PDV</Label>
            <PhotoUpload
              value={formData.photoUrl || null}
              onChange={(url) => setFormData({ ...formData, photoUrl: url || '' })}
              folder="pdvs"
              placeholder="Adicionar foto do posto"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">Código</Label>
              <Input
                id="edit-code"
                value={pdv.code}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Tipo</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as 'posto' | 'conveniencia' | 'both' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="posto">Posto</SelectItem>
                  <SelectItem value="conveniencia">Conveniência</SelectItem>
                  <SelectItem value="both">Posto + Conveniência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome do PDV</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do ponto de venda"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-address">Endereço</Label>
            <Input
              id="edit-address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Rua, número, bairro..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-city">Cidade</Label>
              <Input
                id="edit-city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cidade"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-state">Estado</Label>
              <Input
                id="edit-state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="UF"
                maxLength={2}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-1">
              Coordenadas
              {formData.modules.includes('media') && (
                <span className="text-destructive">*</span>
              )}
            </Label>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Latitude"
                  value={formData.lat ?? ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setFormData({ ...formData, lat: isNaN(val) ? null : val });
                  }}
                  type="number"
                  step="any"
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Longitude"
                  value={formData.lng ?? ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setFormData({ ...formData, lng: isNaN(val) ? null : val });
                  }}
                  type="number"
                  step="any"
                />
              </div>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setShowMapSelector(true)}
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
            {formData.modules.includes('media') && !formData.lat && !formData.lng && (
              <p className="text-xs text-muted-foreground">
                Coordenadas são obrigatórias para PDVs com módulo de Mídia Externa
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Módulos Ativos</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="edit-module-merchandising" 
                  checked={formData.modules.includes('merchandising')}
                  onCheckedChange={(checked) => handleModuleChange('merchandising', checked as boolean)}
                />
                <Label htmlFor="edit-module-merchandising" className="cursor-pointer">Merchandising</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="edit-module-media" 
                  checked={formData.modules.includes('media')}
                  onCheckedChange={(checked) => handleModuleChange('media', checked as boolean)}
                />
                <Label htmlFor="edit-module-media" className="cursor-pointer">Mídia Externa</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={updatePDV.isPending || (formData.modules.includes('media') && (!formData.lat || !formData.lng))}
            >
              {updatePDV.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>

        <MapCoordinateSelector
          open={showMapSelector}
          onOpenChange={setShowMapSelector}
          initialLat={formData.lat}
          initialLng={formData.lng}
          onConfirm={handleCoordinateConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
