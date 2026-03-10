import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';
import { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

export interface DirectorMenuPermissions {
  media: {
    dashboard: boolean;
    outdoors: boolean;
    aprovar_manutencao: boolean;
    relatorios: boolean;
    observacoes_enviadas: boolean;
  };
  default_redirect: {
    media: string;
  };
}

const defaultPermissions: DirectorMenuPermissions = {
  media: {
    dashboard: false,
    outdoors: false,
    aprovar_manutencao: true,
    relatorios: false,
    observacoes_enviadas: true,
  },
  default_redirect: {
    media: '/maintenance-approval',
  },
};

// Mandatory items that cannot be disabled
export const directorMandatoryItems: Record<string, boolean> = {
  aprovar_manutencao: true,
  observacoes_enviadas: true,
};

// Menu key to path mapping for director media items
const menuKeyToPath: Record<string, string> = {
  dashboard: '/media/dashboard',
  outdoors: '/outdoors',
  aprovar_manutencao: '/maintenance-approval',
  relatorios: '/reports',
  observacoes_enviadas: '/director-observations',
};

const pathToMenuKey: Record<string, string> = {
  '/media/dashboard': 'dashboard',
  '/outdoors': 'outdoors',
  '/maintenance-approval': 'aprovar_manutencao',
  '/reports': 'relatorios',
  '/director-observations': 'observacoes_enviadas',
};

export function getDirectorConfigurablePaths(): string[] {
  return Object.keys(pathToMenuKey);
}

export function isDirectorPathMandatory(path: string): boolean {
  const menuKey = pathToMenuKey[path];
  if (!menuKey) return false;
  return directorMandatoryItems[menuKey] === true;
}

export function useDirectorMenuPermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['director-menu-permissions', user?.id],
    queryFn: async (): Promise<DirectorMenuPermissions> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'director_menu_permissions')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return defaultPermissions;
        console.error('Error fetching director permissions:', error);
        return defaultPermissions;
      }

      const saved = (data?.value as unknown as DirectorMenuPermissions) || defaultPermissions;
      console.log('[DirectorMenuPermissions] fetched:', JSON.stringify(saved.media));
      return enforceMandatory(saved);
    },
    enabled: !!user?.id,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

function enforceMandatory(permissions: DirectorMenuPermissions): DirectorMenuPermissions {
  return {
    ...permissions,
    media: {
      ...permissions.media,
      aprovar_manutencao: true,
      observacoes_enviadas: true,
    },
  };
}

export function useUpdateDirectorMenuPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permissions: DirectorMenuPermissions) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const enforced = enforceMandatory(permissions);

      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'director_menu_permissions')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('system_settings')
          .update({
            value: enforced as unknown as Json,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('key', 'director_menu_permissions');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({
            key: 'director_menu_permissions',
            value: enforced as unknown as Json,
            description: 'Permissões de menu para diretores',
            updated_by: user.id,
          });
        if (error) throw error;
      }

      return enforced;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-menu-permissions'] });
      showToast.success('Permissões de diretoria salvas com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating director permissions:', error);
      showToast.error('Erro ao salvar permissões de diretoria');
    },
  });
}

export function isDirectorMenuItemEnabled(
  permissions: DirectorMenuPermissions | undefined,
  isLoading: boolean,
  path: string
): boolean | undefined {
  const menuKey = pathToMenuKey[path];
  if (!menuKey) return true;
  if (directorMandatoryItems[menuKey]) return true;
  if (isLoading || !permissions) return undefined;
  return (permissions.media as Record<string, boolean>)[menuKey] ?? true;
}

export function getDirectorDefaultRoute(permissions: DirectorMenuPermissions | undefined): string {
  if (!permissions) return '/maintenance-approval';
  const redirect = permissions.default_redirect?.media || '/maintenance-approval';
  // Validate that the redirect target is actually enabled
  const menuKey = pathToMenuKey[redirect];
  if (menuKey) {
    const isEnabled = (permissions.media as Record<string, boolean>)[menuKey];
    if (isEnabled === false) {
      // Find first enabled route
      for (const [key, enabled] of Object.entries(permissions.media)) {
        if (enabled && menuKeyToPath[key]) return menuKeyToPath[key];
      }
      return '/maintenance-approval';
    }
  }
  return redirect;
}

export { defaultPermissions as directorDefaultPermissions, menuKeyToPath as directorMenuKeyToPath, pathToMenuKey as directorPathToMenuKey };
