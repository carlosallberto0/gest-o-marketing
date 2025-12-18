import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuth } from '@/contexts/AuthContext';
import { useMapboxToken, useMapPDVs, useMapOutdoors, useMapKPIs, MapPDV, MapOutdoor } from '@/hooks/useStrategicMapData';
import { MapKPIPanel } from '@/components/map/MapKPIPanel';
import { MapLayerControls } from '@/components/map/MapLayerControls';
import { PDVPopup } from '@/components/map/PDVPopup';
import { OutdoorPopup } from '@/components/map/OutdoorPopup';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Map, RefreshCw } from 'lucide-react';
import { createRoot } from 'react-dom/client';

export default function StrategicMap() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const { data: token, isLoading: tokenLoading, error: tokenError } = useMapboxToken();
  const { data: pdvs, isLoading: pdvsLoading, refetch: refetchPDVs } = useMapPDVs();
  const { data: outdoors, isLoading: outdoorsLoading, refetch: refetchOutdoors } = useMapOutdoors();
  const kpis = useMapKPIs();

  const [showPDVs, setShowPDVs] = useState(true);
  const [showOutdoors, setShowOutdoors] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filter data based on user role
  const filteredPDVs = pdvs?.filter(pdv => {
    if (profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'director') {
      return true;
    }
    if (profile?.role === 'manager' && profile?.pdv_id) {
      return pdv.id === profile.pdv_id;
    }
    return true;
  });

  const filteredOutdoors = outdoors?.filter(outdoor => {
    if (profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'director') {
      return true;
    }
    if (profile?.role === 'manager' && profile?.pdv_id) {
      return outdoor.pdv_id === profile.pdv_id;
    }
    return true;
  });

  const closePopup = useCallback(() => {
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
  }, []);

  const showPDVPopup = useCallback((pdv: MapPDV, lngLat: [number, number]) => {
    closePopup();
    
    const container = document.createElement('div');
    const root = createRoot(container);
    root.render(<PDVPopup pdv={pdv} onClose={closePopup} />);

    popupRef.current = new mapboxgl.Popup({ closeOnClick: true, maxWidth: '320px' })
      .setLngLat(lngLat)
      .setDOMContent(container)
      .addTo(map.current!);
  }, [closePopup]);

  const showOutdoorPopup = useCallback((outdoor: MapOutdoor, lngLat: [number, number]) => {
    closePopup();
    
    const container = document.createElement('div');
    const root = createRoot(container);
    root.render(<OutdoorPopup outdoor={outdoor} onClose={closePopup} />);

    popupRef.current = new mapboxgl.Popup({ closeOnClick: true, maxWidth: '320px' })
      .setLngLat(lngLat)
      .setDOMContent(container)
      .addTo(map.current!);
  }, [closePopup]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !token || map.current) return;

    mapboxgl.accessToken = token;
    
    // Default center (Brazil)
    let center: [number, number] = [-49.0, -15.5];
    let zoom = 4;

    // If manager, center on their PDV
    if (profile?.role === 'manager' && profile?.pdv_id && filteredPDVs?.length) {
      const userPDV = filteredPDVs.find(p => p.id === profile.pdv_id);
      if (userPDV?.lat && userPDV?.lng) {
        center = [userPDV.lng, userPDV.lat];
        zoom = 14;
      }
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center,
      zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    
    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [token, profile, filteredPDVs]);

  // Update markers when data or filters change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add PDV markers
    if (showPDVs && filteredPDVs) {
      filteredPDVs.forEach(pdv => {
        if (pdv.lat && pdv.lng) {
          const isAlert = showAlerts && (pdv.evaluationStatus === 'pending' || pdv.evaluationStatus === 'critical');
          
          const el = document.createElement('div');
          el.className = 'pdv-marker';
          el.style.cssText = `
            width: 24px;
            height: 24px;
            border-radius: 50%;
            cursor: pointer;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ${pdv.evaluationStatus === 'ok' ? 'background-color: #10b981;' : ''}
            ${pdv.evaluationStatus === 'pending' ? 'background-color: #f59e0b;' : ''}
            ${pdv.evaluationStatus === 'critical' ? 'background-color: #ef4444;' : ''}
            ${isAlert ? 'animation: pulse 1.5s infinite;' : ''}
          `;

          el.addEventListener('click', () => {
            showPDVPopup(pdv, [pdv.lng!, pdv.lat!]);
          });

          const marker = new mapboxgl.Marker(el)
            .setLngLat([pdv.lng, pdv.lat])
            .addTo(map.current!);
          
          markersRef.current.push(marker);
        }
      });
    }

    // Add Outdoor markers
    if (showOutdoors && filteredOutdoors) {
      filteredOutdoors.forEach(outdoor => {
        if (outdoor.lat && outdoor.lng) {
          const hasAlert = showAlerts && (
            outdoor.status === 'non_operational' ||
            (outdoor.daysUntilContractEnd !== null && outdoor.daysUntilContractEnd <= 30 && outdoor.daysUntilContractEnd > 0)
          );

          const el = document.createElement('div');
          el.className = 'outdoor-marker';
          el.style.cssText = `
            width: 20px;
            height: 20px;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            ${outdoor.status === 'operational' ? 'background-color: #3b82f6;' : ''}
            ${outdoor.status === 'non_operational' ? 'background-color: #ef4444;' : ''}
            ${outdoor.status === 'pending_evaluation' ? 'background-color: #f59e0b;' : ''}
            ${hasAlert ? 'animation: pulse 1.5s infinite;' : ''}
          `;

          el.addEventListener('click', () => {
            showOutdoorPopup(outdoor, [outdoor.lng!, outdoor.lat!]);
          });

          const marker = new mapboxgl.Marker(el)
            .setLngLat([outdoor.lng, outdoor.lat])
            .addTo(map.current!);
          
          markersRef.current.push(marker);
        }
      });
    }
  }, [mapLoaded, filteredPDVs, filteredOutdoors, showPDVs, showOutdoors, showAlerts, showPDVPopup, showOutdoorPopup]);

  const handleRefresh = () => {
    refetchPDVs();
    refetchOutdoors();
  };

  if (tokenLoading || pdvsLoading || outdoorsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando mapa estratégico...</p>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Map className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Erro ao carregar mapa</h2>
          <p className="text-muted-foreground">Token do Mapbox não configurado.</p>
          <Button onClick={() => navigate('/modules')}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      {/* Add pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
      `}</style>

      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Button
            variant="outline"
            size="icon"
            className="bg-background/95 backdrop-blur-sm shadow-lg"
            onClick={() => navigate('/modules')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg px-4 py-2 shadow-lg">
            <h1 className="font-semibold text-foreground flex items-center gap-2">
              <Map className="h-4 w-4" />
              Mapa Estratégico
            </h1>
          </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="bg-background/95 backdrop-blur-sm shadow-lg pointer-events-auto"
          onClick={handleRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Left Panel - KPIs */}
      <div className="absolute top-20 left-4 w-64 pointer-events-auto">
        <MapKPIPanel kpis={kpis} />
      </div>

      {/* Right Panel - Layer Controls */}
      <div className="absolute top-20 right-4 w-52 pointer-events-auto">
        <MapLayerControls
          showPDVs={showPDVs}
          showOutdoors={showOutdoors}
          showAlerts={showAlerts}
          onTogglePDVs={setShowPDVs}
          onToggleOutdoors={setShowOutdoors}
          onToggleAlerts={setShowAlerts}
        />
      </div>
    </div>
  );
}
