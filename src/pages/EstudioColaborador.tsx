// Estúdio de Comunicação — fluxo do colaborador: canal -> template -> editor
// de composição, em 3 passos controlados por estado local nesta única
// página (sem sub-rotas, mesmo padrão de fluxo em etapas de AvaliacoesPdv.tsx).
// Composição controlada: cada área do template só aceita o tipo de elemento
// definido pelo marketing, nas posições fixas configuradas em
// EstudioTemplates.tsx — a mesma técnica de posicionamento absoluto por
// percentual é reaproveitada aqui, agora para preenchimento em vez de
// configuração.
import { useEffect, useState, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useEstudioCategorias,
  useEstudioTemplates,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageCircle, Instagram, Printer, Mail, Zap, Image as ImageIcon, AlertTriangle } from "lucide-react";
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

const CANAL_ICON: Record<EstudioCanal, ComponentType<{ className?: string }>> = {
  whatsapp: MessageCircle,
  instagram_feed: Instagram,
  instagram_story: Instagram,
  pdv_impresso: Printer,
  email: Mail,
  led: Zap,
  lona: ImageIcon,
};

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

function composicaoElementoPreenchido(elemento: EstudioComposicaoElemento | undefined): boolean {
  if (!elemento) return false;
  return !!elemento.elemento_id || !!elemento.valor_texto?.trim();
}

