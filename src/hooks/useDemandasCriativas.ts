import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sem `Database` gerado ainda (ver client.ts) — tipo local até o primeiro
// `supabase gen types` do projeto novo existir.
export type DemandaCriativaPrioridade = "urgente" | "alta" | "normal" | "baixa";

export type DemandaCriativaStatus =
  | "solicitada"
  | "analise"
  | "aguardando_info"
  | "em_criacao"
  | "revisao_interna"
  | "aguardando_aprovacao"
  | "aprovada"
  | "em_producao"
  | "concluida"
  | "cancelada";

export interface DemandaCriativa {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string | null;
  solicitante_id: string;
  pdv_solicitante_id: string | null;
  responsavel_id: string | null;
  prioridade: DemandaCriativaPrioridade;
  status: DemandaCriativaStatus;
  prazo: string | null;
  canal: string | null;
  brief: string | null;
  aprovacao_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemandaCriativaArquivo {
  id: string;
  demanda_id: string;
  enviado_por: string;
  arquivo_url: string;
  nome_arquivo: string;
  tamanho_bytes: number | null;
  versao: number;
  arquivo_final: boolean;
  created_at: string;
}

export interface DemandaCriativaComentario {
  id: string;
  demanda_id: string;
  autor_id: string;
  conteudo: string;
  created_at: string;
}

export interface DemandaCriativaHistoricoItem {
  id: string;
  demanda_id: string;
  alterado_por: string | null;
  status_antigo: DemandaCriativaStatus | null;
  status_novo: DemandaCriativaStatus;
  nota: string | null;
  created_at: string;
}

interface DemandasCriativasFiltros {
  status?: string;
  prioridade?: string;
  responsavelId?: string;
}

const demandasCriativasKeys = {
  all: ["demandas_criativas"] as const,
  list: (filtros?: DemandasCriativasFiltros) => ["demandas_criativas", "list", filtros ?? {}] as const,
  detail: (id: string) => ["demandas_criativas", "detail", id] as const,
};

const demandaCriativaArquivosKeys = {
  list: (demandaId: string) => ["demanda_criativa_arquivos", "list", demandaId] as const,
};

const demandaCriativaComentariosKeys = {
  list: (demandaId: string) => ["demanda_criativa_comentarios", "list", demandaId] as const,
};

const demandaCriativaHistoricoKeys = {
  list: (demandaId: string) => ["demanda_criativa_historico", "list", demandaId] as const,
};

// RLS decide o que volta (dono da demanda vs. rede_toda vs. proprio_pdv) — os
// filtros aqui são refinamento de tela, não segurança.
export function useDemandasCriativas(filtros?: DemandasCriativasFiltros) {
  return useQuery({
    queryKey: demandasCriativasKeys.list(filtros),
    queryFn: async () => {
      let query = supabase.from("demandas_criativas").select("*").order("created_at", { ascending: false });
      if (filtros?.status) query = query.eq("status", filtros.status);
      if (filtros?.prioridade) query = query.eq("prioridade", filtros.prioridade);
      if (filtros?.responsavelId) query = query.eq("responsavel_id", filtros.responsavelId);

      const { data, error } = await query;
      if (error) throw error;
      return data as DemandaCriativa[];
    },
  });
}

export function useDemandaCriativa(id: string) {
  return useQuery({
    queryKey: demandasCriativasKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("demandas_criativas").select("*").eq("id", id).single();
      if (error) throw error;
      return data as DemandaCriativa;
    },
    enabled: !!id,
  });
}

// solicitante_id/status/aprovacao_item_id nunca vão no payload — o trigger
// demandas_criativas_before_insert sobrescreve solicitante_id = auth.uid() e
// força status = 'solicitada'; a policy de INSERT (WITH CHECK) exige
// aprovacao_item_id null. tipo fica fora do input de propósito (texto livre
// sem catálogo/system_options nesta rodada — mesma pendência já registrada
// para materiais.tipo/aprovacao_itens.tipo, não reintroduzir).
export function useCreateDemandaCriativa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      titulo: string;
      descricao?: string;
      pdv_solicitante_id?: string;
      prioridade?: DemandaCriativa["prioridade"];
      prazo?: string;
      canal?: string;
      brief?: string;
    }) => {
      const { data, error } = await supabase.from("demandas_criativas").insert(input).select().single();
      if (error) throw error;
      return data as DemandaCriativa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: demandasCriativasKeys.all });
    },
  });
}

