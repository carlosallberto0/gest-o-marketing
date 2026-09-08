import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

export interface CustoExterno {
  id: string;
  descricao: string;
  tipo: 'material' | 'transporte' | 'mao_obra' | 'outro';
  valor_total: number;
  fornecedor_id: string;
  data_compra: string;
  teve_perdas: boolean;
  perda_descricao: string | null;
  perda_valor: number;
  comprovante_url: string;
  service_order_id: string | null;
  alocacao_tipo: 'unico' | 'multiplo';
  created_at: string;
  created_by: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined data
  fornecedor?: {
    id: string;
    name: string;
  };
  alocacoes?: CustoAlocacao[];
}

export interface CustoAlocacao {
  id: string;
  custo_externo_id: string;
  posto_id: string;
  outdoor_id: string | null;
  percentual_alocacao: number;
  valor_alocado: number;
  created_at: string;
  // Joined data
  posto?: {
    id: string;
    name: string;
    code: string;
  };
  outdoor?: {
    id: string;
    code: string;
  };
}

export interface CreateCustoExternoInput {
  descricao: string;
  tipo: 'material' | 'transporte' | 'mao_obra' | 'outro';
  valor_total: number;
  fornecedor_id: string;
  data_compra: string;
  teve_perdas?: boolean;
  perda_descricao?: string;
  perda_valor?: number;
  comprovante_url: string;
  service_order_id?: string;
  alocacao_tipo?: 'unico' | 'multiplo';
  alocacoes?: {
    posto_id: string;
    outdoor_id?: string;
    percentual_alocacao: number;
  }[];
}

export function useCustosExternos(filters?: {
  fornecedorId?: string;
  tipo?: string;
  dataInicio?: string;
  dataFim?: string;
}) {
  return useQuery({
    queryKey: ['custos-externos', filters],
    queryFn: async (): Promise<CustoExterno[]> => {
      let query = supabase
        .from('custos_externos')
        .select(`
          *,
          fornecedor:suppliers(id, name),
          alocacoes:custo_alocacao(
            *,
            posto:pdvs(id, name, code),
            outdoor:outdoors(id, code)
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.fornecedorId) {
        query = query.eq('fornecedor_id', filters.fornecedorId);
      }
      if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters?.dataInicio) {
        query = query.gte('data_compra', filters.dataInicio);
      }
      if (filters?.dataFim) {
        query = query.lte('data_compra', filters.dataFim);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as CustoExterno[];
    },
  });
}

export function useCustoExterno(id: string | undefined) {
  return useQuery({
    queryKey: ['custo-externo', id],
    enabled: !!id,
    queryFn: async (): Promise<CustoExterno | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('custos_externos')
        .select(`
          *,
          fornecedor:suppliers(id, name),
          alocacoes:custo_alocacao(
            *,
            posto:pdvs(id, name, code),
            outdoor:outdoors(id, code)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as CustoExterno;
    },
  });
}

export function useCreateCustoExterno() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCustoExternoInput) => {
      const { alocacoes, ...custoData } = input;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Create the custo externo
      const { data: custo, error: custoError } = await supabase
        .from('custos_externos')
        .insert({
          ...custoData,
          created_by: user.id,
        })
        .select()
        .single();

      if (custoError) throw custoError;

      // Create allocations if provided
      if (alocacoes && alocacoes.length > 0) {
        const custoLiquido = custoData.valor_total - (custoData.perda_valor || 0);
        
        const alocacoesData = alocacoes.map(a => ({
          custo_externo_id: custo.id,
          posto_id: a.posto_id,
          outdoor_id: a.outdoor_id || null,
          percentual_alocacao: a.percentual_alocacao,
          valor_alocado: (custoLiquido * a.percentual_alocacao) / 100,
        }));

        const { error: alocError } = await supabase
          .from('custo_alocacao')
          .insert(alocacoesData);

        if (alocError) throw alocError;
      }

      return custo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custos-externos'] });
      showToast.success('Custo registrado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating custo externo:', error);
      showToast.error('Erro ao registrar custo');
    },
  });
}

