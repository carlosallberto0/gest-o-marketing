import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  role: 'super_admin' | 'admin' | 'director' | 'manager' | 'collaborator' | 'supplier';
  modules: ('media' | 'merchandising')[];
  pdv_id: string | null;
  pdv_name?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async (): Promise<Profile[]> => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          *,
          pdvs:pdv_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (profiles || []).map(profile => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        cpf: profile.cpf,
        role: profile.role,
        modules: profile.modules,
        pdv_id: profile.pdv_id,
        pdv_name: profile.pdvs?.name || null,
        status: profile.status,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      }));
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      // First update the profile status to inactive
      // Note: Full deletion requires admin auth privileges
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Usuário desativado com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting profile:', error);
      toast.error('Erro ao desativar usuário');
    },
  });
}
