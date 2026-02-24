import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

interface RolePermission {
  id: string;
  role: string;
  module_key: string;
  permission_key: string;
  entity_key: string;
  granted: boolean;
}

export function useRolePermissions() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async (): Promise<RolePermission[]> => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role');

      if (error) {
        console.error('Error fetching role permissions:', error);
        return [];
      }
      return data as RolePermission[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const hasPermission = useCallback((moduleKey: string, permissionKey: string, entityKey: string = '*'): boolean => {
    // Super Admin sempre tem todas as permissões
    if (profile?.role === 'super_admin') return true;
    if (!profile?.role) return false;

    // Procura permissão específica para a entidade
    const specificPerm = permissions.find(
      p => p.role === profile.role && p.module_key === moduleKey && p.permission_key === permissionKey && p.entity_key === entityKey
    );
    if (specificPerm) return specificPerm.granted;

    // Procura permissão wildcard (*)
    if (entityKey !== '*') {
      const wildcardPerm = permissions.find(
        p => p.role === profile.role && p.module_key === moduleKey && p.permission_key === permissionKey && p.entity_key === '*'
      );
      if (wildcardPerm) return wildcardPerm.granted;
    }

    // Default: sem configuração = usa comportamento atual (true para manter compatibilidade)
    return true;
  }, [permissions, profile?.role]);

  const upsertPermission = useMutation({
    mutationFn: async ({ role, moduleKey, permissionKey, entityKey = '*', granted }: {
      role: string; moduleKey: string; permissionKey: string; entityKey?: string; granted: boolean;
    }) => {
      const { error } = await supabase
        .from('role_permissions')
        .upsert(
          { role: role as any, module_key: moduleKey, permission_key: permissionKey, entity_key: entityKey, granted, updated_at: new Date().toISOString() },
          { onConflict: 'role,module_key,permission_key,entity_key' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
    },
  });

  return {
    permissions,
    isLoading,
    hasPermission,
    upsertPermission,
  };
}
