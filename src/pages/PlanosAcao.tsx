import { useState, type FormEvent } from "react";
import {
  usePlanosAcao,
  useUpdatePlanoAcao,
  useTransicionarStatusPlanoAcao,
  type PlanoAcao,
  type PlanoAcaoStatus,
} from "@/hooks/usePlanosAcao";
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
  DialogFooter,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<PlanoAcaoStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_VARIANT: Record<PlanoAcaoStatus, NonNullable<BadgeProps["variant"]>> = {
  pendente: "soft-warning",
  em_andamento: "soft-info",
  concluido: "soft-success",
  cancelado: "soft-danger",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABEL) as PlanoAcaoStatus[];

function isAtrasado(plano: PlanoAcao) {
  if (plano.status === "concluido" || plano.status === "cancelado") return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return plano.prazo < hoje;
}

interface TransicaoStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano: PlanoAcao | null;
  transicionarStatus: ReturnType<typeof useTransicionarStatusPlanoAcao>;
}

// Fora do corpo de PlanosAcao: dentro, o formulário perderia estado a cada
// render do componente pai (ex.: ao chegar dado novo do React Query).
function TransicaoStatusDialog({ open, onOpenChange, plano, transicionarStatus }: TransicaoStatusDialogProps) {
  const [status, setStatus] = useState<PlanoAcaoStatus>(plano?.status ?? "pendente");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const busy = submitting || transicionarStatus.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !plano) return;

    setFormError(null);
    setSubmitting(true);
    try {
      await transicionarStatus.mutateAsync({ id: plano.id, status });
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao mudar status do plano de ação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mudar status</DialogTitle>
          <DialogDescription>
            {plano ? `Status atual: ${STATUS_LABEL[plano.status]}.` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="plano-transicao-status">Novo status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as PlanoAcaoStatus)}>
              <SelectTrigger id="plano-transicao-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {STATUS_LABEL[valor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Salvando…" : "Confirmar mudança"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditarPlanoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano: PlanoAcao | null;
  updatePlano: ReturnType<typeof useUpdatePlanoAcao>;
}

// Fora do corpo do pai pelo mesmo motivo do dialog de transição.
function EditarPlanoDialog({ open, onOpenChange, plano, updatePlano }: EditarPlanoDialogProps) {
  const [descricao, setDescricao] = useState(plano?.descricao ?? "");
  const [prazo, setPrazo] = useState(plano?.prazo ?? "");
  const [notas, setNotas] = useState(plano?.notas ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const busy = submitting || updatePlano.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !plano) return;

    setFormError(null);

    if (!descricao.trim()) {
      setFormError("Descrição é obrigatória.");
      return;
    }
    if (!prazo) {
      setFormError("Prazo é obrigatório.");
      return;
    }

    setSubmitting(true);
    try {
      await updatePlano.mutateAsync({
        id: plano.id,
        descricao: descricao.trim(),
        prazo,
        notas: notas.trim() || null,
      });
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao editar plano de ação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar plano de ação</DialogTitle>
          <DialogDescription>Atualize a descrição, o prazo ou as notas do plano.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="plano-editar-descricao">Descrição</Label>
            <Textarea
              id="plano-editar-descricao"
              required
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="plano-editar-prazo">Prazo</Label>
            <Input
              id="plano-editar-prazo"
              type="date"
              required
              value={prazo}
              onChange={(event) => setPrazo(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="plano-editar-notas">Notas (opcional)</Label>
            <Textarea
              id="plano-editar-notas"
              value={notas ?? ""}
              onChange={(event) => setNotas(event.target.value)}
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PlanosAcao() {
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const { data: planos, isLoading } = usePlanosAcao(
    statusFiltro === "todos" ? undefined : { status: statusFiltro },
  );
  const updatePlano = useUpdatePlanoAcao();
  const transicionarStatus = useTransicionarStatusPlanoAcao();

  const [transicaoAlvo, setTransicaoAlvo] = useState<PlanoAcao | null>(null);
  const [editarAlvo, setEditarAlvo] = useState<PlanoAcao | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Planos de Ação</h1>
        <p className="text-muted-foreground">Planos de ação criados a partir de avaliações de PDV.</p>
      </div>

      <div className="flex flex-col gap-2 sm:w-64">
        <Label htmlFor="planos-acao-filtro-status">Filtrar por status</Label>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger id="planos-acao-filtro-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_OPTIONS.map((valor) => (
              <SelectItem key={valor} value={valor}>
                {STATUS_LABEL[valor]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : planos && planos.length > 0 ? (
              planos.map((plano) => (
                <TableRow key={plano.id}>
                  <TableCell className="max-w-xs truncate font-medium" title={plano.descricao}>
                    {plano.descricao}
                  </TableCell>
                  <TableCell className={cn(isAtrasado(plano) && "font-medium text-destructive")}>
                    {new Date(plano.prazo).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[plano.status]}>{STATUS_LABEL[plano.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditarAlvo(plano)}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setTransicaoAlvo(plano)}>
                        Mudar status
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    {statusFiltro === "todos"
                      ? "Nenhum plano de ação registrado ainda. Planos são criados a partir de uma resposta de avaliação de PDV."
                      : "Nenhum plano de ação com esse status."}
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TransicaoStatusDialog
        key={transicaoAlvo?.id ?? "closed"}
        open={!!transicaoAlvo}
        onOpenChange={(open) => {
          if (!open) setTransicaoAlvo(null);
        }}
        plano={transicaoAlvo}
        transicionarStatus={transicionarStatus}
      />

      <EditarPlanoDialog
        key={editarAlvo?.id ?? "closed"}
        open={!!editarAlvo}
        onOpenChange={(open) => {
          if (!open) setEditarAlvo(null);
        }}
        plano={editarAlvo}
        updatePlano={updatePlano}
      />
    </div>
  );
}
