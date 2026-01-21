import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModule } from '@/contexts/ModuleContext';
import { 
  BarChart3, 
  Layers, 
  Store, 
  Megaphone, 
  Lightbulb, 
  FileBarChart, 
  Settings, 
  Menu, 
  X, 
  ArrowLeftRight, 
  LogOut,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { NotificationsPopover } from '@/components/notifications/NotificationsPopover';
import { OfflineIndicator } from '@/components/offline/OfflineIndicator';

interface AnaliseEstrategicaLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

export function AnaliseEstrategicaLayout({ children }: AnaliseEstrategicaLayoutProps) {
  const { profile, signOut, loading } = useAuth();
  const { clearActiveModule } = useModule();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [systemLogo, setSystemLogo] = useState<string | null>(null);
  const [systemName, setSystemName] = useState<string>('Gestão & Marketing');

  useEffect(() => {
    const savedLogo = localStorage.getItem('system_logo');
    const savedName = localStorage.getItem('system_name');
    if (savedLogo) setSystemLogo(savedLogo);
    if (savedName) setSystemName(savedName);
  }, []);

  const menuItems: MenuItem[] = [
    { icon: BarChart3, label: 'Dashboard', path: '/analise-estrategica/dashboard' },
    { icon: Store, label: 'Clusters Conveniência', path: '/analise-estrategica/clusters/conveniencia' },
    { icon: Megaphone, label: 'Clusters Outdoors', path: '/analise-estrategica/clusters/outdoors' },
    { icon: ArrowLeftRight, label: 'Comparativo', path: '/analise-estrategica/clusters/comparativo' },
    { icon: Lightbulb, label: 'Insights', path: '/analise-estrategica/insights' },
    { icon: FileBarChart, label: 'Relatórios', path: '/analise-estrategica/relatorios' },
    { icon: Settings, label: 'Configurações', path: '/analise-estrategica/config' },
  ];

  const handleLogout = async () => {
    clearActiveModule();
    await signOut();
    navigate('/');
  };

  const handleSwitchModule = () => {
    clearActiveModule();
    navigate('/modules');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          {systemLogo ? (
            <img src={systemLogo} alt="Logo" className="h-7 w-auto" />
          ) : (
            <TrendingUp className="h-6 w-6 text-primary" />
          )}
          <span className="font-semibold text-sm">{systemName}</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsPopover />
          <OfflineIndicator />
        </div>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50 transform transition-transform duration-200 lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2">
            {systemLogo ? (
              <img src={systemLogo} alt="Logo" className="h-8 w-auto" />
            ) : (
              <TrendingUp className="h-6 w-6 text-primary" />
            )}
            <span className="font-semibold text-sm">{systemName}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Module Badge */}
        <div className="p-4 border-b border-border">
          <Badge className="w-full justify-center py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Análise Estratégica
          </Badge>
        </div>

        {/* Navigation */}
        <nav className="p-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start mb-1",
                  isActive && "bg-primary/10 text-primary"
                )}
                onClick={() => {
                  navigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
              >
                <item.icon className="h-4 w-4 mr-3" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <div className="text-xs text-muted-foreground mb-2 px-2">
            {profile?.name}
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={handleSwitchModule}
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Trocar Módulo
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-destructive hover:text-destructive" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
