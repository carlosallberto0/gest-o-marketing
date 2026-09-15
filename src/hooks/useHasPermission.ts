import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Infraestrutura do Core, não de um módulo específico — has_permission() é a
// mesma RPC que qualquer fase pode precisar checar no frontend (ver comentário
// em AuthContext.tsx: "Papel/permissão vem do banco via has_permission()
// quando telas precisarem checar — não replicar essa lógica em JS"). Um hook
// genérico, uma chamada RPC por ponto de uso — sem contexto global de
// permissão nem cache de "todas as permissões do usuário" (abstração
// especulativa não pedida).
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
