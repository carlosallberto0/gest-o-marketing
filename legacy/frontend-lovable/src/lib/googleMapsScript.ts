let loadPromise: Promise<void> | null = null;
let loadedKey: string | null = null;

function hasGoogleMaps(): boolean {
  return typeof window !== 'undefined' && !!(window as any).google?.maps;
}

export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key is missing'));
  }

  // Already loaded
  if (hasGoogleMaps()) {
    loadedKey = loadedKey ?? apiKey;
    loadPromise = loadPromise ?? Promise.resolve();
    return loadPromise;
  }

  // Already loading/loaded with same key
  if (loadPromise) {
    return loadPromise;
  }

  loadedKey = apiKey;

  loadPromise = new Promise<void>((resolve, reject) => {
    // Avoid duplicating script tags
    const existing = document.getElementById('google-maps-js') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-js';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;

    script.onload = () => {
      if (hasGoogleMaps()) resolve();
      else reject(new Error('Google Maps loaded but window.google.maps is missing'));
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
