import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useModule } from '@/contexts/ModuleContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Fuel, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  History,
  Megaphone,
  FileText,
  Package,
  Target,
  Loader2,
  BarChart3,
  ArrowLeftRight,
  Eye,
  ScrollText,
  Building2,
  Wrench,
  FilePlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertsPopover } from '@/components/alerts/AlertsPopover';
import { OfflineIndicator } from '@/components/offline/OfflineIndicator';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrador',
    director: 'Diretoria',
    manager: 'Gerente',
    collaborator: 'Colaborador',
    supplier: 'Fornecedor',
  };
  return labels[role] || role;
};

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, signOut, hasModule, canAccessRoute, loading } = useAuth();
  const { activeModule, clearActiveModule } = useModule();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [systemLogo, setSystemLogo] = useState<string | null>(null);
  const [systemName, setSystemName] = useState('SR Off Trade');

  // Load system settings
  useEffect(() => {
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.logo) setSystemLogo(settings.logo);
        if (settings.systemName) setSystemName(settings.systemName);
      } catch (error) {
        console.error('Error loading system settings:', error);
      }
    }
  }, []);

  type UserRole = 'super_admin' | 'admin' | 'director' | 'manager' | 'collaborator' | 'supplier';
  
  interface MenuItem {
    icon: typeof LayoutDashboard;
    label: string;
    path: string;
    roles: UserRole[];
  }

  // Menu items for Merchandising module
  const merchandisingItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/merchandising/dashboard', roles: ['super_admin', 'admin', 'director', 'manager'] },
    { icon: ClipboardCheck, label: 'Novo Checklist', path: '/checklist', roles: ['super_admin', 'admin', 'manager', 'collaborator'] },
    { icon: History, label: 'Histórico', path: '/history', roles: ['super_admin', 'admin', 'director', 'manager'] },
    { icon: Package, label: 'Materiais', path: '/materials', roles: ['super_admin', 'admin'] },
    { icon: Target, label: 'Campanhas', path: '/campaigns', roles: ['super_admin', 'admin', 'director'] },
    { icon: BarChart3, label: 'Relatórios', path: '/reports', roles: ['super_admin', 'admin', 'director'] },
  ];

  // Menu items for Media module
  const mediaItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/media/dashboard', roles: ['super_admin', 'admin', 'director', 'manager'] },
    { icon: Megaphone, label: 'Outdoors', path: '/outdoors', roles: ['super_admin', 'admin', 'director', 'manager'] },
    { icon: Eye, label: 'Avaliar Outdoor', path: '/outdoor-evaluation', roles: ['super_admin', 'admin', 'manager', 'collaborator'] },
    { icon: FileText, label: 'Contratos', path: '/contracts', roles: ['super_admin', 'admin'] },
    { icon: Wrench, label: 'Solicitações de Manutenção', path: '/maintenance-requests', roles: ['super_admin', 'admin', 'director', 'manager'] },
    { icon: FilePlus, label: 'Gerar Ordem de Serviço', path: '/generate-service-order', roles: ['super_admin', 'admin'] },
    { icon: ClipboardCheck, label: 'Ordens de Serviço', path: '/service-orders', roles: ['super_admin', 'admin', 'director'] },
    { icon: Building2, label: 'Fornecedores', path: '/suppliers', roles: ['super_admin', 'admin'] },
    { icon: BarChart3, label: 'Relatórios', path: '/reports', roles: ['super_admin', 'admin', 'director'] },
  ];

  // Common items (admin only)
  const adminItems: MenuItem[] = [
    { icon: BarChart3, label: 'Admin Dashboard', path: '/admin', roles: ['super_admin', 'admin'] },
    { icon: Fuel, label: 'PDVs', path: '/pdvs', roles: ['super_admin', 'admin'] },
    { icon: Users, label: 'Usuários', path: '/users', roles: ['super_admin', 'admin'] },
    { icon: ScrollText, label: 'Auditoria', path: '/audit-logs', roles: ['super_admin', 'admin'] },
    { icon: Settings, label: 'Configurações', path: '/settings', roles: ['super_admin'] },
  ];

  // Get menu items based on active module
  const getMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [];
    
    if (activeModule === 'merchandising') {
      items.push(...merchandisingItems);
    } else if (activeModule === 'media') {
      items.push(...mediaItems);
    }
    
    // Add admin items for admins
    if (profile?.role === 'super_admin' || profile?.role === 'admin') {
      items.push(...adminItems);
    }
    
    return items;
  };

  const menuItems = getMenuItems();

  const filteredMenuItems = menuItems.filter(item => {
    if (!profile) return false;
    if (!canAccessRoute(item.roles)) return false;
    return true;
  });

  const handleLogout = async () => {
    clearActiveModule();
    await signOut();
    navigate('/');
  };

  const handleSwitchModule = () => {
    clearActiveModule();
    navigate('/modules');
    setIsMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getModuleLabel = () => {
    if (activeModule === 'merchandising') return 'Merchandising';
    if (activeModule === 'media') return 'Mídia Externa';
    return '';
  };

  const getModuleColor = () => {
    if (activeModule === 'merchandising') return 'bg-emerald-500';
    if (activeModule === 'media') return 'bg-blue-500';
    return 'bg-primary';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          {systemLogo ? (
            <img src={systemLogo} alt={systemName} className="h-8 w-auto" />
          ) : (
            <span className="font-semibold text-foreground">{systemName}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <OfflineIndicator />
          <AlertsPopover />
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-foreground/20 z-40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground z-50 transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              {systemLogo ? (
                <img src={systemLogo} alt={systemName} className="h-10 w-auto max-w-[140px] object-contain" />
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                    <Fuel className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <span className="font-bold text-sm block">{systemName}</span>
                    <span className="text-[10px] text-sidebar-foreground/60">Marketing v2.0</span>
                  </div>
                </>
              )}
            </div>
            {/* Desktop alerts and offline indicators */}
            <div className="hidden lg:flex items-center gap-1">
              <OfflineIndicator />
              <AlertsPopover />
            </div>
          </div>

          <div className="px-4 py-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent">
              <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center">
                <span className="text-sidebar-primary-foreground font-semibold">
                  {profile?.name?.charAt(0) || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.name}</p>
                <p className="text-xs text-sidebar-foreground/70">{getRoleLabel(profile?.role || '')}</p>
              </div>
            </div>
            {/* Active Module Badge */}
            {activeModule && (
              <div className="mt-3">
                <Badge className={cn("w-full justify-center py-1.5 text-white", getModuleColor())}>
                  {getModuleLabel()}
                </Badge>
              </div>
            )}
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setIsMobileMenuOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-sidebar-border space-y-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent" 
              onClick={handleSwitchModule}
            >
              <ArrowLeftRight className="h-5 w-5 mr-3" />
              Trocar Módulo
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent" onClick={handleLogout}>
              <LogOut className="h-5 w-5 mr-3" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      <main className={cn("min-h-screen transition-all duration-300", "pt-16 lg:pt-0 lg:pl-64")}>
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}