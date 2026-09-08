import { useState, type FormEvent } from "react";
import {
  useOutdoors,
  useCreateOutdoor,
  useUpdateOutdoor,
  type Outdoor,
} from "@/hooks/useOutdoors";
import { usePdvs, type Pdv } from "@/hooks/usePdvs";
import { useFornecedores, type Fornecedor } from "@/hooks/useFornecedores";
import { useUploadFoto, useFotoSignedUrl } from "@/hooks/useFoto";
import { cn } from "@/lib/utils";
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

const STATUS_LABEL: Record<Outdoor["status_operacional"], string> = {
  operacional: "Operacional",
  nao_operacional: "Não operacional",
  pendente_avaliacao: "Pendente de avaliação",
};

const STATUS_VARIANT: Record<Outdoor["status_operacional"], NonNullable<BadgeProps["variant"]>> = {
  operacional: "soft-success",
  nao_operacional: "soft-danger",
  pendente_avaliacao: "soft-warning",
};

interface OutdoorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outdoor: Outdoor | null;
  pdvs: Pdv[];
  fornecedores: Fornecedor[];
  createOutdoor: ReturnType<typeof useCreateOutdoor>;
  updateOutdoor: ReturnType<typeof useUpdateOutdoor>;
}

// Fora do corpo de Outdoors: dentro, o formulário perderia estado a cada
// render do componente pai (ex.: ao chegar dado novo do React Query).
function OutdoorFormDialog({
  open,
  onOpenChange,
  outdoor,
  pdvs,
  fornecedores,
  createOutdoor,
  updateOutdoor,
}: OutdoorFormDialogProps) {
  const isEditing = !!outdoor;
  const uploadFoto = useUploadFoto("outdoor-fotos");
  const { data: fotoAtualUrl, isLoading: fotoAtualCarregando } = useFotoSignedUrl(
    "outdoor-fotos",
    outdoor?.foto_url,
  );
  const [pdvId, setPdvId] = useState(outdoor?.pdv_id ?? "");
  const [localizacao, setLocalizacao] = useState(outdoor?.localizacao ?? "");
  const [larguraM, setLarguraM] = useState(outdoor?.largura_m != null ? String(outdoor.largura_m) : "");
  const [alturaM, setAlturaM] = useState(outdoor?.altura_m != null ? String(outdoor.altura_m) : "");
  const [status, setStatus] = useState<Outdoor["status_operacional"]>(
    outdoor?.status_operacional ?? "operacional",
  );
  const [motivo, setMotivo] = useState(outdoor?.motivo_nao_operacional ?? "");
  const [supplierId, setSupplierId] = useState(outdoor?.supplier_id ?? "none");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Guarda o id assim que o outdoor é criado, mesmo que a etapa de foto
  // falhe depois — sem isso, clicar em "Salvar" de novo após um erro de
  // upload cairia de novo no branch de create e duplicaria o registro.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const targetId = outdoor?.id ?? createdId;

  const busy = submitting || createOutdoor.isPending || updateOutdoor.isPending || uploadFoto.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setFormError(null);

    if (!pdvId) {
      setFormError("Selecione o PDV.");
      return;
    }
    if (status === "nao_operacional" && !motivo.trim()) {
      setFormError("Informe o motivo da indisponibilidade.");
      return;
    }

    const basePayload = {
      pdv_id: pdvId,
      localizacao,
      largura_m: larguraM ? Number(larguraM) : null,
      altura_m: alturaM ? Number(alturaM) : null,
      status_operacional: status,
      motivo_nao_operacional: status === "nao_operacional" ? motivo.trim() : null,
      supplier_id: supplierId === "none" ? null : supplierId,
    };

    setSubmitting(true);
    try {
      if (targetId) {
        // Editar (ou retry após create ter dado certo mas a foto ter
        // falhado antes): upload primeiro para incluir o foto_url resultante
        // na mesma atualização — nunca grava o resto do formulário se o
        // upload falhar no meio.
        const fotoUrl = fotoFile
          ? await uploadFoto.mutateAsync({ entidadeId: targetId, file: fotoFile })
          : undefined;
        await updateOutdoor.mutateAsync({
          id: targetId,
          ...basePayload,
          ...(fotoUrl ? { foto_url: fotoUrl } : {}),
        });
      } else {
        // Criar: o id só existe depois do INSERT, então a foto (se houver)
        // só pode subir — e ser gravada — depois que o outdoor já existe.
        const created = await createOutdoor.mutateAsync(basePayload);
        setCreatedId(created.id);
        if (fotoFile) {
          const fotoUrl = await uploadFoto.mutateAsync({ entidadeId: created.id, file: fotoFile });
          await updateOutdoor.mutateAsync({ id: created.id, foto_url: fotoUrl });
        }
      }
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao salvar outdoor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar outdoor" : "Novo outdoor"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize os dados do painel." : "Cadastre um novo painel de mídia externa."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="outdoor-pdv">PDV</Label>
            <Select value={pdvId} onValueChange={setPdvId}>
              <SelectTrigger id="outdoor-pdv">
                <SelectValue placeholder="Selecione o PDV" />
              </SelectTrigger>
              <SelectContent>
                {pdvs.map((pdv) => (
                  <SelectItem key={pdv.id} value={pdv.id}>
                    {pdv.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isEditing && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="outdoor-codigo">Código</Label>
                <Input id="outdoor-codigo" value={outdoor.codigo} readOnly disabled aria-readonly="true" />
              </div>
            )}
            <div className={cn("flex flex-col gap-2", !isEditing && "sm:col-span-2")}>
              <Label htmlFor="outdoor-localizacao">Localização</Label>
              <Input
                id="outdoor-localizacao"
                required
                value={localizacao}
                onChange={(event) => setLocalizacao(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="outdoor-largura">Largura (m)</Label>
              <Input
                id="outdoor-largura"
                type="number"
                min="0"
                step="0.01"
                value={larguraM}
                onChange={(event) => setLarguraM(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="outdoor-altura">Altura (m)</Label>
              <Input
                id="outdoor-altura"
                type="number"
                min="0"
                step="0.01"
                value={alturaM}
                onChange={(event) => setAlturaM(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="outdoor-status">Status operacional</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as Outdoor["status_operacional"])}>
              <SelectTrigger id="outdoor-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operacional">Operacional</SelectItem>
                <SelectItem value="nao_operacional">Não operacional</SelectItem>
                <SelectItem value="pendente_avaliacao">Pendente de avaliação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === "nao_operacional" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="outdoor-motivo">Motivo da indisponibilidade</Label>
              <Textarea
                id="outdoor-motivo"
                required
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="outdoor-fornecedor">Fornecedor (opcional)</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger id="outdoor-fornecedor">
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
            <Label htmlFor="outdoor-foto">Foto (opcional)</Label>
            {isEditing && outdoor.foto_url && (
              <div className="flex items-center gap-3">
                {fotoAtualCarregando ? (
                  <Skeleton className="h-16 w-16 rounded-md" />
                ) : fotoAtualUrl ? (
                  <img
                    src={fotoAtualUrl}
                    alt={`Foto atual do outdoor ${outdoor.codigo}`}
                    className="h-16 w-16 rounded-md border border-border object-cover"
                  />
                ) : null}
                <span className="text-sm text-muted-foreground">Foto atual — envie um arquivo para substituir</span>
              </div>
            )}
            <Input
              id="outdoor-foto"
              type="file"
              accept="image/*"
              onChange={(event) => setFotoFile(event.target.files?.[0] ?? null)}
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar outdoor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Outdoors() {
  const { data: outdoors, isLoading } = useOutdoors();
  const { data: pdvs = [] } = usePdvs();
  const { data: fornecedores = [] } = useFornecedores();
  const createOutdoor = useCreateOutdoor();
  const updateOutdoor = useUpdateOutdoor();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Outdoor | null>(null);

  const pdvNomeById = new Map(pdvs.map((pdv) => [pdv.id, pdv.nome]));

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(outdoor: Outdoor) {
    setEditing(outdoor);
    setDialogOpen(true);
  }

  const dialogKey = dialogOpen ? (editing?.id ?? "new") : "closed";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Outdoors</h1>
          <p className="text-muted-foreground">Painéis de mídia externa cadastrados.</p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          Novo Outdoor
        </Button>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>PDV</TableHead>
              <TableHead>Status</TableHead>
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
            ) : outdoors && outdoors.length > 0 ? (
              outdoors.map((outdoor) => (
                <TableRow key={outdoor.id}>
                  <TableCell className="font-medium">{outdoor.codigo}</TableCell>
                  <TableCell>{outdoor.localizacao}</TableCell>
                  <TableCell>{pdvNomeById.get(outdoor.pdv_id) ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[outdoor.status_operacional]}>
                      {STATUS_LABEL[outdoor.status_operacional]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(outdoor)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">Nenhum outdoor cadastrado ainda.</p>
                    <Button size="sm" onClick={openCreate}>
                      Criar Outdoor
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <OutdoorFormDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        outdoor={editing}
        pdvs={pdvs}
        fornecedores={fornecedores}
        createOutdoor={createOutdoor}
        updateOutdoor={updateOutdoor}
      />
    </div>
  );
}
