import { useFeatureFlags } from './useFeatureFlags';
import { useRolePermissions } from './useRolePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

export function useCanAccess() {
  const { profile } = useAuth();
  const { isModuleEnabled, isFeatureEnabled } = useFeatureFlags();
  const { hasPermission } = useRolePermissions();

  const canAccess = useCallback((
    moduleKey: string,
    featureKey?: string,
    permissionKey?: string,
    entityKey?: string,
  ): boolean => {
    // Super Admin sempre tem acesso total
    if (profile?.role === 'super_admin') return true;

    // 1. Verifica se o módulo está habilitado (feature flag)
    if (!isModuleEnabled(moduleKey)) return false;

    // 2. Se feature específica, verifica se está habilitada
    if (featureKey && !isFeatureEnabled(moduleKey, featureKey)) return false;

    // 3. Se permission, verifica se o role do usuário tem permissão
    if (permissionKey && !hasPermission(moduleKey, permissionKey, entityKey)) return false;

    return true;
  }, [profile?.role, isModuleEnabled, isFeatureEnabled, hasPermission]);

  return { canAccess };
}
