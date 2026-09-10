import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  status: "ativo" | "inativo";
  pdv_id: string | null;
  created_at: string;
  updated_at: string;
}

const usuariosKeys = {
  all: ["usuarios"] as const,
};

// RLS (usuarios_select) decide o que volta, fail-closed por papel/escopo — sem filtro extra aqui.
export function useUsuarios() {
  return useQuery({
    queryKey: usuariosKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase.from("usuarios").select("*").order("nome");
      if (error) throw error;
      return data as Usuario[];
    },
  });
}
