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
import { PDVRecalibrateDialog } from '@/components/map/PDVRecalibrateDialog';
import { InlineContextMenu } from '@/components/map/MapContextMenu';
import { useMapPersistence } from '@/hooks/useMapPersistence';
import { MapLegend } from '@/components/map/MapLegend';
import { MapErrorBoundary } from '@/components/map/MapErrorBoundary';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Map, RefreshCw, Upload, Edit, Move, Power, Sun, Moon, MapPin, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createRoot, Root } from 'react-dom/client';

// Debug logging for development
const DEBUG = import.meta.env.DEV;

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

// Cluster colors based on point count
const PDV_CLUSTER_COLORS = ['#51bbd6', '#f1f075', '#f28cb1'];
const OUTDOOR_CLUSTER_COLORS = ['#3b82f6', '#8b5cf6', '#ef4444'];

export default function StrategicMapMapbox() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const adminMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const popupRootRef = useRef<Root | null>(null);
  
  // Refs for GeoJSON data to avoid stale closures in map callbacks
  const pdvGeoJSONRef = useRef<GeoJSON.FeatureCollection>({ type: 'FeatureCollection', features: [] });
  const outdoorGeoJSONRef = useRef<GeoJSON.FeatureCollection>({ type: 'FeatureCollection', features: [] });

  const { data: mapboxToken, isLoading: tokenLoading, error: tokenError, refetch: refetchToken } = useMapboxToken();
  const { data: pdvs, isLoading: pdvsLoading, error: pdvsError, refetch: refetchPDVs } = useMapPDVs();
  const { data: outdoors, isLoading: outdoorsLoading, error: outdoorsError, refetch: refetchOutdoors } = useMapOutdoors();
  const kpis = useMapKPIs();

  // Map initialization error state
  const [mapInitError, setMapInitError] = useState<string | null>(null);
  
  // Loading timeout state
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Debug logging
  useEffect(() => {
    if (DEBUG) {
      console.log('[Map] Token loaded:', !!mapboxToken, 'Loading:', tokenLoading, 'Error:', tokenError?.message);
      console.log('[Map] PDVs loaded:', pdvs?.length, 'Loading:', pdvsLoading, 'Error:', pdvsError?.message);
      console.log('[Map] Outdoors loaded:', outdoors?.length, 'Loading:', outdoorsLoading, 'Error:', outdoorsError?.message);
    }
  }, [mapboxToken, tokenLoading, tokenError, pdvs, pdvsLoading, pdvsError, outdoors, outdoorsLoading, outdoorsError]);

  // Loading timeout to prevent infinite loading
  useEffect(() => {
    if (tokenLoading || pdvsLoading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
        console.warn('[Map] Loading timeout reached after 30 seconds');
      }, 30000);
      return () => clearTimeout(timeout);
    }
    setLoadingTimeout(false);
  }, [tokenLoading, pdvsLoading]);

  // Map persistence hook
  const { 
    state: persistedState, 
    updateCenter, 
    updateZoom, 
    updateFilters, 
    updateLayers,
    updateTheme 
  } = useMapPersistence();

  // Map state
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>(persistedState.theme);

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
  const [recalibrateDialog, setRecalibrateDialog] = useState<{ 
    open: boolean; 
    pdv: MapPDV | null 
  }>({ open: false, pdv: null });

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

  // GeoJSON for PDVs
  const pdvGeoJSON = useMemo((): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: pdvsWithCoords.map(pdv => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [pdv.lng!, pdv.lat!]
      },
      properties: {
        id: pdv.id,
        name: pdv.name,
        code: pdv.code,
        address: pdv.address,
        city: pdv.city,
        state: pdv.state,
        type: pdv.type,
        status: pdv.status,
        evaluationStatus: pdv.evaluationStatus,
        managerName: pdv.managerName,
        lastEvaluationDate: pdv.lastEvaluationDate,
        outdoorCount: pdv.outdoorCount,
      }
    }))
  }), [pdvsWithCoords]);

  // GeoJSON for Outdoors
  const outdoorGeoJSON = useMemo((): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: outdoorsWithCoords.map(outdoor => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [outdoor.lng!, outdoor.lat!]
      },
      properties: {
        id: outdoor.id,
        code: outdoor.code,
        location: outdoor.location,
        width: outdoor.width,
        height: outdoor.height,
        status: outdoor.status,
        pdv_id: outdoor.pdv_id,
        pdvName: outdoor.pdvName,
        photo_url: outdoor.photo_url,
        lastEvaluation: outdoor.lastEvaluation,
        contractEndDate: outdoor.contractEndDate,
        daysSinceEvaluation: outdoor.daysSinceEvaluation,
      }
    }))
  }), [outdoorsWithCoords]);

  // Keep refs updated for use in map callbacks (avoids stale closures)
  useEffect(() => {
    pdvGeoJSONRef.current = pdvGeoJSON;
  }, [pdvGeoJSON]);

  useEffect(() => {
    outdoorGeoJSONRef.current = outdoorGeoJSON;
  }, [outdoorGeoJSON]);

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

  // Handle theme toggle
  const handleThemeToggle = useCallback(() => {
    const newTheme = mapTheme === 'light' ? 'dark' : 'light';
    setMapTheme(newTheme);
    updateTheme(newTheme);
    
    if (mapRef.current) {
      mapRef.current.setStyle(`mapbox://styles/mapbox/${newTheme}-v11`);
    }
  }, [mapTheme, updateTheme]);

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
      const items = [
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
      
      // Add recalibrate option for super_admin only
      if (isSuperAdmin) {
        items.push({
          label: 'Recalibrar por Link',
          icon: <MapPin className="h-4 w-4" />,
          onClick: () => {
            setRecalibrateDialog({ open: true, pdv });
            setContextMenu(null);
          },
        });
      }
      
      return items;
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
  }, [contextMenu, navigate, handleTogglePDVStatus, isSuperAdmin]);

  // Add sources and layers to map - uses refs to avoid stale closures
  const addSourcesAndLayers = useCallback((map: mapboxgl.Map) => {
    // PDV Source with clustering
    if (!map.getSource('pdvs')) {
      map.addSource('pdvs', {
        type: 'geojson',
        data: pdvGeoJSONRef.current,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });
    }

    // PDV Cluster Layer
    if (!map.getLayer('pdv-clusters')) {
      map.addLayer({
        id: 'pdv-clusters',
        type: 'circle',
        source: 'pdvs',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step', ['get', 'point_count'],
            PDV_CLUSTER_COLORS[0], 10,
            PDV_CLUSTER_COLORS[1], 50,
            PDV_CLUSTER_COLORS[2]
          ],
          'circle-radius': [
            'step', ['get', 'point_count'],
            20, 10,
            30, 50,
            40
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    }

    // PDV Cluster Count Layer
    if (!map.getLayer('pdv-cluster-count')) {
      map.addLayer({
        id: 'pdv-cluster-count',
        type: 'symbol',
        source: 'pdvs',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#000000'
        }
      });
    }

    // PDV Individual Points Layer
    if (!map.getLayer('pdv-points')) {
      map.addLayer({
        id: 'pdv-points',
        type: 'circle',
        source: 'pdvs',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match', ['get', 'evaluationStatus'],
            'ok', STATUS_COLORS.ok,
            'pending', STATUS_COLORS.pending,
            'critical', STATUS_COLORS.critical,
            STATUS_COLORS.ok
          ],
          'circle-radius': 10,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    }

    // Outdoor Source with clustering
    if (!map.getSource('outdoors')) {
      map.addSource('outdoors', {
        type: 'geojson',
        data: outdoorGeoJSONRef.current,
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 40,
      });
    }

    // Outdoor Cluster Layer
    if (!map.getLayer('outdoor-clusters')) {
      map.addLayer({
        id: 'outdoor-clusters',
        type: 'circle',
        source: 'outdoors',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step', ['get', 'point_count'],
            OUTDOOR_CLUSTER_COLORS[0], 10,
            OUTDOOR_CLUSTER_COLORS[1], 50,
            OUTDOOR_CLUSTER_COLORS[2]
          ],
          'circle-radius': [
            'step', ['get', 'point_count'],
            18, 10,
            26, 50,
            34
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    }

    // Outdoor Cluster Count Layer
    if (!map.getLayer('outdoor-cluster-count')) {
      map.addLayer({
        id: 'outdoor-cluster-count',
        type: 'symbol',
        source: 'outdoors',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 11
        },
        paint: {
          'text-color': '#ffffff'
        }
      });
    }

    // Outdoor Individual Points Layer
    if (!map.getLayer('outdoor-points')) {
      map.addLayer({
        id: 'outdoor-points',
        type: 'circle',
        source: 'outdoors',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match', ['get', 'status'],
            'operational', STATUS_COLORS.operational,
            'non_operational', STATUS_COLORS.non_operational,
            'pending_evaluation', STATUS_COLORS.pending_evaluation,
            STATUS_COLORS.pending_evaluation
          ],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    }
  }, []); // No dependencies - uses refs for data

  // Show popup for PDV
  const showPDVPopup = useCallback((coordinates: [number, number], pdv: MapPDV) => {
    if (!mapRef.current) return;
    
    if (popupRef.current) popupRef.current.remove();
    if (popupRootRef.current) popupRootRef.current.unmount();
    
    const popupContainer = document.createElement('div');
    const popup = new mapboxgl.Popup({ offset: 25, closeButton: true, maxWidth: '320px' })
      .setLngLat(coordinates)
      .setDOMContent(popupContainer)
      .addTo(mapRef.current);

    popup.on('close', () => {
      if (popupRootRef.current) {
        popupRootRef.current.unmount();
        popupRootRef.current = null;
      }
    });

    popupRef.current = popup;
    
    const root = createRoot(popupContainer);
    popupRootRef.current = root;
    root.render(
      <PDVPopup 
        pdv={pdv} 
        onClose={() => popup.remove()} 
        onNavigate={navigate} 
      />
    );
  }, [navigate]);

  // Show popup for Outdoor
  const showOutdoorPopup = useCallback((coordinates: [number, number], outdoor: MapOutdoor) => {
    if (!mapRef.current) return;
    
    if (popupRef.current) popupRef.current.remove();
    if (popupRootRef.current) popupRootRef.current.unmount();
    
    const popupContainer = document.createElement('div');
    const popup = new mapboxgl.Popup({ offset: 25, closeButton: true, maxWidth: '320px' })
      .setLngLat(coordinates)
      .setDOMContent(popupContainer)
      .addTo(mapRef.current);

    popup.on('close', () => {
      if (popupRootRef.current) {
        popupRootRef.current.unmount();
        popupRootRef.current = null;
      }
    });

    popupRef.current = popup;
    
    const root = createRoot(popupContainer);
    popupRootRef.current = root;
    root.render(
      <OutdoorPopup 
        outdoor={outdoor} 
        onClose={() => popup.remove()} 
        onNavigate={navigate} 
      />
    );
  }, [navigate]);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken || mapRef.current) return;

    // Validate token before using
    if (!mapboxToken.startsWith('pk.')) {
      console.error('[Map] Invalid Mapbox token format');
      setMapInitError('Token do Mapbox inválido. O token deve começar com "pk."');
      return;
    }

    if (DEBUG) {
      console.log('[Map] Initializing Mapbox with token:', mapboxToken.substring(0, 10) + '...');
    }

    try {
      mapboxgl.accessToken = mapboxToken;
      
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: `mapbox://styles/mapbox/${mapTheme}-v11`,
        center: defaultCenter,
        zoom: persistedState.zoom,
        pitch: 0,
      });

      // Handle Mapbox errors
      map.on('error', (e) => {
        console.error('[Map] Mapbox error:', e);
        // Check if it's an authentication error
        const errorEvent = e as mapboxgl.ErrorEvent & { error?: { status?: number } };
        if (errorEvent.error?.status === 401) {
          setMapInitError('Token do Mapbox inválido ou expirado');
        }
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.on('load', () => {
        if (DEBUG) console.log('[Map] Map loaded successfully');
        setMapLoaded(true);
        setMapInitError(null);
        addSourcesAndLayers(map);
        // Force multiple resize to ensure correct dimensions
        setTimeout(() => map.resize(), 100);
        setTimeout(() => map.resize(), 500);
        setTimeout(() => map.resize(), 1000);
      });

    // Re-add layers after style change (theme toggle)
    map.on('style.load', () => {
      addSourcesAndLayers(map);
    });

    map.on('moveend', () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      updateCenter([center.lng, center.lat]);
      updateZoom(zoom);
    });

    // Context menu on right-click
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

    // Close popup on map click (not on markers)
    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['pdv-points', 'pdv-clusters', 'outdoor-points', 'outdoor-clusters']
      });
      if (features.length === 0) {
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      }
    });

    // PDV cluster click - zoom in
    map.on('click', 'pdv-clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['pdv-clusters'] });
      if (!features.length) return;
      
      const clusterId = features[0].properties?.cluster_id;
      const source = map.getSource('pdvs') as mapboxgl.GeoJSONSource;
      
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom === undefined) return;
        const geometry = features[0].geometry as GeoJSON.Point;
        map.easeTo({
          center: geometry.coordinates as [number, number],
          zoom: zoom
        });
      });
    });

    // PDV point click - show popup
    map.on('click', 'pdv-points', (e) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const geometry = feature.geometry as GeoJSON.Point;
      const coords = geometry.coordinates as [number, number];
      
      // Find the PDV object
      const pdv = pdvsWithCoords.find(p => p.id === feature.properties?.id);
      if (pdv) {
        showPDVPopup(coords, pdv);
      }
    });

    // Outdoor cluster click - zoom in
    map.on('click', 'outdoor-clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['outdoor-clusters'] });
      if (!features.length) return;
      
      const clusterId = features[0].properties?.cluster_id;
      const source = map.getSource('outdoors') as mapboxgl.GeoJSONSource;
      
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom === undefined) return;
        const geometry = features[0].geometry as GeoJSON.Point;
        map.easeTo({
          center: geometry.coordinates as [number, number],
          zoom: zoom
        });
      });
    });

    // Outdoor point click - show popup
    map.on('click', 'outdoor-points', (e) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const geometry = feature.geometry as GeoJSON.Point;
      const coords = geometry.coordinates as [number, number];
      
      // Find the Outdoor object
      const outdoor = outdoorsWithCoords.find(o => o.id === feature.properties?.id);
      if (outdoor) {
        showOutdoorPopup(coords, outdoor);
      }
    });

    // Cursor styling
    map.on('mouseenter', 'pdv-clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'pdv-clusters', () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', 'pdv-points', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'pdv-points', () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', 'outdoor-clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'outdoor-clusters', () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', 'outdoor-points', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'outdoor-points', () => { map.getCanvas().style.cursor = ''; });

      mapRef.current = map;

      return () => {
        if (DEBUG) console.log('[Map] Cleaning up map instance');
        map.remove();
        mapRef.current = null;
      };
    } catch (error) {
      console.error('[Map] Failed to initialize Mapbox:', error);
      setMapInitError(error instanceof Error ? error.message : 'Erro ao inicializar o mapa');
    }
  }, [mapboxToken]);

  // Update GeoJSON data when it changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    
    const pdvSource = mapRef.current.getSource('pdvs') as mapboxgl.GeoJSONSource;
    if (pdvSource) {
      pdvSource.setData(pdvGeoJSON);
    }

    const outdoorSource = mapRef.current.getSource('outdoors') as mapboxgl.GeoJSONSource;
    if (outdoorSource) {
      outdoorSource.setData(outdoorGeoJSON);
    }
  }, [pdvGeoJSON, outdoorGeoJSON, mapLoaded]);

  // Toggle layer visibility
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const pdvLayers = ['pdv-clusters', 'pdv-cluster-count', 'pdv-points'];
    const outdoorLayers = ['outdoor-clusters', 'outdoor-cluster-count', 'outdoor-points'];

    pdvLayers.forEach(layer => {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, 'visibility', showPDVs ? 'visible' : 'none');
      }
    });

    outdoorLayers.forEach(layer => {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, 'visibility', showOutdoors ? 'visible' : 'none');
      }
    });
  }, [showPDVs, showOutdoors, mapLoaded]);

  // Admin mode - draggable markers for PDVs
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // Clean up previous admin markers
    adminMarkersRef.current.forEach(m => m.remove());
    adminMarkersRef.current = [];

    // PDV layers that need to be hidden in admin mode
    const pdvLayers = ['pdv-clusters', 'pdv-cluster-count', 'pdv-points'];

    if (adminMode && isSuperAdmin) {
      // Hide ALL PDV layers (clusters + points) so draggable markers are visible
      pdvLayers.forEach(layer => {
        if (map.getLayer(layer)) {
          map.setLayoutProperty(layer, 'visibility', 'none');
        }
      });

      // Disable map drag during marker drag for smoother experience
      let activeMarkerDrag = false;
      
      // Create draggable markers for all PDVs
      pdvsWithCoords.forEach(pdv => {
        const color = STATUS_COLORS[pdv.evaluationStatus] || STATUS_COLORS.ok;
        
        // Create wrapper element (controlled by Mapbox - DO NOT apply transform)
        const wrapper = document.createElement('div');
        wrapper.style.width = '32px';
        wrapper.style.height = '32px';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        wrapper.style.cursor = 'grab';
        wrapper.title = pdv.name || pdv.code || 'PDV';
        
        // Create inner circle element (for visual effects - safe to apply transform)
        const inner = document.createElement('div');
        inner.style.width = '20px';
        inner.style.height = '20px';
        inner.style.borderRadius = '50%';
        inner.style.backgroundColor = color;
        inner.style.border = '3px solid white';
        inner.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
        inner.style.transition = 'all 0.15s ease';
        inner.style.pointerEvents = 'none'; // Let wrapper handle events
        
        wrapper.appendChild(inner);

        // Visual feedback on hover (only on inner element)
        wrapper.onmouseenter = () => { 
          if (!activeMarkerDrag) {
            inner.style.transform = 'scale(1.2)';
            inner.style.boxShadow = '0 4px 12px rgba(0,0,0,0.6)';
          }
        };
        wrapper.onmouseleave = () => { 
          if (!activeMarkerDrag) {
            inner.style.transform = 'scale(1)';
            inner.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
          }
        };

        const marker = new mapboxgl.Marker({ 
          element: wrapper, 
          draggable: true,
          anchor: 'center'
        })
          .setLngLat([pdv.lng!, pdv.lat!])
          .addTo(map);

        marker.on('dragstart', () => {
          activeMarkerDrag = true;
          wrapper.style.cursor = 'grabbing';
          // Blue glow feedback during drag (no scale to maintain precision)
          inner.style.transform = 'scale(1)';
          inner.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.5), 0 4px 16px rgba(59,130,246,0.6)';
          inner.style.border = '3px solid #3b82f6';
          // Disable map panning during marker drag
          map.dragPan.disable();
        });

        marker.on('dragend', () => {
          activeMarkerDrag = false;
          wrapper.style.cursor = 'grab';
          inner.style.transform = 'scale(1)';
          inner.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
          inner.style.border = '3px solid white';
          // Re-enable map panning
          map.dragPan.enable();
          const lngLat = marker.getLngLat();
          handlePDVCoordinateUpdate(pdv.id, lngLat.lat, lngLat.lng);
        });

        wrapper.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({
            show: true,
            x: e.clientX,
            y: e.clientY,
            type: 'pdv',
            item: pdv,
          });
        });

        adminMarkersRef.current.push(marker);
      });
    } else {
      // Restore PDV layer visibility based on showPDVs setting
      pdvLayers.forEach(layer => {
        if (map.getLayer(layer)) {
          map.setLayoutProperty(layer, 'visibility', showPDVs ? 'visible' : 'none');
        }
      });
    }
  }, [adminMode, isSuperAdmin, pdvsWithCoords, mapLoaded, handlePDVCoordinateUpdate, showPDVs]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setMapInitError(null);
    setLoadingTimeout(false);
    refetchToken();
    refetchPDVs();
    refetchOutdoors();
  }, [refetchToken, refetchPDVs, refetchOutdoors]);

  // Loading state with timeout handling
  if ((tokenLoading || pdvsLoading) && !loadingTimeout) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-muted-foreground">Carregando mapa...</span>
        {(tokenLoading && pdvsLoading) && (
          <span className="text-xs text-muted-foreground">Carregando token e dados...</span>
        )}
      </div>
    );
  }

  // Timeout state
  if (loadingTimeout) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4 p-6">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-lg font-semibold">Carregamento lento</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          O carregamento está demorando mais do que o esperado. Isso pode ser devido à conexão de rede.
        </p>
        <div className="flex gap-3">
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
          <Button variant="outline" onClick={() => navigate('/modules')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  // Error state - comprehensive
  const hasError = tokenError || pdvsError || outdoorsError || mapInitError;
  if (hasError) {
    const errorMessage = tokenError?.message || pdvsError?.message || outdoorsError?.message || mapInitError;
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4 p-6">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-semibold text-foreground">Erro ao carregar o mapa</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {errorMessage || 'Ocorreu um erro inesperado ao carregar o mapa estratégico.'}
        </p>
        {DEBUG && (
          <details className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md max-w-md">
            <summary className="cursor-pointer">Debug Info</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">
              Token Error: {tokenError?.message || 'none'}{'\n'}
              PDVs Error: {pdvsError?.message || 'none'}{'\n'}
              Outdoors Error: {outdoorsError?.message || 'none'}{'\n'}
              Map Init Error: {mapInitError || 'none'}
            </pre>
          </details>
        )}
        <div className="flex gap-3 mt-2">
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
          <Button variant="outline" onClick={() => navigate('/modules')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar aos Módulos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <MapErrorBoundary onNavigateBack={() => navigate('/modules')}>
      <div className="h-screen w-screen relative overflow-hidden">
        {/* Full-screen Map - explicit dimensions for Mapbox */}
        <div 
          ref={mapContainerRef} 
          className="absolute inset-0 w-full h-full"
          style={{ minHeight: '100vh', minWidth: '100vw' }}
        />

      {/* Floating Header - Row 1: Navigation + Refresh + Theme Toggle */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-border pointer-events-auto">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/modules')} title="Voltar aos Módulos">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Map className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-sm">Mapa Estratégico</h1>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleThemeToggle} title={mapTheme === 'light' ? 'Tema Escuro' : 'Tema Claro'}>
            {mapTheme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} title="Atualizar dados">
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

      {recalibrateDialog.pdv && (
        <PDVRecalibrateDialog
          open={recalibrateDialog.open}
          onOpenChange={(open) => setRecalibrateDialog({ ...recalibrateDialog, open })}
          pdv={recalibrateDialog.pdv}
          onSuccess={handleImportSuccess}
        />
      )}
      </div>
    </MapErrorBoundary>
  );
}
