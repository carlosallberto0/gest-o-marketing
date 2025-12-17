import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Notificacao {
  id: string;
  usuario_id: string | null;
  tipo: string;
  modulo: string;
  titulo: string;
  mensagem: string;
  url_acao: string | null;
  id_referencia: string | null;
  tipo_referencia: string | null;
  lida: boolean;
  criada_em: string;
}

export function useNotificacoes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notificacoes', user?.id],
    queryFn: async (): Promise<Notificacao[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notificacoes_sistema')
        .select('*')
        .eq('usuario_id', user.id)
        .order('criada_em', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as unknown as Notificacao[];
    },
    enabled: !!user?.id,
  });
}

export function useNotificacoesNaoLidas() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notificacoes-nao-lidas', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('notificacoes_sistema')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .eq('lida', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useMarcarNotificacaoLida() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificacaoId: string) => {
      const { error } = await supabase
        .from('notificacoes_sistema')
        .update({ lida: true })
        .eq('id', notificacaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes-nao-lidas', user?.id] });
    },
  });
}

export function useMarcarTodasLidas() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notificacoes_sistema')
        .update({ lida: true })
        .eq('usuario_id', user.id)
        .eq('lida', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes-nao-lidas', user?.id] });
    },
  });
}

// Function to send notification (for use in other hooks/components)
export async function enviarNotificacao(
  usuarioId: string,
  tipo: string,
  modulo: 'media' | 'merchandising' | 'sistema',
  titulo: string,
  mensagem: string,
  urlAcao?: string,
  idReferencia?: string,
  tipoReferencia?: string
) {
  const { data, error } = await supabase.rpc('enviar_notificacao', {
    p_usuario_id: usuarioId,
    p_tipo: tipo,
    p_modulo: modulo,
    p_titulo: titulo,
    p_mensagem: mensagem,
    p_url_acao: urlAcao || null,
    p_id_referencia: idReferencia || null,
    p_tipo_referencia: tipoReferencia || null,
  });

  if (error) throw error;
  return data;
}

// Function to notify users by role
export async function notificarPorRole(
  role: 'super_admin' | 'admin' | 'director' | 'manager' | 'collaborator' | 'supplier' | 'coordenador_compras',
  tipo: string,
  modulo: 'media' | 'merchandising' | 'sistema',
  titulo: string,
  mensagem: string,
  urlAcao?: string,
  idReferencia?: string,
  tipoReferencia?: string
) {
  const { error } = await supabase.rpc('notificar_por_role', {
    p_role: role,
    p_tipo: tipo,
    p_modulo: modulo,
    p_titulo: titulo,
    p_mensagem: mensagem,
    p_url_acao: urlAcao || null,
    p_id_referencia: idReferencia || null,
    p_tipo_referencia: tipoReferencia || null,
  } as any);

  if (error) throw error;
}

// Function to notify directors who can approve OS
export async function notificarDiretoresAprovadores(
  tipo: string,
  titulo: string,
  mensagem: string,
  urlAcao?: string,
  idReferencia?: string
) {
  const { error } = await supabase.rpc('notificar_diretores_aprovadores', {
    p_tipo: tipo,
    p_titulo: titulo,
    p_mensagem: mensagem,
    p_url_acao: urlAcao || null,
    p_id_referencia: idReferencia || null,
  });

  if (error) throw error;
}
