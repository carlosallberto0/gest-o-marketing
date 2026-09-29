import { useEffect, useState, type FormEvent } from "react";
import {
  useCampanhas,
  useCreateCampanha,
  useUpdateCampanha,
  useTransicionarStatusCampanha,
  type Campanha,
  type CampanhaStatus,
} from "@/hooks/useCampanhas";
import { usePdvs } from "@/hooks/usePdvs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

const STATUS_LABEL: Record<CampanhaStatus, string> = {
  planejada: "Planejada",
  ativa: "Ativa",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

const STATUS_VARIANT: Record<CampanhaStatus, NonNullable<BadgeProps["variant"]>> = {
  planejada: "soft-info",
  ativa: "soft-success",
  encerrada: "outline",
  cancelada: "soft-danger",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABEL) as CampanhaStatus[];

function formatPeriodo(dataInicio: string, dataFim: string) {
  const inicio = new Date(dataInicio).toLocaleDateString("pt-BR");
  const fim = new Date(dataFim).toLocaleDateString("pt-BR");
  return `${inicio} – ${fim}`;
}

interface CampanhaFormValues {
  nome: string;
  data_inicio: string;
  data_fim: string;
  pdvs_alvo: string[];
}

interface CampanhaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campanha: Campanha | null;
  pdvsAtivos: { id: string; nome: string; codigo: string }[];
  onSubmit: (values: CampanhaFormValues) => void;
  submitting: boolean;
  error: string | null;
}

