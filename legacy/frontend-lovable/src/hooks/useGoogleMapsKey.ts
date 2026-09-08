import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useGoogleMapsKey() {
  return useQuery({
    queryKey: ['google-maps-key'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-google-maps-key');
      if (error) throw error;
      if (!data?.key) throw new Error('Google Maps API key not found');
      return data.key as string;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: 2,
  });
}
