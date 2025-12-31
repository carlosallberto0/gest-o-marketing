import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'strategic-map-state';
const DEBOUNCE_MS = 500; // Debounce saves to localStorage

interface MapPersistenceState {
  center: [number, number];
  zoom: number;
  theme: 'light' | 'dark';
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
  theme: 'light',
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

  // Debounce ref for saving
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save to localStorage
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('Error saving map state:', error);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
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

  const updateTheme = useCallback((theme: 'light' | 'dark') => {
    setState(prev => ({ ...prev, theme }));
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
    updateTheme,
    resetState,
  };
}
