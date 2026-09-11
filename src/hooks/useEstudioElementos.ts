import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
//
// Mesmos 10 valores de `estudio_template_areas.tipo_elemento_permitido`
// (migration 20260911140000_estudio_comunicacao.sql) — exportado daqui e
// reimportado em useEstudioTemplates.ts para a área, mesmo padrão de
// reimportar tipo entre hooks já usado em useAvaliacoesOutdoor.ts (import de
// `Outdoor` de useOutdoors.ts).
export type EstudioTipoElemento =
  | "imagem_produto"
  | "logo"
  | "selo"
  | "icone"
  | "grafico"
  | "texto_titulo"
  | "texto_preco"
  | "texto_descricao"
  | "texto_cta"
  | "texto_info";

export interface EstudioElemento {
  id: string;
  nome: string;
  tipo: EstudioTipoElemento;
  arquivo_url: string | null;
  thumbnail_url: string | null;
  tags: string[];
  is_active: boolean;
  enviado_por: string;
  created_at: string;
  updated_at: string;
}

interface EstudioElementosFiltros {
  tipo?: string;
  tag?: string;
}

const estudioElementosKeys = {
  all: ["estudio_elementos"] as const,
  list: (filtros?: EstudioElementosFiltros) => ["estudio_elementos", "list", filtros ?? {}] as const,
};

// RLS já filtra is_active = true (leitura livre a todo authenticated, mesma
// exceção de brand_library/estudio_templates) — sem filtro extra aqui.
// `tag` usa .contains em tags (text[]) — "tag está no array".
export function useEstudioElementos(filtros?: EstudioElementosFiltros) {
  return useQuery({
    queryKey: estudioElementosKeys.list(filtros),
    queryFn: async () => {
      let query = supabase.from("estudio_elementos").select("*").order("nome");
      if (filtros?.tipo) query = query.eq("tipo", filtros.tipo);
      if (filtros?.tag) query = query.contains("tags", [filtros.tag]);

      const { data, error } = await query;
      if (error) throw error;
      return data as EstudioElemento[];
    },
  });
}

// enviado_por nunca vem de parâmetro do chamador — a policy de INSERT exige
// enviado_por = auth.uid() (sem trigger que force isso nesta tabela), resolvido
// via supabase.auth.getUser() dentro do hook, mesmo padrão de
// useBrandLibrary.ts. arquivo_url/tipo coerentes são validados pelo CHECK
// estudio_elementos_arquivo_coerente no banco — não replicado aqui.
export function useCreateEstudioElemento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id?: string; // path de upload em estudio-elementos precisa bater com este id (policy de Storage exige {elemento_id}/{arquivo}) — passe o mesmo id usado no upload, gerado no cliente antes do insert.
      nome: string;
      tipo: EstudioTipoElemento;
      arquivo_url?: string;
      thumbnail_url?: string;
      tags?: string[];
    }) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Usuário não autenticado.");

      const { data, error } = await supabase
        .from("estudio_elementos")
        .insert({ ...input, enviado_por: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as EstudioElemento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estudioElementosKeys.all });
    },
  });
}

// Sem tipo/arquivo_url no input — mudar tipo ou substituir o arquivo depois de
// criado não faz sentido de produto (mesmo critério de useBrandLibrary.ts para
// `tipo`). Não é uma trava de banco: o CHECK estudio_elementos_arquivo_coerente
// só valida coerência tipo↔arquivo_url, não imutabilidade — é convenção deste
// hook, não imposição do schema.
export function useUpdateEstudioElemento() {
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
    }) => {
      const { data, error } = await supabase.from("estudio_elementos").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as EstudioElemento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estudioElementosKeys.all });
    },
  });
}

// Soft delete — sem DELETE físico nesta tabela nesta rodada (sem grant no
// banco, ver migration).
export function useDesativarEstudioElemento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("estudio_elementos")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as EstudioElemento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estudioElementosKeys.all });
    },
  });
}
