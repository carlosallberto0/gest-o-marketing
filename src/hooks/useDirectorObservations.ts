import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { showToast } from '@/lib/toast';

export interface DirectorObservation {
  id: string;
  outdoor_id: string;
  diretor_id: string;
  texto: string;
  criada_em: string;
  outdoor?: {
    code: string;
    location: string;
    pdv?: {
      name: string;
    };
  };
}

// Hook to fetch director's own observations
export function useDirectorObservations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['director-observations', user?.id],
    queryFn: async (): Promise<DirectorObservation[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('observacoes_diretoria_outdoor')
        .select(`
          *,
          outdoor:outdoors(
            code,
            location,
            pdv:pdvs(name)
          )
        `)
        .eq('diretor_id', user.id)
        .order('criada_em', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as DirectorObservation[];
    },
    enabled: !!user?.id,
  });
}

// Hook to fetch observations for a specific outdoor (for history display)
export function useOutdoorObservations(outdoorId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['outdoor-observations', outdoorId, user?.id],
    queryFn: async (): Promise<DirectorObservation[]> => {
      if (!outdoorId || !user?.id) return [];

      const { data, error } = await supabase
        .from('observacoes_diretoria_outdoor')
        .select('*')
        .eq('outdoor_id', outdoorId)
        .eq('diretor_id', user.id)
        .order('criada_em', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as DirectorObservation[];
    },
    enabled: !!outdoorId && !!user?.id,
  });
}

// Hook to create a new observation
export function useCreateDirectorObservation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ outdoorId, texto }: { outdoorId: string; texto: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Create the observation
      const { data: observation, error: obsError } = await supabase
        .from('observacoes_diretoria_outdoor')
        .insert({
          outdoor_id: outdoorId,
          diretor_id: user.id,
          texto,
        })
        .select()
        .single();

      if (obsError) throw obsError;

      // Get outdoor info for notification
      const { data: outdoor } = await supabase
        .from('outdoors')
        .select('code')
        .eq('id', outdoorId)
        .single();

      // Get director name
      const { data: director } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      // Send priority notification to all super_admins
      const { data: superAdmins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'super_admin')
        .eq('status', 'active');

      if (superAdmins) {
        for (const admin of superAdmins) {
          await supabase.from('notificacoes_sistema').insert({
            usuario_id: admin.id,
            tipo: 'prioritaria_diretoria',
            modulo: 'media',
            titulo: '🚨 Observação da Diretoria em Outdoor',
            mensagem: `Diretor ${director?.name || 'Diretoria'} fez um apontamento no outdoor ${outdoor?.code || outdoorId}`,
            url_acao: `/outdoor/${outdoorId}`,
            id_referencia: outdoorId,
            tipo_referencia: 'outdoor',
            prioridade: 'alta',
          });
        }
      }

      return observation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-observations'] });
      queryClient.invalidateQueries({ queryKey: ['outdoor-observations'] });
      showToast.success('Observação enviada ao Super Admin!');
    },
    onError: (error: any) => {
      showToast.error('Erro ao enviar observação', error.message);
    },
  });
}
