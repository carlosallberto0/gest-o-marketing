import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhotoUpload } from '@/components/ui/photo-upload';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { usePDVs } from '@/hooks/usePDVs';
import { useCreateOutdoor } from '@/hooks/useCreateOutdoor';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { extractCoordsFromGoogleMapsUrl, isShortGoogleMapsUrl } from '@/lib/googleMaps';
import { toast } from 'sonner';
import { useSystemOptions } from '@/hooks/useSystemOptions';

interface NewOutdoorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPdvId?: string;
}

export function NewOutdoorDialog({ open, onOpenChange, initialPdvId }: NewOutdoorDialogProps) {
  const { data: pdvs } = usePDVs();
  const createOutdoor = useCreateOutdoor();
  const { data: descriptionTypes } = useSystemOptions('outdoor_description_type');
  const { data: ownershipTypes } = useSystemOptions('outdoor_ownership_type');
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    pdvId: '',
    location: '',
    locationUrl: '',
    width: '',
    height: '',
    photoUrl: '',
    ownershipType: 'owned' as 'owned' | 'rented',
    supplierId: '',
    lat: '',
    lng: '',
    descriptionType: '',
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Generate code automatically when dialog opens and pre-select PDV if provided
  useEffect(() => {
    if (open) {
      generateCode();
      if (initialPdvId) {
        setFormData(prev => ({ ...prev, pdvId: initialPdvId }));
      }
    }
  }, [open, initialPdvId]);

  const generateCode = async () => {
    const { count } = await supabase
      .from('outdoors')
      .select('*', { count: 'exact', head: true });
    
    const nextNumber = (count || 0) + 1;
    const code = `OUT-${String(nextNumber).padStart(4, '0')}`;
    setFormData(prev => ({ ...prev, code }));
  };

  const handleUrlChange = async (url: string) => {
    setFormData(prev => ({ ...prev, locationUrl: url }));
    setUrlError(null);
    
    if (!url.trim()) return;

    // Try local extraction first (for full URLs)
    const coords = extractCoordsFromGoogleMapsUrl(url);
    if (coords) {
      setFormData(prev => ({
        ...prev,
        lat: coords.lat.toString(),
        lng: coords.lng.toString(),
      }));
      toast.success('Coordenadas extraídas com sucesso!');
      return;
    }

    // If short URL, resolve via backend
    if (isShortGoogleMapsUrl(url)) {
      setIsResolvingUrl(true);
      try {
        const { data, error } = await supabase.functions.invoke('resolve-google-maps-url', {
          body: { url: url.trim() }
        });

        if (error) throw error;

        if (data?.coords) {
          setFormData(prev => ({
            ...prev,
            lat: data.coords.lat.toString(),
            lng: data.coords.lng.toString(),
          }));
          toast.success('Coordenadas extraídas com sucesso!');
        } else {
          setUrlError('Não foi possível extrair coordenadas desta URL.');
        }
      } catch (err) {
        console.error('Error resolving URL:', err);
        setUrlError('Erro ao processar URL. Tente usar o link completo do Google Maps.');
      } finally {
        setIsResolvingUrl(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createOutdoor.mutateAsync({
      code: formData.code,
      pdvId: formData.pdvId,
      location: formData.location,
      locationUrl: formData.locationUrl || undefined,
      width: parseFloat(formData.width),
      height: parseFloat(formData.height),
      photoUrl: formData.photoUrl || undefined,
      ownershipType: formData.ownershipType,
      supplierId: formData.supplierId || undefined,
      lat: formData.lat ? parseFloat(formData.lat) : undefined,
      lng: formData.lng ? parseFloat(formData.lng) : undefined,
      descriptionType: formData.descriptionType || undefined,
    });
    
    onOpenChange(false);
    setFormData({
      code: '',
      pdvId: '',
      location: '',
      locationUrl: '',
      width: '',
      height: '',
      photoUrl: '',
      ownershipType: 'owned',
      supplierId: '',
      lat: '',
      lng: '',
      descriptionType: '',
    });
  };

  const mediaPDVs = pdvs?.filter(pdv => pdv.active_modules?.includes('media')) || [];
  const hasCoords = formData.lat && formData.lng;

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
              <Label htmlFor="code">Código (auto)</Label>
              <Input
                id="code"
                value={formData.code}
                readOnly
                className="bg-muted"
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

          {/* URL do Google Maps */}
          <div className="space-y-2">
            <Label htmlFor="locationUrl" className="flex items-center gap-2">
              <LinkIcon className="h-3.5 w-3.5" />
              URL de Localização (opcional)
            </Label>
            <div className="flex gap-2">
              <Input
                id="locationUrl"
                value={formData.locationUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="Cole um link do Google Maps..."
                className="flex-1 truncate"
                title={formData.locationUrl}
              />
              {isResolvingUrl && (
                <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Carregando...
                </Badge>
              )}
              {!isResolvingUrl && hasCoords && (
                <Badge variant="outline" className="flex items-center gap-1 shrink-0 text-green-600 border-green-600">
                  <MapPin className="h-3 w-3" />
                  OK
                </Badge>
              )}
              {formData.locationUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => window.open(formData.locationUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
            {urlError && (
              <p className="text-xs text-destructive">{urlError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Cole um link do Google Maps (curto ou completo) para extrair as coordenadas automaticamente
            </p>
          </div>

          {/* Coordenadas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude (opcional)</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                placeholder="-23.5505"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Longitude (opcional)</Label>
              <Input
                id="lng"
                type="number"
                step="any"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                placeholder="-46.6333"
              />
            </div>
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

          {/* Ownership Type */}
          <div className="space-y-2">
            <Label>Tipo de Propriedade</Label>
            <Select 
              value={formData.ownershipType} 
              onValueChange={(v) => setFormData({ ...formData, ownershipType: v as 'owned' | 'rented' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ownershipTypes?.length ? (
                  ownershipTypes.map((opt) => (
                    <SelectItem key={opt.option_key} value={opt.option_key}>
                      {opt.option_label}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="owned">Próprio</SelectItem>
                    <SelectItem value="rented">Alugado</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Supplier for maintenance */}
          <div className="space-y-2">
            <Label>Fornecedor de Manutenção</Label>
            <Select 
              value={formData.supplierId || 'none'} 
              onValueChange={(v) => setFormData({ ...formData, supplierId: v === 'none' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o fornecedor (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description Type */}
          <div className="space-y-2">
            <Label>Descrição/Tipo do Outdoor</Label>
            <Select 
              value={formData.descriptionType || 'none'} 
              onValueChange={(v) => setFormData({ ...formData, descriptionType: v === 'none' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {descriptionTypes?.map((opt) => (
                  <SelectItem key={opt.option_key} value={opt.option_key}>
                    {opt.option_label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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