import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

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
  temp_password: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async (): Promise<Profile[]> => {
      // Selecionar apenas campos necessários, excluindo temp_password, access_token, etc.
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id, name, email, cpf, role, modules, pdv_id, status,
          pode_aprovar_os, created_at, updated_at,
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
        temp_password: null, // Não buscar do banco por segurança
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
      showToast.success('Usuário atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      showToast.error('Erro ao atualizar usuário');
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      // Update the profile status to inactive
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      showToast.success('Usuário desativado com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting profile:', error);
      showToast.error('Erro ao desativar usuário');
    },
  });
}

export function usePermanentDeleteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: profileId },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erro ao excluir usuário');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao excluir usuário');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      showToast.success('Usuário excluído permanentemente!');
    },
    onError: (error: Error) => {
      console.error('Error permanently deleting profile:', error);
      showToast.error(error.message || 'Erro ao excluir usuário permanentemente');
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
      showToast.success('Usuário reativado com sucesso!');
    },
    onError: (error) => {
      console.error('Error reactivating profile:', error);
      showToast.error('Erro ao reativar usuário');
    },
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { userId },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erro ao resetar senha');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao resetar senha');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      showToast.success('Senha resetada com sucesso!', `Nova senha: ${data.newPassword}`);
    },
    onError: (error: Error) => {
      console.error('Error resetting password:', error);
      showToast.error(error.message || 'Erro ao resetar senha');
    },
  });
}
