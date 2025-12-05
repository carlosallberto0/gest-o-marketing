import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Fuel, Mail, Lock, AlertCircle, BarChart3, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { getRoleLabel } from '@/data/mockData';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        toast.success('Login realizado com sucesso!');
        navigate('/dashboard');
      } else {
        setError('Email não encontrado ou usuário inativo.');
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'super@srofftrademarketing.com', role: 'super_admin' },
    { email: 'admin.midia@srofftrademarketing.com', role: 'admin' },
    { email: 'admin.merch@srofftrademarketing.com', role: 'admin' },
    { email: 'diretoria@srofftrademarketing.com', role: 'director' },
    { email: 'gerente@srofftrademarketing.com', role: 'manager' },
    { email: 'colaborador@srofftrademarketing.com', role: 'collaborator' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 gradient-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        
        <div className="max-w-lg text-center relative z-10">
          <div className="w-24 h-24 rounded-2xl bg-primary-foreground/20 flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
            <Fuel className="h-12 w-12 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground mb-2">
            SR Off Trade Marketing
          </h1>
          <p className="text-primary-foreground/60 text-sm mb-6">
            Sistema Integrado v2.0
          </p>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            Controle total de mídia externa e merchandising para sua rede de postos e conveniências.
          </p>
          
          <div className="mt-12 grid grid-cols-2 gap-6">
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4">
              <Megaphone className="h-8 w-8 text-primary-foreground mb-2 mx-auto" />
              <p className="text-2xl font-bold text-primary-foreground">45</p>
              <p className="text-sm text-primary-foreground/70">Postos</p>
            </div>
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4">
              <BarChart3 className="h-8 w-8 text-primary-foreground mb-2 mx-auto" />
              <p className="text-2xl font-bold text-primary-foreground">9</p>
              <p className="text-sm text-primary-foreground/70">Estados</p>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <span className="px-3 py-1 rounded-full bg-primary-foreground/20 text-primary-foreground text-sm">
              Mídia Externa
            </span>
            <span className="px-3 py-1 rounded-full bg-primary-foreground/20 text-primary-foreground text-sm">
              Merchandising
            </span>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center">
              <Fuel className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="ml-3">
              <span className="text-xl font-bold text-foreground block">SR Off Trade</span>
              <span className="text-xs text-muted-foreground">Marketing v2.0</span>
            </div>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl font-bold text-foreground">Bem-vindo</h2>
            <p className="text-muted-foreground mt-2">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email corporativo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@srofftrademarketing.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Contas de demonstração (qualquer senha):
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword('demo');
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-background transition-colors text-left"
                >
                  <span className="text-xs text-foreground truncate">{account.email}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium whitespace-nowrap ml-2">
                    {getRoleLabel(account.role)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
