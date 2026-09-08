import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  useAvaliacoesOutdoor,
  useCreateAvaliacaoOutdoor,
  type AvaliacaoOutdoor,
} from "@/hooks/useAvaliacoesOutdoor";
import { useUploadFoto, useFotoSignedUrl } from "@/hooks/useFoto";
import type { Outdoor } from "@/hooks/useOutdoors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mesmo enum de Outdoors.tsx (status_operacional / status_resultante
// compartilham os três valores) — duplicado aqui de propósito, dois arquivos
// não acoplados por uma constante compartilhada só para isto.
const STATUS_LABEL: Record<AvaliacaoOutdoor["status_resultante"], string> = {
  operacional: "Operacional",
  nao_operacional: "Não operacional",
  pendente_avaliacao: "Pendente de avaliação",
};

const STATUS_VARIANT: Record<AvaliacaoOutdoor["status_resultante"], NonNullable<BadgeProps["variant"]>> = {
  operacional: "soft-success",
  nao_operacional: "soft-danger",
  pendente_avaliacao: "soft-warning",
};

// Fora do corpo do dialog: cada instância chama o hook de signed URL para o
// seu próprio path, nunca dentro de um .map() do componente pai.
function AvaliacaoFotoThumb({ path }: { path: string }) {
  const { data: url, isLoading } = useFotoSignedUrl("outdoor-fotos", path);
  if (isLoading) return <Skeleton className="h-14 w-14 shrink-0 rounded-md" />;
  if (!url) return null;
  return (
    <img
      src={url}
      alt="Foto da avaliação do outdoor"
      className="h-14 w-14 shrink-0 rounded-md border border-border object-cover"
    />
  );
}

interface AvaliacoesOutdoorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outdoor: Outdoor;
}

export function AvaliacoesOutdoorDialog({ open, onOpenChange, outdoor }: AvaliacoesOutdoorDialogProps) {
  const { data: avaliacoes, isLoading } = useAvaliacoesOutdoor(outdoor.id);
  const createAvaliacao = useCreateAvaliacaoOutdoor();
  const uploadFoto = useUploadFoto("outdoor-fotos");

  const [statusResultante, setStatusResultante] = useState<AvaliacaoOutdoor["status_resultante"]>("operacional");
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const busy = submitting || createAvaliacao.isPending || uploadFoto.isPending;

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setFormError(null);
    if (statusResultante === "nao_operacional" && !motivo.trim()) {
      setFormError("Informe o motivo da avaliação.");
      return;
    }

    setSubmitting(true);
    try {
      const fotos: string[] = [];
      for (const file of files) {
        const path = await uploadFoto.mutateAsync({ entidadeId: outdoor.id, file });
        fotos.push(path);
      }
      await createAvaliacao.mutateAsync({
        outdoor_id: outdoor.id,
        status_resultante: statusResultante,
        motivo: statusResultante === "nao_operacional" ? motivo.trim() : null,
        observacoes: observacoes.trim() || null,
        fotos,
      });
      setStatusResultante("operacional");
      setMotivo("");
      setObservacoes("");
      setFiles([]);
      setFileInputKey((key) => key + 1);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao registrar avaliação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Avaliações — {outdoor.codigo}</DialogTitle>
          <DialogDescription>{outdoor.localizacao}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : avaliacoes && avaliacoes.length > 0 ? (
            avaliacoes.map((avaliacao) => (
              <div key={avaliacao.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">
                    {new Date(avaliacao.data_avaliacao).toLocaleDateString("pt-BR")}
                  </span>
                  <Badge variant={STATUS_VARIANT[avaliacao.status_resultante]}>
                    {STATUS_LABEL[avaliacao.status_resultante]}
                  </Badge>
                </div>
                {avaliacao.motivo && <p className="text-sm text-foreground">{avaliacao.motivo}</p>}
                {avaliacao.observacoes && (
                  <p className="text-sm text-muted-foreground">{avaliacao.observacoes}</p>
                )}
                {avaliacao.fotos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {avaliacao.fotos.map((path) => (
                      <AvaliacaoFotoThumb key={path} path={path} />
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma avaliação registrada ainda para este outdoor.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-border pt-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="avaliacao-status">Status resultante</Label>
            <Select
              value={statusResultante}
              onValueChange={(value) => setStatusResultante(value as AvaliacaoOutdoor["status_resultante"])}
            >
              <SelectTrigger id="avaliacao-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operacional">Operacional</SelectItem>
                <SelectItem value="nao_operacional">Não operacional</SelectItem>
                <SelectItem value="pendente_avaliacao">Pendente de avaliação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {statusResultante === "nao_operacional" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="avaliacao-motivo">Motivo</Label>
              <Textarea
                id="avaliacao-motivo"
                required
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="avaliacao-observacoes">Observações (opcional)</Label>
            <Textarea
              id="avaliacao-observacoes"
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="avaliacao-fotos">Fotos (opcional)</Label>
            <Input
              key={fileInputKey}
              id="avaliacao-fotos"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesChange}
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" disabled={busy} className="w-full sm:w-auto sm:self-end">
            {busy ? "Registrando…" : "Registrar avaliação"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
