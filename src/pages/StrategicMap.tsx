import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuth } from '@/contexts/AuthContext';
import { useMapboxToken, useMapPDVs, useMapOutdoors, useMapKPIs, MapPDV, MapOutdoor } from '@/hooks/useStrategicMapData';
import { MapKPIPanel } from '@/components/map/MapKPIPanel';
import { MapLayerControls } from '@/components/map/MapLayerControls';
import { MapSearchFilters } from '@/components/map/MapSearchFilters';
import { PDVPopup } from '@/components/map/PDVPopup';
import { OutdoorPopup } from '@/components/map/OutdoorPopup';
import { BulkImportDialog } from '@/components/map/BulkImportDialog';
import { BulkEditDialog } from '@/components/map/BulkEditDialog';
import { QuickPDVDialog } from '@/components/map/QuickPDVDialog';
import { InlineContextMenu } from '@/components/map/MapContextMenu';
import { useMapPersistence } from '@/hooks/useMapPersistence';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Map, RefreshCw, Upload, Edit, Move, Power } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Cluster colors by point count
const CLUSTER_COLORS = {
  small: '#51bbd6',  // < 10
  medium: '#f1f075', // 10-50
  large: '#f28cb1',  // > 50
};

export default function StrategicMap() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const pdvMarkersRef = useRef<globalThis.Map<string, mapboxgl.Marker>>(new globalThis.Map());

  const { data: token, isLoading: tokenLoading, error: tokenError } = useMapboxToken();
  const { data: pdvs, isLoading: pdvsLoading, refetch: refetchPDVs } = useMapPDVs();
  const { data: outdoors, isLoading: outdoorsLoading, refetch: refetchOutdoors } = useMapOutdoors();
  const kpis = useMapKPIs();

  // Map persistence hook
  const { 
    state: persistedState, 
    updateCenter, 
    updateZoom, 
    updateFilters, 
    updateLayers 
  } = useMapPersistence();

  // Initialize state from persisted values
  const [showPDVs, setShowPDVs] = useState(persistedState.layers.showPDVs);
  const [showOutdoors, setShowOutdoors] = useState(persistedState.layers.showOutdoors);
  const [showAlerts, setShowAlerts] = useState(persistedState.layers.showAlerts);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Search and filter state - initialized from persistence
  const [searchTerm, setSearchTerm] = useState(persistedState.filters.searchTerm);
  const [selectedState, setSelectedState] = useState(persistedState.filters.selectedState);
  const [selectedCity, setSelectedCity] = useState(persistedState.filters.selectedCity);
  const [selectedImportStatus, setSelectedImportStatus] = useState(persistedState.filters.selectedImportStatus);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);

  // Admin mode state
  const [adminMode, setAdminMode] = useState(false);
  const [quickPDVDialog, setQuickPDVDialog] = useState<{ open: boolean; lat: number; lng: number }>({ 
    open: false, lat: 0, lng: 0 
  });
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    type: 'pdv' | 'outdoor' | 'empty';
    item?: MapPDV | MapOutdoor;
    position?: { lat: number; lng: number };
  } | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

  // Persist filters when they change
  useEffect(() => {
    updateFilters({ searchTerm, selectedState, selectedCity, selectedImportStatus });
  }, [searchTerm, selectedState, selectedCity, selectedImportStatus, updateFilters]);

  // Persist layer visibility when they change
  useEffect(() => {
    updateLayers({ showPDVs, showOutdoors, showAlerts });
  }, [showPDVs, showOutdoors, showAlerts, updateLayers]);

  // Filter data based on user role
  const roleFilteredPDVs = useMemo(() => {
    return pdvs?.filter(pdv => {
      if (profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'director') {
        return true;
      }
      if (profile?.role === 'manager' && profile?.pdv_id) {
        return pdv.id === profile.pdv_id;
      }
      return true;
    }) || [];
  }, [pdvs, profile]);

  // Apply search and location filters
  const filteredPDVs = useMemo(() => {
    return roleFilteredPDVs.filter(pdv => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          pdv.name.toLowerCase().includes(search) ||
          pdv.code.toLowerCase().includes(search) ||
          pdv.address.toLowerCase().includes(search) ||
          pdv.city.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      
      if (selectedState !== 'all' && pdv.state !== selectedState) {
        return false;
      }
      
      if (selectedCity !== 'all' && pdv.city !== selectedCity) {
        return false;
      }

      if (selectedImportStatus !== 'all') {
        if (pdv.status_importacao !== selectedImportStatus) {
          return false;
        }
      }
      
      return true;
    });
  }, [roleFilteredPDVs, searchTerm, selectedState, selectedCity, selectedImportStatus]);

  const filteredOutdoors = useMemo(() => {
    const roleFiltered = outdoors?.filter(outdoor => {
      if (profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'director') {
        return true;
      }
      if (profile?.role === 'manager' && profile?.pdv_id) {
        return outdoor.pdv_id === profile.pdv_id;
      }
      return true;
    }) || [];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return roleFiltered.filter(outdoor =>
        outdoor.code.toLowerCase().includes(search) ||
        outdoor.location.toLowerCase().includes(search) ||
        outdoor.pdvName.toLowerCase().includes(search)
      );
    }

    const pdvIds = new Set(filteredPDVs.map(p => p.id));
    return roleFiltered.filter(o => pdvIds.has(o.pdv_id));
  }, [outdoors, profile, searchTerm, filteredPDVs]);

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
    root.render(<PDVPopup pdv={pdv} onClose={closePopup} onNavigate={navigate} />);

    popupRef.current = new mapboxgl.Popup({ closeOnClick: true, maxWidth: '320px' })
      .setLngLat(lngLat)
      .setDOMContent(container)
      .addTo(map.current!);
  }, [closePopup, navigate]);

  const showOutdoorPopup = useCallback((outdoor: MapOutdoor, lngLat: [number, number]) => {
    closePopup();
    
    const container = document.createElement('div');
    const root = createRoot(container);
    root.render(<OutdoorPopup outdoor={outdoor} onClose={closePopup} onNavigate={navigate} />);

    popupRef.current = new mapboxgl.Popup({ closeOnClick: true, maxWidth: '320px' })
      .setLngLat(lngLat)
      .setDOMContent(container)
      .addTo(map.current!);
  }, [closePopup, navigate]);

  // Handle PDV coordinate update (drag end in admin mode)
  const handlePDVCoordinateUpdate = useCallback(async (pdvId: string, lat: number, lng: number) => {
    try {
      const { error } = await supabase
        .from('pdvs')
        .update({ lat, lng })
        .eq('id', pdvId);

      if (error) throw error;
      toast.success('Coordenadas atualizadas!');
      refetchPDVs();
    } catch (error) {
      console.error('Error updating coordinates:', error);
      toast.error('Erro ao atualizar coordenadas');
    }
  }, [refetchPDVs]);

  // Handle PDV status toggle
  const handleTogglePDVStatus = useCallback(async (pdv: MapPDV) => {
    try {
      const newStatus = pdv.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('pdvs')
        .update({ status: newStatus })
        .eq('id', pdv.id);

      if (error) throw error;
      toast.success(`PDV ${newStatus === 'active' ? 'ativado' : 'inativado'}!`);
      refetchPDVs();
    } catch (error) {
      console.error('Error toggling PDV status:', error);
      toast.error('Erro ao alterar status');
    }
  }, [refetchPDVs]);

  // Create GeoJSON for PDVs
  const pdvGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: filteredPDVs
      .filter(pdv => pdv.lat && pdv.lng)
      .map(pdv => ({
        type: 'Feature' as const,
        properties: {
          id: pdv.id,
          name: pdv.name,
          code: pdv.code,
          status: pdv.evaluationStatus,
          isAlert: pdv.evaluationStatus === 'pending' || pdv.evaluationStatus === 'critical',
          isPreRegistered: pdv.status_importacao === 'pre_cadastrado',
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [pdv.lng!, pdv.lat!],
        },
      })),
  }), [filteredPDVs]);

  // Create GeoJSON for Outdoors
  const outdoorGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: filteredOutdoors
      .filter(outdoor => outdoor.lat && outdoor.lng)
      .map(outdoor => ({
        type: 'Feature' as const,
        properties: {
          id: outdoor.id,
          code: outdoor.code,
          status: outdoor.status,
          hasAlert: outdoor.status === 'non_operational' ||
            (outdoor.daysUntilContractEnd !== null && outdoor.daysUntilContractEnd <= 30 && outdoor.daysUntilContractEnd > 0),
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [outdoor.lng!, outdoor.lat!],
        },
      })),
  }), [filteredOutdoors]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !token || map.current) return;

    mapboxgl.accessToken = token;
    
    // Use persisted center and zoom, or defaults
    let center: [number, number] = persistedState.center;
    let zoom = persistedState.zoom;

    // If manager, center on their PDV (override persisted)
    if (profile?.role === 'manager' && profile?.pdv_id && roleFilteredPDVs?.length) {
      const userPDV = roleFilteredPDVs.find(p => p.id === profile.pdv_id);
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

    // Persist map position on move end
    map.current.on('moveend', () => {
      if (map.current) {
        const center = map.current.getCenter();
        const zoom = map.current.getZoom();
        updateCenter([center.lng, center.lat]);
        updateZoom(zoom);
      }
    });

    // Right-click handler for context menu (Super Admin only)
    map.current.on('contextmenu', (e) => {
      if (!isSuperAdmin) return;
      
      e.preventDefault();
      
      // Check if clicked on a PDV or outdoor marker
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: ['pdv-unclustered', 'outdoor-markers']
      });

      if (features.length > 0) {
        const feature = features[0];
        const isOutdoor = feature.layer?.id === 'outdoor-markers';
        
        if (isOutdoor) {
          const outdoor = filteredOutdoors.find(o => o.id === feature.properties?.id);
          if (outdoor) {
            setContextMenu({
              show: true,
              x: e.point.x,
              y: e.point.y,
              type: 'outdoor',
              item: outdoor,
            });
          }
        } else {
          const pdv = filteredPDVs.find(p => p.id === feature.properties?.id);
          if (pdv) {
            setContextMenu({
              show: true,
              x: e.point.x,
              y: e.point.y,
              type: 'pdv',
              item: pdv,
            });
          }
        }
      } else {
        // Clicked on empty space
        setContextMenu({
          show: true,
          x: e.point.x,
          y: e.point.y,
          type: 'empty',
          position: { lat: e.lngLat.lat, lng: e.lngLat.lng },
        });
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [token, profile, roleFilteredPDVs, persistedState.center, persistedState.zoom, updateCenter, updateZoom, isSuperAdmin, filteredPDVs, filteredOutdoors]);

  // Setup clustering layers
  useEffect(() => {
    if (!map.current || !mapLoaded || !map.current.isStyleLoaded()) return;

    // Remove existing layers and sources
    ['pdv-clusters', 'pdv-cluster-count', 'pdv-unclustered', 'outdoor-markers'].forEach(layer => {
      if (map.current?.getLayer(layer)) {
        map.current.removeLayer(layer);
      }
    });
    ['pdvs', 'outdoors'].forEach(source => {
      if (map.current?.getSource(source)) {
        map.current.removeSource(source);
      }
    });

    // Clear draggable markers
    pdvMarkersRef.current.forEach(marker => marker.remove());
    pdvMarkersRef.current.clear();

    if (showPDVs && pdvGeoJSON.features.length > 0) {
      if (adminMode && isSuperAdmin) {
        // In admin mode, use draggable markers instead of layers
        filteredPDVs.filter(pdv => pdv.lat && pdv.lng).forEach(pdv => {
          const el = document.createElement('div');
          el.className = 'admin-marker';
          el.style.cssText = `
            width: 24px;
            height: 24px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            cursor: move;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          `;

          const marker = new mapboxgl.Marker({ element: el, draggable: true })
            .setLngLat([pdv.lng!, pdv.lat!])
            .addTo(map.current!);

          marker.on('dragend', () => {
            const lngLat = marker.getLngLat();
            handlePDVCoordinateUpdate(pdv.id, lngLat.lat, lngLat.lng);
          });

          pdvMarkersRef.current.set(pdv.id, marker);
        });
      } else {
        // Normal mode - use layers
        map.current.addSource('pdvs', {
          type: 'geojson',
          data: pdvGeoJSON,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        map.current.addLayer({
          id: 'pdv-clusters',
          type: 'circle',
          source: 'pdvs',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              CLUSTER_COLORS.small,
              10,
              CLUSTER_COLORS.medium,
              50,
              CLUSTER_COLORS.large,
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              10,
              25,
              50,
              35,
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        });

        map.current.addLayer({
          id: 'pdv-cluster-count',
          type: 'symbol',
          source: 'pdvs',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12,
          },
          paint: {
            'text-color': '#333',
          },
        });

        map.current.addLayer({
          id: 'pdv-unclustered',
          type: 'circle',
          source: 'pdvs',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': [
              'case',
              ['get', 'isPreRegistered'],
              '#9ca3af',
              [
                'match',
                ['get', 'status'],
                'ok', '#10b981',
                'pending', '#f59e0b',
                'critical', '#ef4444',
                '#888',
              ],
            ],
            'circle-radius': 10,
            'circle-stroke-width': [
              'case',
              ['get', 'isPreRegistered'],
              3,
              2,
            ],
            'circle-stroke-color': [
              'case',
              ['get', 'isPreRegistered'],
              '#6b7280',
              '#fff',
            ],
          },
        });

        map.current.on('click', 'pdv-clusters', (e) => {
          const features = map.current!.queryRenderedFeatures(e.point, { layers: ['pdv-clusters'] });
          const clusterId = features[0].properties?.cluster_id;
          const source = map.current!.getSource('pdvs') as mapboxgl.GeoJSONSource;
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.current!.easeTo({
              center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: zoom!,
            });
          });
        });

        map.current.on('click', 'pdv-unclustered', (e) => {
          const feature = e.features?.[0];
          if (feature) {
            const pdv = filteredPDVs.find(p => p.id === feature.properties?.id);
            if (pdv && pdv.lat && pdv.lng) {
              showPDVPopup(pdv, [pdv.lng, pdv.lat]);
            }
          }
        });

        map.current.on('mouseenter', 'pdv-clusters', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'pdv-clusters', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
        map.current.on('mouseenter', 'pdv-unclustered', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'pdv-unclustered', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
      }
    }

    if (showOutdoors && outdoorGeoJSON.features.length > 0) {
      map.current.addSource('outdoors', {
        type: 'geojson',
        data: outdoorGeoJSON,
      });

      map.current.addLayer({
        id: 'outdoor-markers',
        type: 'circle',
        source: 'outdoors',
        paint: {
          'circle-color': [
            'match',
            ['get', 'status'],
            'operational', '#3b82f6',
            'non_operational', '#ef4444',
            'pending_evaluation', '#f59e0b',
            '#888',
          ],
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      map.current.on('click', 'outdoor-markers', (e) => {
        const feature = e.features?.[0];
        if (feature) {
          const outdoor = filteredOutdoors.find(o => o.id === feature.properties?.id);
          if (outdoor && outdoor.lat && outdoor.lng) {
            showOutdoorPopup(outdoor, [outdoor.lng, outdoor.lat]);
          }
        }
      });

      map.current.on('mouseenter', 'outdoor-markers', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'outdoor-markers', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    }
  }, [mapLoaded, pdvGeoJSON, outdoorGeoJSON, showPDVs, showOutdoors, showAlerts, filteredPDVs, filteredOutdoors, showPDVPopup, showOutdoorPopup, adminMode, isSuperAdmin, handlePDVCoordinateUpdate]);

  // Update source data when filters change
  useEffect(() => {
    if (!map.current || !mapLoaded || adminMode) return;

    const pdvSource = map.current.getSource('pdvs') as mapboxgl.GeoJSONSource;
    if (pdvSource) {
      pdvSource.setData(pdvGeoJSON);
    }

    const outdoorSource = map.current.getSource('outdoors') as mapboxgl.GeoJSONSource;
    if (outdoorSource) {
      outdoorSource.setData(outdoorGeoJSON);
    }
  }, [pdvGeoJSON, outdoorGeoJSON, mapLoaded, adminMode]);

  // Fly to filtered location when filters change
  useEffect(() => {
    if (!map.current || !mapLoaded || filteredPDVs.length === 0) return;

    const pdvsWithCoords = filteredPDVs.filter(p => p.lat && p.lng);
    if (pdvsWithCoords.length === 0) return;

    if (pdvsWithCoords.length === 1) {
      map.current.flyTo({
        center: [pdvsWithCoords[0].lng!, pdvsWithCoords[0].lat!],
        zoom: 12,
      });
    } else {
      const bounds = new mapboxgl.LngLatBounds();
      pdvsWithCoords.forEach(pdv => {
        bounds.extend([pdv.lng!, pdv.lat!]);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [selectedState, selectedCity, mapLoaded]);

  const handleRefresh = () => {
    refetchPDVs();
    refetchOutdoors();
  };

  const handleImportSuccess = () => {
    refetchPDVs();
    refetchOutdoors();
  };

  // Context menu action handlers
  const getContextMenuItems = () => {
    if (!contextMenu) return [];

    if (contextMenu.type === 'pdv') {
      const pdv = contextMenu.item as MapPDV;
      return [
        {
          label: 'Editar Posto',
          icon: <Edit className="h-4 w-4" />,
          onClick: () => navigate(`/pdv/${pdv.id}`),
        },
        {
          label: pdv.status === 'active' ? 'Inativar' : 'Ativar',
          icon: <Power className="h-4 w-4" />,
          onClick: () => handleTogglePDVStatus(pdv),
          destructive: pdv.status === 'active',
        },
      ];
    }

    if (contextMenu.type === 'outdoor') {
      const outdoor = contextMenu.item as MapOutdoor;
      return [
        {
          label: 'Ver Outdoor',
          icon: <Edit className="h-4 w-4" />,
          onClick: () => navigate(`/outdoor/${outdoor.id}`),
        },
      ];
    }

    if (contextMenu.type === 'empty' && contextMenu.position) {
      return [
        {
          label: 'Adicionar Novo Posto Aqui',
          icon: <Map className="h-4 w-4" />,
          onClick: () => {
            setQuickPDVDialog({
              open: true,
              lat: contextMenu.position!.lat,
              lng: contextMenu.position!.lng,
            });
          },
        },
      ];
    }

    return [];
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

        <div className="flex items-center gap-2 pointer-events-auto">
          {isSuperAdmin && (
            <Button
              variant={adminMode ? "default" : "outline"}
              className={`shadow-lg ${adminMode ? '' : 'bg-background/95 backdrop-blur-sm'}`}
              onClick={() => setAdminMode(!adminMode)}
            >
              <Move className="h-4 w-4 mr-2" />
              {adminMode ? 'Sair do Modo Admin' : 'Modo Administração'}
            </Button>
          )}
          {isAdmin && (
            <>
              <Button
                variant="outline"
                className="bg-background/95 backdrop-blur-sm shadow-lg"
                onClick={() => setShowBulkEditDialog(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar em Lote
              </Button>
              <Button
                variant="outline"
                className="bg-background/95 backdrop-blur-sm shadow-lg"
                onClick={() => setShowImportDialog(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="icon"
            className="bg-background/95 backdrop-blur-sm shadow-lg"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Admin Mode Indicator */}
      {adminMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 pointer-events-none">
          <Move className="h-4 w-4" />
          <span className="text-sm font-medium">Modo Administração - Arraste os marcadores para ajustar coordenadas</span>
        </div>
      )}

      {/* Left Panel - KPIs and Search */}
      <div className="absolute top-20 left-4 w-64 space-y-3 pointer-events-auto">
        <MapSearchFilters
          pdvs={roleFilteredPDVs}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedState={selectedState}
          onStateChange={setSelectedState}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          selectedImportStatus={selectedImportStatus}
          onImportStatusChange={setSelectedImportStatus}
        />
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

      {/* Results count */}
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-lg pointer-events-auto">
        <p className="text-xs text-muted-foreground">
          {filteredPDVs.filter(p => p.lat && p.lng).length} PDVs • {filteredOutdoors.filter(o => o.lat && o.lng).length} Outdoors
        </p>
      </div>

      {/* Context Menu */}
      {contextMenu?.show && (
        <InlineContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={getContextMenuItems()}
        />
      )}

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onSuccess={handleImportSuccess}
      />

      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        open={showBulkEditDialog}
        onOpenChange={setShowBulkEditDialog}
        pdvs={roleFilteredPDVs}
        onSuccess={handleImportSuccess}
      />

      {/* Quick PDV Dialog */}
      <QuickPDVDialog
        open={quickPDVDialog.open}
        onOpenChange={(open) => setQuickPDVDialog({ ...quickPDVDialog, open })}
        initialLat={quickPDVDialog.lat}
        initialLng={quickPDVDialog.lng}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
