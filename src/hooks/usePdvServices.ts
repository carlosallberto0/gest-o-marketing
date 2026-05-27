import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

export function useSetPdvServices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pdvId, servicoKeys }: { pdvId: string; servicoKeys: string[] }) => {
      const { error: delError } = await supabase
        .from('pdv_servicos')
        .delete()
        .eq('pdv_id', pdvId);
      if (delError) throw delError;

      if (servicoKeys.length > 0) {
        const rows = servicoKeys.map((k) => ({ pdv_id: pdvId, servico_key: k }));
        const { error: insError } = await supabase.from('pdv_servicos').insert(rows);
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['public-network'] });
      qc.invalidateQueries({ queryKey: ['admin-network'] });
      showToast.success('Serviços atualizados.');
    },
    onError: (e: any) => {
      console.error(e);
      showToast.error('Erro ao atualizar serviços.');
    },
  });
}

export function useUpdatePdvNetworkFields() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pdvId,
      bandeira,
      cnpj,
      phone,
    }: {
      pdvId: string;
      bandeira?: string | null;
      cnpj?: string | null;
      phone?: string | null;
    }) => {
      const { error } = await supabase
        .from('pdvs')
        .update({ bandeira, cnpj, phone, updated_at: new Date().toISOString() })
        .eq('id', pdvId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['public-network'] });
      qc.invalidateQueries({ queryKey: ['admin-network'] });
      showToast.success('Posto atualizado.');
    },
    onError: (e: any) => {
      console.error(e);
      showToast.error('Erro ao atualizar posto.');
    },
  });
}
