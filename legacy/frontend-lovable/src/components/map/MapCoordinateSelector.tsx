import { useEffect, useState, useCallback } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { GoogleMapsProvider, useGoogleMaps } from '@/contexts/GoogleMapsContext';

interface MapCoordinateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLat?: number | null;
  initialLng?: number | null;
  onConfirm: (lat: number, lng: number) => void;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

function MapCoordinateSelectorContent({ 
  open, 
  onOpenChange, 
  initialLat, 
  initialLng,
  onConfirm 
}: MapCoordinateSelectorProps) {
  const { isLoaded, loadError } = useGoogleMaps();

  const [selectedLat, setSelectedLat] = useState<number | null>(initialLat ?? null);
  const [selectedLng, setSelectedLng] = useState<number | null>(initialLng ?? null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);

  // Reset coordinates when dialog opens with new initial values
  useEffect(() => {
    if (open) {
      setSelectedLat(initialLat ?? null);
      setSelectedLng(initialLng ?? null);
    }
  }, [open, initialLat, initialLng]);

  // Default center
  const center = {
    lat: initialLat || -15.5,
    lng: initialLng || -49.0,
  };

  const zoom = initialLat && initialLng ? 14 : 4;

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map);
  }, []);

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setSelectedLat(parseFloat(e.latLng.lat().toFixed(6)));
      setSelectedLng(parseFloat(e.latLng.lng().toFixed(6)));
    }
  }, []);

  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setSelectedLat(parseFloat(e.latLng.lat().toFixed(6)));
      setSelectedLng(parseFloat(e.latLng.lng().toFixed(6)));
    }
  }, []);

  const handleConfirm = () => {
    if (selectedLat && selectedLng) {
      onConfirm(selectedLat, selectedLng);
      onOpenChange(false);
    }
  };

  const handleManualLatChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= -90 && num <= 90) {
      setSelectedLat(num);
    } else if (value === '' || value === '-') {
      setSelectedLat(null);
    }
  };

  const handleManualLngChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= -180 && num <= 180) {
      setSelectedLng(num);
    } else if (value === '' || value === '-') {
      setSelectedLng(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Selecionar Localização no Mapa
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 relative rounded-lg overflow-hidden border border-border">
          {/* Loading state */}
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando mapa...</span>
            </div>
          )}
          
          {/* Error state */}
          {loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-4 z-10">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-destructive text-center px-4">
                Erro ao carregar o mapa
              </p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          )}
          
          {/* Google Map */}
          {isLoaded && !loadError && (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={zoom}
              onLoad={onMapLoad}
              onClick={onMapClick}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                gestureHandling: 'greedy',
              }}
            >
              {selectedLat && selectedLng && (
                <Marker
                  position={{ lat: selectedLat, lng: selectedLng }}
                  draggable
                  onDragEnd={handleMarkerDragEnd}
                />
              )}
            </GoogleMap>
          )}
          
          {/* Instructions overlay */}
          {isLoaded && !loadError && (
            <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-sm z-10">
              <p className="text-muted-foreground">Clique no mapa para selecionar a localização</p>
            </div>
          )}
        </div>

        {/* Manual coordinate input */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <Label>Latitude</Label>
            <Input
              type="number"
              step="any"
              placeholder="-23.550520"
              value={selectedLat ?? ''}
              onChange={(e) => handleManualLatChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Longitude</Label>
            <Input
              type="number"
              step="any"
              placeholder="-46.633309"
              value={selectedLng ?? ''}
              onChange={(e) => handleManualLngChange(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedLat || !selectedLng}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Confirmar Localização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MapCoordinateSelector(props: MapCoordinateSelectorProps) {
  // Only render the provider when dialog is open to avoid loader conflicts
  if (!props.open) {
    return null;
  }
  
  return (
    <GoogleMapsProvider>
      <MapCoordinateSelectorContent {...props} />
    </GoogleMapsProvider>
  );
}
