import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModule } from '@/contexts/ModuleContext';
import { ClipboardCheck, Megaphone, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ModuleSelection() {
  const { profile, hasModule, signOut } = useAuth();
  const { setActiveModule } = useModule();
  const navigate = useNavigate();

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
  ];

  const availableModules = modules.filter(m => hasModule(m.id as 'media' | 'merchandising'));

  const handleModuleSelect = (moduleId: string, path: string) => {
    setActiveModule(moduleId as 'media' | 'merchandising');
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
          <h1 className="text-xl font-bold text-foreground">SR Off Trade</h1>
          <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
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
          <div className={`grid gap-6 ${availableModules.length === 1 ? 'max-w-md mx-auto' : 'md:grid-cols-2'}`}>
            {availableModules.map((module, index) => (
              <Card 
                key={module.id}
                className="group cursor-pointer border-2 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => handleModuleSelect(module.id, module.path)}
              >
                <CardHeader className="pb-4">
                  <div className={`w-14 h-14 rounded-xl ${module.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <module.icon className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-2xl">{module.title}</CardTitle>
                  <CardDescription className="text-base">{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Funcionalidades</p>
                    <ul className="grid grid-cols-2 gap-1">
                      {module.features.map((feature) => (
                        <li key={feature} className="text-sm text-foreground/80 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button className="w-full mt-6 group-hover:bg-primary group-hover:text-primary-foreground" variant="outline">
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
          © {new Date().getFullYear()} SR Off Trade Marketing. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