// Fora do corpo de Campanhas: dentro, o formulário perderia estado a cada
// render do pai (ex.: chegada de dado novo do React Query).
function CampanhaFormDialog({
  open,
  onOpenChange,
  campanha,
  pdvsAtivos,
  onSubmit,
  submitting,
  error,
}: CampanhaFormDialogProps) {
  const [nome, setNome] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [pdvsAlvo, setPdvsAlvo] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Reidrata o formulário sempre que o dialog abre (criação zera, edição pré-preenche).
  useEffect(() => {
    if (open) {
      setNome(campanha?.nome ?? "");
      setDataInicio(campanha?.data_inicio ?? "");
      setDataFim(campanha?.data_fim ?? "");
      setPdvsAlvo(campanha?.pdvs_alvo ?? []);
      setFormError(null);
    }
  }, [open, campanha]);

  function togglePdv(id: string, checked: boolean) {
    setPdvsAlvo((prev) => (checked ? [...prev, id] : prev.filter((pdvId) => pdvId !== id)));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);

    if (dataInicio && dataFim && dataFim < dataInicio) {
      setFormError("A data de fim precisa ser igual ou posterior à data de início.");
      return;
    }

    onSubmit({ nome, data_inicio: dataInicio, data_fim: dataFim, pdvs_alvo: pdvsAlvo });
  }

  const displayError = formError ?? error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{campanha ? "Editar campanha" : "Nova campanha"}</DialogTitle>
          <DialogDescription>
            {campanha ? "Atualize os dados da campanha." : "Cadastre uma nova campanha promocional."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {campanha && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="campanha-codigo">Código</Label>
              <Input id="campanha-codigo" readOnly value={campanha.codigo} className="bg-muted text-muted-foreground" />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="campanha-nome">Nome</Label>
            <Input id="campanha-nome" required value={nome} onChange={(event) => setNome(event.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="campanha-data-inicio">Data de início</Label>
              <Input
                id="campanha-data-inicio"
                type="date"
                required
                value={dataInicio}
                onChange={(event) => setDataInicio(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="campanha-data-fim">Data de fim</Label>
              <Input
                id="campanha-data-fim"
                type="date"
                required
                value={dataFim}
                onChange={(event) => setDataFim(event.target.value)}
              />
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-foreground">PDVs alvo</legend>
            {pdvsAtivos.length > 0 ? (
              <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-md border border-border p-3">
                {pdvsAtivos.map((pdv) => {
                  const checkboxId = `campanha-pdv-${pdv.id}`;
                  return (
                    <div key={pdv.id} className="flex items-center gap-2">
                      <Checkbox
                        id={checkboxId}
                        checked={pdvsAlvo.includes(pdv.id)}
                        onCheckedChange={(checked) => togglePdv(pdv.id, checked === true)}
                      />
                      <Label htmlFor={checkboxId} className="cursor-pointer text-sm font-normal">
                        {pdv.codigo} — {pdv.nome}
                      </Label>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum PDV ativo disponível.</p>
            )}
          </fieldset>

          {displayError && (
            <p role="alert" className="text-sm text-destructive">
              {displayError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TransicaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campanha: Campanha | null;
  transicionarStatus: ReturnType<typeof useTransicionarStatusCampanha>;
}

// Fora do corpo de Campanhas pelo mesmo motivo do dialog de criação/edição.
function TransicaoDialog({ open, onOpenChange, campanha, transicionarStatus }: TransicaoDialogProps) {
  const [status, setStatus] = useState<CampanhaStatus>(campanha?.status ?? "planejada");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStatus(campanha?.status ?? "planejada");
      setFormError(null);
    }
  }, [open, campanha]);

  const busy = submitting || transicionarStatus.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !campanha) return;

    setFormError(null);
    setSubmitting(true);
    try {
      await transicionarStatus.mutateAsync({ id: campanha.id, status });
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao mudar status da campanha.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mudar status</DialogTitle>
          <DialogDescription>
            {campanha ? `Status atual: ${STATUS_LABEL[campanha.status]}.` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="transicao-campanha-status">Novo status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as CampanhaStatus)}>
              <SelectTrigger id="transicao-campanha-status">
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

export default function Campanhas() {
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const { data: campanhas, isLoading } = useCampanhas(statusFiltro === "todos" ? undefined : statusFiltro);
  const { data: pdvs = [] } = usePdvs();
  const createCampanha = useCreateCampanha();
  const updateCampanha = useUpdateCampanha();
  const transicionarStatus = useTransicionarStatusCampanha();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampanha, setEditingCampanha] = useState<Campanha | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [transicaoAlvo, setTransicaoAlvo] = useState<Campanha | null>(null);

  const pdvsAtivos = pdvs.filter((pdv) => pdv.status === "ativo");

  function openCreateDialog() {
    setEditingCampanha(null);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(campanha: Campanha) {
    setEditingCampanha(campanha);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(values: CampanhaFormValues) {
    setFormError(null);
    try {
      if (editingCampanha) {
        await updateCampanha.mutateAsync({
          id: editingCampanha.id,
          nome: values.nome,
          data_inicio: values.data_inicio,
          data_fim: values.data_fim,
          pdvs_alvo: values.pdvs_alvo,
        });
      } else {
        await createCampanha.mutateAsync({
          nome: values.nome,
          data_inicio: values.data_inicio,
          data_fim: values.data_fim,
          pdvs_alvo: values.pdvs_alvo,
        });
      }
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Não foi possível salvar a campanha.");
    }
  }

  const isSubmitting = createCampanha.isPending || updateCampanha.isPending;
  const hasCampanhas = (campanhas?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          breadcrumbs={[{ label: "Marketing" }, { label: "Campanhas" }]}
          title="Campanhas"
          description="Campanhas promocionais e seu ciclo de vida."
        />
        <Button onClick={openCreateDialog} className="w-full sm:w-auto">
          Nova campanha
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:w-64">
        <Label htmlFor="campanhas-filtro-status">Filtrar por status</Label>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger id="campanhas-filtro-status">
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

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !hasCampanhas ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">
            {statusFiltro === "todos" ? "Nenhuma campanha cadastrada ainda." : "Nenhuma campanha com esse status."}
          </p>
          <Button onClick={openCreateDialog}>Criar campanha</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>PDVs alvo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campanhas!.map((campanha) => (
                <TableRow key={campanha.id}>
                  <TableCell className="font-medium">{campanha.codigo}</TableCell>
                  <TableCell>{campanha.nome}</TableCell>
                  <TableCell>{formatPeriodo(campanha.data_inicio, campanha.data_fim)}</TableCell>
                  <TableCell>{campanha.pdvs_alvo.length}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[campanha.status]}>{STATUS_LABEL[campanha.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(campanha)}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setTransicaoAlvo(campanha)}>
                        Mudar status
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CampanhaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        campanha={editingCampanha}
        pdvsAtivos={pdvsAtivos}
        onSubmit={handleSubmit}
        submitting={isSubmitting}
        error={formError}
      />

      <TransicaoDialog
        key={transicaoAlvo?.id ?? "closed"}
        open={!!transicaoAlvo}
        onOpenChange={(open) => {
          if (!open) setTransicaoAlvo(null);
        }}
        campanha={transicaoAlvo}
        transicionarStatus={transicionarStatus}
      />
    </div>
  );
}
