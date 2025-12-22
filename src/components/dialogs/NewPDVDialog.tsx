import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PhotoUpload } from '@/components/ui/photo-upload';
import { Loader2, MapPin } from 'lucide-react';
import { useCreatePDV } from '@/hooks/useCreatePDV';
import { supabase } from '@/integrations/supabase/client';
import { MapCoordinateSelector } from '@/components/map/MapCoordinateSelector';

interface NewPDVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPDVDialog({ open, onOpenChange }: NewPDVDialogProps) {
  const createPDV = useCreatePDV();
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
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

  // Generate code automatically when dialog opens
  useEffect(() => {
    if (open) {
      generateCode();
    }
  }, [open]);

  const generateCode = async () => {
    // Buscar todos os códigos que seguem o padrão PDV-XXXX
    const { data } = await supabase
      .from('pdvs')
      .select('code')
      .like('code', 'PDV-%');
    
    let maxNumber = 0;
    
    if (data) {
      for (const pdv of data) {
        // Extrair número do código (ex: "PDV-0009" → 9)
        const match = pdv.code.match(/PDV-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }
    
    const nextNumber = maxNumber + 1;
    const code = `PDV-${String(nextNumber).padStart(4, '0')}`;
    setFormData(prev => ({ ...prev, code }));
  };

  const handleModuleChange = (module: 'media' | 'merchandising', checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, modules: [...formData.modules, module] });
    } else {
      setFormData({ ...formData, modules: formData.modules.filter(m => m !== module) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type) return;

    // Validate coordinates are required when media module is selected
    if (formData.modules.includes('media') && (!formData.lat || !formData.lng)) {
      return;
    }

    await createPDV.mutateAsync({
      code: formData.code,
      name: formData.name,
      type: formData.type,
      address: formData.address,
      city: formData.city,
      state: formData.state.toUpperCase(),
      modules: formData.modules,
      photoUrl: formData.photoUrl || undefined,
      lat: formData.lat || undefined,
      lng: formData.lng || undefined,
    });
    
    onOpenChange(false);
    setFormData({
      code: '',
      name: '',
      type: '',
      address: '',
      city: '',
      state: '',
      modules: [],
      photoUrl: '',
      lat: null,
      lng: null,
    });
  };

  const handleCoordinateConfirm = (lat: number, lng: number) => {
    setFormData({ ...formData, lat, lng });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo PDV</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo Upload */}
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
              <Label htmlFor="code">Código (auto)</Label>
              <Input
                id="code"
                value={formData.code}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
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
            <Label htmlFor="name">Nome do PDV</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do ponto de venda"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Rua, número, bairro..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cidade"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="UF"
                maxLength={2}
                required
              />
            </div>
          </div>

          {/* Coordinates Section */}
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
                  id="module-merchandising" 
                  checked={formData.modules.includes('merchandising')}
                  onCheckedChange={(checked) => handleModuleChange('merchandising', checked as boolean)}
                />
                <Label htmlFor="module-merchandising" className="cursor-pointer">Merchandising</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="module-media" 
                  checked={formData.modules.includes('media')}
                  onCheckedChange={(checked) => handleModuleChange('media', checked as boolean)}
                />
                <Label htmlFor="module-media" className="cursor-pointer">Mídia Externa</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createPDV.isPending || (formData.modules.includes('media') && (!formData.lat || !formData.lng))}
            >
              {createPDV.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar PDV
            </Button>
          </DialogFooter>
        </form>

        {/* Map Coordinate Selector */}
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