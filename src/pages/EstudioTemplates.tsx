// Templates do Estúdio — três seções: categorias (mesma estrutura de
// ChecklistConfig.tsx), templates (grid de cards no padrão de
// BibliotecaMarca.tsx/EstudioElementos.tsx) e áreas do template selecionado
// (preview estático por percentuais fixos — Cenário A do backlog, sem
// biblioteca de canvas). Botões de gestão visíveis a todo mundo: RLS decide,
// guarda de rota no frontend é UX, não segurança.
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
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
import {
  pontoParaPercentual,
  clampRetangulo,
  TAMANHO_MINIMO_PERCENT,
  type RetanguloPercentual,
} from "@/lib/estudioAreaGeometria";

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

const FONTE_OPTIONS = ["Montserrat", "Baloo 2", "Jost"] as const;

function isTipoTexto(tipo: EstudioTipoElemento): boolean {
  return tipo.startsWith("texto_");
}

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
  posicaoLivre: boolean;
  fonte: string | null;
  tamanhoFontePx: number | null;
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
  retanguloNovo,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: EstudioTemplateArea | null;
  retanguloNovo: RetanguloPercentual | null;
  onSubmit: (values: AreaFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<EstudioTipoElemento>("imagem_produto");
  const [posicaoLivre, setPosicaoLivre] = useState(false);
  const [fonte, setFonte] = useState<string | null>(null);
  const [tamanhoFontePx, setTamanhoFontePx] = useState<number | null>(null);
  const [obrigatorio, setObrigatorio] = useState(true);
  const [maxElementos, setMaxElementos] = useState(1);
  const [zIndex, setZIndex] = useState(0);
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (open) {
      setNome(area?.nome ?? "");
      setTipo(area?.tipo_elemento_permitido ?? "imagem_produto");
      setPosicaoLivre(area?.posicao_livre ?? false);
      setFonte(area?.fonte ?? null);
      setTamanhoFontePx(area?.tamanho_fonte_px ?? null);
      setObrigatorio(area?.obrigatorio ?? true);
      setMaxElementos(area?.max_elementos ?? 1);
      setZIndex(area?.z_index ?? 0);
      setNotas(area?.notas ?? "");
    }
  }, [open, area]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    onSubmit({ nome, tipo, posicaoLivre, fonte, tamanhoFontePx, obrigatorio, maxElementos, zIndex, notas });
  }

  // Área existente: mostra a posição atual (read-only, ajustada só pelo
  // canvas). Área nova: mostra o retângulo que acabou de ser desenhado.
  const posicao = area
    ? {
        xPercent: area.x_percent,
        yPercent: area.y_percent,
        larguraPercent: area.largura_percent,
        alturaPercent: area.altura_percent,
      }
    : retanguloNovo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{area ? "Editar área" : "Nova área"}</DialogTitle>
          <DialogDescription>
            {area
              ? "Atualize as regras desta área. Para mudar posição ou tamanho, arraste a área direto na imagem."
              : "Preencha as regras da área que você acabou de desenhar sobre o template."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="area-nome">Nome</Label>
            <Input id="area-nome" required value={nome} onChange={(event) => setNome(event.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="area-tipo">Tipo de elemento permitido</Label>
            <Select
              value={tipo}
              onValueChange={(value) => {
                const novoTipo = value as EstudioTipoElemento;
                setTipo(novoTipo);
                if (isTipoTexto(novoTipo)) setPosicaoLivre(false);
              }}
            >
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

          {posicao && (
            <p className="text-xs text-muted-foreground">
              Posição: x {posicao.xPercent.toFixed(1)}% · y {posicao.yPercent.toFixed(1)}% · largura{" "}
              {posicao.larguraPercent.toFixed(1)}% · altura {posicao.alturaPercent.toFixed(1)}%
            </p>
          )}

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

          {!isTipoTexto(tipo) && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="area-posicao-livre"
                checked={posicaoLivre}
                onCheckedChange={(checked) => setPosicaoLivre(checked === true)}
              />
              <Label htmlFor="area-posicao-livre" className="font-normal">
                Permitir ajuste de posição/tamanho pelo colaborador
              </Label>
            </div>
          )}

          {isTipoTexto(tipo) && (
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="area-fonte">Fonte</Label>
                <Select value={fonte ?? "padrao"} onValueChange={(value) => setFonte(value === "padrao" ? null : value)}>
                  <SelectTrigger id="area-fonte">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padrao">Padrão do sistema</SelectItem>
                    {FONTE_OPTIONS.map((valor) => (
                      <SelectItem key={valor} value={valor}>
                        {valor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="area-tamanho-fonte">Tamanho máximo (px)</Label>
                <Input
                  id="area-tamanho-fonte"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Automático"
                  value={tamanhoFontePx ?? ""}
                  onChange={(event) => setTamanhoFontePx(event.target.value ? Number(event.target.value) : null)}
                />
              </div>
            </div>
          )}

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

// Tamanho da área de toque de cada alça de canto — maior que o quadrado
// visual (12px) para não ficar impossível de pegar no celular (CLAUDE.md,
// acessibilidade nível A). backgroundClip:content-box mantém o visual
// pequeno enquanto o padding aumenta só a área clicável/tocável.
const ALCA_VISUAL_PX = 12;
const ALCA_TOQUE_PX = 28;
const ALCA_PADDING_PX = (ALCA_TOQUE_PX - ALCA_VISUAL_PX) / 2;

type TipoArrasto = "mover" | "nw" | "ne" | "sw" | "se";

// Passo de teclado (WCAG 2.1.1 — mover/redimensionar sem pointer): seta move
// 1 ponto percentual, Shift+seta move 5.
const PASSO_TECLADO_PERCENT = 1;
const PASSO_TECLADO_SHIFT_PERCENT = 5;

const NOME_CANTO: Record<Exclude<TipoArrasto, "mover">, string> = {
  nw: "superior esquerdo",
  ne: "superior direito",
  sw: "inferior esquerdo",
  se: "inferior direito",
};

// Pura, reaproveitada por pointer (moverArrasto) e teclado — "esquerda desloca
// x, direita só cresce largura" mora só aqui.
function calcularNovoRetangulo(
  tipo: TipoArrasto,
  base: RetanguloPercentual,
  deltaXPercent: number,
  deltaYPercent: number,
): RetanguloPercentual {
  if (tipo === "mover") {
    return { ...base, xPercent: base.xPercent + deltaXPercent, yPercent: base.yPercent + deltaYPercent };
  }
  const ehEsquerda = tipo === "nw" || tipo === "sw";
  const ehTopo = tipo === "nw" || tipo === "ne";
  return {
    xPercent: ehEsquerda ? base.xPercent + deltaXPercent : base.xPercent,
    yPercent: ehTopo ? base.yPercent + deltaYPercent : base.yPercent,
    larguraPercent: ehEsquerda ? base.larguraPercent - deltaXPercent : base.larguraPercent + deltaXPercent,
    alturaPercent: ehTopo ? base.alturaPercent - deltaYPercent : base.alturaPercent + deltaYPercent,
  };
}

// Seta → delta percentual (Shift = passo maior); null se a tecla não for seta.
function deltaDeTecla(event: React.KeyboardEvent): { deltaXPercent: number; deltaYPercent: number } | null {
  const passo = event.shiftKey ? PASSO_TECLADO_SHIFT_PERCENT : PASSO_TECLADO_PERCENT;
  switch (event.key) {
    case "ArrowUp":
      return { deltaXPercent: 0, deltaYPercent: -passo };
    case "ArrowDown":
      return { deltaXPercent: 0, deltaYPercent: passo };
    case "ArrowLeft":
      return { deltaXPercent: -passo, deltaYPercent: 0 };
    case "ArrowRight":
      return { deltaXPercent: passo, deltaYPercent: 0 };
    default:
      return null;
  }
}

// Fora do corpo do pai: cada área tem seu próprio estado de arrasto e sua
// própria mutation — evita re-render de todas as áreas a cada pixel movido
// em uma delas.
function AreaOverlayEditable({
  area,
  containerRef,
  desabilitado,
}: {
  area: EstudioTemplateArea;
  containerRef: React.RefObject<HTMLDivElement>;
  desabilitado: boolean;
}) {
  const updateArea = useUpdateEstudioTemplateArea();
  const [retangulo, setRetangulo] = useState<RetanguloPercentual>({
    xPercent: area.x_percent,
    yPercent: area.y_percent,
    larguraPercent: area.largura_percent,
    alturaPercent: area.altura_percent,
  });
  const [arrastando, setArrastando] = useState<TipoArrasto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const inicioRef = useRef<{ clientX: number; clientY: number; retangulo: RetanguloPercentual } | null>(null);

  // Reflete atualização vinda do servidor (outra aba, outro admin) só quando
  // esta área não está sendo arrastada agora — evita "puxar" o retângulo pra
  // trás no meio de um arrasto por causa de um refetch em paralelo.
  useEffect(() => {
    if (!arrastando) {
      setRetangulo({
        xPercent: area.x_percent,
        yPercent: area.y_percent,
        larguraPercent: area.largura_percent,
        alturaPercent: area.altura_percent,
      });
    }
  }, [area, arrastando]);

  function iniciarArrasto(tipo: TipoArrasto, event: React.PointerEvent<HTMLDivElement>) {
    if (desabilitado) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setArrastando(tipo);
    setErro(null);
    inicioRef.current = { clientX: event.clientX, clientY: event.clientY, retangulo };
  }

  function moverArrasto(event: React.PointerEvent<HTMLDivElement>) {
    if (!arrastando || !inicioRef.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaXPercent = ((event.clientX - inicioRef.current.clientX) / containerRect.width) * 100;
    const deltaYPercent = ((event.clientY - inicioRef.current.clientY) / containerRect.height) * 100;
    const novo = calcularNovoRetangulo(arrastando, inicioRef.current.retangulo, deltaXPercent, deltaYPercent);
    setRetangulo(clampRetangulo(novo));
  }

  // Persiste um retângulo já calculado, com snap-back e mensagem de erro em
  // caso de falha — reaproveitada pelo fim do arrasto (pointer) e por cada
  // passo de teclado.
  async function persistirRetangulo(novo: RetanguloPercentual) {
    try {
      await updateArea.mutateAsync({
        id: area.id,
        template_id: area.template_id,
        x_percent: novo.xPercent,
        y_percent: novo.yPercent,
        largura_percent: novo.larguraPercent,
        altura_percent: novo.alturaPercent,
      });
    } catch (err) {
      setRetangulo({
        xPercent: area.x_percent,
        yPercent: area.y_percent,
        larguraPercent: area.largura_percent,
        alturaPercent: area.altura_percent,
      });
      setErro(err instanceof Error ? err.message : "Não foi possível salvar a posição.");
    }
  }

  async function finalizarArrasto() {
    if (!arrastando) return;
    setArrastando(null);
    await persistirRetangulo(retangulo);
  }

  // Move a área pelo teclado (corpo focado) — WCAG 2.1.1: a tela precisa
  // continuar 100% operável sem pointer depois que os inputs de X/Y saíram.
  function moverPorTeclado(event: React.KeyboardEvent<HTMLDivElement>) {
    if (desabilitado) return;
    const delta = deltaDeTecla(event);
    if (!delta) return;
    event.preventDefault();
    const novo = clampRetangulo(calcularNovoRetangulo("mover", retangulo, delta.deltaXPercent, delta.deltaYPercent));
    setRetangulo(novo);
    void persistirRetangulo(novo);
  }

  // Redimensiona pela alça de canto focada — mesma matemática de
  // calcularNovoRetangulo que o pointer já usa, só com delta fixo por tecla.
  function redimensionarPorTeclado(canto: TipoArrasto, event: React.KeyboardEvent<HTMLDivElement>) {
    if (desabilitado) return;
    const delta = deltaDeTecla(event);
    if (!delta) return;
    event.preventDefault();
    event.stopPropagation();
    const novo = clampRetangulo(calcularNovoRetangulo(canto, retangulo, delta.deltaXPercent, delta.deltaYPercent));
    setRetangulo(novo);
    void persistirRetangulo(novo);
  }

  return (
    <div
      role="button"
      tabIndex={desabilitado ? -1 : 0}
      aria-label={`Área ${area.nome} — arraste para mover, use as alças dos cantos para redimensionar`}
      onPointerDown={(event) => iniciarArrasto("mover", event)}
      onPointerMove={moverArrasto}
      onPointerUp={finalizarArrasto}
      onKeyDown={moverPorTeclado}
      className={`absolute flex items-start overflow-hidden border-2 border-dashed p-1 text-[10px] font-medium leading-tight ${
        area.obrigatorio ? "border-destructive bg-destructive/10 text-destructive" : "border-primary bg-primary/10 text-primary"
      }`}
      style={{
        left: `${retangulo.xPercent}%`,
        top: `${retangulo.yPercent}%`,
        width: `${retangulo.larguraPercent}%`,
        height: `${retangulo.alturaPercent}%`,
        touchAction: "none",
        pointerEvents: desabilitado ? "none" : "auto",
        cursor: arrastando === "mover" ? "grabbing" : "grab",
      }}
    >
      {area.nome}
      {(["nw", "ne", "sw", "se"] as const).map((canto) => (
        <div
          key={canto}
          role="button"
          tabIndex={desabilitado ? -1 : 0}
          aria-label={`Redimensionar pelo canto ${NOME_CANTO[canto]} da área ${area.nome}`}
          onPointerDown={(event) => iniciarArrasto(canto, event)}
          onPointerMove={moverArrasto}
          onPointerUp={finalizarArrasto}
          onKeyDown={(event) => redimensionarPorTeclado(canto, event)}
          className="absolute rounded-full border-2 border-background bg-primary"
          style={{
            width: ALCA_VISUAL_PX,
            height: ALCA_VISUAL_PX,
            padding: ALCA_PADDING_PX,
            backgroundClip: "content-box",
            touchAction: "none",
            cursor: `${canto}-resize`,
            top: canto === "nw" || canto === "ne" ? -ALCA_PADDING_PX - ALCA_VISUAL_PX / 2 : undefined,
            bottom: canto === "sw" || canto === "se" ? -ALCA_PADDING_PX - ALCA_VISUAL_PX / 2 : undefined,
            left: canto === "nw" || canto === "sw" ? -ALCA_PADDING_PX - ALCA_VISUAL_PX / 2 : undefined,
            right: canto === "ne" || canto === "se" ? -ALCA_PADDING_PX - ALCA_VISUAL_PX / 2 : undefined,
          }}
        />
      ))}
      {erro && (
        <p role="alert" className="absolute -bottom-5 left-0 z-10 whitespace-nowrap text-[10px] text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}

function TemplateAreasSection({
  template,
  onFechar,
  desenhando,
  onAlternarDesenho,
  onFinalizarDesenho,
  onEditarArea,
  onExcluirArea,
  excluindo,
}: {
  template: EstudioTemplateComCategoria;
  onFechar: () => void;
  desenhando: boolean;
  onAlternarDesenho: () => void;
  onFinalizarDesenho: (retangulo: RetanguloPercentual | null) => void;
  onEditarArea: (area: EstudioTemplateArea) => void;
  onExcluirArea: (area: EstudioTemplateArea) => void;
  excluindo: boolean;
}) {
  const { data: areas, isLoading } = useEstudioTemplateAreas(template.id);
  const { data: imagemUrl } = useFotoSignedUrl("estudio-templates", template.imagem_base_url);
  const hasAreas = (areas?.length ?? 0) > 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const [rascunho, setRascunho] = useState<RetanguloPercentual | null>(null);
  const pontoInicialRef = useRef<{ xPercent: number; yPercent: number } | null>(null);

  function iniciarDesenho(event: React.PointerEvent<HTMLDivElement>) {
    if (!desenhando || !containerRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const ponto = pontoParaPercentual(event.clientX, event.clientY, containerRef.current.getBoundingClientRect());
    pontoInicialRef.current = ponto;
    setRascunho({ xPercent: ponto.xPercent, yPercent: ponto.yPercent, larguraPercent: 0, alturaPercent: 0 });
  }

  function atualizarDesenho(event: React.PointerEvent<HTMLDivElement>) {
    if (!desenhando || !pontoInicialRef.current || !containerRef.current) return;
    const atual = pontoParaPercentual(event.clientX, event.clientY, containerRef.current.getBoundingClientRect());
    const inicio = pontoInicialRef.current;
    setRascunho({
      xPercent: Math.min(inicio.xPercent, atual.xPercent),
      yPercent: Math.min(inicio.yPercent, atual.yPercent),
      larguraPercent: Math.abs(atual.xPercent - inicio.xPercent),
      alturaPercent: Math.abs(atual.yPercent - inicio.yPercent),
    });
  }

  function finalizarDesenho() {
    if (!desenhando || !rascunho) return;
    pontoInicialRef.current = null;
    const valido = rascunho.larguraPercent >= TAMANHO_MINIMO_PERCENT && rascunho.alturaPercent >= TAMANHO_MINIMO_PERCENT;
    const resultado = valido ? clampRetangulo(rascunho) : null;
    setRascunho(null);
    onFinalizarDesenho(resultado);
  }

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
          <Button onClick={onAlternarDesenho} variant={desenhando ? "secondary" : "default"} className="sm:w-auto">
            {desenhando ? "Desenhando… clique e arraste na imagem" : "Nova área"}
          </Button>
          <Button variant="outline" onClick={onFechar} className="sm:w-auto">
            Voltar
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full max-w-xl overflow-hidden rounded-md border border-border bg-muted"
        style={{
          aspectRatio: `${template.largura_px} / ${template.altura_px}`,
          touchAction: desenhando ? "none" : undefined,
          cursor: desenhando ? "crosshair" : undefined,
        }}
        onPointerDown={iniciarDesenho}
        onPointerMove={atualizarDesenho}
        onPointerUp={finalizarDesenho}
      >
        {imagemUrl ? (
          <img src={imagemUrl} alt={`Imagem base do template ${template.nome}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Carregando imagem base…
          </div>
        )}
        {(areas ?? []).map((area) => (
          <AreaOverlayEditable key={area.id} area={area} containerRef={containerRef} desabilitado={desenhando} />
        ))}
        {rascunho && (
          <div
            className="absolute border-2 border-dashed border-primary bg-primary/20"
            style={{
              left: `${rascunho.xPercent}%`,
              top: `${rascunho.yPercent}%`,
              width: `${rascunho.larguraPercent}%`,
              height: `${rascunho.alturaPercent}%`,
            }}
          />
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !hasAreas ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">Nenhuma área cadastrada para este template ainda.</p>
          <Button onClick={onAlternarDesenho}>{desenhando ? "Cancelar desenho" : "Criar área"}</Button>
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
  const [modoDesenho, setModoDesenho] = useState(false);
  const [retanguloDesenhado, setRetanguloDesenhado] = useState<RetanguloPercentual | null>(null);

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

  function alternarModoDesenho() {
    setModoDesenho((atual) => !atual);
  }

  function handleFinalizarDesenho(retangulo: RetanguloPercentual | null) {
    setModoDesenho(false);
    if (!retangulo) return; // arrasto pequeno demais — descarta sem abrir dialog
    setRetanguloDesenhado(retangulo);
    setEditingArea(null);
    setAreaFormError(null);
    setAreaDialogOpen(true);
  }

  function openEditAreaDialog(area: EstudioTemplateArea) {
    setEditingArea(area);
    setRetanguloDesenhado(null);
    setAreaFormError(null);
    setAreaDialogOpen(true);
  }

  async function handleAreaSubmit(values: AreaFormValues) {
    if (!templateSelecionado) return;
    setAreaFormError(null);
    try {
      const metadados = {
        nome: values.nome,
        tipo_elemento_permitido: values.tipo,
        posicao_livre: values.posicaoLivre,
        fonte: values.fonte,
        tamanho_fonte_px: values.tamanhoFontePx,
        obrigatorio: values.obrigatorio,
        max_elementos: values.maxElementos,
        z_index: values.zIndex,
        notas: values.notas || undefined,
      };
      if (editingArea) {
        await updateArea.mutateAsync({ id: editingArea.id, template_id: templateSelecionado.id, ...metadados });
      } else if (retanguloDesenhado) {
        await createArea.mutateAsync({
          template_id: templateSelecionado.id,
          ...metadados,
          x_percent: retanguloDesenhado.xPercent,
          y_percent: retanguloDesenhado.yPercent,
          largura_percent: retanguloDesenhado.larguraPercent,
          altura_percent: retanguloDesenhado.alturaPercent,
        });
      }
      setAreaDialogOpen(false);
      setRetanguloDesenhado(null);
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
          desenhando={modoDesenho}
          onAlternarDesenho={alternarModoDesenho}
          onFinalizarDesenho={handleFinalizarDesenho}
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
        retanguloNovo={retanguloDesenhado}
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
