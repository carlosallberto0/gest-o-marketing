import { createContext, useContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { loadGoogleMapsScript } from '@/lib/googleMapsScript';
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

function GoogleMapsLoaderInner({ apiKey, children }: { apiKey: string; children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | undefined>(undefined);

  // memo: never allow apiKey to change after first set (prevents loader option mismatch)
  const stableKey = useMemo(() => apiKey, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;

    loadGoogleMapsScript(stableKey)
      .then(() => {
        if (!cancelled) setIsLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err : new Error('Erro ao carregar Google Maps'));
      });

    return () => {
      cancelled = true;
    };
  }, [stableKey]);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const { data: apiKey, isLoading: keyLoading, error: keyError } = useGoogleMapsKey();

  if (keyLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando configurações do mapa...</span>
      </div>
    );
  }

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

  return <GoogleMapsLoaderInner apiKey={apiKey}>{children}</GoogleMapsLoaderInner>;
}

