import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AccessLinkUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  access_token: string | null;
  token_gerado_em: string | null;
  token_valido_ate: string | null;
  ultimo_acesso_via_link: string | null;
}

export function useAccessLinks() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['access-link-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, status, access_token, token_gerado_em, token_valido_ate, ultimo_acesso_via_link')
        .neq('role', 'super_admin')
        .order('name');

      if (error) throw error;
      return data as AccessLinkUser[];
    },
  });

  const generateLink = useMutation({
    mutationFn: async ({ userId, validityDays = 365 }: { userId: string; validityDays?: number }) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await supabase.functions.invoke('generate-access-link', {
        body: { userId, validityDays },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao gerar link');
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['access-link-users'] });
      toast.success('Link de acesso gerado!', {
        description: `Link válido até ${new Date(data.expiresAt).toLocaleDateString('pt-BR')}`,
      });
    },
    onError: (error: Error) => {
      console.error('Error generating link:', error);
      toast.error('Erro ao gerar link: ' + error.message);
    },
  });

  const revokeLink = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await supabase.functions.invoke('revoke-access-token', {
        body: { userId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao revogar link');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-link-users'] });
      toast.success('Acesso revogado com sucesso');
    },
    onError: (error: Error) => {
      console.error('Error revoking link:', error);
      toast.error('Erro ao revogar acesso: ' + error.message);
    },
  });

  const accessLogsQuery = useQuery({
    queryKey: ['access-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_logs')
        .select(`
          id,
          user_id,
          token_usado,
          tipo_acesso,
          ip_address,
          user_agent,
          created_at,
          profiles:user_id (name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  return {
    users: usersQuery.data || [],
    isLoadingUsers: usersQuery.isLoading,
    generateLink,
    revokeLink,
    accessLogs: accessLogsQuery.data || [],
    isLoadingLogs: accessLogsQuery.isLoading,
    refetchUsers: usersQuery.refetch,
  };
}

// Utility functions
export function generateWhatsAppLink(accessLink: string, userName: string): string {
  const message = encodeURIComponent(
    `Olá ${userName}! 👋\n\nAqui está seu link de acesso ao sistema SR Off Trade Marketing:\n\n${accessLink}\n\nClique no link acima para entrar no sistema. Este link é pessoal e não deve ser compartilhado.`
  );
  return `https://wa.me/?text=${message}`;
}

export function getAccessLinkStatus(user: AccessLinkUser): {
  status: 'active' | 'expired' | 'none' | 'pending';
  label: string;
  color: string;
} {
  if (user.status !== 'active') {
    return { status: 'pending', label: 'Conta Pendente', color: 'text-amber-500' };
  }
  
  if (!user.access_token) {
    return { status: 'none', label: 'Sem Link', color: 'text-muted-foreground' };
  }

  if (user.token_valido_ate) {
    const expiration = new Date(user.token_valido_ate);
    if (expiration < new Date()) {
      return { status: 'expired', label: 'Expirado', color: 'text-destructive' };
    }
  }

  return { status: 'active', label: 'Ativo', color: 'text-emerald-500' };
}

export function formatExpirationDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatLastAccess(date: string | null): string {
  if (!date) return 'Nunca acessou';
  const accessDate = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - accessDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Há poucos minutos';
  if (diffHours < 24) return `Há ${diffHours}h`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  
  return accessDate.toLocaleDateString('pt-BR');
}