// Edição geral de campo — sem status (ver useTransicionarStatusDemandaCriativa)
// e sem aprovacao_item_id (ver useVincularAprovacaoDemanda). solicitante_id/
// pdv_solicitante_id nem entram no input: são imutáveis no banco
// (demandas_criativas_before_update rejeita qualquer tentativa de mudar).
export function useUpdateDemandaCriativa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      titulo?: string;
      descricao?: string;
      responsavel_id?: string;
      prioridade?: DemandaCriativa["prioridade"];
      prazo?: string;
      canal?: string;
      brief?: string;
    }) => {
      const { data, error } = await supabase.from("demandas_criativas").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as DemandaCriativa;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: demandasCriativasKeys.all });
      queryClient.invalidateQueries({ queryKey: demandasCriativasKeys.detail(variables.id) });
    },
  });
}

// Mutation genérica de transição — a máquina de estado (10 status, mapa
// completo no topo da migration) é validada no trigger
// demandas_criativas_before_update, não aqui; erro de transição inválida
// propaga sem mascarar. Sem `nota`: o banco não tem de onde tirar esse valor
// nesta rodada (demanda_criativa_historico.nota fica sempre NULL, decisão
// documentada na migration) — não inventar o parâmetro.
export function useTransicionarStatusDemandaCriativa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DemandaCriativa["status"] }) => {
      const { data, error } = await supabase
        .from("demandas_criativas")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as DemandaCriativa;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: demandasCriativasKeys.all });
      queryClient.invalidateQueries({ queryKey: demandasCriativasKeys.detail(variables.id) });
      // O trigger grava esta transição em demanda_criativa_historico — a
      // timeline desta demanda realmente depende deste UPDATE.
      queryClient.invalidateQueries({ queryKey: demandaCriativaHistoricoKeys.list(variables.id) });
    },
  });
}

// Só grava o vínculo — quem cria o aprovacao_itens correspondente é a tela,
// reaproveitando os hooks de useAprovacoes.ts (Fase 4), antes de chamar este
// hook. Passa pela mesma policy de UPDATE única (criativa/demandas/editar/
// rede_toda) — vínculo em INSERT é sempre forçado a null (ver migration).
export function useVincularAprovacaoDemanda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, aprovacao_item_id }: { id: string; aprovacao_item_id: string }) => {
      const { data, error } = await supabase
        .from("demandas_criativas")
        .update({ aprovacao_item_id })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as DemandaCriativa;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: demandasCriativasKeys.all });
      queryClient.invalidateQueries({ queryKey: demandasCriativasKeys.detail(variables.id) });
    },
  });
}

export function useDemandaCriativaArquivos(demandaId: string) {
  return useQuery({
    queryKey: demandaCriativaArquivosKeys.list(demandaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demanda_criativa_arquivos")
        .select("*")
        .eq("demanda_id", demandaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DemandaCriativaArquivo[];
    },
    enabled: !!demandaId,
  });
}

// enviado_por nunca vem de parâmetro do chamador — a policy de INSERT exige
// enviado_por = auth.uid() (sem impersonação), e não há trigger que derive
// essa coluna aqui. Mesmo padrão de avaliador_id/solicitante_id em fases
// anteriores: resolvido via supabase.auth.getUser() dentro do hook.
export function useAdicionarArquivoDemanda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      demanda_id: string;
      arquivo_url: string;
      nome_arquivo: string;
      tamanho_bytes?: number;
      versao?: number;
      arquivo_final?: boolean;
    }) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Usuário não autenticado.");

      const { data, error } = await supabase
        .from("demanda_criativa_arquivos")
        .insert({ ...input, enviado_por: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as DemandaCriativaArquivo;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: demandaCriativaArquivosKeys.list(variables.demanda_id) });
    },
  });
}

export function useDemandaCriativaComentarios(demandaId: string) {
  return useQuery({
    queryKey: demandaCriativaComentariosKeys.list(demandaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demanda_criativa_comentarios")
        .select("*")
        .eq("demanda_id", demandaId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DemandaCriativaComentario[];
    },
    enabled: !!demandaId,
  });
}

// autor_id nunca vem de parâmetro do chamador — mesmo padrão de enviado_por acima.
export function useAdicionarComentarioDemanda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { demanda_id: string; conteudo: string }) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Usuário não autenticado.");

      const { data, error } = await supabase
        .from("demanda_criativa_comentarios")
        .insert({ ...input, autor_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as DemandaCriativaComentario;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: demandaCriativaComentariosKeys.list(variables.demanda_id) });
    },
  });
}

// Insert-only pelo trigger SECURITY DEFINER (demandas_criativas_before_update)
// — sem GRANT/policy de INSERT pro cliente nesta tabela, então não existe
// mutation de escrita aqui de propósito.
export function useDemandaCriativaHistorico(demandaId: string) {
  return useQuery({
    queryKey: demandaCriativaHistoricoKeys.list(demandaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demanda_criativa_historico")
        .select("*")
        .eq("demanda_id", demandaId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DemandaCriativaHistoricoItem[];
    },
    enabled: !!demandaId,
  });
}
