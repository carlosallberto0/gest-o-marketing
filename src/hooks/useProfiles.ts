import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UserRole = 'super_admin' | 'admin' | 'director' | 'manager' | 'collaborator' | 'supplier' | 'coordenador_compras';

export interface Profile {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  role: UserRole;
  modules: ('media' | 'merchandising')[];
  pdv_id: string | null;
  pdv_name?: string | null;
  status: string;
  pode_aprovar_os?: boolean;
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
        role: profile.role as UserRole,
        modules: profile.modules,
        pdv_id: profile.pdv_id,
        pdv_name: profile.pdvs?.name || null,
        status: profile.status,
        pode_aprovar_os: profile.pode_aprovar_os ?? false,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      }));
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      cpf: string | null;
      role: UserRole;
      modules: ('media' | 'merchandising')[];
      pdv_id: string | null;
      status: string;
      pode_aprovar_os?: boolean;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: data.name,
          cpf: data.cpf,
          role: data.role,
          modules: data.modules,
          pdv_id: data.pdv_id,
          status: data.status,
          pode_aprovar_os: data.pode_aprovar_os ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Usuário atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar usuário');
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      // Update the profile status to inactive
      // Full user deletion from auth.users requires admin privileges
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

export function useReactivateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Usuário reativado com sucesso!');
    },
    onError: (error) => {
      console.error('Error reactivating profile:', error);
      toast.error('Erro ao reativar usuário');
    },
  });
}
