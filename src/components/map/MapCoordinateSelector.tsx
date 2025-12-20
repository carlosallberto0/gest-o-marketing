import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useMapboxToken } from '@/hooks/useStrategicMapData';

interface MapCoordinateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLat?: number | null;
  initialLng?: number | null;
  onConfirm: (lat: number, lng: number) => void;
}

export function MapCoordinateSelector({ 
  open, 
  onOpenChange, 
  initialLat, 
  initialLng,
  onConfirm 
}: MapCoordinateSelectorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const initAttempt = useRef(0);
  
  const { data: token, isLoading: tokenLoading, error: tokenError } = useMapboxToken();
  const [selectedLat, setSelectedLat] = useState<number | null>(initialLat ?? null);
  const [selectedLng, setSelectedLng] = useState<number | null>(initialLng ?? null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setMapLoaded(false);
      setMapError(null);
      setIsInitializing(false);
      initAttempt.current = 0;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      marker.current = null;
    }
  }, [open]);

  // Reset coordinates when dialog opens with new initial values
  useEffect(() => {
    if (open) {
      setSelectedLat(initialLat ?? null);
      setSelectedLng(initialLng ?? null);
    }
  }, [open, initialLat, initialLng]);

  const initializeMap = useCallback(() => {
    if (!mapContainer.current || !token) return;

    // Clean up existing map
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
    marker.current = null;
    setMapError(null);
    setIsInitializing(true);

    // Check container dimensions
    const rect = mapContainer.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      if (initAttempt.current < 3) {
        initAttempt.current++;
        setTimeout(initializeMap, 200);
        return;
      }
      setMapError('Não foi possível inicializar o mapa. Tente novamente.');
      setIsInitializing(false);
      return;
    }

    try {
      mapboxgl.accessToken = token;
      
      // Default center (Brazil)
      const center: [number, number] = initialLng && initialLat 
        ? [initialLng, initialLat] 
        : [-49.0, -15.5];
      const zoom = initialLng && initialLat ? 14 : 4;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      
      map.current.on('load', () => {
        setMapLoaded(true);
        setIsInitializing(false);
        
        // Add initial marker if coordinates exist
        if (initialLat && initialLng && map.current) {
          marker.current = new mapboxgl.Marker({ color: '#3b82f6', draggable: true })
            .setLngLat([initialLng, initialLat])
            .addTo(map.current);
            
          marker.current.on('dragend', () => {
            const lngLat = marker.current?.getLngLat();
            if (lngLat) {
              setSelectedLat(parseFloat(lngLat.lat.toFixed(6)));
              setSelectedLng(parseFloat(lngLat.lng.toFixed(6)));
            }
          });
        }
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapError('Erro ao carregar o mapa.');
        setIsInitializing(false);
      });

      // Click handler to place/move marker
      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        setSelectedLat(parseFloat(lat.toFixed(6)));
        setSelectedLng(parseFloat(lng.toFixed(6)));
        
        if (marker.current) {
          marker.current.setLngLat([lng, lat]);
        } else if (map.current) {
          marker.current = new mapboxgl.Marker({ color: '#3b82f6', draggable: true })
            .setLngLat([lng, lat])
            .addTo(map.current);
            
          marker.current.on('dragend', () => {
            const lngLat = marker.current?.getLngLat();
            if (lngLat) {
              setSelectedLat(parseFloat(lngLat.lat.toFixed(6)));
              setSelectedLng(parseFloat(lngLat.lng.toFixed(6)));
            }
          });
        }
      });
    } catch (err) {
      console.error('Map initialization error:', err);
      setMapError('Erro ao inicializar o mapa.');
      setIsInitializing(false);
    }
  }, [token, initialLat, initialLng]);

  // Initialize map with delay to ensure container has dimensions
  useEffect(() => {
    if (!open || !token || map.current) return;

    const timer = setTimeout(() => {
      initializeMap();
    }, 150);

    return () => clearTimeout(timer);
  }, [open, token, initializeMap]);

  // Update marker when manual input changes
  useEffect(() => {
    if (map.current && mapLoaded && selectedLat && selectedLng) {
      if (marker.current) {
        marker.current.setLngLat([selectedLng, selectedLat]);
      } else {
        marker.current = new mapboxgl.Marker({ color: '#3b82f6', draggable: true })
          .setLngLat([selectedLng, selectedLat])
          .addTo(map.current);
          
        marker.current.on('dragend', () => {
          const lngLat = marker.current?.getLngLat();
          if (lngLat) {
            setSelectedLat(parseFloat(lngLat.lat.toFixed(6)));
            setSelectedLng(parseFloat(lngLat.lng.toFixed(6)));
          }
        });
      }
    }
  }, [selectedLat, selectedLng, mapLoaded]);

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
          {/* Map container always rendered but hidden during loading */}
          <div ref={mapContainer} className="absolute inset-0" />
          
          {/* Loading overlay */}
          {(tokenLoading || isInitializing) && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando mapa...</span>
            </div>
          )}
          
          {/* Error overlay */}
          {(tokenError || mapError) && !tokenLoading && !isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-4 z-10">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-destructive text-center px-4">
                {mapError || 'Erro ao carregar token do mapa'}
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  initAttempt.current = 0;
                  initializeMap();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          )}
          
          {/* Instructions overlay */}
          {mapLoaded && !mapError && (
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
