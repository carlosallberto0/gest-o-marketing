import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LoginScreenSettings {
  background_type: 'color' | 'image' | 'slider';
  background_color: string;
  background_image: string | null;
  slider_images: string[];
  slider_interval: number;
  overlay_opacity: number;
  title: string;
  subtitle: string;
}

const defaultSettings: LoginScreenSettings = {
  background_type: 'slider',
  background_color: '#2563eb',
  background_image: null,
  slider_images: [
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&auto=format&fit=crop&q=80',
  ],
  slider_interval: 5000,
  overlay_opacity: 40,
  title: 'Gestão & Marketing',
  subtitle: 'Sistema completo para gestão de merchandising e mídia externa',
};

export function useLoginScreenSettings() {
  return useQuery({
    queryKey: ['login-screen-settings'],
    queryFn: async (): Promise<LoginScreenSettings> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'login_screen_settings')
        .maybeSingle();

      if (error) {
        console.error('Error fetching login screen settings:', error);
        return defaultSettings;
      }

      if (!data?.value) {
        return defaultSettings;
      }

      const value = data.value as Record<string, unknown>;
      return {
        background_type: (value.background_type as 'color' | 'image' | 'slider') || defaultSettings.background_type,
        background_color: (value.background_color as string) || defaultSettings.background_color,
        background_image: (value.background_image as string | null) || defaultSettings.background_image,
        slider_images: (value.slider_images as string[]) || defaultSettings.slider_images,
        slider_interval: (value.slider_interval as number) || defaultSettings.slider_interval,
        overlay_opacity: (value.overlay_opacity as number) ?? defaultSettings.overlay_opacity,
        title: (value.title as string) || defaultSettings.title,
        subtitle: (value.subtitle as string) || defaultSettings.subtitle,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
