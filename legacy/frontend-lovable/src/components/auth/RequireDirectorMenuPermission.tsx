import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDirectorMenuPermissions,
  isDirectorMenuItemEnabled,
  getDirectorDefaultRoute,
  directorPathToMenuKey,
} from '@/hooks/useDirectorMenuPermissions';
import { showToast } from '@/lib/toast';
import { Loader2 } from 'lucide-react';

interface RequireDirectorMenuPermissionProps {
  children: ReactNode;
}

/**
 * Route guard that enforces director menu permissions for media module.
 * - Non-directors: Pass through immediately
 * - Directors: Check if route is allowed based on permissions
 * - Redirects to default route with toast if access denied
 */
export function RequireDirectorMenuPermission({ children }: RequireDirectorMenuPermissionProps) {
  const { profile, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: permissions, isLoading: permissionsLoading } = useDirectorMenuPermissions();

  const isDirector = profile?.role === 'director';
  const currentPath = location.pathname;
  const isConfigurablePath = directorPathToMenuKey[currentPath] !== undefined;

  useEffect(() => {
    if (authLoading || permissionsLoading) return;
    if (!isDirector) return;
    if (!isConfigurablePath) return;

    const allowed = isDirectorMenuItemEnabled(permissions, false, currentPath);

    if (allowed === false) {
      const defaultRoute = getDirectorDefaultRoute(permissions);
      showToast.error('Você não tem permissão para acessar esta página.');
      navigate(defaultRoute, { replace: true });
    }
  }, [authLoading, permissionsLoading, isDirector, isConfigurablePath, currentPath, permissions, navigate]);

  // Show loading while checking permissions for directors
  if (isDirector && isConfigurablePath && (authLoading || permissionsLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // If explicitly denied, don't render
  if (isDirector && isConfigurablePath) {
    const allowed = isDirectorMenuItemEnabled(permissions, permissionsLoading, currentPath);
    if (allowed === false) {
      return null;
    }
  }

  return <>{children}</>;
}
