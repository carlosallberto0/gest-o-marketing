import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';
import { Json } from '@/integrations/supabase/types';

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

export function useManagerMenuPermissions() {
  return useQuery({
    queryKey: ['manager-menu-permissions'],
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
        throw error;
      }

      return (data?.value as unknown as ManagerMenuPermissions) || defaultPermissions;
    },
  });
}

export function useUpdateManagerMenuPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permissions: ManagerMenuPermissions) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

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
            value: permissions as unknown as Json,
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
            value: permissions as unknown as Json,
            description: 'Permissões de menu para gerentes',
            updated_by: user.id,
          });

        if (error) throw error;
      }

      return permissions;
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
export function isMenuItemEnabled(
  permissions: ManagerMenuPermissions | undefined,
  module: 'media' | 'merchandising',
  path: string
): boolean {
  if (!permissions) return true;

  const menuKey = pathToMenuKey[module]?.[path];
  if (!menuKey) return true;

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
