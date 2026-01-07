import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { extractCoordsFromGoogleMapsUrl, isShortGoogleMapsUrl } from '@/lib/googleMaps';
import { showToast } from '@/lib/toast';

interface PDVRecalibrateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdv: {
    id: string;
    name: string;
    code: string;
    lat: number | null;
    lng: number | null;
  };
  onSuccess?: () => void;
}

export function PDVRecalibrateDialog({ open, onOpenChange, pdv, onSuccess }: PDVRecalibrateDialogProps) {
  const [url, setUrl] = useState('');
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resolvedCoords, setResolvedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleResolve = async () => {
    if (!url.trim()) {
      setError('Digite uma URL do Google Maps');
      return;
    }

    setResolving(true);
    setError(null);
    setResolvedCoords(null);

    try {
      // First try local extraction
      let coords = extractCoordsFromGoogleMapsUrl(url);

      // If it's a short URL and no coords found, use the edge function
      if (!coords && isShortGoogleMapsUrl(url)) {
        const { data, error: fnError } = await supabase.functions.invoke('resolve-google-maps-url', {
          body: { url }
        });

        if (fnError) throw fnError;
        if (data?.coords) {
          coords = data.coords;
        }
      }

      if (coords) {
        setResolvedCoords(coords);
      } else {
        setError('Não foi possível extrair coordenadas desta URL. Verifique se é um link válido do Google Maps.');
      }
    } catch (err) {
      console.error('Error resolving URL:', err);
      setError('Erro ao resolver URL. Tente novamente.');
    } finally {
      setResolving(false);
    }
  };

  const handleApply = async () => {
    if (!resolvedCoords) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('pdvs')
        .update({
          lat: resolvedCoords.lat,
          lng: resolvedCoords.lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', pdv.id);

      if (updateError) throw updateError;

      showToast.success(`Coordenadas do PDV "${pdv.name}" atualizadas com sucesso!`);
      onSuccess?.();
      onOpenChange(false);
      resetState();
    } catch (err) {
      console.error('Error updating PDV:', err);
      showToast.error('Erro ao atualizar coordenadas do PDV');
    } finally {
      setSaving(false);
    }
  };

  const resetState = () => {
    setUrl('');
    setResolvedCoords(null);
    setError(null);
  };

  const distance = resolvedCoords && pdv.lat && pdv.lng
    ? calculateDistance(pdv.lat, pdv.lng, resolvedCoords.lat, resolvedCoords.lng)
    : null;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetState();
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Recalibrar PDV por Link
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="font-medium">{pdv.name}</p>
            <p className="text-sm text-muted-foreground">Código: {pdv.code}</p>
            {pdv.lat && pdv.lng && (
              <p className="text-xs text-muted-foreground mt-1">
                Atual: {pdv.lat.toFixed(6)}, {pdv.lng.toFixed(6)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL do Google Maps</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                placeholder="https://maps.app.goo.gl/... ou https://google.com/maps/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={resolving}
              />
              <Button onClick={handleResolve} disabled={resolving || !url.trim()}>
                {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resolver'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cole o link do Google Maps do local correto do PDV
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {resolvedCoords && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Coordenadas encontradas!</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Latitude</p>
                  <p className="font-mono">{resolvedCoords.lat.toFixed(7)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Longitude</p>
                  <p className="font-mono">{resolvedCoords.lng.toFixed(7)}</p>
                </div>
              </div>

              {distance !== null && (
                <div className="pt-2 border-t border-green-500/20">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Diferença: </span>
                    <span className="font-medium">
                      {distance < 1000 
                        ? `${distance.toFixed(0)} metros`
                        : `${(distance / 1000).toFixed(2)} km`
                      }
                    </span>
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(`https://www.google.com/maps?q=${resolvedCoords.lat},${resolvedCoords.lng}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver no Google Maps
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={!resolvedCoords || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Aplicar Coordenadas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
