import { useEffect, useState, type FormEvent } from "react";
import { Pdv, useCreatePdv, useDeactivatePdv, usePdvs, useUpdatePdv } from "@/hooks/usePdvs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PdvFormValues {
  codigo: string;
  nome: string;
  tipo: string;
}

// Fora do corpo de Pdvs: definido aqui dentro, o input perderia estado a cada render do pai.
function PdvFormDialog({
  open,
  onOpenChange,
  pdv,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdv: Pdv | null;
  onSubmit: (values: PdvFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("");

  // Reidrata o formulário sempre que o dialog abre (criação zera, edição pré-preenche).
  useEffect(() => {
    if (open) {
      setCodigo(pdv?.codigo ?? "");
      setNome(pdv?.nome ?? "");
      setTipo(pdv?.tipo ?? "");
    }
  }, [open, pdv]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    onSubmit({ codigo, nome, tipo });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pdv ? "Editar PDV" : "Novo PDV"}</DialogTitle>
          <DialogDescription>
            {pdv ? "Atualize os dados do ponto de venda." : "Cadastre um novo ponto de venda."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pdv-codigo">Código</Label>
            <Input
              id="pdv-codigo"
              name="codigo"
              required
              value={codigo}
              onChange={(event) => setCodigo(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pdv-nome">Nome</Label>
            <Input
              id="pdv-nome"
              name="nome"
              required
              value={nome}
              onChange={(event) => setNome(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pdv-tipo">Tipo</Label>
            <Input
              id="pdv-tipo"
              name="tipo"
              required
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
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

export default function Pdvs() {
  const { data: pdvs, isLoading } = usePdvs();
  const createPdv = useCreatePdv();
  const updatePdv = useUpdatePdv();
  const deactivatePdv = useDeactivatePdv();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPdv, setEditingPdv] = useState<Pdv | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreateDialog() {
    setEditingPdv(null);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(pdv: Pdv) {
    setEditingPdv(pdv);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(values: PdvFormValues) {
    setFormError(null);
    try {
      if (editingPdv) {
        await updatePdv.mutateAsync({ id: editingPdv.id, ...values });
      } else {
        await createPdv.mutateAsync(values);
      }
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Não foi possível salvar o PDV.");
    }
  }

  async function handleDeactivate(pdv: Pdv) {
    if (!window.confirm(`Desativar o PDV "${pdv.nome}"?`)) return;
    try {
      await deactivatePdv.mutateAsync(pdv.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível desativar o PDV.");
    }
  }

  const isSubmitting = createPdv.isPending || updatePdv.isPending;
  const hasPdvs = (pdvs?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">PDVs</h1>
        <Button onClick={openCreateDialog} className="sm:w-auto">
          Novo PDV
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !hasPdvs ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">Nenhum PDV cadastrado ainda.</p>
          <Button onClick={openCreateDialog}>Criar PDV</Button>
        </div>
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pdvs!.map((pdv) => (
                <TableRow key={pdv.id}>
                  <TableCell className="font-medium">{pdv.codigo}</TableCell>
                  <TableCell>{pdv.nome}</TableCell>
                  <TableCell>{pdv.tipo}</TableCell>
                  <TableCell>
                    <Badge variant={pdv.status === "ativo" ? "success" : "outline"}>{pdv.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(pdv)}>
                        Editar
                      </Button>
                      {pdv.status === "ativo" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deactivatePdv.isPending}
                          onClick={() => handleDeactivate(pdv)}
                        >
                          Desativar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PdvFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pdv={editingPdv}
        onSubmit={handleSubmit}
        submitting={isSubmitting}
        error={formError}
      />
    </div>
  );
}
