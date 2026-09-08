import { useState, type FormEvent } from "react";
import {
  useManutencoes,
  useCreateManutencao,
  useTransicionarManutencao,
  type Manutencao,
  type ManutencaoStatus,
  type ManutencaoUrgencia,
  type ManutencaoTipo,
} from "@/hooks/useManutencoes";
import { useOutdoors, type Outdoor } from "@/hooks/useOutdoors";
import { useFornecedores, type Fornecedor } from "@/hooks/useFornecedores";
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

const STATUS_LABEL: Record<ManutencaoStatus, string> = {
  solicitada: "Solicitada",
  em_espera: "Em espera",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  atribuida: "Atribuída",
  em_execucao: "Em execução",
  concluida_fornecedor: "Concluída pelo fornecedor",
  correcao_solicitada: "Correção solicitada",
  validada: "Validada",
  cancelada: "Cancelada",
};

const STATUS_VARIANT: Record<ManutencaoStatus, NonNullable<BadgeProps["variant"]>> = {
  solicitada: "soft-info",
  em_espera: "soft-warning",
  aprovada: "soft-success",
  rejeitada: "soft-danger",
  atribuida: "soft-info",
  em_execucao: "soft-info",
  concluida_fornecedor: "soft-success",
  correcao_solicitada: "soft-warning",
  validada: "soft-success",
  cancelada: "soft-danger",
};

const URGENCIA_LABEL: Record<ManutencaoUrgencia, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  emergencial: "Emergencial",
};

const TIPO_LABEL: Record<ManutencaoTipo, string> = {
  preventiva: "Preventiva",
  corretiva: "Corretiva",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABEL) as ManutencaoStatus[];

interface NovaManutencaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outdoors: Outdoor[];
  createManutencao: ReturnType<typeof useCreateManutencao>;
}

