import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MeuPerfil {
  nome: string;
  papel: string | null;
}

// usuarios.id === auth.users.id (perfil 1:1) — mesmo padrão de resolução já
// usado em EstudioColaborador.tsx (meuPdvIdQuery). Um usuário pode ter mais de
// um papel ativo (N:N); pega-se o primeiro encontrado, suficiente para exibição
// no header — upgrade trivial se isso virar problema real.
export function useMeuPerfil() {
  return useQuery({
    queryKey: ["meu_perfil"],
    queryFn: async (): Promise<MeuPerfil> => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Usuário não autenticado.");

      const { data, error } = await supabase
        .from("usuarios")
        .select("nome, usuario_papeis(is_active, papeis(nome))")
        .eq("id", user.id)
        .single();
      if (error) throw error;

      const papeisDoUsuario = data.usuario_papeis as Array<{
        is_active: boolean;
        papeis: { nome: string } | null;
      }>;
      const papelAtivo = papeisDoUsuario?.find((up) => up.is_active)?.papeis?.nome ?? null;
      return { nome: data.nome as string, papel: papelAtivo };
    },
  });
}
