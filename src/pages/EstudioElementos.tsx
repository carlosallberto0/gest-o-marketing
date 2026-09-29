// Elementos do Estúdio — mesmo padrão de BibliotecaMarca.tsx (grid de cards,
// filtro por tipo, dialog de criação com upload). Botões de gestão visíveis a
// todo mundo: RLS decide, guarda de rota no frontend é UX, não segurança.
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  useEstudioElementos,
  useCreateEstudioElemento,
  useUpdateEstudioElemento,
  useDesativarEstudioElemento,
  type EstudioElemento,
  type EstudioTipoElemento,
} from "@/hooks/useEstudioElementos";
import { useUploadFoto, useFotoSignedUrl } from "@/hooks/useFoto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";

const TIPO_LABEL: Record<EstudioTipoElemento, string> = {
  imagem_produto: "Imagem de produto",
  logo: "Logo",
  selo: "Selo",
  icone: "Ícone",
  grafico: "Gráfico",
  texto_titulo: "Texto de título",
  texto_preco: "Texto de preço",
  texto_descricao: "Texto de descrição",
  texto_cta: "Texto de CTA",
  texto_info: "Texto informativo",
};

const TIPO_OPTIONS = Object.keys(TIPO_LABEL) as EstudioTipoElemento[];

// CHECK estudio_elementos_arquivo_coerente no banco: tipos de texto rejeitam
// arquivo_url preenchido; tipos visuais exigem. Espelhado aqui só pra UX
// (esconder/exigir o campo) — a validação real é do banco.
function isTipoTexto(tipo: EstudioTipoElemento): boolean {
  return tipo.startsWith("texto_");
}

