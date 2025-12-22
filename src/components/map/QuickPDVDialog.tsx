import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Loader2 } from 'lucide-react';
import { useCreatePDV } from '@/hooks/useCreatePDV';
import { supabase } from '@/integrations/supabase/client';

interface QuickPDVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLat: number;
  initialLng: number;
  onSuccess?: () => void;
}

export function QuickPDVDialog({ 
  open, 
  onOpenChange, 
  initialLat, 
  initialLng,
  onSuccess 
}: QuickPDVDialogProps) {
  const createPDV = useCreatePDV();
  
  const [formData, setFormData] = useState({
    name: '',
    type: '' as 'posto' | 'conveniencia' | 'both' | '',
    city: '',
    state: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.name || !formData.city || !formData.state) {
      return;
    }

    // Buscar o maior código existente e incrementar
    const { data: existingPDVs } = await supabase
      .from('pdvs')
      .select('code')
      .like('code', 'PDV-%');
    
    let maxNumber = 0;
    if (existingPDVs) {
      for (const pdv of existingPDVs) {
        const match = pdv.code.match(/PDV-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      }
    }
    
    const code = `PDV-${String(maxNumber + 1).padStart(4, '0')}`;

    await createPDV.mutateAsync({
      code,
      name: formData.name,
      type: formData.type,
      address: `Lat: ${initialLat.toFixed(6)}, Lng: ${initialLng.toFixed(6)}`,
      city: formData.city,
      state: formData.state.toUpperCase(),
      modules: ['media'],
      lat: initialLat,
      lng: initialLng,
    });
    
    onOpenChange(false);
    setFormData({ name: '', type: '', city: '', state: '' });
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Cadastro Rápido de Posto
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Coordinates display */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="text-muted-foreground">Coordenadas selecionadas:</p>
            <p className="font-mono">
              {initialLat.toFixed(6)}, {initialLng.toFixed(6)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do Posto *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Posto Shell Centro"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Select 
              value={formData.type} 
              onValueChange={(v) => setFormData({ ...formData, type: v as 'posto' | 'conveniencia' | 'both' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="posto">Posto</SelectItem>
                <SelectItem value="conveniencia">Conveniência</SelectItem>
                <SelectItem value="both">Posto + Conveniência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cidade"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">UF *</Label>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createPDV.isPending}>
              {createPDV.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Posto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
