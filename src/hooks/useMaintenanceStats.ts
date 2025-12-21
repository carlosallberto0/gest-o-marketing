import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MaintenanceStats {
  pendingMaintenance: number;
  reviewedThisMonth: number;
  approvedThisMonth: number;
  needsMaintenanceThisMonth: number;
}

export function useMaintenanceStats() {
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

  return useQuery({
    queryKey: ['maintenance-stats', currentMonth],
    queryFn: async (): Promise<MaintenanceStats> => {
      // Fetch pending maintenance requests
      const { data: pending, error: pendingError } = await supabase
        .from('maintenance_requests')
        .select('id')
        .eq('status', 'pending_review');

      if (pendingError) throw pendingError;

      // Fetch monthly reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from('outdoor_monthly_reviews')
        .select('id, status')
        .gte('review_month', currentMonth);

      if (reviewsError) throw reviewsError;

      return {
        pendingMaintenance: pending?.length || 0,
        reviewedThisMonth: reviews?.length || 0,
        approvedThisMonth: reviews?.filter(r => r.status === 'approved').length || 0,
        needsMaintenanceThisMonth: reviews?.filter(r => r.status === 'needs_maintenance').length || 0,
      };
    },
  });
}
