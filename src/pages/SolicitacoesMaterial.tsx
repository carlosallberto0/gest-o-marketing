import { useState, type FormEvent } from "react";
import {
  useSolicitacoesMaterial,
  useCreateSolicitacaoMaterial,
  useTransicionarSolicitacaoMaterial,
  type SolicitacaoMaterial,
  type SolicitacaoMaterialStatus,
} from "@/hooks/useSolicitacoesMaterial";
import { useMateriais, type Material } from "@/hooks/useMateriais";
import { usePdvs, type Pdv } from "@/hooks/usePdvs";
import { PageHeader } from "@/components/layout/PageHeader";
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

const STATUS_LABEL: Record<SolicitacaoMaterialStatus, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  separada: "Separada",
  entregue: "Entregue",
  cancelada: "Cancelada",
};

const STATUS_VARIANT: Record<SolicitacaoMaterialStatus, NonNullable<BadgeProps["variant"]>> = {
  pendente: "soft-info",
  aprovada: "soft-success",
  rejeitada: "soft-danger",
  separada: "soft-warning",
  entregue: "soft-success",
  cancelada: "soft-danger",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABEL) as SolicitacaoMaterialStatus[];

interface NovaSolicitacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdvsConv: Pdv[];
  materiaisAtivos: Material[];
  createSolicitacao: ReturnType<typeof useCreateSolicitacaoMaterial>;
}

