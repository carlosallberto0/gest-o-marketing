import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EstudioTipoElemento } from "@/hooks/useEstudioElementos";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export type EstudioCanal =
  | "whatsapp"
  | "instagram_feed"
  | "instagram_story"
  | "pdv_impresso"
  | "email"
  | "led"
  | "lona";

export interface EstudioCategoria {
  id: string;
  nome: string;
  canal: EstudioCanal;
  icone: string | null;
  ordem: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// SEM campo `canal` — estudio_templates não tem coluna própria, o canal vem
// via join com estudio_categorias.canal (decisão de normalização documentada
// na migration 20260911140000_estudio_comunicacao.sql). Quem precisa do canal
// junto usa EstudioTemplateComCategoria; quem só precisa da lista cruza por
// categoria_id na tela.
export interface EstudioTemplate {
  id: string;
  nome: string;
  descricao: string | null;
  categoria_id: string;
  imagem_base_url: string;
  thumbnail_url: string | null;
  largura_px: number;
  altura_px: number;
  versao: number;
  is_active: boolean;
  criado_por: string;
  campanha_id: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface EstudioTemplateComCategoria extends EstudioTemplate {
  categoria: { nome: string; canal: EstudioCanal } | null;
}

export interface EstudioTemplateArea {
  id: string;
  template_id: string;
  nome: string;
  tipo_elemento_permitido: EstudioTipoElemento;
  x_percent: number;
  y_percent: number;
  largura_percent: number;
  altura_percent: number;
  posicao_livre: boolean;
  fonte: string | null;
  tamanho_fonte_px: number | null;
  obrigatorio: boolean;
  max_elementos: number;
  z_index: number;
  notas: string | null;
  created_at: string;
}

interface EstudioTemplatesFiltros {
  categoriaId?: string;
}

const estudioCategoriasKeys = {
  all: ["estudio_categorias"] as const,
};

const estudioTemplatesKeys = {
  all: ["estudio_templates"] as const,
  list: (filtros?: EstudioTemplatesFiltros) => ["estudio_templates", "list", filtros ?? {}] as const,
  detail: (id: string) => ["estudio_templates", "detail", id] as const,
};

const estudioTemplateAreasKeys = {
  byTemplate: (templateId: string) => ["estudio_template_areas", templateId] as const,
};

// ---------------------------------------------------------------------------
// estudio_categorias
// ---------------------------------------------------------------------------

// RLS já filtra is_active = true — sem filtro extra aqui, mesmo comentário de
// usePdvs.ts/useBrandLibrary.ts.
export function useEstudioCategorias() {
  return useQuery({
    queryKey: estudioCategoriasKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase.from("estudio_categorias").select("*").order("ordem").order("id");
      if (error) throw error;
      return data as EstudioCategoria[];
    },
  });
}

export function useCreateEstudioCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { nome: string; canal: EstudioCanal; icone?: string; ordem?: number }) => {
      const { data, error } = await supabase.from("estudio_categorias").insert(input).select().single();
      if (error) throw error;
      return data as EstudioCategoria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estudioCategoriasKeys.all });
    },
  });
}

// `canal` editável aqui de propósito: a migration não trava canal como
// imutável (sem trigger, policy de UPDATE só exige o grant de edição) — travar
// isso seria decisão de produto, não de segurança, e não foi pedida. Como o
// canal é lido via embed em estudio_templates, mudar aqui também invalida a
// lista de templates (o embed ficaria desatualizado em cache).
export function useUpdateEstudioCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      nome?: string;
      canal?: EstudioCanal;
      icone?: string;
      ordem?: number;
    }) => {
      const { data, error } = await supabase.from("estudio_categorias").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as EstudioCategoria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estudioCategoriasKeys.all });
      queryClient.invalidateQueries({ queryKey: estudioTemplatesKeys.all });
    },
  });
}

// Soft delete. Também invalida templates: uma categoria desativada some do
// embed dos templates que a referenciam (RLS da relação embutida também
// filtra is_active = true), então a lista com embed fica desatualizada em
// cache sem essa invalidação.
export function useDesativarEstudioCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("estudio_categorias")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as EstudioCategoria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estudioCategoriasKeys.all });
      queryClient.invalidateQueries({ queryKey: estudioTemplatesKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// estudio_templates
// ---------------------------------------------------------------------------

// FK simples (categoria_id é a única FK de estudio_templates para
// estudio_categorias) — embed direto pelo nome da tabela, sem precisar do
// nome explícito da constraint. Alias `categoria` pra ficar mais legível no
// consumo da tela.
const TEMPLATE_SELECT_COM_CATEGORIA = "*, categoria:estudio_categorias(nome, canal)";

export function useEstudioTemplates(filtros?: EstudioTemplatesFiltros) {
  return useQuery({
    queryKey: estudioTemplatesKeys.list(filtros),
    queryFn: async () => {
      let query = supabase.from("estudio_templates").select(TEMPLATE_SELECT_COM_CATEGORIA).order("ordem").order("id");
      if (filtros?.categoriaId) query = query.eq("categoria_id", filtros.categoriaId);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as EstudioTemplateComCategoria[];
    },
  });
}

export function useEstudioTemplate(id: string) {
  return useQuery({
    queryKey: estudioTemplatesKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estudio_templates")
        .select(TEMPLATE_SELECT_COM_CATEGORIA)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as EstudioTemplateComCategoria;
    },
    enabled: !!id,
  });
}

// criado_por nunca vem de parâmetro do chamador — diferente de
// estudio_composicoes (que tem trigger before_insert forçando o valor), aqui
// a policy de INSERT só confere `criado_por = auth.uid()` no WITH CHECK, sem
// trigger — o hook precisa resolver e enviar o valor, ou o INSERT é rejeitado
// pela RLS. versao/is_active/ordem ficam no default do banco.
export function useCreateEstudioTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id?: string; // path de upload em estudio-templates precisa bater com este id (policy de Storage exige {template_id}/{arquivo}) — passe o mesmo id usado no upload, gerado no cliente antes do insert.
      nome: string;
      descricao?: string;
      categoria_id: string;
      imagem_base_url: string;
      thumbnail_url?: string;
      largura_px: number;
      altura_px: number;
      campanha_id?: string;
    }) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Usuário não autenticado.");

      const { data, error } = await supabase
        .from("estudio_templates")
        .insert({ ...input, criado_por: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as EstudioTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estudioTemplatesKeys.all });
    },
  });
}

