import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export interface EstudioComposicao {
  id: string;
  template_id: string;
  pdv_id: string;
  criado_por: string;
  nome: string | null;
  status: "draft" | "saved" | "exported";
  composition_data: Record<string, unknown>;
  export_file_url: string | null;
  versao: number;
  created_at: string;
  updated_at: string;
}

export interface EstudioComposicaoElemento {
  id: string;
  composicao_id: string;
  area_id: string;
  elemento_id: string | null;
  valor_texto: string | null;
  deslocamento_x_px: number;
  deslocamento_y_px: number;
  fator_escala: number;
  created_at: string;
}

interface EstudioComposicoesFiltros {
  pdvId?: string;
  status?: string;
  templateId?: string;
}

const estudioComposicoesKeys = {
  all: ["estudio_composicoes"] as const,
  list: (filtros?: EstudioComposicoesFiltros) => ["estudio_composicoes", "list", filtros ?? {}] as const,
  detail: (id: string) => ["estudio_composicoes", "detail", id] as const,
};

const estudioComposicaoElementosKeys = {
  list: (composicaoId: string) => ["estudio_composicao_elementos", composicaoId] as const,
};

// RLS decide o que volta (rede_toda vs. proprio_pdv) — filtros aqui são
// refinamento de tela, não segurança. Ordenado por updated_at desc: composição
// é reeditável (sem trava de transição, ver migration), então "editada mais
// recentemente" importa mais que "criada mais recentemente" pra um histórico
// de trabalho em andamento.
export function useEstudioComposicoes(filtros?: EstudioComposicoesFiltros) {
  return useQuery({
    queryKey: estudioComposicoesKeys.list(filtros),
    queryFn: async () => {
      let query = supabase.from("estudio_composicoes").select("*").order("updated_at", { ascending: false });
      if (filtros?.pdvId) query = query.eq("pdv_id", filtros.pdvId);
      if (filtros?.status) query = query.eq("status", filtros.status);
      if (filtros?.templateId) query = query.eq("template_id", filtros.templateId);

      const { data, error } = await query;
      if (error) throw error;
      return data as EstudioComposicao[];
    },
  });
}

export function useEstudioComposicao(id: string) {
  return useQuery({
    queryKey: estudioComposicoesKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("estudio_composicoes").select("*").eq("id", id).single();
      if (error) throw error;
      return data as EstudioComposicao;
    },
    enabled: !!id,
  });
}

// criado_por/status/composition_data/export_file_url nunca vão no payload —
// criado_por é forçado por trigger (before_insert_forcar_criado_por) e status
// nasce 'draft' pelo default de coluna. pdv_id precisa bater com
// usuario_pdv_id() (ou o chamador ter escopo rede_toda) — validado pela RLS,
// não replicado aqui.
export function useCreateEstudioComposicao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { template_id: string; pdv_id: string; nome?: string }) => {
      const { data, error } = await supabase.from("estudio_composicoes").insert(input).select().single();
      if (error) throw error;
      return data as EstudioComposicao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estudioComposicoesKeys.all });
    },
  });
}

// Uma mutation genérica só, sem split "editar geral" x "transição de status"
// (diferente de outras fases, ex. useAvaliacoesPdv/useConcluirAvaliacaoPdv):
// lá o split existe porque um trigger trava a sequência de transição e a
// conclusão dispara cálculo próprio no banco. Aqui NÃO há trigger de trava —
// a migration é explícita (backlog 1.3.03: "exportar não impede reedição")
// em não restringir old.status -> new.status, e nome/status/composition_data/
// export_file_url são todos regidos pela mesma policy de UPDATE (RLS comum,
// sem regra condicional por campo). Sem trigger para dividir contra, split
// aqui seria abstração sem motivo. `nome` obrigatório ao virar saved/exported
// é validado pelo trigger estudio_composicoes_before_update — erro propaga
// sem checagem duplicada em JS (validação amigável fica pra tela).
export function useUpdateEstudioComposicao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      nome?: string;
      status?: EstudioComposicao["status"];
      composition_data?: Record<string, unknown>;
      export_file_url?: string;
    }) => {
      const { data, error } = await supabase.from("estudio_composicoes").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as EstudioComposicao;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: estudioComposicoesKeys.all });
      queryClient.invalidateQueries({ queryKey: estudioComposicoesKeys.detail(data.id) });
    },
  });
}

export function useEstudioComposicaoElementos(composicaoId: string) {
  return useQuery({
    queryKey: estudioComposicaoElementosKeys.list(composicaoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estudio_composicao_elementos")
        .select("*")
        .eq("composicao_id", composicaoId);
      if (error) throw error;
      return data as EstudioComposicaoElemento[];
    },
    enabled: !!composicaoId,
  });
}

// NÃO é upsert por onConflict (diferente de useSalvarRespostaChecklist): a
// migration confirma que `estudio_composicao_elementos` não tem
// unique(composicao_id, area_id) — só PK (id) e o CHECK
// estudio_composicao_elementos_um_valor (exatamente um entre elemento_id/
// valor_texto). Sem chave de conflito natural, onConflict não tem o que usar.
// Implementado como select-then-branch: existe linha pra essa
// composicao_id+area_id -> UPDATE por id; senão -> INSERT. Ver resumo final
// para a observação sobre a constraint ausente (não é conserto de migration
// aqui). Não força null no campo contrário quando só elemento_id/valor_texto
// é enviado — um update de só posição/escala (drag) não deve apagar o
// conteúdo já salvo da área; troca de tipo dentro da mesma área não é um caso
// esperado (tipo_elemento_permitido da área já fixa isso).
export function useSalvarComposicaoElemento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      composicao_id: string;
      area_id: string;
      elemento_id?: string;
      valor_texto?: string;
      deslocamento_x_px?: number;
      deslocamento_y_px?: number;
      fator_escala?: number;
    }) => {
      const { data: existente, error: selectError } = await supabase
        .from("estudio_composicao_elementos")
        .select("id")
        .eq("composicao_id", input.composicao_id)
        .eq("area_id", input.area_id)
        .maybeSingle();
      if (selectError) throw selectError;

      if (existente) {
        const { data, error } = await supabase
          .from("estudio_composicao_elementos")
          .update(input)
          .eq("id", existente.id)
          .select()
          .single();
        if (error) throw error;
        return data as EstudioComposicaoElemento;
      }

      const { data, error } = await supabase.from("estudio_composicao_elementos").insert(input).select().single();
      if (error) throw error;
      return data as EstudioComposicaoElemento;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: estudioComposicaoElementosKeys.list(data.composicao_id) });
    },
  });
}

// Remover um elemento de uma área (usuário decide não preencher mais aquela
// área) — DELETE físico, a tabela tem grant/policy de delete (ver migration).
export function useRemoverComposicaoElemento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; composicao_id: string }) => {
      const { error } = await supabase.from("estudio_composicao_elementos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: estudioComposicaoElementosKeys.list(variables.composicao_id) });
    },
  });
}
