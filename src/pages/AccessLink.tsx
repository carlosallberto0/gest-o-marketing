import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Fuel, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type ErrorType = 'invalid_token' | 'expired_token' | 'inactive_account' | 'general_error';

interface ValidationState {
  status: 'validating' | 'success' | 'error';
  errorType?: ErrorType;
  message?: string;
}

export default function AccessLink() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<ValidationState>({ status: 'validating' });

  useEffect(() => {
    if (!token) {
      setState({ 
        status: 'error', 
        errorType: 'invalid_token',
        message: 'Link de acesso inválido' 
      });
      return;
    }

    validateToken(token);
  }, [token]);

  const validateToken = async (accessToken: string) => {
    try {
      const response = await supabase.functions.invoke('validate-access-token', {
        body: {
          token: accessToken,
          userAgent: navigator.userAgent,
        },
      });

      if (response.error) {
        console.error('Validation error:', response.error);
        setState({ 
          status: 'error', 
          errorType: 'general_error',
          message: 'Erro ao validar o link de acesso' 
        });
        return;
      }

      const data = response.data;

      if (!data.success) {
        setState({ 
          status: 'error', 
          errorType: data.error as ErrorType,
          message: data.message || 'Link inválido' 
        });
        return;
      }

      // Success! Show success state briefly then redirect
      setState({ status: 'success' });
      toast.success(`Bem-vindo, ${data.profile.name}!`);

      // Use magic link to authenticate
      if (data.magicLink) {
        // Extract the token from the magic link
        const url = new URL(data.magicLink);
        const tokenHash = url.hash || url.searchParams.get('token');
        
        if (tokenHash) {
          // Redirect to the magic link to complete authentication
          window.location.href = data.magicLink;
          return;
        }
      }

      // Fallback: redirect to login if magic link fails
      setTimeout(() => {
        navigate(data.redirectTo || '/modules');
      }, 1500);

    } catch (error) {
      console.error('Error validating token:', error);
      setState({ 
        status: 'error', 
        errorType: 'general_error',
        message: 'Erro de conexão. Tente novamente.' 
      });
    }
  };

  const getErrorIcon = () => {
    switch (state.errorType) {
      case 'expired_token':
        return <AlertCircle className="h-16 w-16 text-amber-500" />;
      case 'inactive_account':
        return <AlertCircle className="h-16 w-16 text-amber-500" />;
      default:
        return <XCircle className="h-16 w-16 text-destructive" />;
    }
  };

  const getErrorTitle = () => {
    switch (state.errorType) {
      case 'expired_token':
        return 'Link Expirado';
      case 'inactive_account':
        return 'Conta Pendente';
      case 'invalid_token':
        return 'Link Inválido';
      default:
        return 'Erro de Acesso';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
          <Fuel className="h-8 w-8 text-primary" />
        </div>

        {state.status === 'validating' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">
              Validando seu acesso...
            </h2>
            <p className="text-muted-foreground">
              Aguarde enquanto verificamos seu link de acesso.
            </p>
          </motion.div>
        )}

        {state.status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">
              Acesso Confirmado!
            </h2>
            <p className="text-muted-foreground">
              Redirecionando para o sistema...
            </p>
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mt-4" />
          </motion.div>
        )}

        {state.status === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {getErrorIcon()}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                {getErrorTitle()}
              </h2>
              <p className="text-muted-foreground">
                {state.message}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
              <h3 className="font-medium text-sm text-foreground">O que fazer?</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Entre em contato com o administrador do sistema
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Solicite um novo link de acesso
                </li>
                {state.errorType === 'inactive_account' && (
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Aguarde a aprovação da sua conta
                  </li>
                )}
              </ul>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          © {new Date().getFullYear()} Gestão & Marketing. Todos os direitos reservados.
        </motion.p>
      </motion.div>
    </div>
  );
}
