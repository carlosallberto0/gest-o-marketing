import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModule } from '@/contexts/ModuleContext';
import { 
  useManagerMenuPermissions, 
  isMenuItemEnabled, 
  getManagerDefaultRoute,
  pathToMenuKey 
} from '@/hooks/useManagerMenuPermissions';
import { showToast } from '@/lib/toast';
import { Loader2 } from 'lucide-react';

interface RequireManagerMenuPermissionProps {
  children: ReactNode;
}

/**
 * Route guard that enforces manager menu permissions.
 * - Non-managers: Pass through immediately
 * - Managers: Check if route is allowed based on module permissions
 * - Redirects to default route with toast if access denied
 */
export function RequireManagerMenuPermission({ children }: RequireManagerMenuPermissionProps) {
  const { profile, loading: authLoading } = useAuth();
  const { activeModule } = useModule();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { data: permissions, isLoading: permissionsLoading } = useManagerMenuPermissions();
  
  const isManager = profile?.role === 'manager';
  const currentPath = location.pathname;
  
  // Determine which module context to use for permission check
  // For /material-requests, it can be accessed from both modules
  const getEffectiveModule = (): 'media' | 'merchandising' | null => {
    if (activeModule === 'media' || activeModule === 'merchandising') {
      return activeModule;
    }
    
    // Fallback: Check if path exists in media first, then merchandising
    if (pathToMenuKey.media[currentPath]) return 'media';
    if (pathToMenuKey.merchandising[currentPath]) return 'merchandising';
    
    return null;
  };
  
  const effectiveModule = getEffectiveModule();
  
  useEffect(() => {
    // Wait for auth and permissions to load
    if (authLoading || permissionsLoading) return;
    
    // Non-managers pass through
    if (!isManager) return;
    
    // If no module context, allow (shouldn't happen in normal flow)
    if (!effectiveModule) return;
    
    const allowed = isMenuItemEnabled(permissions, false, effectiveModule, currentPath);
    
    if (allowed === false) {
      const defaultRoute = getManagerDefaultRoute(permissions, effectiveModule);
      showToast.error('Você não tem permissão para acessar esta página.');
      navigate(defaultRoute, { replace: true });
    }
  }, [
    authLoading, 
    permissionsLoading, 
    isManager, 
    effectiveModule, 
    currentPath, 
    permissions, 
    navigate
  ]);
  
  // Show loading while checking permissions for managers
  if (isManager && (authLoading || permissionsLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }
  
  // For managers, verify access before rendering
  if (isManager && effectiveModule) {
    const allowed = isMenuItemEnabled(permissions, permissionsLoading, effectiveModule, currentPath);
    
    // If explicitly denied (not undefined/loading), don't render
    if (allowed === false) {
      return null;
    }
  }
  
  return <>{children}</>;
}
