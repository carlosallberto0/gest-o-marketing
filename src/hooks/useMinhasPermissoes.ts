import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Permissao {
  modulo: string;
  recurso: string;
  acao: string;
  escopo: string;
}

function chave(p: Permissao) {
  return `${p.modulo}:${p.recurso}:${p.acao}:${p.escopo}`;
}

// Complementa useHasPermission.ts: aquele é 1 checagem por chamada (bom para
// pontos de uso isolados dentro de uma tela); este busca TODOS os grants do
// usuário em 1 RPC só, para o AppShell filtrar o menu inteiro sem 1 RPC por
// item de navegação. Ver comentário atualizado em useHasPermission.ts.
export function useMinhasPermissoes() {
  const query = useQuery({
    queryKey: ["minhas_permissoes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("minhas_permissoes");
      if (error) throw error;
      return new Set((data as Permissao[]).map(chave));
    },
  });

  function podeAcessar(modulo: string, recurso: string, acao: string, escopo: string) {
    return query.data?.has(chave({ modulo, recurso, acao, escopo })) ?? false;
  }

  return { ...query, podeAcessar };
}
