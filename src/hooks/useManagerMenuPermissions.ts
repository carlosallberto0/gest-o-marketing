import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';
import { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

export interface ManagerMenuPermissions {
  media: {
    avaliar_outdoor: boolean;
    solicitacoes_manutencao: boolean;
    solicitar_materiais: boolean;
  };
  merchandising: {
    dashboard: boolean;
    avaliacao_pdv: boolean;
    historico: boolean;
    solicitar_materiais: boolean;
  };
  default_redirect: {
    media: string;
    merchandising: string;
  };
}

// Default permissions - these are used when no config exists yet
const defaultPermissions: ManagerMenuPermissions = {
  media: {
    avaliar_outdoor: true,
    solicitacoes_manutencao: true,
    solicitar_materiais: true,
  },
  merchandising: {
    dashboard: false,
    avaliacao_pdv: true,
    historico: true,
    solicitar_materiais: true,
  },
  default_redirect: {
    media: '/outdoor-evaluation',
    merchandising: '/checklist',
  },
};

// Mandatory items that MUST always be true (cannot be disabled)
export const mandatoryItems: Record<string, Record<string, boolean>> = {
  media: {
    avaliar_outdoor: true,
  },
  merchandising: {
    avaliacao_pdv: true,
  },
};

// Menu key to path mapping
const menuKeyToPath: Record<string, Record<string, string>> = {
  media: {
    avaliar_outdoor: '/outdoor-evaluation',
    solicitacoes_manutencao: '/maintenance-requests',
    solicitar_materiais: '/material-requests',
  },
  merchandising: {
    dashboard: '/merchandising/dashboard',
    avaliacao_pdv: '/checklist',
    historico: '/history',
    solicitar_materiais: '/material-requests',
  },
};

// Path to menu key mapping (reverse)
const pathToMenuKey: Record<string, Record<string, string>> = {
  media: {
    '/outdoor-evaluation': 'avaliar_outdoor',
    '/maintenance-requests': 'solicitacoes_manutencao',
    '/material-requests': 'solicitar_materiais',
  },
  merchandising: {
    '/merchandising/dashboard': 'dashboard',
    '/checklist': 'avaliacao_pdv',
    '/history': 'historico',
    '/material-requests': 'solicitar_materiais',
  },
};

// Returns list of paths that are configurable for managers
export function getConfigurablePathsForModule(module: 'media' | 'merchandising'): string[] {
  return Object.keys(pathToMenuKey[module] || {});
}

// Check if a path is mandatory (cannot be disabled)
export function isPathMandatory(module: 'media' | 'merchandising', path: string): boolean {
  const menuKey = pathToMenuKey[module]?.[path];
  if (!menuKey) return false;
  return mandatoryItems[module]?.[menuKey] === true;
}

export function useManagerMenuPermissions() {
  const { user } = useAuth();
  
  return useQuery({
    // Include user ID in queryKey to prevent cache sharing between users
    queryKey: ['manager-menu-permissions', user?.id],
    queryFn: async (): Promise<ManagerMenuPermissions> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'manager_menu_permissions')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found, return default
          return defaultPermissions;
        }
        console.error('Error fetching manager permissions:', error);
        throw error;
      }

      const savedPermissions = (data?.value as unknown as ManagerMenuPermissions) || defaultPermissions;
      
      // Enforce mandatory items are always true
      return enforceMandatoryItems(savedPermissions);
    },
    // Force fresh data on mount and window focus
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider stale to ensure fresh data
  });
}

// Ensures mandatory items are always enabled regardless of saved state
function enforceMandatoryItems(permissions: ManagerMenuPermissions): ManagerMenuPermissions {
  return {
    ...permissions,
    media: {
      ...permissions.media,
      avaliar_outdoor: true, // Always enabled
    },
    merchandising: {
      ...permissions.merchandising,
      avaliacao_pdv: true, // Always enabled
    },
  };
}

export function useUpdateManagerMenuPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permissions: ManagerMenuPermissions) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Enforce mandatory items before saving
      const enforced = enforceMandatoryItems(permissions);

      // Check if setting exists
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'manager_menu_permissions')
        .single();

      if (existing) {
        // Update
        const { error } = await supabase
          .from('system_settings')
          .update({
            value: enforced as unknown as Json,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('key', 'manager_menu_permissions');

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('system_settings')
          .insert({
            key: 'manager_menu_permissions',
            value: enforced as unknown as Json,
            description: 'Permissões de menu para gerentes',
            updated_by: user.id,
          });

        if (error) throw error;
      }

      return enforced;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-menu-permissions'] });
      showToast.success('Permissões salvas com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating manager permissions:', error);
      showToast.error('Erro ao salvar permissões');
    },
  });
}

// Helper function to check if a menu item is enabled for managers
// Returns undefined if permissions are loading, false if disabled, true if enabled
export function isMenuItemEnabled(
  permissions: ManagerMenuPermissions | undefined,
  isLoading: boolean,
  module: 'media' | 'merchandising',
  path: string
): boolean | undefined {
  const menuKey = pathToMenuKey[module]?.[path];
  
  // If path is not in our configurable list, allow it
  if (!menuKey) return true;
  
  // If path is mandatory, always allow
  if (mandatoryItems[module]?.[menuKey]) return true;
  
  // If still loading permissions, return undefined (deny by default for configurable items)
  if (isLoading || !permissions) return undefined;

  const modulePermissions = permissions[module];
  if (!modulePermissions) return true;

  return (modulePermissions as Record<string, boolean>)[menuKey] ?? true;
}

// Helper function to get the default redirect route for managers
export function getManagerDefaultRoute(
  permissions: ManagerMenuPermissions | undefined,
  module: 'media' | 'merchandising'
): string {
  if (!permissions) {
    return module === 'media' ? '/outdoor-evaluation' : '/checklist';
  }

  return permissions.default_redirect?.[module] || 
    (module === 'media' ? '/outdoor-evaluation' : '/checklist');
}

// Export default permissions for use in settings
export { defaultPermissions, menuKeyToPath, pathToMenuKey };
