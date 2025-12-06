import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    name: string;
    email: string;
  };
}

export function useAuditLogs(filters?: {
  entityType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:profiles!audit_logs_user_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });
}

export function useCreateAuditLog() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      action: string;
      entityType: string;
      entityId?: string;
      oldData?: Record<string, any>;
      newData?: Record<string, any>;
    }) => {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user?.id || null,
          action: input.action,
          entity_type: input.entityType,
          entity_id: input.entityId || null,
          old_data: input.oldData || null,
          new_data: input.newData || null,
          user_agent: navigator.userAgent,
        });

      if (error) throw error;
    },
  });
}

// Helper function to create audit log (non-hook version for use in other hooks)
export async function createAuditLog(
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  oldData?: Record<string, any>,
  newData?: Record<string, any>
) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    old_data: oldData || null,
    new_data: newData || null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  });
}
