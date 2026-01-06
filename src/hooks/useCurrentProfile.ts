import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CurrentProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  modules: ('media' | 'merchandising')[];
  pdv_id: string | null;
  status: string;
  pode_aprovar_os: boolean;
}

export function useCurrentProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-profile', user?.id],
    queryFn: async (): Promise<CurrentProfile | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, modules, pdv_id, status, pode_aprovar_os')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching current profile:', error);
        return null;
      }

      return {
        ...data,
        pode_aprovar_os: data.pode_aprovar_os ?? false,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
}
