import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAlertToast } from '@/hooks/useAlertToast';
import { useAuth } from '@/contexts/AuthContext';

export interface Agencia {
  id: string;
  nome: string;
  contato_nome: string | null;
  contato_email: string | null;
  contato_telefone: string | null;
  especialidades: string[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgenciaDemanda {
  id: string;
  agencia_id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  status: string;
  prazo_entrega: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  agencia?: Agencia;
}

export interface AgenciaVideo {
  id: string;
  agencia_id: string;
  titulo: string;
  descricao: string | null;
  link_video: string;
  tags: string[];
  created_by: string | null;
  created_at: string;
  agencia?: Agencia;
}

export interface AgenciaFoto {
  id: string;
  agencia_id: string;
  titulo: string;
  descricao: string | null;
  link_album: string;
  tags: string[];
  created_by: string | null;
  created_at: string;
  agencia?: Agencia;
}

// Hook para Agências
export function useAgencias() {
  return useQuery({
    queryKey: ['agencias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencias')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data as Agencia[];
    },
  });
}

export function useCreateAgencia() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();

  return useMutation({
    mutationFn: async (agencia: Omit<Agencia, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('agencias')
        .insert(agencia)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencias'] });
      success('Agência criada com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao criar agência: ${error.message}`);
    },
  });
}

export function useUpdateAgencia() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();

  return useMutation({
    mutationFn: async ({ id, ...agencia }: Partial<Agencia> & { id: string }) => {
      const { data, error } = await supabase
        .from('agencias')
        .update(agencia)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencias'] });
      success('Agência atualizada com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao atualizar agência: ${error.message}`);
    },
  });
}

export function useDeleteAgencia() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agencias')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencias'] });
      success('Agência excluída com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao excluir agência: ${error.message}`);
    },
  });
}

// Hook para Demandas
export function useAgenciaDemandas() {
  return useQuery({
    queryKey: ['agencia-demandas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencia_demandas')
        .select('*, agencia:agencias(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AgenciaDemanda[];
    },
  });
}

export function useCreateAgenciaDemanda() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (demanda: Omit<AgenciaDemanda, 'id' | 'created_at' | 'updated_at' | 'agencia'>) => {
      const { data, error } = await supabase
        .from('agencia_demandas')
        .insert({ ...demanda, created_by: profile?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencia-demandas'] });
      success('Demanda criada com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao criar demanda: ${error.message}`);
    },
  });
}

export function useUpdateAgenciaDemanda() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();

  return useMutation({
    mutationFn: async ({ id, ...demanda }: Partial<AgenciaDemanda> & { id: string }) => {
      const { data, error } = await supabase
        .from('agencia_demandas')
        .update(demanda)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencia-demandas'] });
      success('Demanda atualizada com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao atualizar demanda: ${error.message}`);
    },
  });
}

// Hook para Vídeos
export function useAgenciaVideos() {
  return useQuery({
    queryKey: ['agencia-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencia_videos')
        .select('*, agencia:agencias(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AgenciaVideo[];
    },
  });
}

export function useCreateAgenciaVideo() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (video: Omit<AgenciaVideo, 'id' | 'created_at' | 'agencia'>) => {
      const { data, error } = await supabase
        .from('agencia_videos')
        .insert({ ...video, created_by: profile?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencia-videos'] });
      success('Vídeo cadastrado com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao cadastrar vídeo: ${error.message}`);
    },
  });
}

export function useDeleteAgenciaVideo() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agencia_videos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencia-videos'] });
      success('Vídeo excluído com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao excluir vídeo: ${error.message}`);
    },
  });
}

// Hook para Fotos
export function useAgenciaFotos() {
  return useQuery({
    queryKey: ['agencia-fotos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencia_fotos')
        .select('*, agencia:agencias(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AgenciaFoto[];
    },
  });
}

export function useCreateAgenciaFoto() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (foto: Omit<AgenciaFoto, 'id' | 'created_at' | 'agencia'>) => {
      const { data, error } = await supabase
        .from('agencia_fotos')
        .insert({ ...foto, created_by: profile?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencia-fotos'] });
      success('Álbum cadastrado com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao cadastrar álbum: ${error.message}`);
    },
  });
}

export function useDeleteAgenciaFoto() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agencia_fotos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencia-fotos'] });
      success('Álbum excluído com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao excluir álbum: ${error.message}`);
    },
  });
}
