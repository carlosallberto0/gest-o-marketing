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
import { MapLegend } from '@/components/map/MapLegend';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Map, RefreshCw, Upload, Edit, Move, Power } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const containerStyle = {
  width: '100%',
  height: '100%',
};

// Clean/light map style - similar to Mapbox light theme
const mapStyles: google.maps.MapTypeStyle[] = [
  // General geometry - light gray background
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  // Text labels - dark gray for readability
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  // Administrative areas
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c0c0c0" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#a0a0a0" }, { weight: 1.5 }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#b0b0b0" }, { weight: 1 }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
  // Landscape
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#f0f0f0" }] },
  // Points of interest - hide to keep map clean
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }, { visibility: "simplified" }] },
  // Roads - white/light gray
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e0e0e0" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  // Transit - hide
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  // Water - soft blue
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9d4e2" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
];

const clusterOptions = {
  imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
  minimumClusterSize: 3,
  maxZoom: 14,
};

// Outdoor-specific cluster options - tighter clustering to handle overlapping coordinates
const outdoorClusterOptions = {
  minimumClusterSize: 2, // Cluster even 2 overlapping points
  maxZoom: 17, // Keep clustering until very high zoom
};

// Detail mode threshold - above this zoom, we show individual markers with spiderfy
const DETAIL_MODE_ZOOM = 18;

// Helper to group outdoors by coordinate and spread overlapping ones
const groupAndSpreadOutdoors = (outdoors: MapOutdoor[], zoom: number) => {
  // Group by coordinate (using toFixed for stability)
  const groups: { [key: string]: MapOutdoor[] } = {};
  
  outdoors.forEach(outdoor => {
    if (outdoor.lat && outdoor.lng) {
      const key = `${outdoor.lat.toFixed(6)},${outdoor.lng.toFixed(6)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(outdoor);
    }
  });
  
  // Calculate spread radius based on zoom (smaller at higher zoom)
  // At zoom 18, approx 0.00005 degrees ≈ 5-6 meters
  const spreadRadius = 0.00008 * Math.pow(2, 18 - zoom);
  
  // Return outdoors with adjusted positions for overlapping ones
  const result: Array<MapOutdoor & { displayLat: number; displayLng: number }> = [];
  
  Object.values(groups).forEach(group => {
    if (group.length === 1) {
      // Single outdoor at this location - no adjustment needed
      result.push({
        ...group[0],
        displayLat: group[0].lat!,
        displayLng: group[0].lng!,
      });
    } else {
      // Multiple outdoors at same location - spread them in a circle
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

// Simple circle marker - Mapbox style
const getMarkerIcon = (
  type: 'posto' | 'conveniencia' | 'both' | 'outdoor', 
  status?: string,
  zoom: number = 12
) => {
  const baseUrl = 'data:image/svg+xml;charset=UTF-8,';
  
  // Responsive size based on zoom - outdoors are slightly larger for visibility
  const size = type === 'outdoor' 
    ? (zoom <= 10 ? 18 : zoom <= 13 ? 24 : 28)
    : (zoom <= 10 ? 16 : zoom <= 13 ? 20 : 24);
  const strokeWidth = 2;
  const r = size / 2;
  
  // Determine color based on status - original Mapbox colors
  const getColor = () => {
    if (type === 'outdoor') {
      if (status === 'operational') return '#3b82f6';     // Blue
      if (status === 'non_operational') return '#ef4444'; // Red
      return '#f59e0b';                                    // Yellow/amber (pending_evaluation)
    }
    // PDV status
    if (status === 'critical') return '#ef4444';  // Red
    if (status === 'pending') return '#f59e0b';   // Yellow/amber
    return '#10b981';                              // Green (ok)
  };
  
  const color = getColor();
  
  // Simple colored circle SVG (identical to Mapbox style)
  return baseUrl + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${r}" cy="${r}" r="${r - strokeWidth/2}" fill="${color}" stroke="white" stroke-width="${strokeWidth}"/>
    </svg>
  `);
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

  // Current zoom level for responsive markers
  const [currentZoom, setCurrentZoom] = useState(persistedState.zoom);

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

  // Check if we're in detail mode (high zoom)
  const isDetailMode = currentZoom >= DETAIL_MODE_ZOOM;

  // Spread overlapping outdoors in detail mode
  const spreadOutdoors = useMemo(() => {
    if (!isDetailMode) return [];
    return groupAndSpreadOutdoors(outdoorsWithCoords, currentZoom);
  }, [outdoorsWithCoords, currentZoom, isDetailMode]);

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
        setCurrentZoom(zoom);
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
            streetViewControl: true,
            fullscreenControl: true,
            zoomControl: true,
            gestureHandling: 'greedy',
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
                        url: getMarkerIcon(pdv.type, pdv.evaluationStatus, currentZoom),
                        scaledSize: new google.maps.Size(20, 20),
                        anchor: new google.maps.Point(10, 10),
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

          {/* Outdoor Markers - Clustered mode (zoom < 18) */}
          {showOutdoors && outdoorsWithCoords.length > 0 && !isDetailMode && (
            <MarkerClusterer 
              options={{
                ...outdoorClusterOptions,
                styles: [
                  {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
                        <circle cx="20" cy="20" r="18" fill="#f59e0b" stroke="white" stroke-width="2"/>
                      </svg>
                    `),
                    width: 40,
                    height: 40,
                    textColor: 'white',
                  },
                  {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50">
                        <circle cx="25" cy="25" r="23" fill="#f59e0b" stroke="white" stroke-width="2"/>
                      </svg>
                    `),
                    width: 50,
                    height: 50,
                    textColor: 'white',
                  },
                  {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
                        <circle cx="30" cy="30" r="28" fill="#f59e0b" stroke="white" stroke-width="2"/>
                      </svg>
                    `),
                    width: 60,
                    height: 60,
                    textColor: 'white',
                  },
                ],
              }}
            >
              {(clusterer) => (
                <>
                  {outdoorsWithCoords.map(outdoor => (
                    <Marker
                      key={outdoor.id}
                      position={{ lat: outdoor.lat!, lng: outdoor.lng! }}
                      clusterer={clusterer}
                      icon={{
                        url: getMarkerIcon('outdoor', outdoor.status, currentZoom),
                        scaledSize: new google.maps.Size(24, 24),
                        anchor: new google.maps.Point(12, 12),
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
                </>
              )}
            </MarkerClusterer>
          )}

          {/* Outdoor Markers - Detail mode (zoom >= 18) with visual spreading */}
          {showOutdoors && isDetailMode && spreadOutdoors.map(outdoor => (
            <Marker
              key={outdoor.id}
              position={{ lat: outdoor.displayLat, lng: outdoor.displayLng }}
              icon={{
                url: getMarkerIcon('outdoor', outdoor.status, currentZoom),
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/modules')} title="Voltar aos Módulos">
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

      {/* Bottom Left: Counter Badge + Legend */}
      <div className="absolute bottom-4 left-4 z-10 space-y-3">
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

// Main component wrapped with provider
export default function StrategicMapGoogle() {
  return (
    <GoogleMapsProvider>
      <StrategicMapContent />
    </GoogleMapsProvider>
  );
}