// Fora do corpo do componente pai: cada card de canal é só leitura, mas
// mantido fora por consistência com os demais subcomponentes desta tela.
function CanalCard({
  canal,
  disponivel,
  onSelecionar,
}: {
  canal: EstudioCanal;
  disponivel: boolean;
  onSelecionar: (canal: EstudioCanal) => void;
}) {
  const Icone = CANAL_ICON[canal];
  return (
    <button
      type="button"
      disabled={!disponivel}
      onClick={() => onSelecionar(canal)}
      className={cn(
        "flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-md border border-border bg-card p-4 text-center shadow-nazox transition-colors",
        disponivel ? "hover:bg-accent hover:text-accent-foreground" : "opacity-50",
      )}
    >
      <Icone className="h-8 w-8 text-primary" aria-hidden="true" />
      <span className="text-sm font-medium text-foreground">{CANAL_LABEL[canal]}</span>
      {!disponivel && <Badge variant="outline">Em breve</Badge>}
    </button>
  );
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

// Fora do corpo do pai: cada zona resolve sua própria imagem (área visual
// preenchida) via signed URL, mesmo motivo dos demais cards com foto.
function AreaZona({
  area,
  composicaoElemento,
  onClick,
}: {
  area: EstudioTemplateArea;
  composicaoElemento: EstudioComposicaoElemento | undefined;
  onClick: () => void;
}) {
  const isTexto = isTipoTexto(area.tipo_elemento_permitido);
  const elementoId = !isTexto ? composicaoElemento?.elemento_id ?? null : null;
  // Sem hook de busca de elemento por id isolado — reaproveita o filtro por
  // tipo já existente (useEstudioElementos) só para resolver nome/arquivo do
  // elemento_id salvo nesta área; cache compartilhado entre áreas do mesmo tipo.
  const { data: elementosDoTipo } = useEstudioElementos(!isTexto ? { tipo: area.tipo_elemento_permitido } : undefined);
  const elemento = elementoId ? (elementosDoTipo ?? []).find((item) => item.id === elementoId) ?? null : null;
  const { data: imagemUrl } = useFotoSignedUrl("estudio-elementos", elemento?.thumbnail_url ?? elemento?.arquivo_url);

  const preenchida = isTexto ? !!composicaoElemento?.valor_texto?.trim() : !!elemento;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${preenchida ? "Editar" : "Preencher"} área ${area.nome}${area.obrigatorio ? " (obrigatória)" : ""}`}
      className={cn(
        "absolute overflow-hidden text-left text-[11px] leading-tight",
        preenchida
          ? "border border-transparent"
          : area.obrigatorio
            ? "border-2 border-dashed border-destructive bg-destructive/10"
            : "border-2 border-dashed border-muted-foreground/50 bg-muted/60",
      )}
      style={{
        left: `${area.x_percent}%`,
        top: `${area.y_percent}%`,
        width: `${area.largura_percent}%`,
        height: `${area.altura_percent}%`,
        zIndex: area.z_index,
      }}
    >
      {preenchida ? (
        isTexto ? (
          <span className="flex h-full w-full items-center justify-center overflow-hidden bg-background/80 p-1 text-foreground">
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

// Fora do corpo do pai: dialog próprio com estado de formulário — dentro,
// perderia estado a cada render do editor (ex.: refetch de composição).
function AreaFillDialog({
  open,
  onOpenChange,
  area,
  composicaoId,
  composicaoElemento,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: EstudioTemplateArea | null;
  composicaoId: string;
  composicaoElemento: EstudioComposicaoElemento | undefined;
}) {
  const [valorTexto, setValorTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const salvar = useSalvarComposicaoElemento();
  const remover = useRemoverComposicaoElemento();

  const isTexto = area ? isTipoTexto(area.tipo_elemento_permitido) : false;
  const { data: elementosDisponiveis, isLoading: elementosLoading } = useEstudioElementos(
    area && !isTexto ? { tipo: area.tipo_elemento_permitido } : undefined,
  );

  useEffect(() => {
    if (open) {
      setValorTexto(composicaoElemento?.valor_texto ?? "");
      setError(null);
    }
  }, [open, composicaoElemento]);

  if (!area) return null;

  const elementosAtivos = (elementosDisponiveis ?? []).filter((elemento) => elemento.is_active);
  const usarTextarea = area.tipo_elemento_permitido !== "texto_preco";

  async function handleSalvarTexto() {
    if (salvar.isPending || !area) return;
    setError(null);
    if (!valorTexto.trim()) {
      setError("Preencha o texto antes de salvar.");
      return;
    }
    try {
      await salvar.mutateAsync({ composicao_id: composicaoId, area_id: area.id, valor_texto: valorTexto.trim() });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o texto.");
    }
  }

  async function handleSelecionarElemento(elementoId: string) {
    if (salvar.isPending || !area) return;
    setError(null);
    try {
      await salvar.mutateAsync({ composicao_id: composicaoId, area_id: area.id, elemento_id: elementoId });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o elemento.");
    }
  }

  async function handleRemover() {
    if (!composicaoElemento || remover.isPending) return;
    setError(null);
    try {
      await remover.mutateAsync({ id: composicaoElemento.id, composicao_id: composicaoId });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{area.nome}</DialogTitle>
          <DialogDescription>
            {area.obrigatorio ? "Área obrigatória — " : ""}
            {TIPO_ELEMENTO_LABEL[area.tipo_elemento_permitido]}
            {area.notas ? ` — ${area.notas}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {isTexto ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="area-fill-texto">Texto</Label>
              {usarTextarea ? (
                <Textarea
                  id="area-fill-texto"
                  rows={3}
                  value={valorTexto}
                  onChange={(event) => setValorTexto(event.target.value)}
                />
              ) : (
                <Input id="area-fill-texto" value={valorTexto} onChange={(event) => setValorTexto(event.target.value)} />
              )}
            </div>
          ) : elementosLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
            <div className="grid max-h-72 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
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
        </div>

        <DialogFooter className="sm:justify-between">
          {composicaoElemento ? (
            <Button type="button" variant="outline-danger" size="sm" disabled={remover.isPending} onClick={handleRemover}>
              {remover.isPending ? "Removendo…" : "Remover"}
            </Button>
          ) : (
            <span />
          )}
          {isTexto && (
            <Button type="button" disabled={salvar.isPending} onClick={handleSalvarTexto}>
              {salvar.isPending ? "Salvando…" : "Salvar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Fora do corpo do pai: é o passo 3 inteiro, com seu próprio estado de nome e
// mutations — perderia estado de input a cada render do wizard.
function ComposicaoEditor({
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

  const [nome, setNome] = useState("");
  const [nomeCarregado, setNomeCarregado] = useState(false);
  const [areaSelecionada, setAreaSelecionada] = useState<EstudioTemplateArea | null>(null);
  const [nomeError, setNomeError] = useState<string | null>(null);
  const [rascunhoError, setRascunhoError] = useState<string | null>(null);
  const [finalizarError, setFinalizarError] = useState<string | null>(null);

  useEffect(() => {
    if (composicao && !nomeCarregado) {
      setNome(composicao.nome ?? "");
      setNomeCarregado(true);
    }
  }, [composicao, nomeCarregado]);

  const elementoPorAreaId = new Map((composicaoElementos ?? []).map((item) => [item.area_id, item]));

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

  async function handleFinalizar() {
    if (finalizarComposicao.isPending) return;
    setFinalizarError(null);

    const faltando: string[] = [];
    if (!nome.trim()) faltando.push("Nome da peça");
    for (const area of areas ?? []) {
      if (area.obrigatorio && !composicaoElementoPreenchido(elementoPorAreaId.get(area.id))) {
        faltando.push(area.nome);
      }
    }
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

  const statusLabel =
    composicao?.status === "saved" ? "Finalizada" : composicao?.status === "exported" ? "Exportada" : "Rascunho";

  return (
    <section className="flex flex-col gap-6">
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
        <div
          className="relative w-full max-w-xl overflow-hidden rounded-md border border-border bg-muted"
          style={{ aspectRatio: `${template.largura_px} / ${template.altura_px}` }}
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
              onClick={() => setAreaSelecionada(area)}
            />
          ))}
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
      </div>

      <AreaFillDialog
        open={!!areaSelecionada}
        onOpenChange={(open) => {
          if (!open) setAreaSelecionada(null);
        }}
        area={areaSelecionada}
        composicaoId={composicaoId}
        composicaoElemento={areaSelecionada ? elementoPorAreaId.get(areaSelecionada.id) : undefined}
      />
    </section>
  );
}

type WizardStep = "canal" | "template" | "peca";

export default function EstudioColaborador() {
  const [step, setStep] = useState<WizardStep>("canal");
  const [canalEscolhido, setCanalEscolhido] = useState<EstudioCanal | null>(null);
  const [categoriaSelecionadaId, setCategoriaSelecionadaId] = useState("");
  const [templateEscolhido, setTemplateEscolhido] = useState<EstudioTemplateComCategoria | null>(null);
  const [composicaoId, setComposicaoId] = useState<string | null>(null);
  const [pdvSelecionadoId, setPdvSelecionadoId] = useState("");
  const [criarComposicaoError, setCriarComposicaoError] = useState<string | null>(null);

  const { data: categorias } = useEstudioCategorias();
  const { data: templatesTodos } = useEstudioTemplates();
  const { data: pdvs, isLoading: pdvsLoading } = usePdvs();
  const createComposicao = useCreateEstudioComposicao();

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
    setStep("template");
  }

  function handleVoltarParaCanal() {
    setStep("canal");
    setCanalEscolhido(null);
    setCategoriaSelecionadaId("");
  }

  function handleVoltarInicio() {
    setStep("canal");
    setCanalEscolhido(null);
    setCategoriaSelecionadaId("");
    setTemplateEscolhido(null);
    setComposicaoId(null);
    setPdvSelecionadoId("");
    setCriarComposicaoError(null);
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

  async function handleUsarTemplate(template: EstudioTemplateComCategoria) {
    if (meuPdvIdQuery.isLoading || createComposicao.isPending) return;
    setTemplateEscolhido(template);
    setComposicaoId(null);
    setPdvSelecionadoId("");
    setCriarComposicaoError(null);
    setStep("peca");
    if (meuPdvIdQuery.data) {
      await criarComposicao(meuPdvIdQuery.data);
    }
    // se meuPdvIdQuery.data for null (usuário de gestão sem posto fixo), a
    // composição só é criada depois que ele escolher um PDV no passo 3.
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Estúdio de Comunicação</h1>
        <p className="text-muted-foreground">Monte peças de comunicação a partir de templates pré-aprovados.</p>
      </div>

      {step === "canal" && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">1. Escolha o canal</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {CANAL_OPTIONS.map((canal) => (
              <CanalCard
                key={canal}
                canal={canal}
                disponivel={canaisComTemplate.has(canal)}
                onSelecionar={handleSelecionarCanal}
              />
            ))}
          </div>
        </section>
      )}

      {step === "template" && canalEscolhido && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-foreground">2. Escolha o template — {CANAL_LABEL[canalEscolhido]}</h2>
            <Button variant="outline" size="sm" onClick={handleVoltarParaCanal} className="sm:w-auto">
              Voltar
            </Button>
          </div>

          {categoriasDoCanal.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
              <p className="text-muted-foreground">Nenhuma categoria ativa para este canal ainda.</p>
              <Button variant="outline" onClick={handleVoltarParaCanal}>
                Escolher outro canal
              </Button>
            </div>
          ) : (
            <Tabs value={categoriaSelecionadaId} onValueChange={setCategoriaSelecionadaId}>
              <TabsList className="flex h-auto flex-wrap justify-start gap-1">
                {categoriasDoCanal.map((categoria) => (
                  <TabsTrigger key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </TabsTrigger>
                ))}
              </TabsList>
              {categoriasDoCanal.map((categoria) => (
                <TabsContent key={categoria.id} value={categoria.id}>
                  {categoria.id !== categoriaSelecionadaId ? null : templatesLoading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Skeleton className="h-64 w-full" />
                      <Skeleton className="h-64 w-full" />
                      <Skeleton className="h-64 w-full" />
                    </div>
                  ) : templatesAtivos.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
                      <p className="text-muted-foreground">Nenhum template disponível nesta categoria ainda.</p>
                      <Button variant="outline" onClick={handleVoltarParaCanal}>
                        Escolher outro canal
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {templatesAtivos.map((template) => (
                        <TemplateEscolhaCard
                          key={template.id}
                          template={template}
                          disabled={meuPdvIdQuery.isLoading || createComposicao.isPending}
                          onUsar={handleUsarTemplate}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </section>
      )}

      {step === "peca" && templateEscolhido && (
        <>
          {composicaoId ? (
            <ComposicaoEditor
              key={composicaoId}
              composicaoId={composicaoId}
              template={templateEscolhido}
              onVoltarInicio={handleVoltarInicio}
            />
          ) : (
            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-foreground">3. Criando a composição</h2>
                <Button variant="outline" size="sm" onClick={() => setStep("template")} className="sm:w-auto">
                  Voltar
                </Button>
              </div>

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
                  {createComposicao.isPending && <p className="text-sm text-muted-foreground">Criando composição…</p>}
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
            </section>
          )}
        </>
      )}
    </div>
  );
}
