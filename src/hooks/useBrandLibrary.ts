import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
//
// `tipo` é CHECK fixo (6 categorias ESTRUTURAIS do produto — a tela sabe
// renderizar/filtrar diferente por tipo), DIFERENTE do `tipo`/`canal` de
// demandas_criativas (texto livre, sem catálogo). Pode usar Select com estas
// 6 opções fixas hardcoded no frontend, sem vir de system_options.
export type BrandLibraryTipo =
  | "fonte"
  | "guia_cores"
  | "manual_marca"
  | "arte_campanha"
  | "material_institucional"
  | "outro";

export interface BrandLibraryItem {
  id: string;
  nome: string;
  tipo: BrandLibraryTipo;
  arquivo_url: string;
  thumbnail_url: string | null;
  tags: string[];
  versao: number;
  is_active: boolean;
  enviado_por: string;
  campanha_id: string | null;
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

interface BrandLibraryFiltros {
  tipo?: string;
}

const brandLibraryKeys = {
  all: ["brand_library"] as const,
  list: (filtros?: BrandLibraryFiltros) => ["brand_library", "list", filtros ?? {}] as const,
};

// RLS já filtra is_active = true (leitura livre a todo authenticated, exceção
// deliberada ao fail-closed documentada na migration) — o select não reforça
// isso, mesmo espírito de "RLS decide o que volta" dos hooks vizinhos.
export function useBrandLibrary(filtros?: BrandLibraryFiltros) {
  return useQuery({
    queryKey: brandLibraryKeys.list(filtros),
    queryFn: async () => {
      let query = supabase.from("brand_library").select("*").order("nome");
      if (filtros?.tipo) query = query.eq("tipo", filtros.tipo);

      const { data, error } = await query;
      if (error) throw error;
      return data as BrandLibraryItem[];
    },
  });
}

// enviado_por nunca vem de parâmetro do chamador — a policy de INSERT exige
// enviado_por = auth.uid(), resolvido via supabase.auth.getUser() dentro do
// hook (mesmo padrão de avaliador_id/solicitante_id em fases anteriores).
// versao/is_active ficam no default do banco.
export function useCreateBrandLibraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      nome: string;
      tipo: BrandLibraryItem["tipo"];
      arquivo_url: string;
      thumbnail_url?: string;
      tags?: string[];
      campanha_id?: string;
      descricao?: string;
    }) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Usuário não autenticado.");

      const { data, error } = await supabase
        .from("brand_library")
        .insert({ ...input, enviado_por: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as BrandLibraryItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandLibraryKeys.all });
    },
  });
}

// Sem tipo/versao/is_active no input — mudar tipo depois de criado não faz
// sentido de produto, e versão nova é registro novo (decisão documentada na
// migration, não lógica de "nova versão do mesmo item" nesta rodada).
export function useUpdateBrandLibraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      nome?: string;
      thumbnail_url?: string;
      tags?: string[];
      campanha_id?: string;
      descricao?: string;
    }) => {
      const { data, error } = await supabase.from("brand_library").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as BrandLibraryItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandLibraryKeys.all });
    },
  });
}

// Soft delete — is_active é o único caminho de exclusão nesta tabela, sem
// DELETE físico nesta rodada (não pedido, evita grant/policy morta).
export function useDesativarBrandLibraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("brand_library")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as BrandLibraryItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandLibraryKeys.all });
    },
  });
}
