import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Material,
  useAjustarEstoqueMaterial,
  useCreateMaterial,
  useDeactivateMaterial,
  useMateriais,
  useUpdateMaterial,
} from "@/hooks/useMateriais";
import { useFotoSignedUrl, useUploadFoto } from "@/hooks/useFoto";
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

interface MaterialFormValues {
  nome: string;
  tipo: string;
  categoria: string;
  custo_unitario: number;
  estoque_minimo: number;
  file: File | null;
}

// Fora do corpo de Materiais: definido aqui dentro, o input perderia estado a cada render do pai.
function MaterialFormDialog({
  open,
  onOpenChange,
  material,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
  onSubmit: (values: MaterialFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [custoUnitario, setCustoUnitario] = useState(0);
  const [estoqueMinimo, setEstoqueMinimo] = useState(0);
  const [file, setFile] = useState<File | null>(null);

  const { data: fotoAtualUrl } = useFotoSignedUrl("material-fotos", material?.imagem_url ?? null);

  // Reidrata o formulário sempre que o dialog abre (criação zera, edição pré-preenche).
  useEffect(() => {
    if (open) {
      setNome(material?.nome ?? "");
      setTipo(material?.tipo ?? "");
      setCategoria(material?.categoria ?? "");
      setCustoUnitario(material?.custo_unitario ?? 0);
      setEstoqueMinimo(material?.estoque_minimo ?? 0);
      setFile(null);
    }
  }, [open, material]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    onSubmit({ nome, tipo, categoria, custo_unitario: custoUnitario, estoque_minimo: estoqueMinimo, file });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{material ? "Editar material" : "Novo material"}</DialogTitle>
          <DialogDescription>
            {material ? "Atualize os dados do material." : "Cadastre um novo material no catálogo."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {material && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="material-codigo">Código</Label>
              <Input id="material-codigo" readOnly value={material.codigo} className="bg-muted text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="material-nome">Nome</Label>
            <Input
              id="material-nome"
              name="nome"
              required
              value={nome}
              onChange={(event) => setNome(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="material-tipo">Tipo (opcional)</Label>
            <Input id="material-tipo" name="tipo" value={tipo} onChange={(event) => setTipo(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="material-categoria">Categoria (opcional)</Label>
            <Input
              id="material-categoria"
              name="categoria"
              value={categoria}
              onChange={(event) => setCategoria(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="material-custo">Custo unitário</Label>
            <Input
              id="material-custo"
              name="custo_unitario"
              type="number"
              step="0.01"
              min="0"
              required
              value={custoUnitario}
              onChange={(event) => setCustoUnitario(Number(event.target.value))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="material-estoque-minimo">Estoque mínimo</Label>
            <Input
              id="material-estoque-minimo"
              name="estoque_minimo"
              type="number"
              step="1"
              min="0"
              required
              value={estoqueMinimo}
              onChange={(event) => setEstoqueMinimo(Number(event.target.value))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="material-foto">Foto do material (opcional)</Label>
            {fotoAtualUrl && (
              <div className="flex items-center gap-2">
                <img src={fotoAtualUrl} alt="Foto atual do material" className="h-16 w-16 rounded object-cover" />
                <span className="text-sm text-muted-foreground">Foto atual</span>
              </div>
            )}
            <Input id="material-foto" type="file" accept="image/*" onChange={handleFileChange} />
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

// Fora do corpo de Materiais pelo mesmo motivo do form de cadastro — dialog
// independente, ação administrativa distinta de editar o cadastro.
function AjustarEstoqueDialog({
  open,
  onOpenChange,
  material,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
  onSubmit: (estoqueAtual: number) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [estoqueAtual, setEstoqueAtual] = useState(0);

  useEffect(() => {
    if (open) {
      setEstoqueAtual(material?.estoque_atual ?? 0);
    }
  }, [open, material]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    onSubmit(estoqueAtual);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar estoque</DialogTitle>
          <DialogDescription>
            {material ? `Novo saldo de estoque para "${material.nome}".` : "Novo saldo de estoque."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="material-estoque-atual">Estoque atual</Label>
            <Input
              id="material-estoque-atual"
              name="estoque_atual"
              type="number"
              step="1"
              min="0"
              required
              value={estoqueAtual}
              onChange={(event) => setEstoqueAtual(Number(event.target.value))}
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

export default function Materiais() {
  const { data: materiais, isLoading } = useMateriais();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deactivateMaterial = useDeactivateMaterial();
  const ajustarEstoque = useAjustarEstoqueMaterial();
  const uploadFoto = useUploadFoto("material-fotos");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [estoqueDialogOpen, setEstoqueDialogOpen] = useState(false);
  const [ajustandoMaterial, setAjustandoMaterial] = useState<Material | null>(null);
  const [estoqueError, setEstoqueError] = useState<string | null>(null);

  function openCreateDialog() {
    setEditingMaterial(null);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(material: Material) {
    setEditingMaterial(material);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEstoqueDialog(material: Material) {
    setAjustandoMaterial(material);
    setEstoqueError(null);
    setEstoqueDialogOpen(true);
  }

  async function handleSubmit(values: MaterialFormValues) {
    setFormError(null);
    try {
      if (editingMaterial) {
        let imagem_url = editingMaterial.imagem_url;
        if (values.file) {
          imagem_url = await uploadFoto.mutateAsync({ entidadeId: editingMaterial.id, file: values.file });
        }
        await updateMaterial.mutateAsync({
          id: editingMaterial.id,
          nome: values.nome,
          tipo: values.tipo || null,
          categoria: values.categoria || null,
          custo_unitario: values.custo_unitario,
          estoque_minimo: values.estoque_minimo,
          imagem_url,
        });
      } else {
        const created = await createMaterial.mutateAsync({
          nome: values.nome,
          tipo: values.tipo || null,
          categoria: values.categoria || null,
          custo_unitario: values.custo_unitario,
          estoque_minimo: values.estoque_minimo,
        });
        // Material já existe no banco a partir daqui — promove o dialog para
        // modo edição antes de tentar a foto, para que um retry (upload/update
        // falhou) reenvie como update, e não crie um segundo material duplicado.
        setEditingMaterial(created);
        if (values.file) {
          const imagem_url = await uploadFoto.mutateAsync({ entidadeId: created.id, file: values.file });
          await updateMaterial.mutateAsync({ id: created.id, imagem_url });
        }
      }
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Não foi possível salvar o material.");
    }
  }

  async function handleAjustarEstoque(estoqueAtual: number) {
    if (!ajustandoMaterial) return;
    setEstoqueError(null);
    try {
      await ajustarEstoque.mutateAsync({ id: ajustandoMaterial.id, estoque_atual: estoqueAtual });
      setEstoqueDialogOpen(false);
    } catch (err) {
      setEstoqueError(err instanceof Error ? err.message : "Não foi possível ajustar o estoque.");
    }
  }

  async function handleDeactivate(material: Material) {
    if (!window.confirm(`Desativar o material "${material.nome}"?`)) return;
    try {
      await deactivateMaterial.mutateAsync(material.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível desativar o material.");
    }
  }

  const isSubmitting = createMaterial.isPending || updateMaterial.isPending || uploadFoto.isPending;
  const hasMateriais = (materiais?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Materiais</h1>
        <Button onClick={openCreateDialog} className="sm:w-auto">
          Novo material
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !hasMateriais ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">Nenhum material cadastrado ainda.</p>
          <Button onClick={openCreateDialog}>Criar material</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materiais!.map((material) => {
                const estoqueBaixo = material.estoque_atual <= material.estoque_minimo;
                return (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.codigo}</TableCell>
                    <TableCell>{material.nome}</TableCell>
                    <TableCell>{material.tipo ?? "—"}</TableCell>
                    <TableCell>{material.categoria ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{material.estoque_atual}</span>
                        {estoqueBaixo && <Badge variant="destructive">Estoque baixo</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={material.status === "ativo" ? "success" : "outline"}>{material.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEstoqueDialog(material)}>
                          Ajustar estoque
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(material)}>
                          Editar
                        </Button>
                        {material.status === "ativo" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deactivateMaterial.isPending}
                            onClick={() => handleDeactivate(material)}
                          >
                            Desativar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <MaterialFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        material={editingMaterial}
        onSubmit={handleSubmit}
        submitting={isSubmitting}
        error={formError}
      />

      <AjustarEstoqueDialog
        open={estoqueDialogOpen}
        onOpenChange={setEstoqueDialogOpen}
        material={ajustandoMaterial}
        onSubmit={handleAjustarEstoque}
        submitting={ajustarEstoque.isPending}
        error={estoqueError}
      />
    </div>
  );
}