// Fora do corpo de SolicitacoesMaterial: dentro, o formulário perderia estado
// a cada render do componente pai (ex.: ao chegar dado novo do React Query).
function NovaSolicitacaoDialog({
  open,
  onOpenChange,
  pdvsConv,
  materiaisAtivos,
  createSolicitacao,
}: NovaSolicitacaoDialogProps) {
  const [pdvId, setPdvId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [justificativa, setJustificativa] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const busy = submitting || createSolicitacao.isPending;
  const semPdvConv = pdvsConv.length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setFormError(null);

    if (semPdvConv) {
      setFormError("Nenhum PDV de conveniência ativo cadastrado — material de trade só pode ser solicitado para esse tipo de PDV.");
      return;
    }
    if (!pdvId) {
      setFormError("Selecione o PDV.");
      return;
    }
    if (!materialId) {
      setFormError("Selecione o material.");
      return;
    }
    const quantidadeNumero = Number(quantidade);
    if (!Number.isInteger(quantidadeNumero) || quantidadeNumero < 1) {
      setFormError("Quantidade deve ser um número inteiro maior ou igual a 1.");
      return;
    }
    if (!justificativa.trim()) {
      setFormError("Justificativa é obrigatória.");
      return;
    }

    setSubmitting(true);
    try {
      await createSolicitacao.mutateAsync({
        pdv_id: pdvId,
        material_id: materialId,
        quantidade: quantidadeNumero,
        justificativa: justificativa.trim(),
      });
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao criar solicitação de material.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova solicitação</DialogTitle>
          <DialogDescription>Registre uma nova solicitação de material para um PDV de conveniência.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="solicitacao-pdv">PDV</Label>
            {semPdvConv ? (
              <p className="text-sm text-muted-foreground">
                Nenhum PDV de conveniência ativo cadastrado.
              </p>
            ) : (
              <Select value={pdvId} onValueChange={setPdvId}>
                <SelectTrigger id="solicitacao-pdv">
                  <SelectValue placeholder="Selecione o PDV" />
                </SelectTrigger>
                <SelectContent>
                  {pdvsConv.map((pdv) => (
                    <SelectItem key={pdv.id} value={pdv.id}>
                      {pdv.codigo} — {pdv.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="solicitacao-material">Material</Label>
            <Select value={materialId} onValueChange={setMaterialId}>
              <SelectTrigger id="solicitacao-material">
                <SelectValue placeholder="Selecione o material" />
              </SelectTrigger>
              <SelectContent>
                {materiaisAtivos.map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="solicitacao-quantidade">Quantidade</Label>
            <Input
              id="solicitacao-quantidade"
              type="number"
              min="1"
              step="1"
              required
              value={quantidade}
              onChange={(event) => setQuantidade(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="solicitacao-justificativa">Justificativa</Label>
            <Textarea
              id="solicitacao-justificativa"
              required
              value={justificativa}
              onChange={(event) => setJustificativa(event.target.value)}
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={busy || semPdvConv}>
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
  solicitacao: SolicitacaoMaterial | null;
  transicionarSolicitacao: ReturnType<typeof useTransicionarSolicitacaoMaterial>;
}

// Fora do corpo de SolicitacoesMaterial pelo mesmo motivo do dialog de criação.
function TransicaoDialog({ open, onOpenChange, solicitacao, transicionarSolicitacao }: TransicaoDialogProps) {
  const [status, setStatus] = useState<SolicitacaoMaterialStatus>(solicitacao?.status ?? "pendente");
  const [notasAdmin, setNotasAdmin] = useState(solicitacao?.notas_admin ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const busy = submitting || transicionarSolicitacao.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !solicitacao) return;

    setFormError(null);

    setSubmitting(true);
    try {
      await transicionarSolicitacao.mutateAsync({
        id: solicitacao.id,
        status,
        notas_admin: notasAdmin.trim() || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao mudar status da solicitação.");
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
            {solicitacao ? `Status atual: ${STATUS_LABEL[solicitacao.status]}.` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="transicao-status">Novo status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as SolicitacaoMaterialStatus)}>
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
            <Label htmlFor="transicao-notas-admin">Notas (opcional)</Label>
            <Textarea
              id="transicao-notas-admin"
              value={notasAdmin}
              onChange={(event) => setNotasAdmin(event.target.value)}
            />
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

export default function SolicitacoesMaterial() {
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const { data: solicitacoes, isLoading } = useSolicitacoesMaterial(
    statusFiltro === "todos" ? undefined : { status: statusFiltro },
  );
  const { data: materiais = [] } = useMateriais();
  const { data: pdvs = [] } = usePdvs();
  const createSolicitacao = useCreateSolicitacaoMaterial();
  const transicionarSolicitacao = useTransicionarSolicitacaoMaterial();

  const [criarDialogOpen, setCriarDialogOpen] = useState(false);
  const [transicaoAlvo, setTransicaoAlvo] = useState<SolicitacaoMaterial | null>(null);

  const materialById = new Map(materiais.map((material) => [material.id, material]));
  const pdvsConv = pdvs.filter((pdv) => pdv.tipo === "CONV" && pdv.status === "ativo");
  const materiaisAtivos = materiais.filter((material) => material.status === "ativo");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          breadcrumbs={[{ label: "Merchandising" }, { label: "Solicitações de Material" }]}
          title="Solicitações de Material"
          description="Solicitações de material de trade para PDVs de conveniência."
        />
        <Button onClick={() => setCriarDialogOpen(true)} className="w-full sm:w-auto">
          Nova solicitação
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:w-64">
        <Label htmlFor="solicitacoes-filtro-status">Filtrar por status</Label>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger id="solicitacoes-filtro-status">
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
              <TableHead>Material</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : solicitacoes && solicitacoes.length > 0 ? (
              solicitacoes.map((solicitacao) => {
                const material = materialById.get(solicitacao.material_id);
                return (
                  <TableRow key={solicitacao.id}>
                    <TableCell className="font-medium">{material ? material.nome : "—"}</TableCell>
                    <TableCell>{solicitacao.quantidade}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[solicitacao.status]}>{STATUS_LABEL[solicitacao.status]}</Badge>
                    </TableCell>
                    <TableCell>{new Date(solicitacao.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setTransicaoAlvo(solicitacao)}>
                        Mudar status
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      {statusFiltro === "todos"
                        ? "Nenhuma solicitação de material registrada ainda."
                        : "Nenhuma solicitação com esse status."}
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

      <NovaSolicitacaoDialog
        key={criarDialogOpen ? "open" : "closed"}
        open={criarDialogOpen}
        onOpenChange={setCriarDialogOpen}
        pdvsConv={pdvsConv}
        materiaisAtivos={materiaisAtivos}
        createSolicitacao={createSolicitacao}
      />

      <TransicaoDialog
        key={transicaoAlvo?.id ?? "closed"}
        open={!!transicaoAlvo}
        onOpenChange={(open) => {
          if (!open) setTransicaoAlvo(null);
        }}
        solicitacao={transicaoAlvo}
        transicionarSolicitacao={transicionarSolicitacao}
      />
    </div>
  );
}
