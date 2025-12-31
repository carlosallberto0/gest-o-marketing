import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuth } from '@/contexts/AuthContext';
import { useMapPDVs, useMapOutdoors, useMapKPIs, useMapboxToken, MapPDV, MapOutdoor } from '@/hooks/useStrategicMapData';
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
import { MapLegend } from '@/components/map/MapLegend';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Map, RefreshCw, Upload, Edit, Move, Power } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createRoot, Root } from 'react-dom/client';

// Detail mode threshold - above this zoom, we show individual markers with spiderfy
const DETAIL_MODE_ZOOM = 16;

// Status colors
const STATUS_COLORS = {
  // PDV evaluation status
  ok: '#10b981',       // Green
  pending: '#f59e0b',  // Yellow/amber
  critical: '#ef4444', // Red
  // Outdoor operational status
  operational: '#3b82f6',        // Blue
  non_operational: '#ef4444',    // Red
  pending_evaluation: '#f59e0b', // Yellow/amber
};

// Helper to group outdoors by coordinate and spread overlapping ones
const groupAndSpreadOutdoors = (outdoors: MapOutdoor[], zoom: number) => {
  const groups: { [key: string]: MapOutdoor[] } = {};
  
  outdoors.forEach(outdoor => {
    if (outdoor.lat && outdoor.lng) {
      const key = `${outdoor.lat.toFixed(6)},${outdoor.lng.toFixed(6)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(outdoor);
    }
  });
  
  const spreadRadius = 0.00008 * Math.pow(2, 18 - zoom);
  const result: Array<MapOutdoor & { displayLat: number; displayLng: number }> = [];
  
  Object.values(groups).forEach(group => {
    if (group.length === 1) {
      result.push({
        ...group[0],
        displayLat: group[0].lat!,
        displayLng: group[0].lng!,
      });
    } else {
      group.forEach((outdoor, index) => {
        const angle = (2 * Math.PI * index) / group.length;
        const offsetLat = spreadRadius * Math.cos(angle);
        const offsetLng = spreadRadius * Math.sin(angle);
        
        result.push({
          ...outdoor,
          displayLat: outdoor.lat! + offsetLat,
          displayLng: outdoor.lng! + offsetLng,
        });
      });
    }
  });
  
  return result;
};

export default function StrategicMapMapbox() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const popupRootRef = useRef<Root | null>(null);

  const { data: mapboxToken, isLoading: tokenLoading, error: tokenError } = useMapboxToken();
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

  // Current zoom level for responsive markers
  const [currentZoom, setCurrentZoom] = useState(persistedState.zoom);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Layer visibility
  const [showPDVs, setShowPDVs] = useState(persistedState.layers.showPDVs);
  const [showOutdoors, setShowOutdoors] = useState(persistedState.layers.showOutdoors);
  const [showAlerts, setShowAlerts] = useState(persistedState.layers.showAlerts);

  // Search and filter state
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

  // Selected items for popup
  const [selectedPDV, setSelectedPDV] = useState<MapPDV | null>(null);
  const [selectedOutdoor, setSelectedOutdoor] = useState<MapOutdoor | null>(null);

  // Context menu
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

  // Default center (Brazil)
  const defaultCenter = useMemo(() => {
    if (profile?.role === 'manager' && profile?.pdv_id && pdvs?.length) {
      const userPDV = pdvs.find(p => p.id === profile.pdv_id);
      if (userPDV?.lat && userPDV?.lng) {
        return [userPDV.lng, userPDV.lat] as [number, number];
      }
    }
    return [persistedState.center[0], persistedState.center[1]] as [number, number];
  }, [profile, pdvs, persistedState.center]);

  // Persist filters when they change
  useEffect(() => {
    updateFilters({ searchTerm, selectedState, selectedCity, selectedImportStatus });
  }, [searchTerm, selectedState, selectedCity, selectedImportStatus, updateFilters]);

  // Persist layer visibility
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
      
      if (selectedState !== 'all' && pdv.state !== selectedState) return false;
      if (selectedCity !== 'all' && pdv.city !== selectedCity) return false;
      if (selectedImportStatus !== 'all' && pdv.status_importacao !== selectedImportStatus) return false;
      
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

  // PDVs with valid coordinates
  const pdvsWithCoords = useMemo(() => 
    filteredPDVs.filter(pdv => pdv.lat && pdv.lng),
  [filteredPDVs]);

  // Outdoors with valid coordinates
  const outdoorsWithCoords = useMemo(() => 
    filteredOutdoors.filter(outdoor => outdoor.lat && outdoor.lng),
  [filteredOutdoors]);

  // Check if we're in detail mode (high zoom)
  const isDetailMode = currentZoom >= DETAIL_MODE_ZOOM;

  // Spread overlapping outdoors in detail mode
  const spreadOutdoors = useMemo(() => {
    if (!isDetailMode) return outdoorsWithCoords.map(o => ({ ...o, displayLat: o.lat!, displayLng: o.lng! }));
    return groupAndSpreadOutdoors(outdoorsWithCoords, currentZoom);
  }, [outdoorsWithCoords, currentZoom, isDetailMode]);

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

  const handleRefresh = useCallback(() => {
    refetchPDVs();
    refetchOutdoors();
    toast.success('Dados atualizados');
  }, [refetchPDVs, refetchOutdoors]);

  const handleImportSuccess = useCallback(() => {
    refetchPDVs();
    refetchOutdoors();
  }, [refetchPDVs, refetchOutdoors]);

  // Close context menu on click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu?.show) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu?.show]);

  // Context menu items
  const contextMenuItems = useMemo(() => {
    if (!contextMenu) return [];
    
    if (contextMenu.type === 'empty' && contextMenu.position) {
      return [
        {
          label: 'Adicionar PDV aqui',
          icon: <Map className="h-4 w-4" />,
          onClick: () => {
            setQuickPDVDialog({ 
              open: true, 
              lat: contextMenu.position!.lat, 
              lng: contextMenu.position!.lng 
            });
            setContextMenu(null);
          },
        },
      ];
    }
    
    if (contextMenu.type === 'pdv' && contextMenu.item) {
      const pdv = contextMenu.item as MapPDV;
      return [
        {
          label: 'Ver detalhes',
          icon: <Map className="h-4 w-4" />,
          onClick: () => {
            navigate(`/pdv/${pdv.id}`);
            setContextMenu(null);
          },
        },
        {
          label: pdv.status === 'active' ? 'Desativar PDV' : 'Ativar PDV',
          icon: <Power className="h-4 w-4" />,
          onClick: () => {
            handleTogglePDVStatus(pdv);
            setContextMenu(null);
          },
        },
      ];
    }
    
    if (contextMenu.type === 'outdoor' && contextMenu.item) {
      const outdoor = contextMenu.item as MapOutdoor;
      return [
        {
          label: 'Ver detalhes',
          icon: <Map className="h-4 w-4" />,
          onClick: () => {
            navigate(`/outdoor/${outdoor.id}`);
            setContextMenu(null);
          },
        },
      ];
    }
    
    return [];
  }, [contextMenu, navigate, handleTogglePDVStatus]);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken || mapRef.current) return;

    mapboxgl.accessToken = mapboxToken;
    
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: defaultCenter,
      zoom: persistedState.zoom,
      pitch: 0,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      setMapLoaded(true);
    });

    map.on('moveend', () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      updateCenter([center.lng, center.lat]);
      updateZoom(zoom);
      setCurrentZoom(zoom);
    });

    map.on('contextmenu', (e) => {
      if (!isSuperAdmin) return;
      setContextMenu({
        show: true,
        x: e.point.x,
        y: e.point.y,
        type: 'empty',
        position: { lat: e.lngLat.lat, lng: e.lngLat.lng },
      });
    });

    map.on('click', () => {
      setSelectedPDV(null);
      setSelectedOutdoor(null);
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken, defaultCenter, persistedState.zoom, isSuperAdmin, updateCenter, updateZoom]);

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const map = mapRef.current;

    // Add PDV markers
    if (showPDVs) {
      pdvsWithCoords.forEach(pdv => {
        const color = STATUS_COLORS[pdv.evaluationStatus] || STATUS_COLORS.ok;
        
        // Create marker element
        const el = document.createElement('div');
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = color;
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';

        const marker = new mapboxgl.Marker({
          element: el,
          draggable: adminMode && isSuperAdmin,
        })
          .setLngLat([pdv.lng!, pdv.lat!])
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedOutdoor(null);
          setSelectedPDV(pdv);

          // Create popup
          if (popupRef.current) popupRef.current.remove();
          
          const popupContainer = document.createElement('div');
          const popup = new mapboxgl.Popup({ offset: 25, closeButton: true, maxWidth: '320px' })
            .setLngLat([pdv.lng!, pdv.lat!])
            .setDOMContent(popupContainer)
            .addTo(map);

          popup.on('close', () => {
            setSelectedPDV(null);
            if (popupRootRef.current) {
              popupRootRef.current.unmount();
              popupRootRef.current = null;
            }
          });

          popupRef.current = popup;
          
          // Render React component into popup
          const root = createRoot(popupContainer);
          popupRootRef.current = root;
          root.render(
            <PDVPopup 
              pdv={pdv} 
              onClose={() => {
                popup.remove();
                setSelectedPDV(null);
              }} 
              onNavigate={navigate} 
            />
          );
        });

        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isSuperAdmin) {
            setContextMenu({
              show: true,
              x: e.clientX,
              y: e.clientY,
              type: 'pdv',
              item: pdv,
            });
          }
        });

        if (adminMode && isSuperAdmin) {
          marker.on('dragend', () => {
            const lngLat = marker.getLngLat();
            handlePDVCoordinateUpdate(pdv.id, lngLat.lat, lngLat.lng);
          });
        }

        markersRef.current.push(marker);
      });
    }

    // Add Outdoor markers
    if (showOutdoors) {
      spreadOutdoors.forEach(outdoor => {
        const color = STATUS_COLORS[outdoor.status] || STATUS_COLORS.pending_evaluation;
        
        // Create marker element
        const el = document.createElement('div');
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = color;
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';

        const marker = new mapboxgl.Marker({
          element: el,
        })
          .setLngLat([outdoor.displayLng, outdoor.displayLat])
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedPDV(null);
          setSelectedOutdoor(outdoor);

          // Create popup
          if (popupRef.current) popupRef.current.remove();
          
          const popupContainer = document.createElement('div');
          const popup = new mapboxgl.Popup({ offset: 25, closeButton: true, maxWidth: '320px' })
            .setLngLat([outdoor.displayLng, outdoor.displayLat])
            .setDOMContent(popupContainer)
            .addTo(map);

          popup.on('close', () => {
            setSelectedOutdoor(null);
            if (popupRootRef.current) {
              popupRootRef.current.unmount();
              popupRootRef.current = null;
            }
          });

          popupRef.current = popup;
          
          // Render React component into popup
          const root = createRoot(popupContainer);
          popupRootRef.current = root;
          root.render(
            <OutdoorPopup 
              outdoor={outdoor} 
              onClose={() => {
                popup.remove();
                setSelectedOutdoor(null);
              }} 
              onNavigate={navigate} 
            />
          );
        });

        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isSuperAdmin) {
            setContextMenu({
              show: true,
              x: e.clientX,
              y: e.clientY,
              type: 'outdoor',
              item: outdoor,
            });
          }
        });

        markersRef.current.push(marker);
      });
    }
  }, [mapLoaded, pdvsWithCoords, spreadOutdoors, showPDVs, showOutdoors, adminMode, isSuperAdmin, navigate, handlePDVCoordinateUpdate]);

  // Loading state
  if (tokenLoading || pdvsLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando mapa...</span>
      </div>
    );
  }

  // Error state
  if (tokenError) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-destructive">Erro ao carregar o mapa</p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Full-screen Map */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Floating Header - Row 1: Navigation + Refresh */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-border pointer-events-auto">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/modules')} title="Voltar aos Módulos">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Map className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-sm">Mapa Estratégico</h1>
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Admin Bar - Row 2: Below header, only for super_admin */}
      {isSuperAdmin && (
        <div className="absolute top-[72px] left-4 z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-lg border border-border pointer-events-auto">
            <Button
              variant={adminMode ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setAdminMode(!adminMode)}
            >
              <Move className="h-3.5 w-3.5 mr-1.5" />
              {adminMode ? 'Admin ON' : 'Modo Admin'}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowBulkEditDialog(true)}>
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Lote
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Importar
            </Button>
          </div>
        </div>
      )}

      {/* Left Panel: Filters + KPIs */}
      <div className="absolute top-20 left-4 z-10 w-56 space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto" style={{ top: isSuperAdmin ? '112px' : '80px' }}>
        <MapSearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedState={selectedState}
          onStateChange={setSelectedState}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          selectedImportStatus={selectedImportStatus}
          onImportStatusChange={setSelectedImportStatus}
          pdvs={roleFilteredPDVs}
        />
        <MapKPIPanel kpis={kpis} />
      </div>

      {/* Right Panel: Layer Controls - positioned lower to avoid Mapbox controls */}
      <div className="absolute top-36 right-4 z-10 w-52">
        <MapLayerControls
          showPDVs={showPDVs}
          showOutdoors={showOutdoors}
          showAlerts={showAlerts}
          onTogglePDVs={() => setShowPDVs(!showPDVs)}
          onToggleOutdoors={() => setShowOutdoors(!showOutdoors)}
          onToggleAlerts={() => setShowAlerts(!showAlerts)}
        />
      </div>

      {/* Bottom Left: Legend + Counter Badge inline */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
        <MapLegend />
        <div className="bg-background/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg border border-border text-sm font-medium">
          <span className="text-primary">{filteredPDVs.length}</span>
          <span className="text-muted-foreground"> PDVs</span>
          <span className="mx-2 text-muted-foreground">•</span>
          <span className="text-primary">{filteredOutdoors.length}</span>
          <span className="text-muted-foreground"> Outdoors</span>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu?.show && (
        <InlineContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Dialogs */}
      <BulkImportDialog 
        open={showImportDialog} 
        onOpenChange={setShowImportDialog}
        onSuccess={handleImportSuccess}
      />
      
      <BulkEditDialog
        open={showBulkEditDialog}
        onOpenChange={setShowBulkEditDialog}
        pdvs={filteredPDVs}
        onSuccess={handleImportSuccess}
      />

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
