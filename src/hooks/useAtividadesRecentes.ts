import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Rótulo humanizado por action de audit_logs — cobre as 9 actions de
// transição de status já gravadas pelas fases anteriores (Core até
// Estúdio). Ação não mapeada cai no fallback (mostra a action crua) em
// vez de sumir da lista — nunca esconder atividade real por falta de
// tradução.
const ACTION_LABELS: Record<string, string> = {
  aprovacao_item_transicao_status: "Item de aprovação atualizado",
  avaliacao_pdv_transicao_status: "Avaliação de PDV atualizada",
  campanha_transicao_status: "Campanha atualizada",
  demanda_criativa_transicao_status: "Demanda criativa atualizada",
  estudio_composicao_transicao_status: "Peça do Estúdio atualizada",
  manutencao_editada_sem_transicao: "Manutenção editada",
  manutencao_transicao_status: "Manutenção atualizada",
  plano_acao_transicao_status: "Plano de ação atualizado",
  solicitacao_material_transicao_status: "Solicitação de material atualizada",
};

interface AtividadeRecente {
  id: string;
  label: string;
  usuarioNome: string | null;
  createdAt: string;
}

export function useAtividadesRecentes(limite = 8) {
  return useQuery({
    queryKey: ["atividades_recentes", limite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, created_at, usuarios(nome)")
        .order("created_at", { ascending: false })
        .limit(limite);

      if (error) throw error;

      return (data ?? []).map((log): AtividadeRecente => ({
        id: log.id,
        label: ACTION_LABELS[log.action] ?? log.action,
        usuarioNome: (log.usuarios as { nome: string } | null)?.nome ?? null,
        createdAt: log.created_at,
      }));
    },
  });
}
