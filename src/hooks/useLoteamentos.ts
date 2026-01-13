import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAlertToast } from '@/hooks/useAlertToast';

export interface LoteamentoLancamento {
  id: string;
  nome: string;
  localizacao: string;
  status: string;
  total_lotes: number | null;
  lotes_vendidos: number;
  data_lancamento: string | null;
  links_drive: string[];
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoteamentoPagamento {
  id: string;
  lancamento_id: string;
  descricao: string;
  valor: number;
  tipo: string | null;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  comprovante_url: string | null;
  created_at: string;
  updated_at: string;
  lancamento?: LoteamentoLancamento;
}

export interface LoteamentoContrato {
  id: string;
  lancamento_id: string;
  cliente_nome: string;
  cliente_cpf: string | null;
  cliente_telefone: string | null;
  cliente_email: string | null;
  lote_numero: string;
  quadra: string | null;
  valor: number;
  entrada: number | null;
  parcelas: number | null;
  status: string;
  data_assinatura: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  lancamento?: LoteamentoLancamento;
}

// Hook para Lançamentos
export function useLoteamentosLancamentos() {
  return useQuery({
    queryKey: ['loteamentos-lancamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loteamentos_lancamentos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LoteamentoLancamento[];
    },
  });
}

export function useCreateLoteamentoLancamento() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();

  return useMutation({
    mutationFn: async (lancamento: Omit<LoteamentoLancamento, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('loteamentos_lancamentos')
        .insert(lancamento)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loteamentos-lancamentos'] });
      success('Lançamento criado com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao criar lançamento: ${error.message}`);
    },
  });
}

export function useUpdateLoteamentoLancamento() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();

  return useMutation({
    mutationFn: async ({ id, ...lancamento }: Partial<LoteamentoLancamento> & { id: string }) => {
      const { data, error } = await supabase
        .from('loteamentos_lancamentos')
        .update(lancamento)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loteamentos-lancamentos'] });
      success('Lançamento atualizado com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao atualizar lançamento: ${error.message}`);
    },
  });
}

export function useDeleteLoteamentoLancamento() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('loteamentos_lancamentos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loteamentos-lancamentos'] });
      success('Lançamento excluído com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao excluir lançamento: ${error.message}`);
    },
  });
}

// Hook para Pagamentos
export function useLoteamentosPagamentos() {
  return useQuery({
    queryKey: ['loteamentos-pagamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loteamentos_pagamentos')
        .select('*, lancamento:loteamentos_lancamentos(*)')
        .order('data_vencimento', { ascending: true });
      
      if (error) throw error;
      return data as LoteamentoPagamento[];
    },
  });
}

export function useCreateLoteamentoPagamento() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();

  return useMutation({
    mutationFn: async (pagamento: Omit<LoteamentoPagamento, 'id' | 'created_at' | 'updated_at' | 'lancamento'>) => {
      const { data, error } = await supabase
        .from('loteamentos_pagamentos')
        .insert(pagamento)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loteamentos-pagamentos'] });
      success('Pagamento registrado com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao registrar pagamento: ${error.message}`);
    },
  });
}

export function useUpdateLoteamentoPagamento() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();

  return useMutation({
    mutationFn: async ({ id, ...pagamento }: Partial<LoteamentoPagamento> & { id: string }) => {
      const { data, error } = await supabase
        .from('loteamentos_pagamentos')
        .update(pagamento)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loteamentos-pagamentos'] });
      success('Pagamento atualizado com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao atualizar pagamento: ${error.message}`);
    },
  });
}

// Hook para Contratos
export function useLoteamentosContratos() {
  return useQuery({
    queryKey: ['loteamentos-contratos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loteamentos_contratos')
        .select('*, lancamento:loteamentos_lancamentos(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LoteamentoContrato[];
    },
  });
}

export function useCreateLoteamentoContrato() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();

  return useMutation({
    mutationFn: async (contrato: Omit<LoteamentoContrato, 'id' | 'created_at' | 'updated_at' | 'lancamento'>) => {
      const { data, error } = await supabase
        .from('loteamentos_contratos')
        .insert(contrato)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loteamentos-contratos'] });
      success('Contrato criado com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao criar contrato: ${error.message}`);
    },
  });
}

export function useUpdateLoteamentoContrato() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();

  return useMutation({
    mutationFn: async ({ id, ...contrato }: Partial<LoteamentoContrato> & { id: string }) => {
      const { data, error } = await supabase
        .from('loteamentos_contratos')
        .update(contrato)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loteamentos-contratos'] });
      success('Contrato atualizado com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao atualizar contrato: ${error.message}`);
    },
  });
}

export function useDeleteLoteamentoContrato() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('loteamentos_contratos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loteamentos-contratos'] });
      success('Contrato excluído com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao excluir contrato: ${error.message}`);
    },
  });
}
