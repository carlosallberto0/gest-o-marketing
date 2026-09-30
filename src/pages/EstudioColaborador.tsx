// Estúdio de Comunicação — fluxo do colaborador: canal -> template -> editor
// de composição, em 3 passos controlados por estado local nesta única
// página (sem sub-rotas, mesmo padrão de fluxo em etapas de AvaliacoesPdv.tsx).
// Composição controlada: cada área do template só aceita o tipo de elemento
// definido pelo marketing, nas posições fixas configuradas em
// EstudioTemplates.tsx — a mesma técnica de posicionamento absoluto por
// percentual é reaproveitada aqui, agora para preenchimento em vez de
// configuração.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  useEstudioCategorias,
  useEstudioTemplates,
  useEstudioTemplate,
  useEstudioTemplateAreas,
  type EstudioCanal,
  type EstudioTemplateComCategoria,
  type EstudioTemplateArea,
} from "@/hooks/useEstudioTemplates";
import { useEstudioElementos, type EstudioElemento, type EstudioTipoElemento } from "@/hooks/useEstudioElementos";
import {
  useCreateEstudioComposicao,
  useUpdateEstudioComposicao,
  useEstudioComposicao,
  useEstudioComposicaoElementos,
  useSalvarComposicaoElemento,
  useRemoverComposicaoElemento,
  type EstudioComposicaoElemento,
} from "@/hooks/useEstudioComposicoes";
import { usePdvs } from "@/hooks/usePdvs";
import { useFotoSignedUrl } from "@/hooks/useFoto";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Image as ImageIcon,
  AlertTriangle,
  ChevronDown,
  Undo2,
  Redo2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

// Mesma lista de EstudioTemplates.tsx/EstudioElementos.tsx — não exportada de
// lá, duplicada aqui (é o mesmo CHECK de tipo de elemento em cada tela).
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

function isTipoTexto(tipo: EstudioTipoElemento): boolean {
  return tipo.startsWith("texto_");
}

// Só as categorias com tipo real no schema hoje — "Forma"/"Botão"/"QR Code"/
// "Vídeo" da referência visual NÃO têm EstudioTipoElemento correspondente
// (ver spec, achado adicional 1); não fabricar categoria falsa aqui.
const CATEGORIAS_ELEMENTO: { label: string; tipos: EstudioTipoElemento[] }[] = [
  { label: "Texto", tipos: ["texto_titulo", "texto_preco", "texto_descricao", "texto_cta", "texto_info"] },
  { label: "Imagem de produto", tipos: ["imagem_produto"] },
  { label: "Logo", tipos: ["logo"] },
  { label: "Selo", tipos: ["selo"] },
  { label: "Ícone", tipos: ["icone"] },
  { label: "Gráfico", tipos: ["grafico"] },
];

// Mesma lista de EstudioTemplates.tsx (Task 3) — duplicação deliberada, mesmo
// padrão de TIPO_ELEMENTO_LABEL acima entre os dois arquivos.
const FONTES_ESTUDIO = ["Montserrat", "Baloo 2", "Jost"] as const;

// CSS font-family a partir do nome salvo na área — sempre citado entre aspas
// (válido em CSS pra qualquer nome de família, com ou sem espaço).
function fonteCssDeNome(fonte: string | null): string {
  return fonte ? `"${fonte}", sans-serif` : "sans-serif";
}

// Estilo inline pra prévia (span de exibição e campo de edição) — aproximado,
// o encolhimento automático de verdade só roda no canvas da exportação.
// `tamanho_fonte_px` é pixel do template final; `escalaTelaPorTemplate`
// converte pra pixel de tela do container da prévia.
function estiloFonteTexto(area: EstudioTemplateArea, escalaTelaPorTemplate: number): React.CSSProperties {
  if (!area.fonte && !area.tamanho_fonte_px) return {};
  return {
    fontFamily: area.fonte ? fonteCssDeNome(area.fonte) : undefined,
    fontSize: area.tamanho_fonte_px ? `${area.tamanho_fonte_px * escalaTelaPorTemplate}px` : undefined,
    fontWeight: 600,
  };
}

// Ajuste de posição/escala em área "posicao_livre" — mesma unidade
// (pixel do template final) que desenharImagemNaArea() já usa no export.
// Zoom da prévia (Task B2): largura de referência em zoom 100% — mesmo valor
// que a classe Tailwind `max-w-xl` (36rem) representava antes do controle de
// zoom existir. Vira base de `width` em vez de `transform: scale()`: escala
// via `transform` não ocupa espaço de layout (o canvas pintava por cima da
// barra de ações em zoom >100%) e duplicava a escala já aplicada por
// `escalaTelaPorTemplate`/`translateXPx`/`translateYPx`, que leem
// `getBoundingClientRect()` — já em pixel de tela PÓS-transform.
const CANVAS_LARGURA_BASE_PX = 576;
const FATOR_ESCALA_MINIMO = 0.2;
const LIMIAR_ARRASTO_PX = 4; // abaixo disso, pointerup vira "clique" (troca elemento), não arrasto
const PASSO_TECLADO_DESLOCAMENTO_PX = 5;
const PASSO_TECLADO_DESLOCAMENTO_SHIFT_PX = 20;
const PASSO_TECLADO_ESCALA = 0.05;
const PASSO_TECLADO_ESCALA_SHIFT = 0.2;

function composicaoElementoPreenchido(elemento: EstudioComposicaoElemento | undefined): boolean {
  if (!elemento) return false;
  return !!elemento.elemento_id || !!elemento.valor_texto?.trim();
}

// Desfazer/Refazer (Task B4) — 1 entrada por mutação de conteúdo de área
// (texto salvo, elemento atribuído/removido, posição/escala ajustada).
// `antes`/`depois` são snapshots completos da linha de
// estudio_composicao_elementos (null = área vazia antes/depois da mutação),
// não um diff — reaplicar é sempre "reenviar a linha inteira" via
// useSalvarComposicaoElemento ou remover via useRemoverComposicaoElemento.
interface HistoricoEntrada {
  areaId: string;
  antes: EstudioComposicaoElemento | null;
  depois: EstudioComposicaoElemento | null;
}

// --- Exportação da peça: rasterização em <canvas> nativo, sem dependência
// nova — o layout já é conhecido (retângulos em percentual + imagem/texto por
// área), então desenhar direto no canvas é menos código e mais preciso na
// resolução final (largura_px/altura_px do template) do que tirar um
// "screenshot" da prévia responsiva da tela com uma lib como html2canvas.

interface RectPx {
  x: number;
  y: number;
  w: number;
  h: number;
}

function areaRectPx(area: EstudioTemplateArea, larguraPx: number, alturaPx: number): RectPx {
  return {
    x: (area.x_percent / 100) * larguraPx,
    y: (area.y_percent / 100) * alturaPx,
    w: (area.largura_percent / 100) * larguraPx,
    h: (area.altura_percent / 100) * alturaPx,
  };
}

function carregarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar uma imagem da peça para exportação."));
    img.src = url;
  });
}

function canvasParaPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível gerar a imagem exportada."))),
      "image/png",
    );
  });
}

function quebrarLinhas(ctx: CanvasRenderingContext2D, texto: string, larguraMaxima: number): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (atual && ctx.measureText(teste).width > larguraMaxima) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

// ponytail: heurística simples de ajuste de fonte (reduz até caber, sem
// otimizar a quebra de linha em si) — teto: texto muito longo corta no
// tamanho mínimo (8px) em vez de estourar a área. Upgrade: expor fonte/cor
// por área se isso virar problema real com templates de verdade.
function desenharTextoNaArea(
  ctx: CanvasRenderingContext2D,
  texto: string,
  rect: RectPx,
  fonteCss: string,
  tamanhoMaximoPx: number,
): void {
  const padding = Math.max(4, rect.h * 0.08);
  const larguraMaxima = Math.max(1, rect.w - padding * 2);
  const alturaMaxima = Math.max(1, rect.h - padding * 2);

  let fontSize = tamanhoMaximoPx;
  let linhas: string[] = [texto];
  while (fontSize > 8) {
    ctx.font = `600 ${fontSize}px ${fonteCss}`;
    linhas = quebrarLinhas(ctx, texto, larguraMaxima);
    if (linhas.length * fontSize * 1.2 <= alturaMaxima) break;
    fontSize -= 2;
  }

  ctx.font = `600 ${fontSize}px ${fonteCss}`;
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const alturaLinha = fontSize * 1.2;
  const inicioY = rect.y + rect.h / 2 - ((linhas.length - 1) * alturaLinha) / 2;
  linhas.forEach((linha, indice) => {
    ctx.fillText(linha, rect.x + rect.w / 2, inicioY + indice * alturaLinha, larguraMaxima);
  });
}

