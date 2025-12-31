import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Fuel, Mail, Lock, User, Loader2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';
import { useLoginScreenSettings } from '@/hooks/useLoginScreenSettings';
import { ImageSlider } from '@/components/ui/image-slider';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  role: z.string().min(1, 'Selecione um cargo'),
});

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
} as const;

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 12,
    },
  },
};

export default function Auth() {
  const navigate = useNavigate();
  const { data: loginSettings } = useLoginScreenSettings();
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

  const renderBackground = () => {
    if (loginSettings?.background_type === 'slider' && loginSettings.slider_images?.length > 0) {
      return (
        <>
          <ImageSlider
            images={loginSettings.slider_images}
            interval={loginSettings.slider_interval || 5000}
            className="absolute inset-0"
          />
          <div
            className="absolute inset-0 bg-black/40 z-[1]"
            style={{ opacity: (loginSettings.overlay_opacity || 40) / 100 }}
          />
        </>
      );
    }

    if (loginSettings?.background_type === 'image' && loginSettings.background_image) {
      return (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${loginSettings.background_image})` }}
          />
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: (loginSettings.overlay_opacity || 50) / 100 }}
          />
        </>
      );
    }

    return (
      <>
        <div
          className="absolute inset-0"
          style={{ backgroundColor: loginSettings?.background_color || '#2563eb' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/20" />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding with Slider */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {renderBackground()}
        
        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8 border border-white/20"
          >
            <Fuel className="h-10 w-10" />
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-4xl font-bold mb-4 text-center"
          >
            {loginSettings?.title || 'Gestão & Marketing'}
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-lg text-white/80 text-center max-w-md"
          >
            {loginSettings?.subtitle || 'Sistema completo para gestão de merchandising e mídia externa'}
          </motion.p>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full border border-white/10 z-10" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full border border-white/10 z-10" />
        <div className="absolute bottom-20 right-20 w-64 h-64 rounded-full border border-white/10 z-10" />
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <motion.div variants={itemVariants} className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary mb-4">
              <Fuel className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Gestão & Marketing</h1>
          </motion.div>

          {/* Form Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground">
              {isLogin ? 'Bem-vindo de volta' : 'Criar Conta'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isLogin ? 'Entre com suas credenciais para acessar sua conta.' : 'Preencha os dados para criar sua conta.'}
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Digite seu nome"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10 h-11 rounded-lg border-input bg-background shadow-sm shadow-black/5 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
                      required={!isLogin}
                    />
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">Qual o seu cargo?</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <Select 
                      value={formData.role} 
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger className="pl-10 h-11 rounded-lg">
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
                </motion.div>
              </>
            )}

            <motion.div variants={itemVariants} className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 h-11 rounded-lg border-input bg-background shadow-sm shadow-black/5 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
                  required
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 h-11 rounded-lg border-input bg-background shadow-sm shadow-black/5 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
                  required
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Button 
                type="submit" 
                className="w-full h-11 rounded-lg font-medium shadow-sm shadow-black/5" 
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isLogin ? 'Entrar' : 'Criar conta'}
              </Button>
            </motion.div>
          </form>

          <motion.div variants={itemVariants} className="mt-6 text-center">
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
          </motion.div>

          {/* Footer */}
          <motion.p
            variants={itemVariants}
            className="text-center text-xs text-muted-foreground mt-8"
          >
            © {new Date().getFullYear()} Gestão & Marketing. Todos os direitos reservados.
          </motion.p>
        </motion.div>
      </div>

      <ForgotPasswordDialog 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
    </div>
  );
}
