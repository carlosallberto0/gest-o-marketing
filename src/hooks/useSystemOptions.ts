import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export interface SystemOption {
  id: string;
  modulo: string;
  campo: string;
  valor: string;
  rotulo: string;
  ordem: number;
  is_active: boolean;
}

// Catálogo genérico de opção de campo (ADR-009) — RLS decide quem lê cada
// combinação de modulo/campo; aqui é só o filtro de negócio (ativo, ordenado).
export function useSystemOptions(modulo: string, campo: string) {
  return useQuery({
    queryKey: ["system_options", modulo, campo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_options")
        .select("id, modulo, campo, valor, rotulo, ordem, is_active")
        .eq("modulo", modulo)
        .eq("campo", campo)
        .eq("is_active", true)
        .order("ordem");
      if (error) throw error;
      return data as SystemOption[];
    },
  });
}
