import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LoginScreenSettings {
  background_type: 'color' | 'image';
  background_color: string;
  background_image: string | null;
  overlay_opacity: number;
  title: string;
  subtitle: string;
}

const defaultSettings: LoginScreenSettings = {
  background_type: 'color',
  background_color: '#2563eb',
  background_image: null,
  overlay_opacity: 50,
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
        background_type: (value.background_type as 'color' | 'image') || defaultSettings.background_type,
        background_color: (value.background_color as string) || defaultSettings.background_color,
        background_image: (value.background_image as string | null) || defaultSettings.background_image,
        overlay_opacity: (value.overlay_opacity as number) ?? defaultSettings.overlay_opacity,
        title: (value.title as string) || defaultSettings.title,
        subtitle: (value.subtitle as string) || defaultSettings.subtitle,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
