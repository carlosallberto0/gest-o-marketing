import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Infraestrutura do Core, não de um módulo específico — has_permission() é a
// mesma RPC que qualquer fase pode precisar checar no frontend para 1 ponto
// de uso isolado dentro de uma tela (ex.: mostrar/esconder 1 botão). Para
// filtrar o menu inteiro por papel, use useMinhasPermissoes() em vez deste —
// ele busca todos os grants em 1 RPC só, evitando 1 chamada de
// has_permission() por item de navegação.
export function useHasPermission(modulo: string, recurso: string, acao: string, escopo: string) {
  return useQuery({
    queryKey: ["has_permission", modulo, recurso, acao, escopo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_permission", {
        p_modulo: modulo,
        p_recurso: recurso,
        p_acao: acao,
        p_escopo: escopo,
      });
      if (error) throw error;
      return data as boolean;
    },
  });
}