// Fora do corpo de Manutencoes: dentro, o formulário perderia estado a cada
// render do componente pai (ex.: ao chegar dado novo do React Query).
function NovaManutencaoDialog({ open, onOpenChange, outdoors, createManutencao }: NovaManutencaoDialogProps) {
  const [outdoorId, setOutdoorId] = useState("");
  const [urgencia, setUrgencia] = useState<ManutencaoUrgencia>("normal");
  const [tipo, setTipo] = useState<ManutencaoTipo>("corretiva");
  const [descricao, setDescricao] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const busy = submitting || createManutencao.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setFormError(null);

    if (!outdoorId) {
      setFormError("Selecione o outdoor.");
      return;
    }

    setSubmitting(true);
    try {
      await createManutencao.mutateAsync({
        outdoor_id: outdoorId,
        urgencia,
        tipo,
        descricao: descricao.trim() || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao criar solicitação de manutenção.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova solicitação</DialogTitle>
          <DialogDescription>Registre uma nova solicitação de manutenção para um outdoor.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="manutencao-outdoor">Outdoor</Label>
            <Select value={outdoorId} onValueChange={setOutdoorId}>
              <SelectTrigger id="manutencao-outdoor">
                <SelectValue placeholder="Selecione o outdoor" />
              </SelectTrigger>
              <SelectContent>
                {outdoors.map((outdoor) => (
                  <SelectItem key={outdoor.id} value={outdoor.id}>
                    {outdoor.codigo} — {outdoor.localizacao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="manutencao-urgencia">Urgência</Label>
              <Select value={urgencia} onValueChange={(value) => setUrgencia(value as ManutencaoUrgencia)}>
                <SelectTrigger id="manutencao-urgencia">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(URGENCIA_LABEL) as ManutencaoUrgencia[]).map((valor) => (
                    <SelectItem key={valor} value={valor}>
                      {URGENCIA_LABEL[valor]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="manutencao-tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(value) => setTipo(value as ManutencaoTipo)}>
                <SelectTrigger id="manutencao-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_LABEL) as ManutencaoTipo[]).map((valor) => (
                    <SelectItem key={valor} value={valor}>
                      {TIPO_LABEL[valor]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="manutencao-descricao">Descrição (opcional)</Label>
            <Textarea
              id="manutencao-descricao"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Enviando…" : "Criar solicitação"}
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
  manutencao: Manutencao | null;
  fornecedores: Fornecedor[];
  transicionarManutencao: ReturnType<typeof useTransicionarManutencao>;
}

// Fora do corpo de Manutencoes pelo mesmo motivo do dialog de criação.
function TransicaoDialog({ open, onOpenChange, manutencao, fornecedores, transicionarManutencao }: TransicaoDialogProps) {
  const [status, setStatus] = useState<ManutencaoStatus>(manutencao?.status ?? "solicitada");
  const [justificativa, setJustificativa] = useState("");
  const [dataReavaliacao, setDataReavaliacao] = useState("");
  const [fornecedorId, setFornecedorId] = useState("none");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const busy = submitting || transicionarManutencao.isPending;
  const exigeJustificativa = status === "em_espera";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !manutencao) return;

    setFormError(null);

    if (exigeJustificativa && (!justificativa.trim() || !dataReavaliacao)) {
      setFormError("Justificativa e data de reavaliação são obrigatórias para o status \"Em espera\".");
      return;
    }

    setSubmitting(true);
    try {
      await transicionarManutencao.mutateAsync({
        id: manutencao.id,
        status,
        justificativa: justificativa.trim() || undefined,
        data_reavaliacao: dataReavaliacao || undefined,
        fornecedor_id: fornecedorId === "none" ? undefined : fornecedorId,
      });
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao mudar status da manutenção.");
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
            {manutencao ? `Status atual: ${STATUS_LABEL[manutencao.status]}.` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="transicao-status">Novo status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as ManutencaoStatus)}>
              <SelectTrigger id="transicao-status">
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="transicao-fornecedor">Fornecedor (opcional)</Label>
            <Select value={fornecedorId} onValueChange={setFornecedorId}>
              <SelectTrigger id="transicao-fornecedor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {fornecedores.map((fornecedor) => (
                  <SelectItem key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="transicao-data-reavaliacao">
              Data de reavaliação{exigeJustificativa ? "" : " (opcional)"}
            </Label>
            <Input
              id="transicao-data-reavaliacao"
              type="date"
              required={exigeJustificativa}
              value={dataReavaliacao}
              onChange={(event) => setDataReavaliacao(event.target.value)}
            />
          </div>

          {exigeJustificativa && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="transicao-justificativa">Justificativa</Label>
              <Textarea
                id="transicao-justificativa"
                required
                value={justificativa}
                onChange={(event) => setJustificativa(event.target.value)}
              />
            </div>
          )}

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

export default function Manutencoes() {
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const { data: manutencoes, isLoading } = useManutencoes(
    statusFiltro === "todos" ? undefined : { status: statusFiltro },
  );
  const { data: outdoors = [] } = useOutdoors();
  const { data: fornecedores = [] } = useFornecedores();
  const createManutencao = useCreateManutencao();
  const transicionarManutencao = useTransicionarManutencao();

  const [criarDialogOpen, setCriarDialogOpen] = useState(false);
  const [transicaoAlvo, setTransicaoAlvo] = useState<Manutencao | null>(null);

  const outdoorById = new Map(outdoors.map((outdoor) => [outdoor.id, outdoor]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Manutenções</h1>
          <p className="text-muted-foreground">Solicitações de manutenção de outdoors.</p>
        </div>
        <Button onClick={() => setCriarDialogOpen(true)} className="w-full sm:w-auto">
          Nova solicitação
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:w-64">
        <Label htmlFor="manutencoes-filtro-status">Filtrar por status</Label>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger id="manutencoes-filtro-status">
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
              <TableHead>Outdoor</TableHead>
              <TableHead>Urgência</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : manutencoes && manutencoes.length > 0 ? (
              manutencoes.map((manutencao) => {
                const outdoor = outdoorById.get(manutencao.outdoor_id);
                return (
                  <TableRow key={manutencao.id}>
                    <TableCell className="font-medium">
                      {outdoor ? `${outdoor.codigo} — ${outdoor.localizacao}` : "—"}
                    </TableCell>
                    <TableCell>{URGENCIA_LABEL[manutencao.urgencia]}</TableCell>
                    <TableCell>{TIPO_LABEL[manutencao.tipo]}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[manutencao.status]}>{STATUS_LABEL[manutencao.status]}</Badge>
                    </TableCell>
                    <TableCell>{new Date(manutencao.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setTransicaoAlvo(manutencao)}>
                        Mudar status
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      {statusFiltro === "todos"
                        ? "Nenhuma manutenção registrada ainda."
                        : "Nenhuma manutenção com esse status."}
                    </p>
                    <Button size="sm" onClick={() => setCriarDialogOpen(true)}>
                      Nova solicitação
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <NovaManutencaoDialog
        key={criarDialogOpen ? "open" : "closed"}
        open={criarDialogOpen}
        onOpenChange={setCriarDialogOpen}
        outdoors={outdoors}
        createManutencao={createManutencao}
      />

      <TransicaoDialog
        key={transicaoAlvo?.id ?? "closed"}
        open={!!transicaoAlvo}
        onOpenChange={(open) => {
          if (!open) setTransicaoAlvo(null);
        }}
        manutencao={transicaoAlvo}
        fornecedores={fornecedores}
        transicionarManutencao={transicionarManutencao}
      />
    </div>
  );
}
