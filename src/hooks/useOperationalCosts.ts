import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OperationalCost {
  id: string;
  parametro: string;
  valor: number;
  unidade: string;
  descricao: string | null;
  atualizado_em: string;
  atualizado_por: string | null;
}

export interface RegionalCost {
  id: string;
  estado: string;
  multiplicador: number;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export function useOperationalCosts() {
  return useQuery({
    queryKey: ['operational-costs'],
    queryFn: async (): Promise<OperationalCost[]> => {
      const { data, error } = await supabase
        .from('config_custos_operacionais')
        .select('*')
        .order('parametro');

      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpdateOperationalCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ parametro, valor }: { parametro: string; valor: number }) => {
      const { data, error } = await supabase
        .from('config_custos_operacionais')
        .update({ 
          valor, 
          atualizado_em: new Date().toISOString() 
        })
        .eq('parametro', parametro)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-costs'] });
    },
    onError: (error) => {
      console.error('Error updating operational cost:', error);
      toast.error('Erro ao atualizar parâmetro de custo');
    },
  });
}

export function useRegionalCosts() {
  return useQuery({
    queryKey: ['regional-costs'],
    queryFn: async (): Promise<RegionalCost[]> => {
      const { data, error } = await supabase
        .from('custos_regionais')
        .select('*')
        .order('estado');

      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpdateRegionalCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ estado, multiplicador, observacao }: { 
      estado: string; 
      multiplicador: number; 
      observacao?: string 
    }) => {
      const { data, error } = await supabase
        .from('custos_regionais')
        .update({ multiplicador, observacao })
        .eq('estado', estado)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regional-costs'] });
    },
    onError: (error) => {
      console.error('Error updating regional cost:', error);
      toast.error('Erro ao atualizar multiplicador regional');
    },
  });
}

// Helper to get a specific parameter value
export function getOperationalCostValue(
  costs: OperationalCost[], 
  parametro: string
): number {
  const cost = costs.find(c => c.parametro === parametro);
  return cost?.valor ?? 0;
}
