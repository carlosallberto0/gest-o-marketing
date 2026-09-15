// Histórico de peças do posto — fecha a Fase 6 (linha 56 da especificação:
// "... histórico de peças do posto"). Resolução de pdv_id é o mesmo padrão de
// EstudioColaborador.tsx (meuPdvIdQuery: usuarios.pdv_id; null -> usuário de
// gestão sem posto fixo, deixa escolher via Select com usePdvs()).
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEstudioComposicoes, type EstudioComposicao } from "@/hooks/useEstudioComposicoes";
import type { EstudioCanal } from "@/hooks/useEstudioTemplates";
import { usePdvs } from "@/hooks/usePdvs";
import { useFotoSignedUrl } from "@/hooks/useFoto";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_LABEL: Record<EstudioComposicao["status"], string> = {
  draft: "Rascunho",
  saved: "Finalizada",
  exported: "Exportada",
};

// Mesma lista de EstudioColaborador.tsx/EstudioTemplates.tsx — não exportada
// de lá, duplicada aqui (mesmo enum de canal, em contexto de histórico).
const CANAL_LABEL: Record<EstudioCanal, string> = {
  whatsapp: "WhatsApp",
  instagram_feed: "Instagram Feed",
  instagram_story: "Instagram Story",
  pdv_impresso: "PDV Impresso",
  email: "E-mail",
  led: "Faixa de LED",
  lona: "Faixa de Lona",
};

// Mesma paleta semântica de outros badges de status do projeto: neutro pro
// rascunho, sucesso pra finalizada, informativo pra já exportada.
const STATUS_BADGE_VARIANT: Record<EstudioComposicao["status"], BadgeProps["variant"]> = {
  draft: "outline",
  saved: "soft-success",
  exported: "soft-info",
};

// Fora do corpo do pai: cada card assina a própria signed URL de download
// (só quando exportada) — mesmo padrão de TemplateEscolhaCard em
// EstudioColaborador.tsx.
function HistoricoComposicaoCard({ composicao }: { composicao: EstudioComposicao }) {
  const { data: downloadUrl } = useFotoSignedUrl(
    "estudio-composicoes",
    composicao.status === "exported" ? composicao.export_file_url : null,
  );

  const canal = composicao.template?.categoria?.canal;
  const templateNome = composicao.template?.nome ?? "Template desativado";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{composicao.nome?.trim() || "(sem nome)"}</CardTitle>
        <Badge variant={STATUS_BADGE_VARIANT[composicao.status]}>{STATUS_LABEL[composicao.status]}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
        <p>
          {templateNome}
          {canal ? ` — ${CANAL_LABEL[canal]}` : ""}
        </p>
        <p>Atualizada em {new Date(composicao.updated_at).toLocaleDateString("pt-BR")}</p>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={`/estudio?composicao=${composicao.id}`}>Continuar editando</Link>
        </Button>
        {composicao.status === "exported" && downloadUrl && (
          <Button asChild size="sm">
            <a href={downloadUrl} target="_blank" rel="noreferrer">
              Baixar peça
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default function EstudioHistorico() {
  const [pdvSelecionadoId, setPdvSelecionadoId] = useState("");
  const { data: pdvs, isLoading: pdvsLoading } = usePdvs();
  const pdvsAtivos = (pdvs ?? []).filter((pdv) => pdv.status === "ativo");

  // pdv_id do usuário logado — mesma consulta pontual de EstudioColaborador.tsx
  // (não vira hook reutilizável em hooks/: só telas do Estúdio precisam decidir
  // entre "usar o pdv do colaborador" e "deixar quem não tem posto fixo escolher").
  const meuPdvIdQuery = useQuery({
    queryKey: ["estudio-historico-meu-pdv-id"],
    queryFn: async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Usuário não autenticado.");
      const { data, error } = await supabase.from("usuarios").select("pdv_id").eq("id", user.id).single();
      if (error) throw error;
      return (data.pdv_id as string | null) ?? null;
    },
  });

  const pdvIdResolvido = meuPdvIdQuery.data ?? (pdvSelecionadoId || undefined);

  const composicoesQuery = useEstudioComposicoes({ pdvId: pdvIdResolvido, enabled: !!pdvIdResolvido });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Histórico de Peças</h1>
        <p className="text-muted-foreground">Peças já montadas no Estúdio de Comunicação para este posto.</p>
      </div>

      {meuPdvIdQuery.isLoading ? (
        <Skeleton className="h-20 w-full max-w-md" />
      ) : meuPdvIdQuery.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-destructive">
            {meuPdvIdQuery.error instanceof Error
              ? meuPdvIdQuery.error.message
              : "Não foi possível identificar o posto do usuário."}
          </p>
          <Button variant="outline" size="sm" onClick={() => meuPdvIdQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : meuPdvIdQuery.data === null && !pdvSelecionadoId ? (
        <div className="flex flex-col gap-3 sm:w-80">
          <p className="text-sm text-muted-foreground">
            Seu usuário não tem um posto fixo — escolha de qual PDV você quer ver o histórico.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="historico-pdv-select">PDV</Label>
            <Select value={pdvSelecionadoId} onValueChange={setPdvSelecionadoId}>
              <SelectTrigger id="historico-pdv-select">
                <SelectValue placeholder={pdvsLoading ? "Carregando…" : "Selecione o PDV"} />
              </SelectTrigger>
              <SelectContent>
                {pdvsAtivos.map((pdv) => (
                  <SelectItem key={pdv.id} value={pdv.id}>
                    {pdv.codigo} — {pdv.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : composicoesQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : composicoesQuery.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-destructive">
            {composicoesQuery.error instanceof Error
              ? composicoesQuery.error.message
              : "Não foi possível carregar o histórico."}
          </p>
          <Button variant="outline" size="sm" onClick={() => composicoesQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (composicoesQuery.data ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">Nenhuma peça criada ainda neste posto.</p>
          <Button asChild>
            <Link to="/estudio">Criar peça</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(composicoesQuery.data ?? []).map((composicao) => (
            <HistoricoComposicaoCard key={composicao.id} composicao={composicao} />
          ))}
        </div>
      )}
    </div>
  );
}
