import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'strategic-map-state';

interface MapPersistenceState {
  center: [number, number];
  zoom: number;
  filters: {
    searchTerm: string;
    selectedState: string;
    selectedCity: string;
    selectedImportStatus: string;
  };
  layers: {
    showPDVs: boolean;
    showOutdoors: boolean;
    showAlerts: boolean;
  };
}

const defaultState: MapPersistenceState = {
  center: [-49.0, -15.5],
  zoom: 4,
  filters: {
    searchTerm: '',
    selectedState: 'all',
    selectedCity: 'all',
    selectedImportStatus: 'all',
  },
  layers: {
    showPDVs: true,
    showOutdoors: true,
    showAlerts: true,
  },
};

export function useMapPersistence() {
  const [state, setState] = useState<MapPersistenceState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultState, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading map state:', error);
    }
    return defaultState;
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving map state:', error);
    }
  }, [state]);

  const updateCenter = useCallback((center: [number, number]) => {
    setState(prev => ({ ...prev, center }));
  }, []);

  const updateZoom = useCallback((zoom: number) => {
    setState(prev => ({ ...prev, zoom }));
  }, []);

  const updateFilters = useCallback((filters: Partial<MapPersistenceState['filters']>) => {
    setState(prev => ({ 
      ...prev, 
      filters: { ...prev.filters, ...filters } 
    }));
  }, []);

  const updateLayers = useCallback((layers: Partial<MapPersistenceState['layers']>) => {
    setState(prev => ({ 
      ...prev, 
      layers: { ...prev.layers, ...layers } 
    }));
  }, []);

  const resetState = useCallback(() => {
    setState(defaultState);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    state,
    updateCenter,
    updateZoom,
    updateFilters,
    updateLayers,
    resetState,
  };
}
