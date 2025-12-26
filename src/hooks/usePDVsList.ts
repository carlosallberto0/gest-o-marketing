import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PDVBasic {
  id: string;
  code: string;
  name: string;
}

export function usePDVsList() {
  return useQuery({
    queryKey: ['pdvs-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdvs')
        .select('id, code, name')
        .order('name');

      if (error) throw error;
      return data as PDVBasic[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
  });
}
