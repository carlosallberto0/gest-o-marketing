import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Fuel, Mail, Lock, User, Loader2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  role: z.string().min(1, 'Selecione um cargo'),
});

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'collaborator',
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/modules');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/modules');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const validation = loginSchema.safeParse(formData);
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Email ou senha inválidos');
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        toast.success('Login realizado com sucesso!');
      } else {
        const validation = signupSchema.safeParse(formData);
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        // Determine modules based on role
        const modules = formData.role === 'manager' ? ['media', 'merchandising'] : ['merchandising'];

        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name: formData.name,
              role: formData.role,
              modules: modules,
            },
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Este email já está cadastrado');
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        toast.success('Conta criada com sucesso!');
      }
    } catch (error) {
      toast.error('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-primary-foreground">
          <div className="w-20 h-20 rounded-lg bg-white/10 flex items-center justify-center mb-8">
            <Fuel className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-center">Gestão & Marketing</h1>
          <p className="text-lg text-primary-foreground/80 text-center max-w-md">
            Sistema completo para gestão de merchandising e mídia externa
          </p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full border border-white/10" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full border border-white/10" />
        <div className="absolute bottom-20 right-20 w-64 h-64 rounded-full border border-white/10" />
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded bg-primary mb-4">
              <Fuel className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Gestão & Marketing</h1>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground">
              {isLogin ? 'Bem-vindo!' : 'Criar Conta'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {isLogin ? 'Entre com suas credenciais para acessar o sistema.' : 'Preencha os dados para criar sua conta.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Digite seu nome"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10 h-10"
                      required={!isLogin}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">Qual o seu cargo?</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <Select 
                      value={formData.role} 
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger className="pl-10 h-10">
                        <SelectValue placeholder="Selecione seu cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="collaborator">Colaborador</SelectItem>
                        <SelectItem value="manager">Gerente</SelectItem>
                        <SelectItem value="director">Diretor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O administrador confirmará seu cargo após a aprovação
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite seu email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 h-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 h-10"
                  required
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded border-input" />
                  <span className="text-muted-foreground">Lembrar-me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isLogin ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-sm text-muted-foreground">
              {isLogin ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary font-medium hover:underline"
            >
              {isLogin ? 'Cadastre-se' : 'Entre'}
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            © {new Date().getFullYear()} Gestão & Marketing. Todos os direitos reservados.
          </p>
        </div>
      </div>

      <ForgotPasswordDialog 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
    </div>
  );
}
