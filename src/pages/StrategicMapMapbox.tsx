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
import { ArrowLeft, Loader2, Map, RefreshCw, Upload, Edit, Move, Power, Sun, Moon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createRoot, Root } from 'react-dom/client';

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

    mapboxgl.accessToken = mapboxToken;
    
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: `mapbox://styles/mapbox/${mapTheme}-v11`,
      center: defaultCenter,
      zoom: persistedState.zoom,
      pitch: 0,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      setMapLoaded(true);
      addSourcesAndLayers(map);
      // Force resize to ensure correct dimensions
      setTimeout(() => {
        map.resize();
      }, 100);
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
      map.remove();
      mapRef.current = null;
    };
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

      // Create draggable markers for all PDVs
      pdvsWithCoords.forEach(pdv => {
        const color = STATUS_COLORS[pdv.evaluationStatus] || STATUS_COLORS.ok;
        
        const el = document.createElement('div');
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = color;
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
        el.style.cursor = 'grab';
        el.style.transition = 'transform 0.15s ease';

        // Visual feedback on hover
        el.onmouseenter = () => { el.style.transform = 'scale(1.2)'; };
        el.onmouseleave = () => { el.style.transform = 'scale(1)'; };

        const marker = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat([pdv.lng!, pdv.lat!])
          .addTo(map);

        marker.on('dragstart', () => {
          el.style.cursor = 'grabbing';
          el.style.transform = 'scale(1.3)';
        });

        marker.on('dragend', () => {
          el.style.cursor = 'grab';
          el.style.transform = 'scale(1)';
          const lngLat = marker.getLngLat();
          handlePDVCoordinateUpdate(pdv.id, lngLat.lat, lngLat.lng);
        });

        el.addEventListener('contextmenu', (e) => {
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
    </div>
  );
}
