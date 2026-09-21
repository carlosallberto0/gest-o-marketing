// Templates do Estúdio — três seções: categorias (mesma estrutura de
// ChecklistConfig.tsx), templates (grid de cards no padrão de
// BibliotecaMarca.tsx/EstudioElementos.tsx) e áreas do template selecionado
// (preview estático por percentuais fixos — Cenário A do backlog, sem
// biblioteca de canvas). Botões de gestão visíveis a todo mundo: RLS decide,
// guarda de rota no frontend é UX, não segurança.
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  useEstudioCategorias,
  useCreateEstudioCategoria,
  useUpdateEstudioCategoria,
  useDesativarEstudioCategoria,
  useEstudioTemplates,
  useCreateEstudioTemplate,
  useUpdateEstudioTemplate,
  useDesativarEstudioTemplate,
  useExcluirEstudioTemplate,
  useEstudioTemplateAreas,
  useCreateEstudioTemplateArea,
  useUpdateEstudioTemplateArea,
  useExcluirEstudioTemplateArea,
  type EstudioCanal,
  type EstudioCategoria,
  type EstudioTemplateComCategoria,
  type EstudioTemplateArea,
} from "@/hooks/useEstudioTemplates";
import type { EstudioTipoElemento } from "@/hooks/useEstudioElementos";
import { useUploadFoto, useFotoSignedUrl } from "@/hooks/useFoto";
import { useCampanhas } from "@/hooks/useCampanhas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CANAL_LABEL: Record<EstudioCanal, string> = {
  whatsapp: "WhatsApp",
  instagram_feed: "Instagram Feed",
  instagram_story: "Instagram Story",
  pdv_impresso: "PDV Impresso",
  email: "E-mail",
  led: "Faixa de LED",
  lona: "Faixa de Lona",
};
const CANAL_OPTIONS = Object.keys(CANAL_LABEL) as EstudioCanal[];

