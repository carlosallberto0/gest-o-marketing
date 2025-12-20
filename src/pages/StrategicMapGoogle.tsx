import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleMapsProvider, useGoogleMaps } from '@/contexts/GoogleMapsContext';
import { useMapPDVs, useMapOutdoors, useMapKPIs, MapPDV, MapOutdoor } from '@/hooks/useStrategicMapData';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const mapStyles = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const clusterOptions = {
  imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
  minimumClusterSize: 3,
  maxZoom: 14,
};

// Marker icons
const getMarkerIcon = (type: 'posto' | 'conveniencia' | 'both' | 'outdoor', status?: string) => {
  const baseUrl = 'data:image/svg+xml;charset=UTF-8,';
  
  if (type === 'outdoor') {
    const color = status === 'operational' ? '%2322c55e' : status === 'non_operational' ? '%23ef4444' : '%23f59e0b';
    return baseUrl + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="12" rx="2"/>
        <line x1="12" y1="15" x2="12" y2="21"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
      </svg>
    `);
  }
  
  // PDV markers
  const isPosto = type === 'posto' || type === 'both';
  const statusColor = status === 'critical' ? '%23ef4444' : status === 'pending' ? '%23f59e0b' : '%233b82f6';
  
  if (isPosto) {
    return baseUrl + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 24 24" fill="${statusColor}" stroke="white" stroke-width="1.5">
        <path d="M3 22V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14"/>
        <path d="M6 10h6"/>
        <path d="M6 14h6"/>
        <path d="M15 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 4"/>
      </svg>
    `);
  } else {
    return baseUrl + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 24 24" fill="${statusColor}" stroke="white" stroke-width="1.5">
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
        <path d="M2 7h20"/>
        <path d="M22 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"/>
      </svg>
    `);
  }
};

function StrategicMapContent() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded, loadError } = useGoogleMaps();

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

  // InfoWindow state
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
        return { lat: userPDV.lat, lng: userPDV.lng };
      }
    }
    return { lat: persistedState.center[1], lng: persistedState.center[0] };
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

  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Handle map idle (after pan/zoom)
  const onMapIdle = useCallback(() => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      const zoom = mapRef.current.getZoom();
      if (center && zoom) {
        updateCenter([center.lng(), center.lat()]);
        updateZoom(zoom);
      }
    }
  }, [updateCenter, updateZoom]);

  // Handle right click for context menu
  const onMapRightClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!isSuperAdmin || !e.latLng) return;
    
    const mouseEvent = e.domEvent as MouseEvent | undefined;
    setContextMenu({
      show: true,
      x: mouseEvent?.clientX || 0,
      y: mouseEvent?.clientY || 0,
      type: 'empty',
      position: { lat: e.latLng.lat(), lng: e.latLng.lng() },
    });
  }, [isSuperAdmin]);

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

  // Close context menu
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

  // Loading state
  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando mapa...</span>
      </div>
    );
  }

  // Error state
  if (loadError) {
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
      <div className="absolute inset-0">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={defaultCenter}
          zoom={persistedState.zoom}
          onLoad={onMapLoad}
          onIdle={onMapIdle}
          onRightClick={onMapRightClick}
          onClick={() => {
            setSelectedPDV(null);
            setSelectedOutdoor(null);
          }}
          options={{
            styles: mapStyles,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            mapTypeControlOptions: {
              position: google.maps.ControlPosition.TOP_RIGHT,
            },
          }}
        >
          {/* PDV Markers with Clustering */}
          {showPDVs && pdvsWithCoords.length > 0 && (
            <MarkerClusterer options={clusterOptions}>
              {(clusterer) => (
                <>
                  {pdvsWithCoords.map(pdv => (
                    <Marker
                      key={pdv.id}
                      position={{ lat: pdv.lat!, lng: pdv.lng! }}
                      clusterer={clusterer}
                      icon={{
                        url: getMarkerIcon(
                          (pdv as any).type || 'posto',
                          pdv.evaluationStatus
                        ),
                        scaledSize: new google.maps.Size(32, 40),
                        anchor: new google.maps.Point(16, 40),
                      }}
                      draggable={adminMode && isSuperAdmin}
                      onClick={() => {
                        setSelectedOutdoor(null);
                        setSelectedPDV(pdv);
                      }}
                      onRightClick={(e) => {
                        if (isSuperAdmin) {
                          const mouseEvent = e.domEvent as MouseEvent | undefined;
                          setContextMenu({
                            show: true,
                            x: mouseEvent?.clientX || 0,
                            y: mouseEvent?.clientY || 0,
                            type: 'pdv',
                            item: pdv,
                          });
                        }
                      }}
                      onDragEnd={(e) => {
                        if (e.latLng && adminMode) {
                          handlePDVCoordinateUpdate(pdv.id, e.latLng.lat(), e.latLng.lng());
                        }
                      }}
                    />
                  ))}
                </>
              )}
            </MarkerClusterer>
          )}

          {/* Outdoor Markers */}
          {showOutdoors && outdoorsWithCoords.map(outdoor => (
            <Marker
              key={outdoor.id}
              position={{ lat: outdoor.lat!, lng: outdoor.lng! }}
              icon={{
                url: getMarkerIcon('outdoor', outdoor.status),
                scaledSize: new google.maps.Size(28, 28),
                anchor: new google.maps.Point(14, 14),
              }}
              onClick={() => {
                setSelectedPDV(null);
                setSelectedOutdoor(outdoor);
              }}
              onRightClick={(e) => {
                if (isSuperAdmin) {
                  const mouseEvent = e.domEvent as MouseEvent | undefined;
                  setContextMenu({
                    show: true,
                    x: mouseEvent?.clientX || 0,
                    y: mouseEvent?.clientY || 0,
                    type: 'outdoor',
                    item: outdoor,
                  });
                }
              }}
            />
          ))}

          {/* PDV InfoWindow */}
          {selectedPDV && selectedPDV.lat && selectedPDV.lng && (
            <InfoWindow
              position={{ lat: selectedPDV.lat, lng: selectedPDV.lng }}
              onCloseClick={() => setSelectedPDV(null)}
            >
              <PDVPopup 
                pdv={selectedPDV} 
                onClose={() => setSelectedPDV(null)} 
                onNavigate={navigate} 
              />
            </InfoWindow>
          )}

          {/* Outdoor InfoWindow */}
          {selectedOutdoor && selectedOutdoor.lat && selectedOutdoor.lng && (
            <InfoWindow
              position={{ lat: selectedOutdoor.lat, lng: selectedOutdoor.lng }}
              onCloseClick={() => setSelectedOutdoor(null)}
            >
              <OutdoorPopup 
                outdoor={selectedOutdoor} 
                onClose={() => setSelectedOutdoor(null)} 
                onNavigate={navigate} 
              />
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* Floating Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-border pointer-events-auto">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Map className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-sm">Mapa Estratégico</h1>
        </div>
        
        {/* Right: Admin Buttons */}
        <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-border pointer-events-auto">
          {isSuperAdmin && (
            <>
              <Button
                variant={adminMode ? 'default' : 'ghost'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setAdminMode(!adminMode)}
              >
                <Move className="h-3.5 w-3.5 mr-1.5" />
                {adminMode ? 'Admin ON' : 'Modo Admin'}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowBulkEditDialog(true)}>
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Editar em Lote
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowImportDialog(true)}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Importar
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Left Panel: Filters + KPIs */}
      <div className="absolute top-20 left-4 z-10 w-56 space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto">
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

      {/* Right Panel: Layer Controls */}
      <div className="absolute top-20 right-4 z-10 w-52">
        <MapLayerControls
          showPDVs={showPDVs}
          showOutdoors={showOutdoors}
          showAlerts={showAlerts}
          onTogglePDVs={() => setShowPDVs(!showPDVs)}
          onToggleOutdoors={() => setShowOutdoors(!showOutdoors)}
          onToggleAlerts={() => setShowAlerts(!showAlerts)}
        />
      </div>

      {/* Bottom Left: Counter Badge */}
      <div className="absolute bottom-4 left-4 z-10 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg border border-border text-sm font-medium">
        <span className="text-primary">{filteredPDVs.length}</span>
        <span className="text-muted-foreground"> PDVs</span>
        <span className="mx-2 text-muted-foreground">•</span>
        <span className="text-primary">{filteredOutdoors.length}</span>
        <span className="text-muted-foreground"> Outdoors</span>
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

// Main component wrapped with provider
export default function StrategicMapGoogle() {
  return (
    <GoogleMapsProvider>
      <StrategicMapContent />
    </GoogleMapsProvider>
  );
}
