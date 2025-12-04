import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClipboardCheck, Mail, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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
        setError('Email não encontrado. Tente: admin@empresa.com, gerente@empresa.com ou colaborador@empresa.com');
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'admin@empresa.com', role: 'Administrador' },
    { email: 'gerente@empresa.com', role: 'Gerente' },
    { email: 'colaborador@empresa.com', role: 'Colaborador' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 gradient-primary items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 flex items-center justify-center mx-auto mb-8">
            <ClipboardCheck className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">
            PDV Check
          </h1>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            Sistema completo para gestão de checklists de merchandising em pontos de venda.
            Avalie, monitore e melhore a execução das suas lojas.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { value: '500+', label: 'Avaliações' },
              { value: '95%', label: 'Precisão' },
              { value: '50+', label: 'Lojas' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-primary-foreground">{stat.value}</p>
                <p className="text-sm text-primary-foreground/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center">
              <ClipboardCheck className="h-7 w-7 text-primary-foreground" />
            </div>
            <span className="ml-3 text-2xl font-bold text-foreground">PDV Check</span>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h2>
            <p className="text-muted-foreground mt-2">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
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
              Contas de demonstração:
            </p>
            <div className="space-y-2">
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
                  <span className="text-sm text-foreground">{account.email}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {account.role}
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