// Mesma lista de EstudioElementos.tsx (não exportada de lá, duplicada aqui —
// é o mesmo CHECK de tipo de elemento, mas em contexto de área de template).
const TIPO_ELEMENTO_LABEL: Record<EstudioTipoElemento, string> = {
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
const TIPO_ELEMENTO_OPTIONS = Object.keys(TIPO_ELEMENTO_LABEL) as EstudioTipoElemento[];

const FILTRO_TODAS = "todas";

interface CategoriaFormValues {
  nome: string;
  canal: EstudioCanal;
  icone: string;
  ordem: number;
}

// Fora do corpo de EstudioTemplates: definido dentro, o input perderia estado
// a cada render do pai.
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
  categoria: EstudioCategoria | null;
  onSubmit: (values: CategoriaFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [nome, setNome] = useState("");
  const [canal, setCanal] = useState<EstudioCanal>("whatsapp");
  const [icone, setIcone] = useState("");
  const [ordem, setOrdem] = useState(0);

  useEffect(() => {
    if (open) {
      setNome(categoria?.nome ?? "");
      setCanal(categoria?.canal ?? "whatsapp");
      setIcone(categoria?.icone ?? "");
      setOrdem(categoria?.ordem ?? 0);
    }
  }, [open, categoria]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    onSubmit({ nome, canal, icone, ordem });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{categoria ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>
            {categoria
              ? "Atualize os dados da categoria de templates do estúdio."
              : "Cadastre uma nova categoria de templates do estúdio de comunicação."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria-nome">Nome</Label>
            <Input id="categoria-nome" required value={nome} onChange={(event) => setNome(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria-canal">Canal</Label>
            <Select value={canal} onValueChange={(value) => setCanal(value as EstudioCanal)}>
              <SelectTrigger id="categoria-canal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANAL_OPTIONS.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {CANAL_LABEL[valor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria-icone">Ícone (opcional)</Label>
            <Input id="categoria-icone" value={icone} onChange={(event) => setIcone(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria-ordem">Ordem</Label>
            <Input
              id="categoria-ordem"
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

// Fora do corpo de EstudioTemplates: cada card assina a própria signed URL de
// thumbnail e imagem base, mesmo padrão de BrandLibraryCard/ElementoCard.
function TemplateCard({
  template,
  onConfigurarAreas,
  onEdit,
  onDesativar,
  onExcluir,
  desativando,
  excluindo,
}: {
  template: EstudioTemplateComCategoria;
  onConfigurarAreas: (template: EstudioTemplateComCategoria) => void;
  onEdit: (template: EstudioTemplateComCategoria) => void;
  onDesativar: (template: EstudioTemplateComCategoria) => void;
  onExcluir: (template: EstudioTemplateComCategoria) => void;
  desativando: boolean;
  excluindo: boolean;
}) {
  const { data: thumbUrl } = useFotoSignedUrl("estudio-templates", template.thumbnail_url);
  const { data: baseUrl } = useFotoSignedUrl("estudio-templates", template.imagem_base_url);
  const previewUrl = thumbUrl ?? baseUrl;

  return (
    <Card className="flex flex-col">
      <CardHeader className="p-0">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`Prévia do template ${template.nome}`}
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
          <CardTitle className="text-sm">{template.nome}</CardTitle>
          <Badge variant="soft-info">{template.categoria ? CANAL_LABEL[template.categoria.canal] : "—"}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {template.largura_px}×{template.altura_px}px
        </p>
        <Badge variant={template.is_active ? "success" : "outline"} className="w-fit">
          {template.is_active ? "ativo" : "inativo"}
        </Badge>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t border-border/50 p-4 pt-4">
        <Button variant="outline" size="sm" onClick={() => onConfigurarAreas(template)}>
          Configurar áreas
        </Button>
        <Button variant="outline" size="sm" onClick={() => onEdit(template)}>
          Editar
        </Button>
        {template.is_active && (
          <Button variant="outline" size="sm" disabled={desativando} onClick={() => onDesativar(template)}>
            Desativar
          </Button>
        )}
        <Button variant="destructive" size="sm" disabled={excluindo} onClick={() => onExcluir(template)}>
          {excluindo ? "Excluindo…" : "Excluir"}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface TemplateFormValues {
  nome: string;
  descricao: string;
  categoriaId: string;
  larguraPx: number;
  alturaPx: number;
  campanhaId: string;
  imagemFile: File | null;
  thumbnailFile: File | null;
}

// Fora do corpo de EstudioTemplates pelo mesmo motivo do form de categoria.
// imagem_base_url não é editável depois de criado (mesma decisão de
// BibliotecaMarca.tsx/EstudioElementos.tsx pro arquivo principal) — em
// edição aparece só como link somente-leitura; thumbnail pode ser trocada
// nos dois modos.
function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  categoriasAtivas,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EstudioTemplateComCategoria | null;
  categoriasAtivas: EstudioCategoria[];
  onSubmit: (values: TemplateFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const { data: campanhas = [] } = useCampanhas();
  const { data: imagemAtualUrl } = useFotoSignedUrl("estudio-templates", template?.imagem_base_url ?? null);
  const { data: thumbnailAtualUrl } = useFotoSignedUrl("estudio-templates", template?.thumbnail_url ?? null);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [larguraPx, setLarguraPx] = useState(1);
  const [alturaPx, setAlturaPx] = useState(1);
  const [campanhaId, setCampanhaId] = useState("nenhuma");
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNome(template?.nome ?? "");
      setDescricao(template?.descricao ?? "");
      setCategoriaId(template?.categoria_id ?? categoriasAtivas[0]?.id ?? "");
      setLarguraPx(template?.largura_px ?? 1);
      setAlturaPx(template?.altura_px ?? 1);
      setCampanhaId(template?.campanha_id ?? "nenhuma");
      setImagemFile(null);
      setThumbnailFile(null);
      setValidationError(null);
    }
    // categoriasAtivas de propósito fora das deps: reset deve rodar só quando
    // o diálogo abre/fecha ou o registro muda, não a cada nova referência de
    // array vinda do React Query (ver causa raiz do bug de imagem sumindo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!categoriaId || !categoriasAtivas.some((categoria) => categoria.id === categoriaId)) {
      setValidationError("Selecione uma categoria ativa antes de salvar.");
      return;
    }
    if (!template && !imagemFile) {
      setValidationError("Selecione a imagem base do template.");
      return;
    }
    setValidationError(null);
    onSubmit({ nome, descricao, categoriaId, larguraPx, alturaPx, campanhaId, imagemFile, thumbnailFile });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? "Editar template" : "Novo template"}</DialogTitle>
          <DialogDescription>
            {template ? "Atualize os dados do template do estúdio." : "Cadastre um novo template para o estúdio de comunicação."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="template-nome">Nome</Label>
            <Input id="template-nome" required value={nome} onChange={(event) => setNome(event.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="template-descricao">Descrição (opcional)</Label>
            <Textarea id="template-descricao" value={descricao} onChange={(event) => setDescricao(event.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="template-categoria">Categoria</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger id="template-categoria">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categoriasAtivas.map((categoria) => (
                  <SelectItem key={categoria.id} value={categoria.id}>
                    {categoria.nome} ({CANAL_LABEL[categoria.canal]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="template-largura">Largura (px)</Label>
              <Input
                id="template-largura"
                type="number"
                min="1"
                required
                value={larguraPx}
                onChange={(event) => setLarguraPx(Number(event.target.value))}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="template-altura">Altura (px)</Label>
              <Input
                id="template-altura"
                type="number"
                min="1"
                required
                value={alturaPx}
                onChange={(event) => setAlturaPx(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="template-campanha">Campanha (opcional)</Label>
            <Select value={campanhaId} onValueChange={setCampanhaId}>
              <SelectTrigger id="template-campanha">
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

          {template ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="template-imagem-atual">Imagem base</Label>
              {imagemAtualUrl ? (
                <a
                  id="template-imagem-atual"
                  href={imagemAtualUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary underline"
                >
                  Ver imagem base atual
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Imagem indisponível.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Imagem base não é editável — para trocar, cadastre um novo template.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="template-imagem">Imagem base</Label>
              <Input
                id="template-imagem"
                type="file"
                accept="image/*"
                required
                onChange={(event: ChangeEvent<HTMLInputElement>) => setImagemFile(event.target.files?.[0] ?? null)}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="template-thumbnail">Thumbnail (opcional)</Label>
            {thumbnailAtualUrl && (
              <div className="flex items-center gap-2">
                <img src={thumbnailAtualUrl} alt="Thumbnail atual" className="h-16 w-16 rounded object-cover" />
                <span className="text-sm text-muted-foreground">Thumbnail atual</span>
              </div>
            )}
            <Input
              id="template-thumbnail"
              type="file"
              accept="image/*"
              onChange={(event: ChangeEvent<HTMLInputElement>) => setThumbnailFile(event.target.files?.[0] ?? null)}
            />
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

interface AreaFormValues {
  nome: string;
  tipo: EstudioTipoElemento;
  xPercent: number;
  yPercent: number;
  larguraPercent: number;
  alturaPercent: number;
  obrigatorio: boolean;
  maxElementos: number;
  zIndex: number;
  notas: string;
}

// Fora do corpo de EstudioTemplates pelo mesmo motivo dos demais forms.
function AreaFormDialog({
  open,
  onOpenChange,
  area,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: EstudioTemplateArea | null;
  onSubmit: (values: AreaFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<EstudioTipoElemento>("imagem_produto");
  const [xPercent, setXPercent] = useState(0);
  const [yPercent, setYPercent] = useState(0);
  const [larguraPercent, setLarguraPercent] = useState(10);
  const [alturaPercent, setAlturaPercent] = useState(10);
  const [obrigatorio, setObrigatorio] = useState(true);
  const [maxElementos, setMaxElementos] = useState(1);
  const [zIndex, setZIndex] = useState(0);
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (open) {
      setNome(area?.nome ?? "");
      setTipo(area?.tipo_elemento_permitido ?? "imagem_produto");
      setXPercent(area?.x_percent ?? 0);
      setYPercent(area?.y_percent ?? 0);
      setLarguraPercent(area?.largura_percent ?? 10);
      setAlturaPercent(area?.altura_percent ?? 10);
      setObrigatorio(area?.obrigatorio ?? true);
      setMaxElementos(area?.max_elementos ?? 1);
      setZIndex(area?.z_index ?? 0);
      setNotas(area?.notas ?? "");
    }
  }, [open, area]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    onSubmit({ nome, tipo, xPercent, yPercent, larguraPercent, alturaPercent, obrigatorio, maxElementos, zIndex, notas });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{area ? "Editar área" : "Nova área"}</DialogTitle>
          <DialogDescription>
            {area ? "Atualize a posição e as regras desta área do template." : "Defina uma nova área sobre o template."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="area-nome">Nome</Label>
            <Input id="area-nome" required value={nome} onChange={(event) => setNome(event.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="area-tipo">Tipo de elemento permitido</Label>
            <Select value={tipo} onValueChange={(value) => setTipo(value as EstudioTipoElemento)}>
              <SelectTrigger id="area-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_ELEMENTO_OPTIONS.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {TIPO_ELEMENTO_LABEL[valor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="area-x">X (%)</Label>
              <Input
                id="area-x"
                type="number"
                min="0"
                max="100"
                step="0.1"
                required
                value={xPercent}
                onChange={(event) => setXPercent(Number(event.target.value))}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="area-y">Y (%)</Label>
              <Input
                id="area-y"
                type="number"
                min="0"
                max="100"
                step="0.1"
                required
                value={yPercent}
                onChange={(event) => setYPercent(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="area-largura">Largura (%)</Label>
              <Input
                id="area-largura"
                type="number"
                min="0"
                max="100"
                step="0.1"
                required
                value={larguraPercent}
                onChange={(event) => setLarguraPercent(Number(event.target.value))}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="area-altura">Altura (%)</Label>
              <Input
                id="area-altura"
                type="number"
                min="0"
                max="100"
                step="0.1"
                required
                value={alturaPercent}
                onChange={(event) => setAlturaPercent(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="area-obrigatorio"
              checked={obrigatorio}
              onCheckedChange={(checked) => setObrigatorio(checked === true)}
            />
            <Label htmlFor="area-obrigatorio" className="font-normal">
              Área obrigatória
            </Label>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="area-max-elementos">Máx. de elementos</Label>
              <Input
                id="area-max-elementos"
                type="number"
                min="1"
                step="1"
                value={maxElementos}
                onChange={(event) => setMaxElementos(Number(event.target.value))}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="area-z-index">Ordem de camada (z-index)</Label>
              <Input
                id="area-z-index"
                type="number"
                step="1"
                value={zIndex}
                onChange={(event) => setZIndex(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="area-notas">Notas (opcional)</Label>
            <Textarea id="area-notas" value={notas} onChange={(event) => setNotas(event.target.value)} />
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

// Fora do corpo de EstudioTemplates: só leitura (preview + lista), mas
// mantido como componente próprio para separar a seção 3 do restante.
function TemplateAreasSection({
  template,
  onFechar,
  onNovaArea,
  onEditarArea,
  onExcluirArea,
  excluindo,
}: {
  template: EstudioTemplateComCategoria;
  onFechar: () => void;
  onNovaArea: () => void;
  onEditarArea: (area: EstudioTemplateArea) => void;
  onExcluirArea: (area: EstudioTemplateArea) => void;
  excluindo: boolean;
}) {
  const { data: areas, isLoading } = useEstudioTemplateAreas(template.id);
  const { data: imagemUrl } = useFotoSignedUrl("estudio-templates", template.imagem_base_url);
  const hasAreas = (areas?.length ?? 0) > 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Áreas — {template.nome}</h2>
          <p className="text-sm text-muted-foreground">
            {template.largura_px}×{template.altura_px}px
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onNovaArea} className="sm:w-auto">
            Nova área
          </Button>
          <Button variant="outline" onClick={onFechar} className="sm:w-auto">
            Voltar
          </Button>
        </div>
      </div>

      <div
        className="relative w-full max-w-xl overflow-hidden rounded-md border border-border bg-muted"
        style={{ aspectRatio: `${template.largura_px} / ${template.altura_px}` }}
      >
        {imagemUrl ? (
          <img src={imagemUrl} alt={`Imagem base do template ${template.nome}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Carregando imagem base…
          </div>
        )}
        {(areas ?? []).map((area) => (
          <div
            key={area.id}
            className={`absolute flex items-start overflow-hidden border-2 border-dashed p-1 text-[10px] font-medium leading-tight ${
              area.obrigatorio ? "border-destructive bg-destructive/10 text-destructive" : "border-primary bg-primary/10 text-primary"
            }`}
            style={{
              left: `${area.x_percent}%`,
              top: `${area.y_percent}%`,
              width: `${area.largura_percent}%`,
              height: `${area.altura_percent}%`,
            }}
          >
            {area.nome}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !hasAreas ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">Nenhuma área cadastrada para este template ainda.</p>
          <Button onClick={onNovaArea}>Criar área</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Posição / tamanho</TableHead>
                <TableHead>Obrigatória</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas!.map((area) => (
                <TableRow key={area.id}>
                  <TableCell className="font-medium">{area.nome}</TableCell>
                  <TableCell>
                    <Badge variant="soft-info">{TIPO_ELEMENTO_LABEL[area.tipo_elemento_permitido]}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    x {area.x_percent}%, y {area.y_percent}%, larg {area.largura_percent}%, alt {area.altura_percent}%
                  </TableCell>
                  <TableCell>
                    <Badge variant={area.obrigatorio ? "destructive" : "outline"}>
                      {area.obrigatorio ? "sim" : "não"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => onEditarArea(area)}>
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={excluindo}
                        onClick={() => onExcluirArea(area)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

export default function EstudioTemplates() {
  // Seção 1 — categorias
  const { data: categorias, isLoading: loadingCategorias } = useEstudioCategorias();
  const createCategoria = useCreateEstudioCategoria();
  const updateCategoria = useUpdateEstudioCategoria();
  const desativarCategoria = useDesativarEstudioCategoria();

  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<EstudioCategoria | null>(null);
  const [categoriaFormError, setCategoriaFormError] = useState<string | null>(null);
  const [confirmandoCategoria, setConfirmandoCategoria] = useState<EstudioCategoria | null>(null);
  const [confirmCategoriaError, setConfirmCategoriaError] = useState<string | null>(null);

  const categoriasAtivas = useMemo(
    () => (categorias ?? []).filter((categoria) => categoria.is_active),
    [categorias],
  );
  const hasCategorias = (categorias?.length ?? 0) > 0;

  // Seção 2 — templates
  const [filtroCategoriaId, setFiltroCategoriaId] = useState<string>(FILTRO_TODAS);
  const { data: templates, isLoading: loadingTemplates } = useEstudioTemplates({
    categoriaId: filtroCategoriaId === FILTRO_TODAS ? undefined : filtroCategoriaId,
  });
  const createTemplate = useCreateEstudioTemplate();
  const updateTemplate = useUpdateEstudioTemplate();
  const desativarTemplate = useDesativarEstudioTemplate();
  const excluirTemplate = useExcluirEstudioTemplate();
  const uploadImagemTemplate = useUploadFoto("estudio-templates");

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EstudioTemplateComCategoria | null>(null);
  const [templateFormError, setTemplateFormError] = useState<string | null>(null);
  const [confirmandoTemplate, setConfirmandoTemplate] = useState<EstudioTemplateComCategoria | null>(null);
  const [confirmTemplateError, setConfirmTemplateError] = useState<string | null>(null);
  const [excluindoTemplate, setExcluindoTemplate] = useState<EstudioTemplateComCategoria | null>(null);
  const [excluirTemplateError, setExcluirTemplateError] = useState<string | null>(null);

  // Seção 3 — áreas do template selecionado
  const [templateSelecionado, setTemplateSelecionado] = useState<EstudioTemplateComCategoria | null>(null);
  const createArea = useCreateEstudioTemplateArea();
  const updateArea = useUpdateEstudioTemplateArea();
  const excluirArea = useExcluirEstudioTemplateArea();

  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<EstudioTemplateArea | null>(null);
  const [areaFormError, setAreaFormError] = useState<string | null>(null);
  const [confirmandoArea, setConfirmandoArea] = useState<EstudioTemplateArea | null>(null);
  const [confirmAreaError, setConfirmAreaError] = useState<string | null>(null);

  function openCreateCategoriaDialog() {
    setEditingCategoria(null);
    setCategoriaFormError(null);
    setCategoriaDialogOpen(true);
  }

  function openEditCategoriaDialog(categoria: EstudioCategoria) {
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
          canal: values.canal,
          icone: values.icone || undefined,
          ordem: values.ordem,
        });
      } else {
        await createCategoria.mutateAsync({
          nome: values.nome,
          canal: values.canal,
          icone: values.icone || undefined,
          ordem: values.ordem,
        });
      }
      setCategoriaDialogOpen(false);
    } catch (err) {
      setCategoriaFormError(err instanceof Error ? err.message : "Não foi possível salvar a categoria.");
    }
  }

  function handleDesativarCategoria(categoria: EstudioCategoria) {
    setConfirmCategoriaError(null);
    setConfirmandoCategoria(categoria);
  }

  async function confirmDesativarCategoria() {
    if (!confirmandoCategoria) return;
    try {
      await desativarCategoria.mutateAsync(confirmandoCategoria.id);
      setConfirmandoCategoria(null);
    } catch (err) {
      setConfirmCategoriaError(err instanceof Error ? err.message : "Não foi possível desativar a categoria.");
    }
  }

  function openCreateTemplateDialog() {
    setEditingTemplate(null);
    setTemplateFormError(null);
    setTemplateDialogOpen(true);
  }

  function openEditTemplateDialog(template: EstudioTemplateComCategoria) {
    setEditingTemplate(template);
    setTemplateFormError(null);
    setTemplateDialogOpen(true);
  }

  async function handleTemplateSubmit(values: TemplateFormValues) {
    setTemplateFormError(null);
    const campanha_id = values.campanhaId === "nenhuma" ? undefined : values.campanhaId;

    const erroDepoisDoUpload = (err: unknown) =>
      `A imagem foi enviada, mas não foi possível salvar o template (${
        err instanceof Error ? err.message : "erro desconhecido"
      }). Tente novamente enviando a imagem de novo — a anterior não será reaproveitada.`;

    try {
      if (editingTemplate) {
        let thumbnail_url = editingTemplate.thumbnail_url ?? undefined;
        if (values.thumbnailFile) {
          thumbnail_url = await uploadImagemTemplate.mutateAsync({
            entidadeId: editingTemplate.id,
            file: values.thumbnailFile,
          });
        }
        try {
          await updateTemplate.mutateAsync({
            id: editingTemplate.id,
            nome: values.nome,
            descricao: values.descricao || undefined,
            categoria_id: values.categoriaId,
            largura_px: values.larguraPx,
            altura_px: values.alturaPx,
            campanha_id,
            thumbnail_url,
          });
        } catch (err) {
          setTemplateFormError(erroDepoisDoUpload(err));
          return;
        }
      } else {
        // Gerado ANTES do upload e reutilizado como `id` do insert — mesmo
        // padrão de BibliotecaMarca.tsx/EstudioElementos.tsx: a policy de
        // Storage de estudio-templates exige que o path bata com o id real
        // da linha.
        const entidadeTemporaria = crypto.randomUUID();
        const imagem_base_url = await uploadImagemTemplate.mutateAsync({
          entidadeId: entidadeTemporaria,
          file: values.imagemFile as File,
        });
        const thumbnail_url = values.thumbnailFile
          ? await uploadImagemTemplate.mutateAsync({ entidadeId: entidadeTemporaria, file: values.thumbnailFile })
          : undefined;

        try {
          await createTemplate.mutateAsync({
            id: entidadeTemporaria,
            nome: values.nome,
            descricao: values.descricao || undefined,
            categoria_id: values.categoriaId,
            imagem_base_url,
            thumbnail_url,
            largura_px: values.larguraPx,
            altura_px: values.alturaPx,
            campanha_id,
          });
        } catch (err) {
          setTemplateFormError(erroDepoisDoUpload(err));
          return;
        }
      }
      setTemplateDialogOpen(false);
    } catch (err) {
      setTemplateFormError(err instanceof Error ? err.message : "Falha no upload da imagem.");
    }
  }

  function handleDesativarTemplate(template: EstudioTemplateComCategoria) {
    setConfirmTemplateError(null);
    setConfirmandoTemplate(template);
  }

  async function confirmDesativarTemplate() {
    if (!confirmandoTemplate) return;
    try {
      await desativarTemplate.mutateAsync(confirmandoTemplate.id);
      setConfirmandoTemplate(null);
    } catch (err) {
      setConfirmTemplateError(err instanceof Error ? err.message : "Não foi possível desativar o template.");
    }
  }

  function handleExcluirTemplate(template: EstudioTemplateComCategoria) {
    setExcluirTemplateError(null);
    setExcluindoTemplate(template);
  }

  async function confirmExcluirTemplate() {
    if (!excluindoTemplate) return;
    try {
      await excluirTemplate.mutateAsync(excluindoTemplate.id);
      if (templateSelecionado?.id === excluindoTemplate.id) setTemplateSelecionado(null);
      setExcluindoTemplate(null);
    } catch (err) {
      setExcluirTemplateError(err instanceof Error ? err.message : "Não foi possível excluir o template.");
    }
  }

  function openCreateAreaDialog() {
    setEditingArea(null);
    setAreaFormError(null);
    setAreaDialogOpen(true);
  }

  function openEditAreaDialog(area: EstudioTemplateArea) {
    setEditingArea(area);
    setAreaFormError(null);
    setAreaDialogOpen(true);
  }

  async function handleAreaSubmit(values: AreaFormValues) {
    if (!templateSelecionado) return;
    setAreaFormError(null);
    try {
      const payload = {
        nome: values.nome,
        tipo_elemento_permitido: values.tipo,
        x_percent: values.xPercent,
        y_percent: values.yPercent,
        largura_percent: values.larguraPercent,
        altura_percent: values.alturaPercent,
        obrigatorio: values.obrigatorio,
        max_elementos: values.maxElementos,
        z_index: values.zIndex,
        notas: values.notas || undefined,
      };
      if (editingArea) {
        await updateArea.mutateAsync({ id: editingArea.id, template_id: templateSelecionado.id, ...payload });
      } else {
        await createArea.mutateAsync({ template_id: templateSelecionado.id, ...payload });
      }
      setAreaDialogOpen(false);
    } catch (err) {
      setAreaFormError(err instanceof Error ? err.message : "Não foi possível salvar a área.");
    }
  }

  function handleExcluirArea(area: EstudioTemplateArea) {
    setConfirmAreaError(null);
    setConfirmandoArea(area);
  }

  async function confirmExcluirArea() {
    if (!confirmandoArea) return;
    try {
      await excluirArea.mutateAsync({ id: confirmandoArea.id, template_id: confirmandoArea.template_id });
      setConfirmandoArea(null);
    } catch (err) {
      setConfirmAreaError(err instanceof Error ? err.message : "Não foi possível excluir a área.");
    }
  }

  const isCategoriaSubmitting = createCategoria.isPending || updateCategoria.isPending;
  const isTemplateSubmitting = createTemplate.isPending || updateTemplate.isPending || uploadImagemTemplate.isPending;
  const isAreaSubmitting = createArea.isPending || updateArea.isPending;
  const hasTemplates = (templates?.length ?? 0) > 0;
  const podeCriarTemplate = categoriasAtivas.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold text-foreground">Templates do Estúdio</h1>

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
            <p className="text-muted-foreground">Nenhuma categoria de templates cadastrada ainda.</p>
            <Button onClick={openCreateCategoriaDialog}>Criar categoria</Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Canal</TableHead>
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
                    <TableCell>
                      <Badge variant="soft-info">{CANAL_LABEL[categoria.canal]}</Badge>
                    </TableCell>
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
                            disabled={desativarCategoria.isPending}
                            onClick={() => handleDesativarCategoria(categoria)}
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
          <h2 className="text-lg font-semibold text-foreground">Templates</h2>
          <Button onClick={openCreateTemplateDialog} disabled={!podeCriarTemplate} className="sm:w-auto">
            Novo template
          </Button>
        </div>

        {!hasCategorias ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
            <p className="text-muted-foreground">Cadastre uma categoria primeiro.</p>
          </div>
        ) : (
          <>
            {!podeCriarTemplate && (
              <p className="text-sm text-muted-foreground">
                Nenhuma categoria ativa — ative uma categoria para cadastrar templates novos.
              </p>
            )}

            <div className="flex flex-col gap-2 sm:w-64">
              <Label htmlFor="template-filtro-categoria">Filtrar por categoria</Label>
              <Select value={filtroCategoriaId} onValueChange={setFiltroCategoriaId}>
                <SelectTrigger id="template-filtro-categoria">
                  <SelectValue />
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

            {loadingTemplates ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : !hasTemplates ? (
              <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
                <p className="text-muted-foreground">
                  {filtroCategoriaId === FILTRO_TODAS ? "Nenhum template cadastrado ainda." : "Nenhum template nesta categoria."}
                </p>
                {podeCriarTemplate && <Button onClick={openCreateTemplateDialog}>Cadastrar template</Button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates!.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onConfigurarAreas={setTemplateSelecionado}
                    onEdit={openEditTemplateDialog}
                    onDesativar={handleDesativarTemplate}
                    onExcluir={handleExcluirTemplate}
                    desativando={desativarTemplate.isPending}
                    excluindo={excluirTemplate.isPending}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {templateSelecionado && (
        <TemplateAreasSection
          template={templateSelecionado}
          onFechar={() => setTemplateSelecionado(null)}
          onNovaArea={openCreateAreaDialog}
          onEditarArea={openEditAreaDialog}
          onExcluirArea={handleExcluirArea}
          excluindo={excluirArea.isPending}
        />
      )}

      <CategoriaFormDialog
        open={categoriaDialogOpen}
        onOpenChange={setCategoriaDialogOpen}
        categoria={editingCategoria}
        onSubmit={handleCategoriaSubmit}
        submitting={isCategoriaSubmitting}
        error={categoriaFormError}
      />

      <TemplateFormDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        template={editingTemplate}
        categoriasAtivas={categoriasAtivas}
        onSubmit={handleTemplateSubmit}
        submitting={isTemplateSubmitting}
        error={templateFormError}
      />

      <AreaFormDialog
        open={areaDialogOpen}
        onOpenChange={setAreaDialogOpen}
        area={editingArea}
        onSubmit={handleAreaSubmit}
        submitting={isAreaSubmitting}
        error={areaFormError}
      />

      <ConfirmDialog
        open={!!confirmandoCategoria}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmandoCategoria(null);
            setConfirmCategoriaError(null);
          }
        }}
        titulo="Desativar categoria"
        descricao={`Desativar a categoria "${confirmandoCategoria?.nome}"?`}
        rotuloAcao="Desativar"
        pendente={desativarCategoria.isPending}
        erro={confirmCategoriaError}
        onConfirm={confirmDesativarCategoria}
      />

      <ConfirmDialog
        open={!!confirmandoTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmandoTemplate(null);
            setConfirmTemplateError(null);
          }
        }}
        titulo="Desativar template"
        descricao={`Desativar o template "${confirmandoTemplate?.nome}"?`}
        rotuloAcao="Desativar"
        pendente={desativarTemplate.isPending}
        erro={confirmTemplateError}
        onConfirm={confirmDesativarTemplate}
      />

      <ConfirmDialog
        open={!!excluindoTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setExcluindoTemplate(null);
            setExcluirTemplateError(null);
          }
        }}
        titulo="Excluir template"
        descricao={`Excluir PERMANENTEMENTE o template "${excluindoTemplate?.nome}"? Esta ação não pode ser desfeita e só funciona se nenhuma composição estiver usando este template.`}
        rotuloAcao="Excluir"
        pendente={excluirTemplate.isPending}
        erro={excluirTemplateError}
        onConfirm={confirmExcluirTemplate}
      />

      <ConfirmDialog
        open={!!confirmandoArea}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmandoArea(null);
            setConfirmAreaError(null);
          }
        }}
        titulo="Excluir área"
        descricao={`Excluir a área "${confirmandoArea?.nome}"?`}
        rotuloAcao="Excluir"
        pendente={excluirArea.isPending}
        erro={confirmAreaError}
        onConfirm={confirmExcluirArea}
      />
    </div>
  );
}
