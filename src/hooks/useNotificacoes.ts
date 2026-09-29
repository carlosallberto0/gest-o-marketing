import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NotificacaoUsuario {
  id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
}

const notificacoesKeys = { minhas: ["notificacoes", "minhas"] as const };

// RLS (notificacoes_select) já filtra usuario_id = auth.uid() — sem filtro
// extra aqui, mesmo padrão de usePdvs.ts. is_active = true: soft delete padrão
// do projeto.
export function useMinhasNotificacoes() {
  return useQuery({
    queryKey: notificacoesKeys.minhas,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("id, titulo, mensagem, lida, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as NotificacaoUsuario[];
    },
  });
}

export function useMarcarNotificacaoLida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificacoesKeys.minhas });
    },
  });
}
