import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModule } from '@/contexts/ModuleContext';
import { ClipboardCheck, Megaphone, Map, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect } from 'react';

export default function ModuleSelection() {
  const { profile, hasModule, signOut, loading } = useAuth();
  const { setActiveModule } = useModule();
  const navigate = useNavigate();

  // Redirect pending users to pending approval page
  useEffect(() => {
    if (!loading && profile?.status === 'pending') {
      navigate('/pending-approval');
    }
  }, [profile?.status, loading, navigate]);

  const modules = [
    {
      id: 'merchandising',
      title: 'Merchandising',
      description: 'Gestão de checklists, avaliações de PDVs, materiais de trade e campanhas.',
      icon: ClipboardCheck,
      path: '/merchandising/dashboard',
      color: 'bg-emerald-500',
      features: ['Checklists de Avaliação', 'Histórico de Visitas', 'Materiais de Trade', 'Campanhas', 'Relatórios'],
    },
    {
      id: 'media',
      title: 'Mídia Externa',
      description: 'Gestão de outdoors, contratos com produtores, ordens de serviço e avaliações.',
      icon: Megaphone,
      path: '/media/dashboard',
      color: 'bg-blue-500',
      features: ['Cadastro de Outdoors', 'Contratos', 'Ordens de Serviço', 'Avaliações de Mídia', 'Fornecedores'],
    },
    {
      id: 'mapa',
      title: 'Mapa Estratégico',
      description: 'Visualização geográfica unificada de PDVs, outdoors e status operacional em tempo real.',
      icon: Map,
      path: '/mapa',
      color: 'bg-purple-500',
      features: ['Mapa Interativo', 'Status em Tempo Real', 'Alertas Visuais', 'KPIs Consolidados', 'Ações Rápidas'],
    },
  ];

  // Filter modules - Mapa is available only for super_admin, others filter by hasModule
  const availableModules = modules.filter(m => {
    if (m.id === 'mapa') {
      return profile?.role === 'super_admin';
    }
    return hasModule(m.id as 'media' | 'merchandising');
  });

  const handleModuleSelect = (moduleId: string, path: string) => {
    setActiveModule(moduleId as 'media' | 'merchandising' | 'mapa');
    navigate(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

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
        <div className="w-full max-w-4xl space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Bem-vindo, {profile?.name?.split(' ')[0]}!
            </h2>
            <p className="text-muted-foreground text-lg">
              Selecione o módulo que deseja acessar
            </p>
          </div>

      {/* Module Cards */}
          <div className={`grid gap-4 ${availableModules.length === 1 ? 'max-w-sm mx-auto' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
            {availableModules.map((module, index) => (
              <Card 
                key={module.id}
                className="group cursor-pointer border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => handleModuleSelect(module.id, module.path)}
              >
                <CardHeader className="pb-3 p-4 sm:p-5">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg ${module.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    <module.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">{module.title}</CardTitle>
                  <CardDescription className="text-sm line-clamp-2">{module.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 p-4 sm:p-5">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Funcionalidades</p>
                    <ul className="grid grid-cols-1 gap-0.5">
                      {module.features.slice(0, 4).map((feature) => (
                        <li key={feature} className="text-xs text-foreground/80 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                          <span className="truncate">{feature}</span>
                        </li>
                      ))}
                      {module.features.length > 4 && (
                        <li className="text-xs text-muted-foreground">+{module.features.length - 4} mais</li>
                      )}
                    </ul>
                  </div>
                  <Button className="w-full mt-4 h-9 text-sm group-hover:bg-primary group-hover:text-primary-foreground" variant="outline">
                    Acessar Módulo
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* No Modules Message */}
          {availableModules.length === 0 && (
            <Card className="max-w-md mx-auto text-center py-8">
              <CardContent>
                <p className="text-muted-foreground">
                  Você não tem acesso a nenhum módulo. Entre em contato com o administrador.
                </p>
              </CardContent>
            </Card>
          )}
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
