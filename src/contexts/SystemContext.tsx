import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemSettings {
  systemName: string;
  logo: string | null;
  palette: string;
  theme: 'light' | 'dark';
}

interface SystemContextType {
  settings: SystemSettings;
  updateSettings: (settings: Partial<SystemSettings>) => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: SystemSettings = {
  systemName: 'SR Off Trade Marketing',
  logo: null,
  palette: 'default',
  theme: 'light',
};

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export function SystemProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage and Supabase on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // First try to load from localStorage for fast initial render
        const localSettings = localStorage.getItem('systemSettings');
        if (localSettings) {
          const parsed = JSON.parse(localSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
          applySettings(parsed);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const applySettings = (newSettings: Partial<SystemSettings>) => {
    // Apply color palette
    if (newSettings.palette) {
      const palettes: Record<string, string> = {
        default: '217 91% 45%',
        emerald: '160 84% 39%',
        violet: '263 70% 50%',
        red: '0 72% 51%',
        orange: '25 95% 53%',
        pink: '330 81% 60%',
      };
      const primaryColor = palettes[newSettings.palette] || palettes.default;
      document.documentElement.style.setProperty('--primary', primaryColor);
    }
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    
    // Save to localStorage
    localStorage.setItem('systemSettings', JSON.stringify(updated));
    
    // Apply settings
    applySettings(newSettings);
  };

  return (
    <SystemContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
}