// Biblioteca de marca — tela primariamente de consulta (RLS libera leitura a
// todo autenticado; gestão é restrita a admin/super_admin no banco). Botões
// de gestão ficam visíveis para todo mundo, sem checagem de papel no
// frontend: se a mutation for rejeitada pela RLS, o erro do banco aparece
// literal no formulário — mesma filosofia de "guarda de rota é UX, RLS é
// segurança" do resto do projeto.
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  useBrandLibrary,
  useCreateBrandLibraryItem,
  useUpdateBrandLibraryItem,
  useDesativarBrandLibraryItem,
  type BrandLibraryItem,
  type BrandLibraryTipo,
} from "@/hooks/useBrandLibrary";
import { useUploadFoto, useFotoSignedUrl } from "@/hooks/useFoto";
import { useCampanhas } from "@/hooks/useCampanhas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TIPO_LABEL: Record<BrandLibraryTipo, string> = {
  fonte: "Fonte",
  guia_cores: "Guia de cores",
  manual_marca: "Manual de marca",
  arte_campanha: "Arte de campanha",
  material_institucional: "Material institucional",
  outro: "Outro",
};

const TIPO_OPTIONS = Object.keys(TIPO_LABEL) as BrandLibraryTipo[];

function tagsFromTexto(texto: string): string[] {
  return texto
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

// Fora do corpo de BibliotecaMarca: cada card assina a própria signed URL de
// thumbnail e arquivo, mesmo padrão de DemandaArquivoLink em DemandasCriativas.tsx.
function BrandLibraryCard({
  item,
  onEdit,
  onDesativar,
  desativando,
}: {
  item: BrandLibraryItem;
  onEdit: (item: BrandLibraryItem) => void;
  onDesativar: (item: BrandLibraryItem) => void;
  desativando: boolean;
}) {
  const { data: thumbUrl } = useFotoSignedUrl("biblioteca-marca-arquivos", item.thumbnail_url);
  const { data: arquivoUrl } = useFotoSignedUrl("biblioteca-marca-arquivos", item.arquivo_url);

  return (
    <Card className="flex flex-col">
      <CardHeader className="p-0">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={`Prévia de ${item.nome}`}
            className="h-40 w-full rounded-t object-cover"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-t bg-muted text-sm text-muted-foreground">
            Sem preview
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">{item.nome}</CardTitle>
          <Badge variant="soft-info">{TIPO_LABEL[item.tipo]}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Versão {item.versao}</p>
        {item.descricao && <p className="text-sm text-muted-foreground">{item.descricao}</p>}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t border-border/50 p-4 pt-4">
        {arquivoUrl && (
          <Button asChild variant="outline" size="sm">
            <a href={arquivoUrl} target="_blank" rel="noreferrer">
              Baixar
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
          Editar
        </Button>
        <Button variant="outline" size="sm" disabled={desativando} onClick={() => onDesativar(item)}>
          Desativar
        </Button>
      </CardFooter>
    </Card>
  );
}

interface BrandLibraryFormValues {
  nome: string;
  tipo: BrandLibraryTipo;
  tagsTexto: string;
  campanhaId: string;
  descricao: string;
  arquivoFile: File | null;
  thumbnailFile: File | null;
}

// Fora do corpo de BibliotecaMarca: dentro, o formulário perderia estado a
// cada render do pai. Cobre criação e edição — sem campo `tipo` em edição
// (não editável, mesmo em criação: arquivo_url também não muda depois de
// criado — useUpdateBrandLibraryItem não aceita esse campo, arquivo novo é
// versão nova do item, decisão já documentada no hook. Por isso o arquivo é
// obrigatório aqui na criação, e em edição só a thumbnail pode ser trocada).
function BrandLibraryFormDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: BrandLibraryItem | null;
  onSubmit: (values: BrandLibraryFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const { data: campanhas = [] } = useCampanhas();
  const { data: arquivoAtualUrl } = useFotoSignedUrl("biblioteca-marca-arquivos", item?.arquivo_url ?? null);
  const { data: thumbnailAtualUrl } = useFotoSignedUrl("biblioteca-marca-arquivos", item?.thumbnail_url ?? null);

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<BrandLibraryTipo>("outro");
  const [tagsTexto, setTagsTexto] = useState("");
  const [campanhaId, setCampanhaId] = useState("nenhuma");
  const [descricao, setDescricao] = useState("");
  const [arquivoFile, setArquivoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setNome(item?.nome ?? "");
      setTipo(item?.tipo ?? "outro");
      setTagsTexto(item?.tags.join(", ") ?? "");
      setCampanhaId(item?.campanha_id ?? "nenhuma");
      setDescricao(item?.descricao ?? "");
      setArquivoFile(null);
      setThumbnailFile(null);
    }
  }, [open, item]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    onSubmit({ nome, tipo, tagsTexto, campanhaId, descricao, arquivoFile, thumbnailFile });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Editar item" : "Novo item"}</DialogTitle>
          <DialogDescription>
            {item ? "Atualize os dados do item da biblioteca de marca." : "Cadastre um novo item na biblioteca de marca."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="biblioteca-nome">Nome</Label>
            <Input id="biblioteca-nome" required value={nome} onChange={(event) => setNome(event.target.value)} />
          </div>

          {item ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="biblioteca-tipo">Tipo</Label>
              <Input id="biblioteca-tipo" readOnly value={TIPO_LABEL[item.tipo]} className="bg-muted text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="biblioteca-tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(value) => setTipo(value as BrandLibraryTipo)}>
                <SelectTrigger id="biblioteca-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.map((valor) => (
                    <SelectItem key={valor} value={valor}>
                      {TIPO_LABEL[valor]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="biblioteca-tags">Tags (opcional, separadas por vírgula)</Label>
            <Input
              id="biblioteca-tags"
              placeholder="Ex.: institucional, 2026, vermelho"
              value={tagsTexto}
              onChange={(event) => setTagsTexto(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="biblioteca-campanha">Campanha (opcional)</Label>
            <Select value={campanhaId} onValueChange={setCampanhaId}>
              <SelectTrigger id="biblioteca-campanha">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Nenhuma</SelectItem>
                {campanhas.map((campanha) => (
                  <SelectItem key={campanha.id} value={campanha.id}>
                    {campanha.codigo} — {campanha.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="biblioteca-descricao">Descrição (opcional)</Label>
            <Textarea
              id="biblioteca-descricao"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
            />
          </div>

          {item ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="biblioteca-arquivo-atual">Arquivo</Label>
              {arquivoAtualUrl ? (
                <a
                  id="biblioteca-arquivo-atual"
                  href={arquivoAtualUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary underline"
                >
                  Baixar arquivo atual
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Arquivo indisponível.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Arquivo não é editável — para trocar, cadastre um novo item (nova versão).
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="biblioteca-arquivo">Arquivo</Label>
              <Input
                id="biblioteca-arquivo"
                type="file"
                required
                onChange={(event: ChangeEvent<HTMLInputElement>) => setArquivoFile(event.target.files?.[0] ?? null)}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="biblioteca-thumbnail">Thumbnail (opcional)</Label>
            {thumbnailAtualUrl && (
              <div className="flex items-center gap-2">
                <img src={thumbnailAtualUrl} alt="Thumbnail atual" className="h-16 w-16 rounded object-cover" />
                <span className="text-sm text-muted-foreground">Thumbnail atual</span>
              </div>
            )}
            <Input
              id="biblioteca-thumbnail"
              type="file"
              accept="image/*"
              onChange={(event: ChangeEvent<HTMLInputElement>) => setThumbnailFile(event.target.files?.[0] ?? null)}
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

export default function BibliotecaMarca() {
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const { data: itens, isLoading } = useBrandLibrary({ tipo: tipoFiltro === "todos" ? undefined : tipoFiltro });

  const createItem = useCreateBrandLibraryItem();
  const updateItem = useUpdateBrandLibraryItem();
  const desativarItem = useDesativarBrandLibraryItem();
  const uploadArquivo = useUploadFoto("biblioteca-marca-arquivos");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BrandLibraryItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<BrandLibraryItem | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function openCreateDialog() {
    setEditingItem(null);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(item: BrandLibraryItem) {
    setEditingItem(item);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(values: BrandLibraryFormValues) {
    setFormError(null);
    const tags = tagsFromTexto(values.tagsTexto);
    const campanha_id = values.campanhaId === "nenhuma" ? undefined : values.campanhaId;

    const erroDepoisDoUpload = (err: unknown) =>
      `O arquivo foi enviado, mas não foi possível salvar o item (${
        err instanceof Error ? err.message : "erro desconhecido"
      }). Tente novamente enviando o arquivo de novo — o anterior não será reaproveitado.`;

    try {
      if (editingItem) {
        let thumbnail_url = editingItem.thumbnail_url ?? undefined;
        if (values.thumbnailFile) {
          thumbnail_url = await uploadArquivo.mutateAsync({
            entidadeId: editingItem.id,
            file: values.thumbnailFile,
          });
        }
        try {
          await updateItem.mutateAsync({
            id: editingItem.id,
            nome: values.nome,
            thumbnail_url,
            tags,
            campanha_id,
            descricao: values.descricao || undefined,
          });
        } catch (err) {
          setFormError(erroDepoisDoUpload(err));
          return;
        }
      } else {
        if (!values.arquivoFile) {
          setFormError("Selecione o arquivo do item.");
          return;
        }
        // Gerado ANTES do upload e reutilizado como `id` do insert — garante
        // que o path do Storage bate com brand_library.id desde o primeiro
        // segundo (policy de SELECT do bucket exige essa igualdade).
        const entidadeTemporaria = crypto.randomUUID();
        const arquivo_url = await uploadArquivo.mutateAsync({
          entidadeId: entidadeTemporaria,
          file: values.arquivoFile,
        });
        const thumbnail_url = values.thumbnailFile
          ? await uploadArquivo.mutateAsync({ entidadeId: entidadeTemporaria, file: values.thumbnailFile })
          : undefined;

        try {
          await createItem.mutateAsync({
            id: entidadeTemporaria,
            nome: values.nome,
            tipo: values.tipo,
            arquivo_url,
            thumbnail_url,
            tags,
            campanha_id,
            descricao: values.descricao || undefined,
          });
        } catch (err) {
          setFormError(erroDepoisDoUpload(err));
          return;
        }
      }
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Falha no upload do arquivo.");
    }
  }

  function handleDesativar(item: BrandLibraryItem) {
    setConfirmError(null);
    setConfirmando(item);
  }

  async function confirmDesativar() {
    if (!confirmando) return;
    try {
      await desativarItem.mutateAsync(confirmando.id);
      setConfirmando(null);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Não foi possível desativar o item.");
    }
  }

  const isSubmitting = createItem.isPending || updateItem.isPending || uploadArquivo.isPending;
  const hasItens = (itens?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Biblioteca de Marca</h1>
          <p className="text-muted-foreground">Fontes, guias, artes e materiais institucionais da marca.</p>
        </div>
        <Button onClick={openCreateDialog} className="sm:w-auto">
          Novo item
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:w-64">
        <Label htmlFor="biblioteca-filtro-tipo">Filtrar por tipo</Label>
        <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
          <SelectTrigger id="biblioteca-filtro-tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {TIPO_OPTIONS.map((valor) => (
              <SelectItem key={valor} value={valor}>
                {TIPO_LABEL[valor]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !hasItens ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">
            {tipoFiltro === "todos" ? "Nenhum item cadastrado ainda." : "Nenhum item com esse tipo."}
          </p>
          <Button onClick={openCreateDialog}>Cadastrar item</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {itens!.map((item) => (
            <BrandLibraryCard
              key={item.id}
              item={item}
              onEdit={openEditDialog}
              onDesativar={handleDesativar}
              desativando={desativarItem.isPending}
            />
          ))}
        </div>
      )}

      <BrandLibraryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        onSubmit={handleSubmit}
        submitting={isSubmitting}
        error={formError}
      />

      <AlertDialog
        open={!!confirmando}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmando(null);
            setConfirmError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar item</AlertDialogTitle>
            <AlertDialogDescription>
              Desativar o item "{confirmando?.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmError && (
            <p role="alert" className="text-sm text-destructive">
              {confirmError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDesativar();
              }}
              disabled={desativarItem.isPending}
            >
              {desativarItem.isPending ? "Aguarde…" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