function tagsFromTexto(texto: string): string[] {
  return texto
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

// Fora do corpo de EstudioElementos: cada card assina a própria signed URL de
// thumbnail e arquivo, mesmo padrão de BrandLibraryCard em BibliotecaMarca.tsx.
function ElementoCard({
  elemento,
  onEdit,
  onDesativar,
  desativando,
}: {
  elemento: EstudioElemento;
  onEdit: (elemento: EstudioElemento) => void;
  onDesativar: (elemento: EstudioElemento) => void;
  desativando: boolean;
}) {
  const { data: thumbUrl } = useFotoSignedUrl("estudio-elementos", elemento.thumbnail_url);
  const { data: arquivoUrl } = useFotoSignedUrl("estudio-elementos", elemento.arquivo_url);
  const textoSemArquivo = isTipoTexto(elemento.tipo);

  return (
    <Card className="flex flex-col">
      <CardHeader className="p-0">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={`Prévia de ${elemento.nome}`}
            className="h-40 w-full rounded-t object-cover"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-t bg-muted text-sm text-muted-foreground">
            {textoSemArquivo ? "Elemento de texto" : "Sem preview"}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">{elemento.nome}</CardTitle>
          <Badge variant="soft-info">{TIPO_LABEL[elemento.tipo]}</Badge>
        </div>
        {elemento.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {elemento.tags.map((tag) => (
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
        <Button variant="outline" size="sm" onClick={() => onEdit(elemento)}>
          Editar
        </Button>
        <Button variant="outline" size="sm" disabled={desativando} onClick={() => onDesativar(elemento)}>
          Desativar
        </Button>
      </CardFooter>
    </Card>
  );
}

interface ElementoFormValues {
  nome: string;
  tipo: EstudioTipoElemento;
  tagsTexto: string;
  arquivoFile: File | null;
  thumbnailFile: File | null;
}

// Fora do corpo de EstudioElementos: dentro, o formulário perderia estado a
// cada render do pai. Cobre criação e edição — sem campo `tipo` em edição
// (não editável, mesmo critério de BibliotecaMarca.tsx: useUpdateEstudioElemento
// não aceita esse campo). Campo de arquivo é condicional ao tipo: escondido
// pra elementos de texto (CHECK do banco rejeita arquivo_url nesses casos),
// obrigatório na criação pros tipos visuais.
function ElementoFormDialog({
  open,
  onOpenChange,
  elemento,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elemento: EstudioElemento | null;
  onSubmit: (values: ElementoFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const { data: arquivoAtualUrl } = useFotoSignedUrl("estudio-elementos", elemento?.arquivo_url ?? null);
  const { data: thumbnailAtualUrl } = useFotoSignedUrl("estudio-elementos", elemento?.thumbnail_url ?? null);

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<EstudioTipoElemento>("imagem_produto");
  const [tagsTexto, setTagsTexto] = useState("");
  const [arquivoFile, setArquivoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setNome(elemento?.nome ?? "");
      setTipo(elemento?.tipo ?? "imagem_produto");
      setTagsTexto(elemento?.tags.join(", ") ?? "");
      setArquivoFile(null);
      setThumbnailFile(null);
    }
  }, [open, elemento]);

  const textoSemArquivo = isTipoTexto(tipo);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    onSubmit({ nome, tipo, tagsTexto, arquivoFile, thumbnailFile });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{elemento ? "Editar elemento" : "Novo elemento"}</DialogTitle>
          <DialogDescription>
            {elemento
              ? "Atualize os dados do elemento do estúdio."
              : "Cadastre um novo elemento para uso no estúdio de comunicação."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="elemento-nome">Nome</Label>
            <Input id="elemento-nome" required value={nome} onChange={(event) => setNome(event.target.value)} />
          </div>

          {elemento ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="elemento-tipo">Tipo</Label>
              <Input
                id="elemento-tipo"
                readOnly
                value={TIPO_LABEL[elemento.tipo]}
                className="bg-muted text-muted-foreground"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="elemento-tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(value) => setTipo(value as EstudioTipoElemento)}>
                <SelectTrigger id="elemento-tipo">
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
            <Label htmlFor="elemento-tags">Tags (opcional, separadas por vírgula)</Label>
            <Input
              id="elemento-tags"
              placeholder="Ex.: promoção, verão, destaque"
              value={tagsTexto}
              onChange={(event) => setTagsTexto(event.target.value)}
            />
          </div>

          {elemento ? (
            !isTipoTexto(elemento.tipo) && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="elemento-arquivo-atual">Arquivo</Label>
                {arquivoAtualUrl ? (
                  <a
                    id="elemento-arquivo-atual"
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
                  Arquivo não é editável — para trocar, cadastre um novo elemento.
                </p>
              </div>
            )
          ) : (
            !textoSemArquivo && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="elemento-arquivo">Arquivo</Label>
                <Input
                  id="elemento-arquivo"
                  type="file"
                  required
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setArquivoFile(event.target.files?.[0] ?? null)}
                />
              </div>
            )
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="elemento-thumbnail">Thumbnail (opcional)</Label>
            {thumbnailAtualUrl && (
              <div className="flex items-center gap-2">
                <img src={thumbnailAtualUrl} alt="Thumbnail atual" className="h-16 w-16 rounded object-cover" />
                <span className="text-sm text-muted-foreground">Thumbnail atual</span>
              </div>
            )}
            <Input
              id="elemento-thumbnail"
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

export default function EstudioElementos() {
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const { data: elementos, isLoading } = useEstudioElementos({ tipo: tipoFiltro === "todos" ? undefined : tipoFiltro });

  const createElemento = useCreateEstudioElemento();
  const updateElemento = useUpdateEstudioElemento();
  const desativarElemento = useDesativarEstudioElemento();
  const uploadArquivo = useUploadFoto("estudio-elementos");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingElemento, setEditingElemento] = useState<EstudioElemento | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<EstudioElemento | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function openCreateDialog() {
    setEditingElemento(null);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(elemento: EstudioElemento) {
    setEditingElemento(elemento);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(values: ElementoFormValues) {
    setFormError(null);
    const tags = tagsFromTexto(values.tagsTexto);

    const erroDepoisDoUpload = (err: unknown) =>
      `O arquivo foi enviado, mas não foi possível salvar o elemento (${
        err instanceof Error ? err.message : "erro desconhecido"
      }). Tente novamente enviando o arquivo de novo — o anterior não será reaproveitado.`;

    try {
      if (editingElemento) {
        let thumbnail_url = editingElemento.thumbnail_url ?? undefined;
        if (values.thumbnailFile) {
          thumbnail_url = await uploadArquivo.mutateAsync({
            entidadeId: editingElemento.id,
            file: values.thumbnailFile,
          });
        }
        try {
          await updateElemento.mutateAsync({
            id: editingElemento.id,
            nome: values.nome,
            thumbnail_url,
            tags,
          });
        } catch (err) {
          setFormError(erroDepoisDoUpload(err));
          return;
        }
      } else {
        const precisaArquivo = !isTipoTexto(values.tipo);
        if (precisaArquivo && !values.arquivoFile) {
          setFormError("Selecione o arquivo do elemento.");
          return;
        }
        // Gerado ANTES do upload e reutilizado como `id` do insert — garante
        // que o path do Storage bate com estudio_elementos.id desde o
        // primeiro segundo (policy do bucket estudio-elementos exige essa
        // igualdade). Mesmo padrão de BibliotecaMarca.tsx.
        const entidadeTemporaria = crypto.randomUUID();
        const arquivo_url = precisaArquivo
          ? await uploadArquivo.mutateAsync({ entidadeId: entidadeTemporaria, file: values.arquivoFile as File })
          : undefined;
        const thumbnail_url = values.thumbnailFile
          ? await uploadArquivo.mutateAsync({ entidadeId: entidadeTemporaria, file: values.thumbnailFile })
          : undefined;

        try {
          await createElemento.mutateAsync({
            id: entidadeTemporaria,
            nome: values.nome,
            tipo: values.tipo,
            arquivo_url,
            thumbnail_url,
            tags,
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

  function handleDesativar(elemento: EstudioElemento) {
    setConfirmError(null);
    setConfirmando(elemento);
  }

  async function confirmDesativar() {
    if (!confirmando) return;
    try {
      await desativarElemento.mutateAsync(confirmando.id);
      setConfirmando(null);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Não foi possível desativar o elemento.");
    }
  }

  const isSubmitting = createElemento.isPending || updateElemento.isPending || uploadArquivo.isPending;
  const hasElementos = (elementos?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          breadcrumbs={[{ label: "Criação" }, { label: "Estúdio", to: "/estudio" }, { label: "Elementos" }]}
          title="Elementos do Estúdio"
          description="Imagens, logos, selos, ícones, gráficos e textos para os templates."
        />
        <Button onClick={openCreateDialog} className="sm:w-auto">
          Novo elemento
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:w-64">
        <Label htmlFor="elemento-filtro-tipo">Filtrar por tipo</Label>
        <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
          <SelectTrigger id="elemento-filtro-tipo">
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
      ) : !hasElementos ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">
            {tipoFiltro === "todos" ? "Nenhum elemento cadastrado ainda." : "Nenhum elemento com esse tipo."}
          </p>
          <Button onClick={openCreateDialog}>Cadastrar elemento</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {elementos!.map((elemento) => (
            <ElementoCard
              key={elemento.id}
              elemento={elemento}
              onEdit={openEditDialog}
              onDesativar={handleDesativar}
              desativando={desativarElemento.isPending}
            />
          ))}
        </div>
      )}

      <ElementoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        elemento={editingElemento}
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
        titulo="Desativar elemento"
        descricao={`Desativar o elemento "${confirmando?.nome}"?`}
        rotuloAcao="Desativar"
        pendente={desativarElemento.isPending}
        erro={confirmError}
        onConfirm={confirmDesativar}
      />
    </div>
  );
}