// Sem criado_por/versao/is_active no input — edição geral não reatribui
// autoria nem versão, e desativação tem hook dedicado.
export function useUpdateEstudioTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      nome?: string;
      descricao?: string;
      categoria_id?: string;
      imagem_base_url?: string;
      thumbnail_url?: string;
      largura_px?: number;
      altura_px?: number;
      campanha_id?: string;
      ordem?: number;
    }) => {
      const { data, error } = await supabase.from("estudio_templates").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as EstudioTemplate;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: estudioTemplatesKeys.all });
      queryClient.invalidateQueries({ queryKey: estudioTemplatesKeys.detail(variables.id) });
    },
  });
}

// Soft delete.
export function useDesativarEstudioTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("estudio_templates")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as EstudioTemplate;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: estudioTemplatesKeys.all });
      queryClient.invalidateQueries({ queryKey: estudioTemplatesKeys.detail(id) });
    },
  });
}

// DELETE físico — restrito a super_admin pela policy (grant
// 'estudio/templates/excluir/rede_toda'). Sem CASCADE em
// estudio_composicoes.template_id: se existir composição referenciando este
// template, o banco rejeita o DELETE (FK RESTRICT) e o erro sobe pro
// chamador. Não tratamos nenhum dos dois casos aqui de propósito — deixamos o
// erro do banco propagar.
export function useExcluirEstudioTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("estudio_templates").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: estudioTemplatesKeys.all });
      queryClient.invalidateQueries({ queryKey: estudioTemplatesKeys.detail(id) });
    },
  });
}

// ---------------------------------------------------------------------------
// estudio_template_areas — sem is_active/updated_at (lista de colunas
// exaustiva da migration). INSERT/UPDATE/DELETE usam o mesmo grant de edição
// de template, sem exigir super_admin (ver decisão na migration).
// ---------------------------------------------------------------------------

export function useEstudioTemplateAreas(templateId: string) {
  return useQuery({
    queryKey: estudioTemplateAreasKeys.byTemplate(templateId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estudio_template_areas")
        .select("*")
        .eq("template_id", templateId)
        .order("z_index");
      if (error) throw error;
      return data as EstudioTemplateArea[];
    },
    enabled: !!templateId,
  });
}

export function useCreateEstudioTemplateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      template_id: string;
      nome: string;
      tipo_elemento_permitido: EstudioTipoElemento;
      x_percent: number;
      y_percent: number;
      largura_percent: number;
      altura_percent: number;
      posicao_livre?: boolean;
      fonte?: string | null;
      tamanho_fonte_px?: number | null;
      obrigatorio?: boolean;
      max_elementos?: number;
      z_index?: number;
      notas?: string;
    }) => {
      const { data, error } = await supabase.from("estudio_template_areas").insert(input).select().single();
      if (error) throw error;
      return data as EstudioTemplateArea;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: estudioTemplateAreasKeys.byTemplate(data.template_id) });
    },
  });
}

// template_id não entra no payload de update — mover uma área pra outro
// template não é um caso de uso desta tela; recebido só para saber qual
// chave de cache invalidar.
export function useUpdateEstudioTemplateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      template_id,
      ...input
    }: {
      id: string;
      template_id: string;
      nome?: string;
      tipo_elemento_permitido?: EstudioTipoElemento;
      x_percent?: number;
      y_percent?: number;
      largura_percent?: number;
      altura_percent?: number;
      posicao_livre?: boolean;
      fonte?: string | null;
      tamanho_fonte_px?: number | null;
      obrigatorio?: boolean;
      max_elementos?: number;
      z_index?: number;
      notas?: string;
    }) => {
      const { data, error } = await supabase
        .from("estudio_template_areas")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { area: data as EstudioTemplateArea, template_id };
    },
    onSuccess: ({ template_id }) => {
      queryClient.invalidateQueries({ queryKey: estudioTemplateAreasKeys.byTemplate(template_id) });
    },
  });
}

// DELETE físico — configuração estrutural do layout do template, não uma
// entidade de negócio (ver decisão na migration: mesmo grant de editar,
// sem exigir super_admin, diferente do DELETE de estudio_templates).
export function useExcluirEstudioTemplateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, template_id }: { id: string; template_id: string }) => {
      const { error } = await supabase.from("estudio_template_areas").delete().eq("id", id);
      if (error) throw error;
      return template_id;
    },
    onSuccess: (template_id) => {
      queryClient.invalidateQueries({ queryKey: estudioTemplateAreasKeys.byTemplate(template_id) });
    },
  });
}
