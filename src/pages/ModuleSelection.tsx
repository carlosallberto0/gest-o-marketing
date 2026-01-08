import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModule } from '@/contexts/ModuleContext';
import { ClipboardCheck, Megaphone, Map, LogOut, Loader2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ModuleCard } from '@/components/ui/module-card';
import { useModuleSettings } from '@/hooks/useModuleSettings';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AdminCalendarWidget } from '@/components/calendar/AdminCalendarWidget';

const moduleIcons = {
  merchandising: ClipboardCheck,
  media: Megaphone,
  mapa: Map,
  financeiro: DollarSign,
};

const modulePaths = {
  merchandising: '/merchandising/dashboard',
  media: '/media/dashboard',
  mapa: '/mapa',
  financeiro: '/financeiro/dashboard',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12,
    },
  },
};

export default function ModuleSelection() {
  const { profile, hasModule, signOut, loading } = useAuth();
  const { setActiveModule } = useModule();
  const navigate = useNavigate();
  const { data: moduleSettings, isLoading: settingsLoading } = useModuleSettings();

  const isSuperAdmin = profile?.role === 'super_admin';

  // Redirect pending users to pending approval page
  useEffect(() => {
    if (!loading && profile?.status === 'pending') {
      navigate('/pending-approval');
    }
  }, [profile?.status, loading, navigate]);

  const moduleKeys = ['merchandising', 'media', 'mapa', 'financeiro'] as const;
  
  // Filter modules based on user access
  const availableModules = moduleKeys.filter(moduleId => {
    if (moduleId === 'mapa') {
      return isSuperAdmin;
    }
    if (moduleId === 'financeiro') {
      // Super Admin, Director, and Coordenador Compras can access
      return ['super_admin', 'director', 'coordenador_compras'].includes(profile?.role || '');
    }
    return hasModule(moduleId as 'media' | 'merchandising');
  });

  const handleModuleSelect = (moduleId: string, path: string) => {
    setActiveModule(moduleId as 'media' | 'merchandising' | 'mapa' | 'financeiro');
    navigate(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestão & Marketing</h1>
          <p className="text-xs text-muted-foreground">Sistema de Gestão Integrado</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground">{profile?.name}</p>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-7xl">
          {/* Welcome Section */}
          <motion.div 
            className="text-center space-y-2 mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Bem-vindo, {profile?.name?.split(' ')[0]}!
            </h2>
            <p className="text-muted-foreground text-lg">
              Selecione o módulo que deseja acessar
            </p>
          </motion.div>

          {/* Layout with Calendar for Super Admin */}
          <div className={isSuperAdmin ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : ""}>
            {/* Module Cards Section */}
            <div className={isSuperAdmin ? "lg:col-span-2" : ""}>
              {availableModules.length > 0 ? (
                <motion.div 
                  className={`grid gap-5 ${
                    !isSuperAdmin && availableModules.length === 1 
                      ? 'max-w-xs mx-auto' 
                      : !isSuperAdmin && availableModules.length === 2 
                        ? 'sm:grid-cols-2 max-w-xl mx-auto' 
                        : isSuperAdmin
                          ? 'sm:grid-cols-2 xl:grid-cols-4'
                          : 'sm:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto'
                  }`}
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {availableModules.map((moduleId) => {
                    const settings = moduleSettings?.[moduleId];
                    const Icon = moduleIcons[moduleId];
                    const path = modulePaths[moduleId];

                    return (
                      <motion.div key={moduleId} variants={itemVariants}>
                        <ModuleCard
                          title={settings?.title || moduleId}
                          description={settings?.description || ''}
                          icon={Icon}
                          iconBgColor={settings?.icon_color || '#3b82f6'}
                          buttonColor={settings?.button_color || '#3b82f6'}
                          onClick={() => handleModuleSelect(moduleId, path)}
                        />
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <Card className="max-w-md mx-auto text-center py-8">
                  <CardContent>
                    <p className="text-muted-foreground">
                      Você não tem acesso a nenhum módulo. Entre em contato com o administrador.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Calendar Section - Only for Super Admin */}
            {isSuperAdmin && (
              <div className="lg:col-span-1">
                <AdminCalendarWidget />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-4 border-t border-border/50 bg-background/80">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Gestão & Marketing. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
