import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Fuel, Mail, Lock, Loader2, Shield, Users, Link2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { z } from 'zod';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';
import { useLoginScreenSettings, defaultSettings } from '@/hooks/useLoginScreenSettings';
import { ImageSlider } from '@/components/ui/image-slider';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
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
  const { data: loginSettings = defaultSettings } = useLoginScreenSettings();
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const isSubmittingRef = useRef(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip if a login submission is in progress
      if (isSubmittingRef.current) return;

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'super_admin') {
          navigate('/modules');
        }
        // Do NOT sign out here — let handleSubmit handle non-super_admin cases
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (isSubmittingRef.current) return;
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'super_admin') {
          navigate('/modules');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    isSubmittingRef.current = true;

    try {
      const validation = loginSchema.safeParse(formData);
      if (!validation.success) {
        showToast.error(validation.error.errors[0].message);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          showToast.error('Email ou senha inválidos');
        } else {
          showToast.error(error.message);
        }
        return;
      }

      if (data.user) {
        let profile = null;
        let retries = 3;
        
        while (retries > 0 && !profile) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .maybeSingle();
          
          if (profileData) {
            profile = profileData;
            break;
          }
          
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }

        if (!profile || profile.role !== 'super_admin') {
          await supabase.auth.signOut();
          showToast.error('Acesso restrito. Utilize o link pessoal fornecido pelo administrador.');
          return;
        }

        showToast.success('Login realizado com sucesso!');
        navigate('/modules');
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast.error('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
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
          className="w-full max-w-md space-y-6"
        >
          {/* Mobile Logo */}
          <motion.div variants={itemVariants} className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary mb-4">
              <Fuel className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Gestão & Marketing</h1>
          </motion.div>

          {/* Super Admin Login Card */}
          <motion.div variants={itemVariants}>
            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">Acesso Administrativo</h2>
                    <p className="text-xs text-muted-foreground">Exclusivo para Super Admin</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@empresa.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11" 
                    disabled={loading}
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Entrar como Super Admin
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Info Card for Other Users */}
          <motion.div variants={itemVariants}>
            <Card className="bg-muted/50 border-muted">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-foreground">Demais Usuários</h3>
                    <p className="text-sm text-muted-foreground">
                      Gerentes, Diretores e Coordenadores acessam o sistema através de um{' '}
                      <span className="font-medium text-foreground">link pessoal</span>{' '}
                      enviado pelo administrador.
                    </p>
                    <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                      <Link2 className="h-4 w-4" />
                      <span>Não tem seu link? Entre em contato com o administrador.</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Footer */}
          <motion.p
            variants={itemVariants}
            className="text-center text-xs text-muted-foreground"
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