export function useUpdateCustoExterno() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustoExterno> & { id: string }) => {
      const { data, error } = await supabase
        .from('custos_externos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['custos-externos'] });
      queryClient.invalidateQueries({ queryKey: ['custo-externo', variables.id] });
      showToast.success('Custo atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating custo externo:', error);
      showToast.error('Erro ao atualizar custo');
    },
  });
}

export function useDeleteCustoExterno() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('custos_externos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custos-externos'] });
      showToast.success('Custo excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting custo externo:', error);
      showToast.error('Erro ao excluir custo');
    },
  });
}

// Hook for updating allocations
export function useUpdateAlocacoes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ custoId, alocacoes }: {
      custoId: string;
      alocacoes: {
        posto_id: string;
        outdoor_id?: string;
        percentual_alocacao: number;
        valor_alocado: number;
      }[];
    }) => {
      // Delete existing allocations
      const { error: deleteError } = await supabase
        .from('custo_alocacao')
        .delete()
        .eq('custo_externo_id', custoId);

      if (deleteError) throw deleteError;

      // Insert new allocations
      const alocacoesData = alocacoes.map(a => ({
        custo_externo_id: custoId,
        posto_id: a.posto_id,
        outdoor_id: a.outdoor_id || null,
        percentual_alocacao: a.percentual_alocacao,
        valor_alocado: a.valor_alocado,
      }));

      const { error: insertError } = await supabase
        .from('custo_alocacao')
        .insert(alocacoesData);

      if (insertError) throw insertError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['custos-externos'] });
      queryClient.invalidateQueries({ queryKey: ['custo-externo', variables.custoId] });
      showToast.success('Rateio atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating alocacoes:', error);
      showToast.error('Erro ao atualizar rateio');
    },
  });
}

// Hook for getting costs by PDV
export function useCustosPorPosto(postoId: string | undefined, periodo?: { inicio: string; fim: string }) {
  return useQuery({
    queryKey: ['custos-por-posto', postoId, periodo],
    enabled: !!postoId,
    queryFn: async () => {
      if (!postoId) return [];

      let query = supabase
        .from('custo_alocacao')
        .select(`
          *,
          custo:custos_externos(
            *,
            fornecedor:suppliers(id, name)
          )
        `)
        .eq('posto_id', postoId);

      if (periodo?.inicio) {
        query = query.gte('custo.data_compra', periodo.inicio);
      }
      if (periodo?.fim) {
        query = query.lte('custo.data_compra', periodo.fim);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out items where custo is null (soft deleted)
      return (data || []).filter(item => item.custo && !item.custo.deleted_at);
    },
  });
}

// Hook for KPIs
export function useCustosExternosKPIs(periodo?: { inicio: string; fim: string }) {
  return useQuery({
    queryKey: ['custos-externos-kpis', periodo],
    queryFn: async () => {
      let query = supabase
        .from('custos_externos')
        .select('valor_total, perda_valor, teve_perdas')
        .is('deleted_at', null);

      if (periodo?.inicio) {
        query = query.gte('data_compra', periodo.inicio);
      }
      if (periodo?.fim) {
        query = query.lte('data_compra', periodo.fim);
      }

      const { data, error } = await query;

      if (error) throw error;

      const custos = data || [];
      const totalBruto = custos.reduce((sum, c) => sum + Number(c.valor_total), 0);
      const totalPerdas = custos.reduce((sum, c) => sum + Number(c.perda_valor || 0), 0);
      const totalLiquido = totalBruto - totalPerdas;
      const registros = custos.length;
      const comPerdas = custos.filter(c => c.teve_perdas).length;

      return {
        totalBruto,
        totalPerdas,
        totalLiquido,
        registros,
        comPerdas,
      };
    },
  });
}
