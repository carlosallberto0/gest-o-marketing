import { useEffect, useState, type FormEvent } from "react";
import {
  CategoriaChecklist,
  useCategoriasChecklist,
  useCreateCategoriaChecklist,
  useDeactivateCategoriaChecklist,
  useUpdateCategoriaChecklist,
} from "@/hooks/useCategoriasChecklist";
import {
  PerguntaChecklist,
  useCreatePerguntaChecklist,
  useDeactivatePerguntaChecklist,
  usePerguntasChecklist,
  useUpdatePerguntaChecklist,
} from "@/hooks/usePerguntasChecklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FILTRO_TODAS = "todas";

interface CategoriaFormValues {
  nome: string;
  icone: string;
  ordem: number;
}

// Fora do corpo de ChecklistConfig: definido aqui dentro, o input perderia estado a cada render do pai.
function CategoriaFormDialog({
  open,
  onOpenChange,
  categoria,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoria: CategoriaChecklist | null;
  onSubmit: (values: CategoriaFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState("");
  const [ordem, setOrdem] = useState(0);

  // Reidrata o formulário sempre que o dialog abre (criação zera, edição pré-preenche).
  useEffect(() => {
    if (open) {
      setNome(categoria?.nome ?? "");
      setIcone(categoria?.icone ?? "");
      setOrdem(categoria?.ordem ?? 0);
    }
  }, [open, categoria]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    onSubmit({ nome, icone, ordem });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{categoria ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>
            {categoria
              ? "Atualize os dados da categoria de checklist."
              : "Cadastre uma nova categoria de checklist de avaliação."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria-nome">Nome</Label>
            <Input
              id="categoria-nome"
              name="nome"
              required
              value={nome}
              onChange={(event) => setNome(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria-icone">Ícone (opcional)</Label>
            <Input
              id="categoria-icone"
              name="icone"
              value={icone}
              onChange={(event) => setIcone(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria-ordem">Ordem</Label>
            <Input
              id="categoria-ordem"
              name="ordem"
              type="number"
              step="1"
              value={ordem}
              onChange={(event) => setOrdem(Number(event.target.value))}
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

interface PerguntaFormValues {
  categoria_id: string;
  texto: string;
  dica: string;
  ordem: number;
  exige_foto: boolean;
  exige_comentario: boolean;
  is_critica: boolean;
  exige_material: boolean;
}

// Fora do corpo de ChecklistConfig pelo mesmo motivo do form de categoria.
function PerguntaFormDialog({
  open,
  onOpenChange,
  pergunta,
  categoriasAtivas,
  defaultCategoriaId,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pergunta: PerguntaChecklist | null;
  categoriasAtivas: CategoriaChecklist[];
  defaultCategoriaId: string;
  onSubmit: (values: PerguntaFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [categoriaId, setCategoriaId] = useState("");
  const [texto, setTexto] = useState("");
  const [dica, setDica] = useState("");
  const [ordem, setOrdem] = useState(0);
  const [exigeFoto, setExigeFoto] = useState(false);
  const [exigeComentario, setExigeComentario] = useState(false);
  const [isCritica, setIsCritica] = useState(false);
  const [exigeMaterial, setExigeMaterial] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reidrata o formulário sempre que o dialog abre (criação zera com a
  // categoria filtrada como padrão, edição pré-preenche).
  useEffect(() => {
    if (open) {
      setCategoriaId(pergunta?.categoria_id ?? defaultCategoriaId);
      setTexto(pergunta?.texto ?? "");
      setDica(pergunta?.dica ?? "");
      setOrdem(pergunta?.ordem ?? 0);
      setExigeFoto(pergunta?.exige_foto ?? false);
      setExigeComentario(pergunta?.exige_comentario ?? false);
      setIsCritica(pergunta?.is_critica ?? false);
      setExigeMaterial(pergunta?.exige_material ?? false);
      setValidationError(null);
    }
  }, [open, pergunta, defaultCategoriaId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    // Guarda própria do formulário: não confia só no botão de abertura estar
    // desabilitado. Cobre categoria vazia e categoria que ficou inativa entre
    // a abertura do dialog e o submit.
    if (!categoriaId || !categoriasAtivas.some((categoria) => categoria.id === categoriaId)) {
      setValidationError("Selecione uma categoria ativa antes de salvar.");
      return;
    }
    setValidationError(null);
    onSubmit({
      categoria_id: categoriaId,
      texto,
      dica,
      ordem,
      exige_foto: exigeFoto,
      exige_comentario: exigeComentario,
      is_critica: isCritica,
      exige_material: exigeMaterial,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pergunta ? "Editar pergunta" : "Nova pergunta"}</DialogTitle>
          <DialogDescription>
            {pergunta
              ? "Atualize os dados da pergunta de checklist."
              : "Cadastre uma nova pergunta de checklist de avaliação."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pergunta-categoria">Categoria</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger id="pergunta-categoria">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categoriasAtivas.map((categoria) => (
                  <SelectItem key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pergunta-texto">Texto</Label>
            <Textarea
              id="pergunta-texto"
              name="texto"
              required
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pergunta-dica">Dica (opcional)</Label>
            <Textarea id="pergunta-dica" name="dica" value={dica} onChange={(event) => setDica(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pergunta-ordem">Ordem</Label>
            <Input
              id="pergunta-ordem"
              name="ordem"
              type="number"
              step="1"
              value={ordem}
              onChange={(event) => setOrdem(Number(event.target.value))}
            />
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="pergunta-exige-foto"
                checked={exigeFoto}
                onCheckedChange={(checked) => setExigeFoto(checked === true)}
              />
              <Label htmlFor="pergunta-exige-foto" className="font-normal">
                Exige foto
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="pergunta-exige-comentario"
                checked={exigeComentario}
                onCheckedChange={(checked) => setExigeComentario(checked === true)}
              />
              <Label htmlFor="pergunta-exige-comentario" className="font-normal">
                Exige comentário
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="pergunta-is-critica"
                checked={isCritica}
                onCheckedChange={(checked) => setIsCritica(checked === true)}
              />
              <Label htmlFor="pergunta-is-critica" className="font-normal">
                Pergunta crítica
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="pergunta-exige-material"
                checked={exigeMaterial}
                onCheckedChange={(checked) => setExigeMaterial(checked === true)}
              />
              <Label htmlFor="pergunta-exige-material" className="font-normal">
                Exige material
              </Label>
            </div>
          </div>
          {(validationError ?? error) && (
            <p role="alert" className="text-sm text-destructive">
              {validationError ?? error}
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

export default function ChecklistConfig() {
  const { data: categorias, isLoading: loadingCategorias } = useCategoriasChecklist();
  const createCategoria = useCreateCategoriaChecklist();
  const updateCategoria = useUpdateCategoriaChecklist();
  const deactivateCategoria = useDeactivateCategoriaChecklist();

  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<CategoriaChecklist | null>(null);
  const [categoriaFormError, setCategoriaFormError] = useState<string | null>(null);
  const [confirmandoCategoria, setConfirmandoCategoria] = useState<CategoriaChecklist | null>(null);
  const [confirmCategoriaError, setConfirmCategoriaError] = useState<string | null>(null);

  const categoriasAtivas = (categorias ?? []).filter((categoria) => categoria.is_active);
  const hasCategorias = (categorias?.length ?? 0) > 0;

  // null = ainda não inicializado. Assim que a lista chega, cai na primeira
  // categoria ativa (ou "todas" se não houver nenhuma), sem sobrescrever
  // depois uma escolha do usuário.
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCategoriaId === null && categorias) {
      const primeiraAtiva = categorias.find((categoria) => categoria.is_active);
      setSelectedCategoriaId(primeiraAtiva?.id ?? FILTRO_TODAS);
    }
  }, [categorias, selectedCategoriaId]);

  const filtroAtivo = selectedCategoriaId ?? FILTRO_TODAS;
  const perguntasCategoriaId = filtroAtivo === FILTRO_TODAS ? undefined : filtroAtivo;
  const { data: perguntas, isLoading: loadingPerguntas } = usePerguntasChecklist(perguntasCategoriaId);
  const createPergunta = useCreatePerguntaChecklist();
  const updatePergunta = useUpdatePerguntaChecklist();
  const deactivatePergunta = useDeactivatePerguntaChecklist();

  const [perguntaDialogOpen, setPerguntaDialogOpen] = useState(false);
  const [editingPergunta, setEditingPergunta] = useState<PerguntaChecklist | null>(null);
  const [perguntaFormError, setPerguntaFormError] = useState<string | null>(null);
  const [confirmandoPergunta, setConfirmandoPergunta] = useState<PerguntaChecklist | null>(null);
  const [confirmPerguntaError, setConfirmPerguntaError] = useState<string | null>(null);

  const categoriaNomePorId = new Map((categorias ?? []).map((categoria) => [categoria.id, categoria.nome]));

  function openCreateCategoriaDialog() {
    setEditingCategoria(null);
    setCategoriaFormError(null);
    setCategoriaDialogOpen(true);
  }

  function openEditCategoriaDialog(categoria: CategoriaChecklist) {
    setEditingCategoria(categoria);
    setCategoriaFormError(null);
    setCategoriaDialogOpen(true);
  }

  async function handleCategoriaSubmit(values: CategoriaFormValues) {
    setCategoriaFormError(null);
    try {
      if (editingCategoria) {
        await updateCategoria.mutateAsync({
          id: editingCategoria.id,
          nome: values.nome,
          icone: values.icone || null,
          ordem: values.ordem,
        });
      } else {
        await createCategoria.mutateAsync({
          nome: values.nome,
          icone: values.icone || null,
          ordem: values.ordem,
        });
      }
      setCategoriaDialogOpen(false);
    } catch (err) {
      setCategoriaFormError(err instanceof Error ? err.message : "Não foi possível salvar a categoria.");
    }
  }

  function handleDeactivateCategoria(categoria: CategoriaChecklist) {
    setConfirmCategoriaError(null);
    setConfirmandoCategoria(categoria);
  }

  async function confirmDeactivateCategoria() {
    if (!confirmandoCategoria) return;
    try {
      await deactivateCategoria.mutateAsync(confirmandoCategoria.id);
      setConfirmandoCategoria(null);
    } catch (err) {
      setConfirmCategoriaError(err instanceof Error ? err.message : "Não foi possível desativar a categoria.");
    }
  }

  function openCreatePerguntaDialog() {
    setEditingPergunta(null);
    setPerguntaFormError(null);
    setPerguntaDialogOpen(true);
  }

  function openEditPerguntaDialog(pergunta: PerguntaChecklist) {
    setEditingPergunta(pergunta);
    setPerguntaFormError(null);
    setPerguntaDialogOpen(true);
  }

  async function handlePerguntaSubmit(values: PerguntaFormValues) {
    setPerguntaFormError(null);
    try {
      const payload = {
        categoria_id: values.categoria_id,
        texto: values.texto,
        dica: values.dica || null,
        ordem: values.ordem,
        exige_foto: values.exige_foto,
        exige_comentario: values.exige_comentario,
        is_critica: values.is_critica,
        exige_material: values.exige_material,
      };
      if (editingPergunta) {
        await updatePergunta.mutateAsync({ id: editingPergunta.id, ...payload });
      } else {
        await createPergunta.mutateAsync(payload);
      }
      setPerguntaDialogOpen(false);
    } catch (err) {
      setPerguntaFormError(err instanceof Error ? err.message : "Não foi possível salvar a pergunta.");
    }
  }

  function handleDeactivatePergunta(pergunta: PerguntaChecklist) {
    setConfirmPerguntaError(null);
    setConfirmandoPergunta(pergunta);
  }

  async function confirmDeactivatePergunta() {
    if (!confirmandoPergunta) return;
    try {
      await deactivatePergunta.mutateAsync(confirmandoPergunta.id);
      setConfirmandoPergunta(null);
    } catch (err) {
      setConfirmPerguntaError(err instanceof Error ? err.message : "Não foi possível desativar a pergunta.");
    }
  }

  const isCategoriaSubmitting = createCategoria.isPending || updateCategoria.isPending;
  const isPerguntaSubmitting = createPergunta.isPending || updatePergunta.isPending;
  const hasPerguntas = (perguntas?.length ?? 0) > 0;
  const podeCriarPergunta = categoriasAtivas.length > 0;
  const defaultCategoriaIdParaNovaPergunta = categoriasAtivas.some((categoria) => categoria.id === filtroAtivo)
    ? filtroAtivo
    : categoriasAtivas[0]?.id ?? "";

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold text-foreground">Configuração de checklist</h1>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">Categorias</h2>
          <Button onClick={openCreateCategoriaDialog} className="sm:w-auto">
            Nova categoria
          </Button>
        </div>

        {loadingCategorias ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !hasCategorias ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
            <p className="text-muted-foreground">Nenhuma categoria de checklist cadastrada ainda.</p>
            <Button onClick={openCreateCategoriaDialog}>Criar categoria</Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ícone</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias!.map((categoria) => (
                  <TableRow key={categoria.id}>
                    <TableCell className="font-medium">{categoria.nome}</TableCell>
                    <TableCell>{categoria.icone ?? "—"}</TableCell>
                    <TableCell>{categoria.ordem}</TableCell>
                    <TableCell>
                      <Badge variant={categoria.is_active ? "success" : "outline"}>
                        {categoria.is_active ? "ativo" : "inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditCategoriaDialog(categoria)}>
                          Editar
                        </Button>
                        {categoria.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deactivateCategoria.isPending}
                            onClick={() => handleDeactivateCategoria(categoria)}
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
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">Perguntas</h2>
          <Button onClick={openCreatePerguntaDialog} disabled={!podeCriarPergunta} className="sm:w-auto">
            Nova pergunta
          </Button>
        </div>

        {!hasCategorias ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
            <p className="text-muted-foreground">Cadastre uma categoria primeiro.</p>
          </div>
        ) : (
          <>
            {!podeCriarPergunta && (
              <p className="text-sm text-muted-foreground">
                Nenhuma categoria ativa — ative uma categoria para cadastrar perguntas novas.
              </p>
            )}

            <div className="flex flex-col gap-2 sm:w-64">
              <Label htmlFor="pergunta-filtro-categoria">Filtrar por categoria</Label>
              <Select value={filtroAtivo} onValueChange={setSelectedCategoriaId}>
                <SelectTrigger id="pergunta-filtro-categoria">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTRO_TODAS}>Todas</SelectItem>
                  {categoriasAtivas.map((categoria) => (
                    <SelectItem key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingPerguntas ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !hasPerguntas ? (
              <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
                <p className="text-muted-foreground">Nenhuma pergunta cadastrada para este filtro.</p>
                {podeCriarPergunta && <Button onClick={openCreatePerguntaDialog}>Criar pergunta</Button>}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Texto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perguntas!.map((pergunta) => (
                      <TableRow key={pergunta.id}>
                        <TableCell className="max-w-xs truncate" title={pergunta.texto}>
                          {pergunta.texto}
                        </TableCell>
                        <TableCell>{categoriaNomePorId.get(pergunta.categoria_id) ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {pergunta.exige_foto && <Badge variant="outline">Foto</Badge>}
                            {pergunta.exige_comentario && <Badge variant="outline">Comentário</Badge>}
                            {pergunta.exige_material && <Badge variant="outline">Material</Badge>}
                            {pergunta.is_critica && <Badge variant="destructive">Crítica</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={pergunta.is_active ? "success" : "outline"}>
                            {pergunta.is_active ? "ativo" : "inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditPerguntaDialog(pergunta)}>
                              Editar
                            </Button>
                            {pergunta.is_active && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={deactivatePergunta.isPending}
                                onClick={() => handleDeactivatePergunta(pergunta)}
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
          </>
        )}
      </section>

      <CategoriaFormDialog
        open={categoriaDialogOpen}
        onOpenChange={setCategoriaDialogOpen}
        categoria={editingCategoria}
        onSubmit={handleCategoriaSubmit}
        submitting={isCategoriaSubmitting}
        error={categoriaFormError}
      />

      <PerguntaFormDialog
        open={perguntaDialogOpen}
        onOpenChange={setPerguntaDialogOpen}
        pergunta={editingPergunta}
        categoriasAtivas={categoriasAtivas}
        defaultCategoriaId={defaultCategoriaIdParaNovaPergunta}
        onSubmit={handlePerguntaSubmit}
        submitting={isPerguntaSubmitting}
        error={perguntaFormError}
      />

      <AlertDialog
        open={!!confirmandoCategoria}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmandoCategoria(null);
            setConfirmCategoriaError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Desativar a categoria "{confirmandoCategoria?.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmCategoriaError && (
            <p role="alert" className="text-sm text-destructive">
              {confirmCategoriaError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDeactivateCategoria();
              }}
              disabled={deactivateCategoria.isPending}
            >
              {deactivateCategoria.isPending ? "Aguarde…" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmandoPergunta}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmandoPergunta(null);
            setConfirmPerguntaError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar pergunta</AlertDialogTitle>
            <AlertDialogDescription>Desativar esta pergunta?</AlertDialogDescription>
          </AlertDialogHeader>
          {confirmPerguntaError && (
            <p role="alert" className="text-sm text-destructive">
              {confirmPerguntaError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDeactivatePergunta();
              }}
              disabled={deactivatePergunta.isPending}
            >
              {deactivatePergunta.isPending ? "Aguarde…" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
