import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, Mail, User } from 'lucide-react';
import { useEffect } from 'react';

export default function PendingApproval() {
  const { profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If profile is approved, redirect to modules
    if (!loading && profile?.status === 'active') {
      navigate('/modules');
    }
  }, [profile?.status, loading, navigate]);

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
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-warning" />
            </div>
            <CardTitle className="text-2xl">Aguardando Aprovação</CardTitle>
            <CardDescription className="text-base">
              Bem-vindo ao Gestão & Marketing!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{profile?.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{profile?.email}</span>
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Sua conta foi criada com sucesso! Aguarde enquanto o administrador valida seu cadastro e configura suas permissões.
              </p>
              <p className="text-xs text-muted-foreground">
                Você receberá uma notificação assim que seu acesso for liberado.
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
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
