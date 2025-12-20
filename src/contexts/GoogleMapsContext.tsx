import { createContext, useContext, ReactNode } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
});

export function useGoogleMaps() {
  return useContext(GoogleMapsContext);
}

interface GoogleMapsProviderProps {
  children: ReactNode;
}

function GoogleMapsLoaderInner({ 
  apiKey, 
  children 
}: { 
  apiKey: string; 
  children: ReactNode;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: 'google-map-script',
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const { data: apiKey, isLoading: keyLoading, error: keyError } = useGoogleMapsKey();

  // Show loading while fetching API key
  if (keyLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando configurações do mapa...</span>
      </div>
    );
  }

  // Show error if key fetch failed
  if (keyError || !apiKey) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-destructive">Erro ao carregar configurações do mapa</p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Only render loader after we have the API key
  return (
    <GoogleMapsLoaderInner apiKey={apiKey}>
      {children}
    </GoogleMapsLoaderInner>
  );
}
