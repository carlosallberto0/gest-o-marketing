import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateUserInput {
  name: string;
  email: string;
  cpf?: string;
  role: 'super_admin' | 'admin' | 'director' | 'manager' | 'collaborator' | 'supplier';
  modules: ('media' | 'merchandising')[];
  pdvId?: string;
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('create-user', {
        body: input,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create user');
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Usuário criado com sucesso!', {
        description: `Senha temporária: ${data.tempPassword}`,
        duration: 10000,
      });
    },
    onError: (error: Error) => {
      console.error('Error creating user:', error);
      if (error.message.includes('already been registered')) {
        toast.error('Este email já está registrado');
      } else {
        toast.error('Erro ao criar usuário: ' + error.message);
      }
    },
  });
}