// object-contain dentro da área, com deslocamento/escala já existentes no
// schema (estudio_composicao_elementos.deslocamento_x_px/y_px/fator_escala) —
// deslocamento/escala agora configuráveis pelo colaborador em áreas com
// `posicao_livre = true`, ver AreaZona.
function desenharImagemNaArea(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  rect: RectPx,
  deslocamentoXPx: number,
  deslocamentoYPx: number,
  fatorEscala: number,
): void {
  const escalaBase = Math.min(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const largura = img.naturalWidth * escalaBase * fatorEscala;
  const altura = img.naturalHeight * escalaBase * fatorEscala;
  const x = rect.x + (rect.w - largura) / 2 + deslocamentoXPx;
  const y = rect.y + (rect.h - altura) / 2 + deslocamentoYPx;
  ctx.drawImage(img, x, y, largura, altura);
}

async function gerarImagemComposicao(
  template: EstudioTemplateComCategoria,
  imagemBaseUrl: string,
  areas: EstudioTemplateArea[],
  elementoPorAreaId: Map<string, EstudioComposicaoElemento>,
): Promise<Blob> {
  const idsElementosVisuais = Array.from(
    new Set(
      areas
        .filter((area) => !isTipoTexto(area.tipo_elemento_permitido))
        .map((area) => elementoPorAreaId.get(area.id)?.elemento_id)
        .filter((id): id is string => !!id),
    ),
  );

  const arquivoPorElementoId = new Map<string, string>();
  if (idsElementosVisuais.length > 0) {
    const { data, error } = await supabase
      .from("estudio_elementos")
      .select("id, arquivo_url")
      .in("id", idsElementosVisuais);
    if (error) throw error;
    for (const elemento of data ?? []) {
      if (elemento.arquivo_url) arquivoPorElementoId.set(elemento.id as string, elemento.arquivo_url as string);
    }
  }

  const imagemPorElementoId = new Map<string, HTMLImageElement>();
  for (const [elementoId, arquivoUrl] of arquivoPorElementoId) {
    const { data, error } = await supabase.storage.from("estudio-elementos").createSignedUrl(arquivoUrl, 60);
    if (error) throw error;
    imagemPorElementoId.set(elementoId, await carregarImagem(data.signedUrl));
  }

  const imagemBase = await carregarImagem(imagemBaseUrl);

  const canvas = document.createElement("canvas");
  canvas.width = template.largura_px;
  canvas.height = template.altura_px;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado neste navegador.");

  ctx.drawImage(imagemBase, 0, 0, canvas.width, canvas.height);

  await Promise.all(FONTES_ESTUDIO.map((fonte) => document.fonts.load(`600 40px "${fonte}"`).catch(() => {})));

  const areasOrdenadas = [...areas].sort((a, b) => a.z_index - b.z_index);
  for (const area of areasOrdenadas) {
    const composicaoElemento = elementoPorAreaId.get(area.id);
    const rect = areaRectPx(area, canvas.width, canvas.height);
    if (isTipoTexto(area.tipo_elemento_permitido)) {
      const texto = composicaoElemento?.valor_texto?.trim();
      if (texto) {
        desenharTextoNaArea(
          ctx,
          texto,
          rect,
          fonteCssDeNome(area.fonte),
          area.tamanho_fonte_px ?? Math.floor(rect.h * 0.6),
        );
      }
    } else {
      const img = composicaoElemento?.elemento_id ? imagemPorElementoId.get(composicaoElemento.elemento_id) : undefined;
      if (img) {
        desenharImagemNaArea(
          ctx,
          img,
          rect,
          composicaoElemento?.deslocamento_x_px ?? 0,
          composicaoElemento?.deslocamento_y_px ?? 0,
          composicaoElemento?.fator_escala ?? 1,
        );
      }
    }
  }

  return canvasParaPngBlob(canvas);
}

// Fora do corpo do pai: assina a própria signed URL, mesmo padrão de
// TemplateCard em EstudioTemplates.tsx.
function TemplateEscolhaCard({
  template,
  disabled,
  onUsar,
}: {
  template: EstudioTemplateComCategoria;
  disabled: boolean;
  onUsar: (template: EstudioTemplateComCategoria) => void;
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
      <CardContent className="flex flex-1 flex-col gap-1 p-4">
        <CardTitle className="text-sm">{template.nome}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {template.largura_px}×{template.altura_px}px
        </p>
      </CardContent>
      <CardFooter className="border-t border-border/50 p-4 pt-4">
        <Button className="w-full sm:w-auto" disabled={disabled} onClick={() => onUsar(template)}>
          Usar este template
        </Button>
      </CardFooter>
    </Card>
  );
}

// Fora do corpo do pai: cada zona resolve sua própria imagem/estado de edição
// de texto — evita re-render de todas as áreas a cada tecla digitada em uma.
function AreaZona({
  area,
  composicaoElemento,
  composicaoId,
  destacada,
  onClicarImagem,
  containerRef,
  templateLarguraPx,
  templateAlturaPx,
  onAcaoAplicada,
}: {
  area: EstudioTemplateArea;
  composicaoElemento: EstudioComposicaoElemento | undefined;
  composicaoId: string;
  destacada: boolean;
  onClicarImagem: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
  templateLarguraPx: number;
  templateAlturaPx: number;
  onAcaoAplicada: (entrada: HistoricoEntrada) => void;
}) {
  const isTexto = isTipoTexto(area.tipo_elemento_permitido);
  const elementoId = !isTexto ? composicaoElemento?.elemento_id ?? null : null;
  const { data: elementosDoTipo } = useEstudioElementos(!isTexto ? { tipo: area.tipo_elemento_permitido } : undefined);
  const elemento = elementoId ? (elementosDoTipo ?? []).find((item) => item.id === elementoId) ?? null : null;
  const { data: imagemUrl } = useFotoSignedUrl("estudio-elementos", elemento?.thumbnail_url ?? elemento?.arquivo_url);

  const [editandoTexto, setEditandoTexto] = useState(false);
  const [valorTexto, setValorTexto] = useState(composicaoElemento?.valor_texto ?? "");
  const [erroTexto, setErroTexto] = useState<string | null>(null);
  const salvarTextoMutation = useSalvarComposicaoElemento();
  const cancelandoRef = useRef(false);

  const podeAjustarPosicao = !isTexto && area.posicao_livre;
  const [deslocamentoXPx, setDeslocamentoXPx] = useState(composicaoElemento?.deslocamento_x_px ?? 0);
  const [deslocamentoYPx, setDeslocamentoYPx] = useState(composicaoElemento?.deslocamento_y_px ?? 0);
  const [fatorEscala, setFatorEscala] = useState(composicaoElemento?.fator_escala ?? 1);
  const [ajustando, setAjustando] = useState<"mover" | "escala" | null>(null);
  const [erroAjuste, setErroAjuste] = useState<string | null>(null);
  const ajusteInicioRef = useRef<{
    clientX: number;
    clientY: number;
    deslocamentoXPx: number;
    deslocamentoYPx: number;
    fatorEscala: number;
    moveu: boolean;
  } | null>(null);
  const debounceTecladoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const salvarAjusteMutation = useSalvarComposicaoElemento();

  useEffect(() => {
    if (!ajustando && !salvarAjusteMutation.isPending) {
      setDeslocamentoXPx(composicaoElemento?.deslocamento_x_px ?? 0);
      setDeslocamentoYPx(composicaoElemento?.deslocamento_y_px ?? 0);
      setFatorEscala(composicaoElemento?.fator_escala ?? 1);
    }
  }, [composicaoElemento, ajustando, salvarAjusteMutation.isPending]);

  function iniciarAjuste(tipo: "mover" | "escala", event: React.PointerEvent) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setAjustando(tipo);
    setErroAjuste(null);
    ajusteInicioRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      deslocamentoXPx,
      deslocamentoYPx,
      fatorEscala,
      moveu: false,
    };
  }

  function moverAjuste(event: React.PointerEvent) {
    const inicio = ajusteInicioRef.current;
    if (!ajustando || !inicio || !containerRef.current) return;
    const deltaClientX = event.clientX - inicio.clientX;
    const deltaClientY = event.clientY - inicio.clientY;
    if (Math.abs(deltaClientX) > LIMIAR_ARRASTO_PX || Math.abs(deltaClientY) > LIMIAR_ARRASTO_PX) {
      inicio.moveu = true;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const templatePxPorTelaPxX = templateLarguraPx / containerRect.width;
    const templatePxPorTelaPxY = templateAlturaPx / containerRect.height;

    if (ajustando === "mover") {
      setDeslocamentoXPx(inicio.deslocamentoXPx + deltaClientX * templatePxPorTelaPxX);
      setDeslocamentoYPx(inicio.deslocamentoYPx + deltaClientY * templatePxPorTelaPxY);
    } else {
      const areaLarguraTemplatePx = (area.largura_percent / 100) * templateLarguraPx;
      const novaEscala = Math.max(
        FATOR_ESCALA_MINIMO,
        inicio.fatorEscala + (deltaClientX * templatePxPorTelaPxX) / areaLarguraTemplatePx,
      );
      setFatorEscala(novaEscala);
    }
  }

  async function persistirAjuste() {
    await persistirAjusteComValores(deslocamentoXPx, deslocamentoYPx, fatorEscala);
  }

  async function finalizarAjuste() {
    const inicio = ajusteInicioRef.current;
    const tipo = ajustando;
    if (!tipo || !inicio) return;
    setAjustando(null);
    ajusteInicioRef.current = null;

    if (tipo === "mover" && !inicio.moveu) {
      // pointerdown+up sem arrasto de verdade — trata como clique (trocar elemento)
      onClicarImagem();
      return;
    }
    await persistirAjuste();
  }

  function agendarPersistenciaPorTeclado(x: number, y: number, escala: number) {
    if (debounceTecladoRef.current) clearTimeout(debounceTecladoRef.current);
    debounceTecladoRef.current = setTimeout(() => {
      debounceTecladoRef.current = null;
      void persistirAjusteComValores(x, y, escala);
    }, 300);
  }

  function moverPorTeclado(event: React.KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClicarImagem();
      return;
    }
    const passo = event.shiftKey ? PASSO_TECLADO_DESLOCAMENTO_SHIFT_PX : PASSO_TECLADO_DESLOCAMENTO_PX;
    let deltaX = 0;
    let deltaY = 0;
    if (event.key === "ArrowUp") deltaY = -passo;
    else if (event.key === "ArrowDown") deltaY = passo;
    else if (event.key === "ArrowLeft") deltaX = -passo;
    else if (event.key === "ArrowRight") deltaX = passo;
    else return;
    event.preventDefault();
    const novoX = deslocamentoXPx + deltaX;
    const novoY = deslocamentoYPx + deltaY;
    setDeslocamentoXPx(novoX);
    setDeslocamentoYPx(novoY);
    agendarPersistenciaPorTeclado(novoX, novoY, fatorEscala);
  }

  function redimensionarPorTeclado(event: React.KeyboardEvent) {
    event.stopPropagation();
    const passo = event.shiftKey ? PASSO_TECLADO_ESCALA_SHIFT : PASSO_TECLADO_ESCALA;
    let deltaEscala = 0;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") deltaEscala = passo;
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft") deltaEscala = -passo;
    else return;
    event.preventDefault();
    const novaEscala = Math.max(FATOR_ESCALA_MINIMO, fatorEscala + deltaEscala);
    setFatorEscala(novaEscala);
    agendarPersistenciaPorTeclado(deslocamentoXPx, deslocamentoYPx, novaEscala);
  }

  async function persistirAjusteComValores(x: number, y: number, escala: number) {
    setErroAjuste(null);
    try {
      const antes = composicaoElemento ?? null;
      const depois = await salvarAjusteMutation.mutateAsync({
        composicao_id: composicaoId,
        area_id: area.id,
        deslocamento_x_px: x,
        deslocamento_y_px: y,
        fator_escala: escala,
      });
      onAcaoAplicada({ areaId: area.id, antes, depois });
    } catch (err) {
      setDeslocamentoXPx(composicaoElemento?.deslocamento_x_px ?? 0);
      setDeslocamentoYPx(composicaoElemento?.deslocamento_y_px ?? 0);
      setFatorEscala(composicaoElemento?.fator_escala ?? 1);
      setErroAjuste(err instanceof Error ? err.message : "Não foi possível salvar o ajuste.");
    }
  }

  useEffect(() => {
    if (!editandoTexto) setValorTexto(composicaoElemento?.valor_texto ?? "");
  }, [composicaoElemento, editandoTexto]);

  const preenchida = isTexto ? !!composicaoElemento?.valor_texto?.trim() : !!elemento;
  const usarTextarea = isTexto && area.tipo_elemento_permitido !== "texto_preco";

  async function salvarTexto() {
    if (cancelandoRef.current) {
      cancelandoRef.current = false;
      return;
    }
    if (salvarTextoMutation.isPending) return;
    setErroTexto(null);
    const texto = valorTexto.trim();
    if (!texto || texto === composicaoElemento?.valor_texto) {
      setValorTexto(composicaoElemento?.valor_texto ?? "");
      setEditandoTexto(false);
      return;
    }
    try {
      const antes = composicaoElemento ?? null;
      const depois = await salvarTextoMutation.mutateAsync({
        composicao_id: composicaoId,
        area_id: area.id,
        valor_texto: texto,
      });
      onAcaoAplicada({ areaId: area.id, antes, depois });
      setEditandoTexto(false);
    } catch (err) {
      setErroTexto(err instanceof Error ? err.message : "Não foi possível salvar o texto.");
    }
  }

  const estiloPosicao = {
    left: `${area.x_percent}%`,
    top: `${area.y_percent}%`,
    width: `${area.largura_percent}%`,
    height: `${area.altura_percent}%`,
    zIndex: area.z_index,
  };

  const containerRectAtual = containerRef.current?.getBoundingClientRect();
  const escalaTelaPorTemplate = containerRectAtual ? containerRectAtual.width / templateLarguraPx : 1;

  if (isTexto && editandoTexto) {
    return (
      <div className="absolute" style={estiloPosicao}>
        {usarTextarea ? (
          <Textarea
            autoFocus
            value={valorTexto}
            onChange={(event) => setValorTexto(event.target.value)}
            onBlur={salvarTexto}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                cancelandoRef.current = true;
                setValorTexto(composicaoElemento?.valor_texto ?? "");
                setEditandoTexto(false);
              }
            }}
            disabled={salvarTextoMutation.isPending}
            className="h-full w-full resize-none bg-background/90 text-xs"
            style={estiloFonteTexto(area, escalaTelaPorTemplate)}
          />
        ) : (
          <Input
            autoFocus
            value={valorTexto}
            onChange={(event) => setValorTexto(event.target.value)}
            onBlur={salvarTexto}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                salvarTexto();
              }
              if (event.key === "Escape") {
                cancelandoRef.current = true;
                setValorTexto(composicaoElemento?.valor_texto ?? "");
                setEditandoTexto(false);
              }
            }}
            disabled={salvarTextoMutation.isPending}
            className="h-full w-full bg-background/90 text-xs"
            style={estiloFonteTexto(area, escalaTelaPorTemplate)}
          />
        )}
        {erroTexto && (
          <p role="alert" className="absolute left-0 top-full z-10 whitespace-nowrap text-[10px] text-destructive">
            {erroTexto}
          </p>
        )}
      </div>
    );
  }

  if (podeAjustarPosicao && preenchida) {
    const containerRect = containerRef.current?.getBoundingClientRect();
    const translateXPx = containerRect ? deslocamentoXPx * (containerRect.width / templateLarguraPx) : 0;
    const translateYPx = containerRect ? deslocamentoYPx * (containerRect.height / templateAlturaPx) : 0;

    return (
      <div
        role="button"
        tabIndex={0}
        onPointerDown={(event) => iniciarAjuste("mover", event)}
        onPointerMove={moverAjuste}
        onPointerUp={finalizarAjuste}
        onPointerCancel={finalizarAjuste}
        onKeyDown={moverPorTeclado}
        aria-label={`Ajustar posição do elemento em ${area.nome} — arraste ou use as setas para mover, Enter para trocar o elemento`}
        className="absolute overflow-visible"
        style={{ ...estiloPosicao, touchAction: "none", cursor: ajustando === "mover" ? "grabbing" : "grab" }}
      >
        {imagemUrl ? (
          <img
            src={imagemUrl}
            alt={elemento?.nome ?? area.nome}
            className="h-full w-full object-contain"
            style={{ transform: `translate(${translateXPx}px, ${translateYPx}px) scale(${fatorEscala})` }}
            draggable={false}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-background/80 text-muted-foreground">
            Carregando…
          </span>
        )}
        <div
          role="button"
          tabIndex={0}
          onPointerDown={(event) => iniciarAjuste("escala", event)}
          onPointerMove={moverAjuste}
          onPointerUp={finalizarAjuste}
          onPointerCancel={finalizarAjuste}
          onKeyDown={redimensionarPorTeclado}
          aria-label={`Redimensionar o elemento em ${area.nome} — arraste ou use as setas para escalar`}
          className="absolute h-4 w-4 -bottom-1 -right-1 cursor-nwse-resize rounded-full border-2 border-background bg-primary"
          style={{ touchAction: "none" }}
        />
        {erroAjuste && (
          <p role="alert" className="absolute -bottom-5 left-0 z-10 whitespace-nowrap text-[10px] text-destructive">
            {erroAjuste}
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={isTexto ? () => setEditandoTexto(true) : onClicarImagem}
      aria-label={`${preenchida ? "Editar" : "Preencher"} área ${area.nome}${area.obrigatorio ? " (obrigatória)" : ""}`}
      className={cn(
        "absolute overflow-hidden text-left text-[11px] leading-tight",
        preenchida
          ? "border border-transparent"
          : area.obrigatorio
            ? "border-2 border-dashed border-destructive bg-destructive/10"
            : "border-2 border-dashed border-muted-foreground/50 bg-muted/60",
        destacada && "ring-2 ring-primary ring-offset-2",
      )}
      style={estiloPosicao}
    >
      {preenchida ? (
        isTexto ? (
          <span
            className="flex h-full w-full items-center justify-center overflow-hidden bg-background/80 p-1 text-foreground"
            style={estiloFonteTexto(area, escalaTelaPorTemplate)}
          >
            {composicaoElemento?.valor_texto}
          </span>
        ) : imagemUrl ? (
          <img src={imagemUrl} alt={elemento?.nome ?? area.nome} className="h-full w-full object-contain" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-background/80 text-muted-foreground">
            Carregando…
          </span>
        )
      ) : (
        <span className="flex h-full w-full flex-col items-center justify-center gap-1 p-1 text-center text-muted-foreground">
          {area.obrigatorio && <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" aria-hidden="true" />}
          <span>{area.nome}</span>
        </span>
      )}
    </button>
  );
}

// Fora do corpo do pai: cada opção de elemento assina a própria signed URL.
function ElementoOptionButton({
  elemento,
  selecionado,
  disabled,
  onSelecionar,
}: {
  elemento: EstudioElemento;
  selecionado: boolean;
  disabled: boolean;
  onSelecionar: () => void;
}) {
  const { data: thumbUrl } = useFotoSignedUrl("estudio-elementos", elemento.thumbnail_url ?? elemento.arquivo_url);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelecionar}
      className={cn(
        "flex flex-col items-center gap-1 rounded-md border p-2 text-center text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        selecionado ? "border-primary bg-primary/10" : "border-border hover:bg-accent",
      )}
    >
      {thumbUrl ? (
        <img src={thumbUrl} alt={elemento.nome} className="h-16 w-16 rounded object-cover" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded bg-muted text-muted-foreground">
          <ImageIcon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <span className="line-clamp-2 text-foreground">{elemento.nome}</span>
    </button>
  );
}

// Fora do corpo do pai: painel próprio com estado de formulário — dentro,
// perderia estado a cada render do editor (ex.: refetch de composição).
// Antes era o conteúdo de um <Dialog> (modal); agora é a coluna 3 inline —
// monta/desmonta com `areaSelecionada` no pai, então troca de área já reseta
// o estado local sozinha, sem precisar de um `useEffect` de reset.
function AreaElementoPainel({
  area,
  composicaoId,
  composicaoElemento,
  onFechar,
  onAcaoAplicada,
}: {
  area: EstudioTemplateArea;
  composicaoId: string;
  composicaoElemento: EstudioComposicaoElemento | undefined;
  onFechar: () => void;
  onAcaoAplicada: (entrada: HistoricoEntrada) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const salvar = useSalvarComposicaoElemento();
  const remover = useRemoverComposicaoElemento();

  const { data: elementosDisponiveis, isLoading: elementosLoading } = useEstudioElementos({
    tipo: area.tipo_elemento_permitido,
  });

  const elementosAtivos = (elementosDisponiveis ?? []).filter((elemento) => elemento.is_active);

  async function handleSelecionarElemento(elementoId: string) {
    if (salvar.isPending) return;
    setError(null);
    try {
      const antes = composicaoElemento ?? null;
      const depois = await salvar.mutateAsync({ composicao_id: composicaoId, area_id: area.id, elemento_id: elementoId });
      onAcaoAplicada({ areaId: area.id, antes, depois });
      onFechar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o elemento.");
    }
  }

  async function handleRemover() {
    if (!composicaoElemento || remover.isPending) return;
    setError(null);
    try {
      const antes = composicaoElemento;
      await remover.mutateAsync({ id: composicaoElemento.id, composicao_id: composicaoId });
      onAcaoAplicada({ areaId: area.id, antes, depois: null });
      onFechar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-foreground">{area.nome}</h3>
        <p className="text-xs text-muted-foreground">
          {area.obrigatorio ? "Área obrigatória — " : ""}
          {TIPO_ELEMENTO_LABEL[area.tipo_elemento_permitido]}
          {area.notas ? ` — ${area.notas}` : ""}
        </p>
      </div>

      {elementosLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : elementosAtivos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum elemento de "{TIPO_ELEMENTO_LABEL[area.tipo_elemento_permitido]}" disponível ainda.
          </p>
          <p className="text-xs text-muted-foreground">
            Peça ao time de marketing para cadastrar um em Elementos do Estúdio.
          </p>
        </div>
      ) : (
        <div className="grid max-h-72 grid-cols-2 gap-3 overflow-y-auto">
          {elementosAtivos.map((elemento) => (
            <ElementoOptionButton
              key={elemento.id}
              elemento={elemento}
              selecionado={composicaoElemento?.elemento_id === elemento.id}
              disabled={salvar.isPending}
              onSelecionar={() => handleSelecionarElemento(elemento.id)}
            />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border/50 pt-4">
        {composicaoElemento && (
          <Button type="button" variant="outline-danger" size="sm" disabled={remover.isPending} onClick={handleRemover}>
            {remover.isPending ? "Removendo…" : "Remover"}
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onFechar}>
          Fechar seleção
        </Button>
      </div>
    </div>
  );
}

// Fora do corpo do pai: cada categoria expandida busca sua própria lista de
// elementos — o Collapsible desmonta o conteúdo fechado (Radix, sem
// forceMount), então só busca quando o colaborador abre. Só apoio visual
// (sem área-alvo ainda), por isso os botões ficam desabilitados.
// ponytail: categoria "Texto" tem 5 tipos — busca todos os elementos (sem
// filtro de tipo) e filtra client-side por `tipos.includes`, em vez de 5
// queries em paralelo; upgrade se a tabela de elementos crescer muito.
function CategoriaElementoLista({ tipos }: { tipos: EstudioTipoElemento[] }) {
  const filtroTipo = tipos.length === 1 ? tipos[0] : undefined;
  const { data: elementosDoFiltro, isLoading } = useEstudioElementos(filtroTipo ? { tipo: filtroTipo } : undefined);
  const elementosAtivos = (elementosDoFiltro ?? []).filter(
    (elemento) => elemento.is_active && (filtroTipo ? true : tipos.includes(elemento.tipo)),
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (elementosAtivos.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
        Nenhum elemento cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3">
        {elementosAtivos.map((elemento) => (
          <ElementoOptionButton
            key={elemento.id}
            elemento={elemento}
            selecionado={false}
            disabled
            onSelecionar={() => {}}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Selecione uma área no template para adicionar este elemento.</p>
    </div>
  );
}

// Fora do corpo do pai: navegação por categoria da coluna 3 quando nenhuma
// área do canvas está selecionada — busca de categoria é filtro client-side
// puro, mesmo padrão de `buscaTemplate` em TemplatesColuna.
function CategoriasElementoBrowse({
  categorias,
}: {
  categorias: { label: string; tipos: EstudioTipoElemento[] }[];
}) {
  const [busca, setBusca] = useState("");
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const termo = busca.trim().toLowerCase();
  const categoriasFiltradas = termo
    ? categorias.filter((categoria) => categoria.label.toLowerCase().includes(termo))
    : categorias;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="estudio-busca-elementos">Buscar elementos</Label>
        <Input
          id="estudio-busca-elementos"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar elementos..."
        />
      </div>

      {categoriasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma categoria encontrada para esta busca.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {categoriasFiltradas.map((categoria) => (
            <Collapsible
              key={categoria.label}
              open={abertas[categoria.label] ?? false}
              onOpenChange={(open) => setAbertas((prev) => ({ ...prev, [categoria.label]: open }))}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
                {categoria.label}
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 transition-transform", abertas[categoria.label] && "rotate-180")}
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <CategoriaElementoLista tipos={categoria.tipos} />
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}

// Fora do corpo do pai: é a coluna 2 (+ casca da coluna 3) do Estúdio, com seu
// próprio estado de nome e mutations — perderia estado de input a cada render
// da página. Retorna um fragment de 2 colunas: canvas e (por enquanto)
// placeholder da coluna de elementos, que a Task B3 preenche.
function ComposicaoWorkspace({
  composicaoId,
  template,
  onVoltarInicio,
}: {
  composicaoId: string;
  template: EstudioTemplateComCategoria;
  onVoltarInicio: () => void;
}) {
  const { data: composicao, isLoading: composicaoLoading } = useEstudioComposicao(composicaoId);
  const { data: areas, isLoading: areasLoading } = useEstudioTemplateAreas(template.id);
  const { data: composicaoElementos } = useEstudioComposicaoElementos(composicaoId);
  const { data: imagemBaseUrl } = useFotoSignedUrl("estudio-templates", template.imagem_base_url);

  const salvarComposicao = useUpdateEstudioComposicao();
  const finalizarComposicao = useUpdateEstudioComposicao();
  const exportarComposicao = useUpdateEstudioComposicao();
  const { data: exportadaUrl } = useFotoSignedUrl("estudio-composicoes", composicao?.export_file_url);

  // Desfazer/Refazer (Task B4) — mutations próprias desta pilha, mesmo padrão
  // de múltiplas instâncias de useSalvarComposicaoElemento já usado em
  // AreaZona (salvarTextoMutation/salvarAjusteMutation): cada consumidor tem
  // seu próprio estado de pending, o cache invalidado é o mesmo.
  const salvarElementoMutation = useSalvarComposicaoElemento();
  const removerElementoMutation = useRemoverComposicaoElemento();
  const [pilhaDesfazer, setPilhaDesfazer] = useState<HistoricoEntrada[]>([]);
  const [pilhaRefazer, setPilhaRefazer] = useState<HistoricoEntrada[]>([]);
  const [desfazendoOuRefazendo, setDesfazendoOuRefazendo] = useState(false);
  const [historicoError, setHistoricoError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [nome, setNome] = useState("");
  const [nomeCarregado, setNomeCarregado] = useState(false);
  const [areaSelecionada, setAreaSelecionada] = useState<EstudioTemplateArea | null>(null);
  const [nomeError, setNomeError] = useState<string | null>(null);
  const [rascunhoError, setRascunhoError] = useState<string | null>(null);
  const [finalizarError, setFinalizarError] = useState<string | null>(null);
  const [exportarError, setExportarError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    if (composicao && !nomeCarregado) {
      setNome(composicao.nome ?? "");
      setNomeCarregado(true);
    }
  }, [composicao, nomeCarregado]);

  // Fora de escopo: desfazer transição de status/troca de template — a pilha
  // só acompanha as 3 mutações de conteúdo de área, e reseta (fica vazia)
  // sempre que a composição muda.
  useEffect(() => {
    setPilhaDesfazer([]);
    setPilhaRefazer([]);
    setHistoricoError(null);
  }, [composicaoId]);

  const elementoPorAreaId = new Map((composicaoElementos ?? []).map((item) => [item.area_id, item]));

  function registrarHistorico(entrada: HistoricoEntrada) {
    setPilhaDesfazer((prev) => [...prev, entrada].slice(-20));
    setPilhaRefazer([]);
  }

  async function handleDesfazer() {
    if (desfazendoOuRefazendo || pilhaDesfazer.length === 0) return;
    const entrada = pilhaDesfazer[pilhaDesfazer.length - 1];
    setDesfazendoOuRefazendo(true);
    setHistoricoError(null);
    try {
      if (entrada.antes === null) {
        await removerElementoMutation.mutateAsync({ id: entrada.depois!.id, composicao_id: composicaoId });
      } else {
        await salvarElementoMutation.mutateAsync({
          composicao_id: composicaoId,
          area_id: entrada.areaId,
          elemento_id: entrada.antes.elemento_id ?? undefined,
          valor_texto: entrada.antes.valor_texto ?? undefined,
          deslocamento_x_px: entrada.antes.deslocamento_x_px,
          deslocamento_y_px: entrada.antes.deslocamento_y_px,
          fator_escala: entrada.antes.fator_escala,
        });
      }
      setPilhaDesfazer((prev) => prev.slice(0, -1));
      setPilhaRefazer((prev) => [...prev, entrada]);
    } catch (err) {
      setHistoricoError(err instanceof Error ? err.message : "Não foi possível desfazer.");
    } finally {
      setDesfazendoOuRefazendo(false);
    }
  }

  async function handleRefazer() {
    if (desfazendoOuRefazendo || pilhaRefazer.length === 0) return;
    const entrada = pilhaRefazer[pilhaRefazer.length - 1];
    setDesfazendoOuRefazendo(true);
    setHistoricoError(null);
    try {
      if (entrada.depois === null) {
        // id ATUAL da linha, não o do histórico — um desfazer intermediário
        // pode ter recriado a linha com um id novo. Se o cache de
        // composicaoElementos ainda não refletiu essa recriação (invalidação
        // dispara refetch em background, não aguardado), idAtual vem
        // undefined — nesse caso NÃO fingir sucesso: erro visível e a
        // entrada continua em pilhaRefazer para o usuário tentar de novo.
        const idAtual = elementoPorAreaId.get(entrada.areaId)?.id;
        if (!idAtual) {
          setHistoricoError("Não foi possível refazer: o elemento ainda está sendo atualizado, tente novamente em instantes.");
          return;
        }
        await removerElementoMutation.mutateAsync({ id: idAtual, composicao_id: composicaoId });
      } else {
        await salvarElementoMutation.mutateAsync({
          composicao_id: composicaoId,
          area_id: entrada.areaId,
          elemento_id: entrada.depois.elemento_id ?? undefined,
          valor_texto: entrada.depois.valor_texto ?? undefined,
          deslocamento_x_px: entrada.depois.deslocamento_x_px,
          deslocamento_y_px: entrada.depois.deslocamento_y_px,
          fator_escala: entrada.depois.fator_escala,
        });
      }
      setPilhaRefazer((prev) => prev.slice(0, -1));
      setPilhaDesfazer((prev) => [...prev, entrada]);
    } catch (err) {
      setHistoricoError(err instanceof Error ? err.message : "Não foi possível refazer.");
    } finally {
      setDesfazendoOuRefazendo(false);
    }
  }

  function handleSalvarNome() {
    if (salvarComposicao.isPending) return;
    setNomeError(null);
    salvarComposicao.mutate(
      { id: composicaoId, nome: nome.trim() },
      { onError: (err) => setNomeError(err instanceof Error ? err.message : "Não foi possível salvar o nome.") },
    );
  }

  async function handleSalvarRascunho() {
    if (salvarComposicao.isPending) return;
    setRascunhoError(null);
    try {
      await salvarComposicao.mutateAsync({ id: composicaoId, status: "draft" });
    } catch (err) {
      setRascunhoError(err instanceof Error ? err.message : "Não foi possível salvar o rascunho.");
    }
  }

  function areasFaltando(): string[] {
    const faltando: string[] = [];
    if (!nome.trim()) faltando.push("Nome da peça");
    for (const area of areas ?? []) {
      if (area.obrigatorio && !composicaoElementoPreenchido(elementoPorAreaId.get(area.id))) {
        faltando.push(area.nome);
      }
    }
    return faltando;
  }

  async function handleFinalizar() {
    if (finalizarComposicao.isPending) return;
    setFinalizarError(null);

    const faltando = areasFaltando();
    if (faltando.length > 0) {
      setFinalizarError(`Antes de finalizar, preencha: ${faltando.join(", ")}.`);
      return;
    }

    try {
      // nome vai junto neste mesmo UPDATE, não só no autosave do onBlur: os
      // dois updates são independentes e sem ordem garantida, então finalizar
      // logo após digitar o nome (sem esperar o blur) podia bater no trigger
      // que rejeita saved/exported sem nome, mesmo com o campo preenchido.
      await finalizarComposicao.mutateAsync({ id: composicaoId, nome: nome.trim(), status: "saved" });
    } catch (err) {
      setFinalizarError(err instanceof Error ? err.message : "Não foi possível finalizar a peça.");
    }
  }

  async function handleExportar() {
    // `exportarComposicao.isPending` só cobre o UPDATE final — a geração do
    // canvas e o upload rodam antes dela e também precisam travar o clique
    // duplo, daí o estado local cobrindo a função inteira (try/finally).
    if (exportando || exportarComposicao.isPending || !imagemBaseUrl || areasLoading) return;
    setExportarError(null);

    const faltando = areasFaltando();
    if (faltando.length > 0) {
      setExportarError(`Antes de exportar, preencha: ${faltando.join(", ")}.`);
      return;
    }

    setExportando(true);
    try {
      const blob = await gerarImagemComposicao(template, imagemBaseUrl, areas ?? [], elementoPorAreaId);
      const path = `${composicaoId}/${Date.now()}-exportada.png`;
      const { error: uploadError } = await supabase.storage
        .from("estudio-composicoes")
        .upload(path, blob, { upsert: true, contentType: "image/png" });
      if (uploadError) throw uploadError;

      // nome vai junto neste UPDATE pelo mesmo motivo do handleFinalizar: sem
      // ordem garantida com o autosave do onBlur.
      await exportarComposicao.mutateAsync({
        id: composicaoId,
        nome: nome.trim(),
        status: "exported",
        export_file_url: path,
      });
    } catch (err) {
      setExportarError(err instanceof Error ? err.message : "Não foi possível exportar a peça.");
    } finally {
      setExportando(false);
    }
  }

  const statusLabel =
    composicao?.status === "saved" ? "Finalizada" : composicao?.status === "exported" ? "Exportada" : "Rascunho";

  return (
    <>
      <div className="min-w-0 flex-1 rounded-md border border-border bg-card p-4">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Montando: {template.nome}</h2>
              <p className="text-sm text-muted-foreground">
                {template.largura_px}×{template.altura_px}px — {statusLabel}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onVoltarInicio} className="sm:w-auto">
              Voltar ao início
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="composicao-nome">Nome da peça</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="composicao-nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                onBlur={handleSalvarNome}
                placeholder="Ex.: Promoção de verão — loja 12"
                className="sm:max-w-md"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={salvarComposicao.isPending}
                onClick={handleSalvarNome}
                className="sm:w-auto"
              >
                {salvarComposicao.isPending ? "Salvando…" : "Salvar nome"}
              </Button>
            </div>
            {nomeError && (
              <p role="alert" className="text-sm text-destructive">
                {nomeError}
              </p>
            )}
          </div>

          {areasLoading || composicaoLoading ? (
            <Skeleton className="aspect-video w-full max-w-xl" />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="composicao-zoom" className="shrink-0">
                  Zoom
                </Label>
                <Select value={String(zoomPercent)} onValueChange={(v) => setZoomPercent(Number(v))}>
                  <SelectTrigger id="composicao-zoom" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[50, 75, 100, 125, 150, 200].map((valor) => (
                      <SelectItem key={valor} value={String(valor)}>
                        {valor}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={pilhaDesfazer.length === 0 || desfazendoOuRefazendo}
                  onClick={handleDesfazer}
                  aria-label="Desfazer"
                >
                  {desfazendoOuRefazendo ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Undo2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={pilhaRefazer.length === 0 || desfazendoOuRefazendo}
                  onClick={handleRefazer}
                  aria-label="Refazer"
                >
                  {desfazendoOuRefazendo ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Redo2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {historicoError && (
                <p role="alert" className="text-sm text-destructive">
                  {historicoError}
                </p>
              )}
              <div className="overflow-x-auto">
                <div
                  ref={containerRef}
                  className="relative overflow-hidden rounded-md border border-border bg-muted"
                  style={{
                    aspectRatio: `${template.largura_px} / ${template.altura_px}`,
                    width: `${(CANVAS_LARGURA_BASE_PX * zoomPercent) / 100}px`,
                  }}
                >
                  {imagemBaseUrl ? (
                    <img
                      src={imagemBaseUrl}
                      alt={`Layout do template ${template.nome}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                      Carregando imagem base…
                    </div>
                  )}
                  {(areas ?? []).map((area) => (
                    <AreaZona
                      key={area.id}
                      area={area}
                      composicaoElemento={elementoPorAreaId.get(area.id)}
                      composicaoId={composicaoId}
                      destacada={areaSelecionada?.id === area.id}
                      onClicarImagem={() => setAreaSelecionada(area)}
                      containerRef={containerRef}
                      templateLarguraPx={template.largura_px}
                      templateAlturaPx={template.altura_px}
                      onAcaoAplicada={registrarHistorico}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={salvarComposicao.isPending} onClick={handleSalvarRascunho}>
                {salvarComposicao.isPending ? "Salvando…" : "Salvar rascunho"}
              </Button>
              <Button type="button" disabled={finalizarComposicao.isPending} onClick={handleFinalizar}>
                {finalizarComposicao.isPending ? "Finalizando…" : "Finalizar peça"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={exportando || exportarComposicao.isPending || !imagemBaseUrl || areasLoading}
                onClick={handleExportar}
              >
                {exportando || exportarComposicao.isPending ? "Exportando…" : "Exportar peça"}
              </Button>
              {composicao?.export_file_url && exportadaUrl && (
                <Button asChild variant="outline">
                  <a href={exportadaUrl} target="_blank" rel="noreferrer">
                    Baixar peça exportada
                  </a>
                </Button>
              )}
            </div>
            {rascunhoError && (
              <p role="alert" className="text-sm text-destructive">
                {rascunhoError}
              </p>
            )}
            {finalizarError && (
              <p role="alert" className="text-sm text-destructive">
                {finalizarError}
              </p>
            )}
            {exportarError && (
              <p role="alert" className="text-sm text-destructive">
                {exportarError}
              </p>
            )}
          </div>

        </div>
      </div>
      <div className="lg:w-72 shrink-0 rounded-md border border-border bg-card p-4">
        {areaSelecionada ? (
          <AreaElementoPainel
            key={areaSelecionada.id}
            area={areaSelecionada}
            composicaoId={composicaoId}
            composicaoElemento={elementoPorAreaId.get(areaSelecionada.id)}
            onFechar={() => setAreaSelecionada(null)}
            onAcaoAplicada={registrarHistorico}
          />
        ) : (
          <CategoriasElementoBrowse categorias={CATEGORIAS_ELEMENTO} />
        )}
      </div>
    </>
  );
}

// Fora do corpo do pai: coluna 1 do Estúdio (canal + busca + categorias +
// grade de templates) — sempre visível, substitui os antigos passos 1+2 do
// wizard sequencial. Busca de template é filtro client-side puro (a lista já
// vem inteira da query), por isso o estado dela vive só aqui.
function TemplatesColuna({
  canalEscolhido,
  onSelecionarCanal,
  canaisComTemplate,
  categoriasDoCanal,
  categoriaSelecionadaId,
  onSelecionarCategoria,
  templatesAtivos,
  templatesLoading,
  templateEscolhidoId,
  disabled,
  onUsarTemplate,
}: {
  canalEscolhido: EstudioCanal | null;
  onSelecionarCanal: (canal: EstudioCanal) => void;
  canaisComTemplate: Set<EstudioCanal>;
  categoriasDoCanal: { id: string; nome: string }[];
  categoriaSelecionadaId: string;
  onSelecionarCategoria: (categoriaId: string) => void;
  templatesAtivos: EstudioTemplateComCategoria[];
  templatesLoading: boolean;
  templateEscolhidoId: string | null;
  disabled: boolean;
  onUsarTemplate: (template: EstudioTemplateComCategoria) => void;
}) {
  const [buscaTemplate, setBuscaTemplate] = useState("");
  const termoBusca = buscaTemplate.trim().toLowerCase();
  const templatesFiltrados = termoBusca
    ? templatesAtivos.filter((template) => template.nome.toLowerCase().includes(termoBusca))
    : templatesAtivos;

  return (
    <section className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
      <div className="flex flex-col gap-2">
        <Label htmlFor="estudio-canal-select">Canal</Label>
        <Select value={canalEscolhido ?? ""} onValueChange={(value) => onSelecionarCanal(value as EstudioCanal)}>
          <SelectTrigger id="estudio-canal-select">
            <SelectValue placeholder="Selecione o canal" />
          </SelectTrigger>
          <SelectContent>
            {CANAL_OPTIONS.map((canal) => (
              <SelectItem key={canal} value={canal} disabled={!canaisComTemplate.has(canal)}>
                {CANAL_LABEL[canal]}
                {!canaisComTemplate.has(canal) ? " (em breve)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {canalEscolhido && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="estudio-busca-template">Buscar templates</Label>
            <Input
              id="estudio-busca-template"
              value={buscaTemplate}
              onChange={(event) => setBuscaTemplate(event.target.value)}
              placeholder="Buscar templates..."
            />
          </div>

          {categoriasDoCanal.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma categoria ativa para este canal ainda. Escolha outro canal acima.
              </p>
            </div>
          ) : (
            <Tabs value={categoriaSelecionadaId} onValueChange={onSelecionarCategoria}>
              <TabsList className="flex h-auto flex-wrap justify-start gap-1">
                <TabsTrigger value="">Todos</TabsTrigger>
                {categoriasDoCanal.map((categoria) => (
                  <TabsTrigger key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={categoriaSelecionadaId} className="mt-4">
                {templatesLoading ? (
                  <div className="grid grid-cols-1 gap-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : templatesFiltrados.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {termoBusca
                        ? "Nenhum template encontrado para esta busca."
                        : "Nenhum template disponível nesta categoria ainda."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {templatesFiltrados.map((template) => (
                      <div
                        key={template.id}
                        className={cn(
                          template.id === templateEscolhidoId && "rounded-md ring-2 ring-primary ring-offset-2",
                        )}
                      >
                        <TemplateEscolhaCard template={template} disabled={disabled} onUsar={onUsarTemplate} />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </section>
  );
}

export default function EstudioColaborador() {
  const [canalEscolhido, setCanalEscolhido] = useState<EstudioCanal | null>(null);
  const [categoriaSelecionadaId, setCategoriaSelecionadaId] = useState("");
  const [templateEscolhido, setTemplateEscolhido] = useState<EstudioTemplateComCategoria | null>(null);
  const [composicaoId, setComposicaoId] = useState<string | null>(null);
  const [pdvSelecionadoId, setPdvSelecionadoId] = useState("");
  const [criarComposicaoError, setCriarComposicaoError] = useState<string | null>(null);
  // Confirmação antes de trocar de template com composição em andamento —
  // guarda o template clicado até o usuário confirmar (ou fechar o dialog,
  // que cancela a troca sem mexer na composição atual).
  const [templatePendente, setTemplatePendente] = useState<EstudioTemplateComCategoria | null>(null);

  const { data: categorias } = useEstudioCategorias();
  const { data: templatesTodos } = useEstudioTemplates();
  const { data: pdvs, isLoading: pdvsLoading } = usePdvs();
  const createComposicao = useCreateEstudioComposicao();

  // Retomada a partir do histórico de peças (EstudioHistorico.tsx): /estudio?composicao=<id>
  // pula direto pro passo 3, sem passar por canal/template. Mesma composicao_id
  // detail-key do ComposicaoWorkspace abaixo — cache compartilhado, sem fetch duplicado.
  const [searchParams, setSearchParams] = useSearchParams();
  const composicaoIdParam = searchParams.get("composicao");
  const composicaoResumoQuery = useEstudioComposicao(composicaoIdParam ?? "");
  const templateResumoQuery = useEstudioTemplate(composicaoResumoQuery.data?.template_id ?? "");
  const resumindoPeca = !!composicaoIdParam && composicaoId !== composicaoIdParam;
  const resumoComErro = composicaoResumoQuery.isError || templateResumoQuery.isError;

  useEffect(() => {
    if (!composicaoIdParam || composicaoId === composicaoIdParam) return;
    if (composicaoResumoQuery.data && templateResumoQuery.data) {
      setTemplateEscolhido(templateResumoQuery.data);
      setComposicaoId(composicaoResumoQuery.data.id);
    }
  }, [composicaoIdParam, composicaoId, composicaoResumoQuery.data, templateResumoQuery.data]);

  // pdv_id do usuário logado — consulta pontual desta tela (não vira hook
  // reutilizável em hooks/: só esta tela precisa decidir entre "usar o pdv do
  // colaborador" e "deixar quem não tem posto fixo escolher"). auth.getUser()
  // primeiro porque o pdv_id mora em `usuarios`, não na sessão do Supabase Auth.
  const meuPdvIdQuery = useQuery({
    queryKey: ["estudio-colaborador-meu-pdv-id"],
    queryFn: async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Usuário não autenticado.");
      const { data, error } = await supabase.from("usuarios").select("pdv_id").eq("id", user.id).single();
      if (error) throw error;
      return (data.pdv_id as string | null) ?? null;
    },
  });

  const canaisComTemplate = new Set(
    (templatesTodos ?? [])
      .filter((template) => template.is_active && template.categoria)
      .map((template) => template.categoria!.canal),
  );

  const categoriasDoCanal = (categorias ?? []).filter(
    (categoria) => categoria.is_active && categoria.canal === canalEscolhido,
  );

  useEffect(() => {
    if (categoriasDoCanal.length === 0) return;
    if (!categoriasDoCanal.some((categoria) => categoria.id === categoriaSelecionadaId)) {
      setCategoriaSelecionadaId(categoriasDoCanal[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canalEscolhido, categoriasDoCanal.map((c) => c.id).join(",")]);

  const { data: templatesDaCategoria, isLoading: templatesLoading } = useEstudioTemplates({
    categoriaId: categoriaSelecionadaId || undefined,
  });
  const templatesAtivos = (templatesDaCategoria ?? []).filter((template) => template.is_active);

  const pdvsAtivos = (pdvs ?? []).filter((pdv) => pdv.status === "ativo");

  function handleSelecionarCanal(canal: EstudioCanal) {
    if (!canaisComTemplate.has(canal)) return;
    setCanalEscolhido(canal);
    setCategoriaSelecionadaId("");
  }

  function handleVoltarInicio() {
    setCanalEscolhido(null);
    setCategoriaSelecionadaId("");
    setTemplateEscolhido(null);
    setComposicaoId(null);
    setPdvSelecionadoId("");
    setCriarComposicaoError(null);
    // Limpa ?composicao= da URL — sem isso, o efeito de retomada acima
    // reabriria a mesma composição no próximo render (ou num F5).
    if (searchParams.has("composicao")) {
      const next = new URLSearchParams(searchParams);
      next.delete("composicao");
      setSearchParams(next, { replace: true });
    }
  }

  async function criarComposicao(pdvId: string) {
    if (!templateEscolhido || createComposicao.isPending) return;
    setCriarComposicaoError(null);
    try {
      const created = await createComposicao.mutateAsync({ template_id: templateEscolhido.id, pdv_id: pdvId });
      setComposicaoId(created.id);
    } catch (err) {
      setCriarComposicaoError(err instanceof Error ? err.message : "Não foi possível criar a composição.");
    }
  }

  async function executarTrocaTemplate(template: EstudioTemplateComCategoria) {
    if (meuPdvIdQuery.isLoading || createComposicao.isPending) return;
    setTemplateEscolhido(template);
    setComposicaoId(null);
    setPdvSelecionadoId("");
    setCriarComposicaoError(null);
    if (meuPdvIdQuery.data) {
      await criarComposicao(meuPdvIdQuery.data);
    }
    // se meuPdvIdQuery.data for null (usuário de gestão sem posto fixo), a
    // composição só é criada depois que ele escolher um PDV no passo 3.
  }

  // Com composição em andamento, clicar noutro template descartaria o
  // progresso sem aviso (o rascunho fica salvo no histórico, mas o clique
  // pode ter sido sem querer) — confirma antes; sem composição aberta,
  // troca direto (comportamento de sempre).
  function handleUsarTemplate(template: EstudioTemplateComCategoria) {
    if (composicaoId) {
      setTemplatePendente(template);
      return;
    }
    void executarTrocaTemplate(template);
  }

  function handleConfirmarTrocaTemplate() {
    if (templatePendente) void executarTrocaTemplate(templatePendente);
    setTemplatePendente(null);
  }

  // Retomando uma peça do histórico (?composicao=<id>): mostra skeleton
  // enquanto composição+template carregam, ou erro amigável se a RLS negar
  // acesso (composição de outro PDV) — não deixa a tela estourar em branco.
  if (resumindoPeca) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: "Criação" }, { label: "Estúdio" }]}
          title="Estúdio de Comunicação"
          description="Crie peças de comunicação a partir de templates pré-aprovados."
          action={<Button onClick={handleVoltarInicio}>Nova Composição</Button>}
        />
        {resumoComErro ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-sm text-destructive">
              Não foi possível abrir esta peça.
            </p>
            <Button variant="outline" size="sm" onClick={handleVoltarInicio}>
              Voltar ao início
            </Button>
          </div>
        ) : (
          <Skeleton className="h-64 w-full max-w-xl" />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Criação" }, { label: "Estúdio" }]}
        title="Estúdio de Comunicação"
        description="Crie peças de comunicação a partir de templates pré-aprovados."
        action={<Button onClick={handleVoltarInicio}>Nova Composição</Button>}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <TemplatesColuna
          canalEscolhido={canalEscolhido}
          onSelecionarCanal={handleSelecionarCanal}
          canaisComTemplate={canaisComTemplate}
          categoriasDoCanal={categoriasDoCanal}
          categoriaSelecionadaId={categoriaSelecionadaId}
          onSelecionarCategoria={setCategoriaSelecionadaId}
          templatesAtivos={templatesAtivos}
          templatesLoading={templatesLoading}
          templateEscolhidoId={templateEscolhido?.id ?? null}
          disabled={meuPdvIdQuery.isLoading || createComposicao.isPending}
          onUsarTemplate={handleUsarTemplate}
        />
        {templateEscolhido && composicaoId ? (
          <ComposicaoWorkspace
            composicaoId={composicaoId}
            template={templateEscolhido}
            onVoltarInicio={handleVoltarInicio}
          />
        ) : templateEscolhido ? (
          // Composição ainda não existe: cria automaticamente pro colaborador com
          // posto fixo (handleUsarTemplate já disparou), ou pede o PDV pra quem não
          // tem (papel de gestão) — mesma lógica de antes da Task B1, só a casca
          // muda (aqui dentro da coluna central, sem "step" de wizard pra voltar).
          <div className="flex-1 rounded-md border border-border bg-card p-4">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-foreground">Criando a composição</h2>
              {meuPdvIdQuery.isLoading ? (
                <Skeleton className="h-20 w-full max-w-md" />
              ) : meuPdvIdQuery.isError ? (
                <div className="flex flex-col items-start gap-2">
                  <p role="alert" className="text-sm text-destructive">
                    {meuPdvIdQuery.error instanceof Error
                      ? meuPdvIdQuery.error.message
                      : "Não foi possível identificar o posto do usuário."}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => meuPdvIdQuery.refetch()}>
                    Tentar novamente
                  </Button>
                </div>
              ) : meuPdvIdQuery.data ? (
                <div className="flex flex-col items-start gap-2">
                  {createComposicao.isPending && (
                    <p className="text-sm text-muted-foreground">Criando composição…</p>
                  )}
                  {criarComposicaoError && (
                    <>
                      <p role="alert" className="text-sm text-destructive">
                        {criarComposicaoError}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={createComposicao.isPending}
                        onClick={() => criarComposicao(meuPdvIdQuery.data as string)}
                      >
                        Tentar novamente
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:w-80">
                  <p className="text-sm text-muted-foreground">
                    Seu usuário não tem um posto fixo — escolha em qual PDV esta peça está sendo criada.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="composicao-pdv-select">PDV</Label>
                    <Select value={pdvSelecionadoId} onValueChange={setPdvSelecionadoId}>
                      <SelectTrigger id="composicao-pdv-select">
                        <SelectValue placeholder={pdvsLoading ? "Carregando…" : "Selecione o PDV"} />
                      </SelectTrigger>
                      <SelectContent>
                        {pdvsAtivos.map((pdv) => (
                          <SelectItem key={pdv.id} value={pdv.id}>
                            {pdv.codigo} — {pdv.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {criarComposicaoError && (
                    <p role="alert" className="text-sm text-destructive">
                      {criarComposicaoError}
                    </p>
                  )}
                  <Button
                    disabled={!pdvSelecionadoId || createComposicao.isPending}
                    onClick={() => criarComposicao(pdvSelecionadoId)}
                    className="w-full sm:w-auto"
                  >
                    {createComposicao.isPending ? "Criando…" : "Criar composição"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          // coluna 3 real fica pra Task B3; aqui ainda não há template
          // suficiente pra montar o workspace de 2 colunas.
          <div className="flex-1 rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
            Selecione um template à esquerda para começar.
          </div>
        )}
      </div>

      <ConfirmDialog
        open={templatePendente !== null}
        onOpenChange={(open) => {
          if (!open) setTemplatePendente(null);
        }}
        titulo="Trocar de template?"
        descricao="Você tem uma composição em andamento. Trocar de template agora inicia uma nova composição — a atual fica salva como rascunho no histórico de peças."
        rotuloAcao="Trocar mesmo assim"
        pendente={false}
        erro={null}
        variantePerigosa={false}
        onConfirm={handleConfirmarTrocaTemplate}
      />
    </div>
  );
}
