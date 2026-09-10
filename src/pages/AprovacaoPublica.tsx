import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useAprovacaoPorToken, useResponderAprovacao } from "@/hooks/useAprovacaoPublica";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Decisao = "approved" | "rejected" | "revision_requested";

const DECISAO_LABEL: Record<Decisao, string> = {
  approved: "Aprovar",
  rejected: "Rejeitar",
  revision_requested: "Solicitar revisão",
};

// Página pública /aprovacao/:token — sem AppShell/ProtectedRoute/sessão. O
// próprio container centralizado substitui o layout do app.
export default function AprovacaoPublica() {
  const { token } = useParams<{ token: string }>();
  const { data: aprovacao, isLoading, error } = useAprovacaoPorToken(token);
  const responder = useResponderAprovacao();

  const [decisao, setDecisao] = useState<Decisao>("approved");
  const [comentario, setComentario] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [decisaoRegistrada, setDecisaoRegistrada] = useState<Decisao | null>(null);

  const jaRespondido = error instanceof Error && /respondid/i.test(error.message);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || responder.isPending || !token) return;

    setFormError(null);
    if (decisao !== "approved" && !comentario.trim()) {
      setFormError("Comentário é obrigatório para esta decisão.");
      return;
    }

    setSubmitting(true);
    try {
      await responder.mutateAsync({ token, decisao, comentario: comentario.trim() || undefined });
      setDecisaoRegistrada(decisao);
    } catch {
      // Erro fica em responder.error, exibido abaixo — usuário pode tentar de novo.
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !jaRespondido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Não foi possível abrir a aprovação</CardTitle>
          </CardHeader>
          <CardContent>
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (decisaoRegistrada || jaRespondido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Obrigado, sua decisão foi registrada.</CardTitle>
          </CardHeader>
          {decisaoRegistrada && (
            <CardContent>
              <p className="text-sm text-muted-foreground">Decisão: {DECISAO_LABEL[decisaoRegistrada]}</p>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  if (!aprovacao) return null;

  const busy = submitting || responder.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{aprovacao.titulo}</CardTitle>
          <CardDescription>Olá, {aprovacao.revisor.nome}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {aprovacao.tipo && <p className="text-sm text-muted-foreground">Tipo: {aprovacao.tipo}</p>}
          {aprovacao.descricao && <p className="text-sm text-foreground">{aprovacao.descricao}</p>}

          {aprovacao.preview_url_assinada && (
            <img
              src={aprovacao.preview_url_assinada}
              alt={`Pré-visualização de ${aprovacao.titulo}`}
              className="w-full rounded-md border border-border object-cover"
            />
          )}

          {aprovacao.arquivo_url_assinada && (
            <a
              href={aprovacao.arquivo_url_assinada}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary underline"
            >
              Baixar arquivo original
            </a>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-border pt-4" noValidate>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-foreground">Decisão</legend>
              <RadioGroup value={decisao} onValueChange={(value) => setDecisao(value as Decisao)}>
                {(Object.keys(DECISAO_LABEL) as Decisao[]).map((valor) => (
                  <div key={valor} className="flex items-center gap-2">
                    <RadioGroupItem value={valor} id={`decisao-${valor}`} />
                    <Label htmlFor={`decisao-${valor}`}>{DECISAO_LABEL[valor]}</Label>
                  </div>
                ))}
              </RadioGroup>
            </fieldset>

            <div className="flex flex-col gap-2">
              <Label htmlFor="aprovacao-comentario">
                Comentário {decisao !== "approved" && <span>* (obrigatório)</span>}
              </Label>
              <Textarea
                id="aprovacao-comentario"
                value={comentario}
                onChange={(event) => setComentario(event.target.value)}
                aria-required={decisao !== "approved"}
              />
            </div>

            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            {responder.error && (
              <p role="alert" className="text-sm text-destructive">
                {responder.error instanceof Error ? responder.error.message : "Erro ao registrar decisão."}
              </p>
            )}

            <Button type="submit" disabled={busy}>
              {busy ? "Enviando…" : "Confirmar decisão"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
