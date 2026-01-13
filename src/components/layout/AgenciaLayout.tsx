import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useModule } from '@/contexts/ModuleContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2,
  Settings, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  ChevronDown,
  Loader2,
  ArrowLeftRight,
  ClipboardList,
  Video,
  Image,
  Search,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationsPopover } from '@/components/notifications/NotificationsPopover';
import { OfflineIndicator } from '@/components/offline/OfflineIndicator';
import { cn } from '@/lib/utils';

interface AgenciaLayoutProps {
  children: ReactNode;
}

const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrador',
    director: 'Diretoria',
    manager: 'Gerente',
  };
  return labels[role] || role;
};

type UserRole = 'super_admin' | 'admin' | 'director' | 'manager';

interface MenuItem {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  roles: UserRole[];
}

export function AgenciaLayout({ children }: AgenciaLayoutProps) {
  const { profile, signOut, canAccessRoute, loading } = useAuth();
  const { clearActiveModule } = useModule();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [systemLogo, setSystemLogo] = useState<string | null>(null);
  const [systemName, setSystemName] = useState('Gestão & Marketing');
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const agenciaItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/agencia/dashboard', roles: ['super_admin'] },
    { icon: Building2, label: 'Agências', path: '/agencia/agencias', roles: ['super_admin'] },
    { icon: ClipboardList, label: 'Demandas', path: '/agencia/demandas', roles: ['super_admin'] },
    { icon: Video, label: 'Catálogo de Vídeos', path: '/agencia/videos', roles: ['super_admin'] },
    { icon: Image, label: 'Catálogo de Fotos', path: '/agencia/fotos', roles: ['super_admin'] },
  ];

  const filteredMenuItems = agenciaItems.filter(item => {
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
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Header */}
      <header className="hidden lg:flex fixed top-0 left-64 right-0 h-[70px] bg-card border-b border-border z-40 items-center justify-between px-6 shadow-nazox">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="h-9 w-64 pl-10 pr-4 rounded bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <OfflineIndicator />
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-muted-foreground hover:text-foreground">
            <Maximize2 className="h-5 w-5" />
          </Button>
          <NotificationsPopover />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 ml-3 pl-3 border-l border-border hover:bg-muted/50 rounded-lg px-3 py-2 transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <span className="text-purple-500 font-semibold text-sm">
                    {profile?.name?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="hidden xl:block text-left">
                  <p className="text-sm font-medium text-foreground">{profile?.name}</p>
                  <p className="text-xs text-muted-foreground">{getRoleLabel(profile?.role || '')}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.name}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-[70px] bg-card border-b border-border z-50 flex items-center justify-between px-4 shadow-nazox">
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
          <NotificationsPopover />
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
          {/* Logo Area */}
          <div className="h-[70px] flex items-center justify-center px-5 border-b border-sidebar-border">
            {systemLogo ? (
              <img src={systemLogo} alt={systemName} className="h-10 w-auto max-w-[180px] object-contain" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-purple-500 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="font-semibold text-lg block text-sidebar-foreground">{systemName}</span>
                </div>
              </div>
            )}
          </div>

          {/* Active Module Badge */}
          <div className="px-5 py-3 border-b border-sidebar-border">
            <Badge className="w-full justify-center py-1.5 text-white border-0 bg-purple-500">
              Agência
            </Badge>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto scrollbar-thin">
            <p className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Menu</p>
            {filteredMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setIsMobileMenuOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-medium transition-all duration-200",
                    isActive 
                      ? "bg-purple-500 text-white" 
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isActive && <ChevronRight className="h-4 w-4 opacity-60" />}
                </button>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-sidebar-border space-y-1">
            <button 
              onClick={handleSwitchModule}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
            >
              <ArrowLeftRight className="h-[18px] w-[18px]" />
              <span>Trocar Módulo</span>
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
            >
              <LogOut className="h-[18px] w-[18px]" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn("min-h-screen transition-all duration-300", "pt-[70px] lg:pl-64")}>
        <div className="p-5 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
