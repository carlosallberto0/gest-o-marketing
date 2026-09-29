import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Pdv, useCreatePdv, useDeactivatePdv, usePdvs, useUpdatePdv } from "@/hooks/usePdvs";
import { SystemOption, useSystemOptions } from "@/hooks/useSystemOptions";
import { useFotoSignedUrl, useUploadFoto } from "@/hooks/useFoto";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface PdvFormValues {
  nome: string;
  tipo: string;
  file: File | null;
}

// Fora do corpo de Pdvs: definido aqui dentro, o input perderia estado a cada render do pai.
function PdvFormDialog({
  open,
  onOpenChange,
  pdv,
  tipoOptions,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdv: Pdv | null;
  tipoOptions: SystemOption[];
  onSubmit: (values: PdvFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: fotoAtualUrl } = useFotoSignedUrl("pdv-fotos", pdv?.foto_url ?? null);

  // Reidrata o formulário sempre que o dialog abre (criação zera, edição pré-preenche).
  useEffect(() => {
    if (open) {
      setNome(pdv?.nome ?? "");
      setTipo(pdv?.tipo ?? "");
      setFile(null);
    }
  }, [open, pdv]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    onSubmit({ nome, tipo, file });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
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
          {pdv && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="pdv-codigo">Código</Label>
              <Input id="pdv-codigo" readOnly value={pdv.codigo} className="bg-muted text-muted-foreground" />
            </div>
          )}
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
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="pdv-tipo">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {tipoOptions.map((opcao) => (
                  <SelectItem key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pdv-foto">Foto do PDV (opcional)</Label>
            {fotoAtualUrl && (
              <div className="flex items-center gap-2">
                <img src={fotoAtualUrl} alt="Foto atual do PDV" className="h-16 w-16 rounded object-cover" />
                <span className="text-sm text-muted-foreground">Foto atual</span>
              </div>
            )}
            <Input id="pdv-foto" type="file" accept="image/*" onChange={handleFileChange} />
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
  const { data: tipoOptions = [] } = useSystemOptions("core", "pdv_tipo");
  const createPdv = useCreatePdv();
  const updatePdv = useUpdatePdv();
  const deactivatePdv = useDeactivatePdv();
  const uploadFoto = useUploadFoto("pdv-fotos");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPdv, setEditingPdv] = useState<Pdv | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Pdv | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const tipoRotuloPorValor = new Map(tipoOptions.map((opcao) => [opcao.valor, opcao.rotulo]));

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
        let foto_url = editingPdv.foto_url;
        if (values.file) {
          foto_url = await uploadFoto.mutateAsync({ entidadeId: editingPdv.id, file: values.file });
        }
        await updatePdv.mutateAsync({ id: editingPdv.id, nome: values.nome, tipo: values.tipo, foto_url });
      } else {
        const created = await createPdv.mutateAsync({ nome: values.nome, tipo: values.tipo });
        // PDV já existe no banco a partir daqui — promove o dialog para modo
        // edição antes de tentar a foto, para que um retry (upload/update
        // falhou) reenvie como update, e não crie um segundo PDV duplicado.
        setEditingPdv(created);
        if (values.file) {
          const foto_url = await uploadFoto.mutateAsync({ entidadeId: created.id, file: values.file });
          await updatePdv.mutateAsync({ id: created.id, foto_url });
        }
      }
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Não foi possível salvar o PDV.");
    }
  }

  function handleDeactivate(pdv: Pdv) {
    setConfirmError(null);
    setConfirmando(pdv);
  }

  async function confirmDeactivate() {
    if (!confirmando) return;
    try {
      await deactivatePdv.mutateAsync(confirmando.id);
      setConfirmando(null);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Não foi possível desativar o PDV.");
    }
  }

  const isSubmitting = createPdv.isPending || updatePdv.isPending || uploadFoto.isPending;
  const hasPdvs = (pdvs?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader breadcrumbs={[{ label: "Operação" }, { label: "PDVs" }]} title="PDVs" description="" />
        <Button onClick={openCreateDialog} className="sm:w-auto sm:mt-8">
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
                  <TableCell>{tipoRotuloPorValor.get(pdv.tipo) ?? pdv.tipo}</TableCell>
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
        tipoOptions={tipoOptions}
        onSubmit={handleSubmit}
        submitting={isSubmitting}
        error={formError}
      />

      <ConfirmDialog
        open={!!confirmando}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmando(null);
            setConfirmError(null);
          }
        }}
        titulo="Desativar PDV"
        descricao={`Desativar o PDV "${confirmando?.nome}"?`}
        rotuloAcao="Desativar"
        pendente={deactivatePdv.isPending}
        erro={confirmError}
        onConfirm={confirmDeactivate}
      />
    </div>
  );
}
