// Tela de gestão de Demandas Criativas — decisão deliberada de escopo: só
// lista (o backlog original cita "kanban OU lista, toggle"; a lista simples
// já satisfaz o requisito mínimo desta rodada). Kanban fica para outra
// rodada, se pedido.
import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  useDemandasCriativas,
  useDemandaCriativa,
  useCreateDemandaCriativa,
  useTransicionarStatusDemandaCriativa,
  useVincularAprovacaoDemanda,
  useDemandaCriativaArquivos,
  useAdicionarArquivoDemanda,
  useDemandaCriativaComentarios,
  useAdicionarComentarioDemanda,
  useDemandaCriativaHistorico,
  type DemandaCriativa,
  type DemandaCriativaStatus,
  type DemandaCriativaPrioridade,
} from "@/hooks/useDemandasCriativas";
import {
  useCreateAprovacaoItemDraft,
  useUpdateAprovacaoItemDraft,
  useEnviarParaAprovacao,
} from "@/hooks/useAprovacoes";
import { usePdvs } from "@/hooks/usePdvs";
import { useUsuarios, type Usuario } from "@/hooks/useUsuarios";
import { useUploadFoto, useFotoSignedUrl } from "@/hooks/useFoto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<DemandaCriativaStatus, string> = {
  solicitada: "Solicitada",
  analise: "Em análise",
  aguardando_info: "Aguardando informação",
  em_criacao: "Em criação",
  revisao_interna: "Revisão interna",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovada: "Aprovada",
  em_producao: "Em produção",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const STATUS_VARIANT: Record<DemandaCriativaStatus, NonNullable<BadgeProps["variant"]>> = {
  solicitada: "soft-info",
  analise: "soft-info",
  aguardando_info: "soft-warning",
  em_criacao: "soft-info",
  revisao_interna: "soft-warning",
  aguardando_aprovacao: "soft-warning",
  aprovada: "soft-success",
  em_producao: "soft-info",
  concluida: "soft-success",
  cancelada: "soft-danger",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABEL) as DemandaCriativaStatus[];
const STATUS_TERMINAL: DemandaCriativaStatus[] = ["concluida", "cancelada"];

const PRIORIDADE_LABEL: Record<DemandaCriativaPrioridade, string> = {
  urgente: "Urgente",
  alta: "Alta",
  normal: "Normal",
  baixa: "Baixa",
};

const PRIORIDADE_VARIANT: Record<DemandaCriativaPrioridade, NonNullable<BadgeProps["variant"]>> = {
  urgente: "soft-danger",
  alta: "soft-warning",
  normal: "outline",
  baixa: "secondary",
};

const PRIORIDADE_OPTIONS = Object.keys(PRIORIDADE_LABEL) as DemandaCriativaPrioridade[];

function isDemandaAtrasada(demanda: DemandaCriativa) {
  if (!demanda.prazo) return false;
  if (STATUS_TERMINAL.includes(demanda.status)) return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return demanda.prazo < hoje;
}

// Sem nome completo cadastrado como parâmetro de tela (não é crítico, o
// pedido permite id truncado) — cruza com useUsuarios() quando o usuário
// ainda está na lista visível para quem está olhando.
function usuarioLabel(usuarios: Usuario[], id: string | null) {
  if (!id) return "—";
  const usuario = usuarios.find((candidate) => candidate.id === id);
  return usuario ? usuario.nome : `${id.slice(0, 8)}…`;
}

// Fora do corpo do painel de detalhe: cada instância assina a própria signed
// URL, mesmo padrão de AprovacaoArquivoLink em Aprovacoes.tsx.
function DemandaArquivoLink({ path, nome }: { path: string; nome: string }) {
  const { data: url, isLoading } = useFotoSignedUrl("demanda-criativa-arquivos", path);
  if (isLoading) return <Skeleton className="h-5 w-40" />;
  if (!url) return <span className="text-sm text-muted-foreground">Arquivo indisponível.</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline">
      Baixar {nome}
    </a>
  );
}

interface NovaDemandaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createDemanda: ReturnType<typeof useCreateDemandaCriativa>;
  onCreated: (demanda: DemandaCriativa) => void;
}

// Fora do corpo de DemandasCriativas: dentro, o formulário perderia estado a
// cada render do componente pai.
function NovaDemandaDialog({ open, onOpenChange, createDemanda, onCreated }: NovaDemandaDialogProps) {
  const { data: pdvs = [] } = usePdvs();
  const pdvsAtivos = pdvs.filter((pdv) => pdv.status === "ativo");

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [pdvId, setPdvId] = useState("interna");
  const [prioridade, setPrioridade] = useState<DemandaCriativaPrioridade>("normal");
  const [prazo, setPrazo] = useState("");
  const [canal, setCanal] = useState("");
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const busy = submitting || createDemanda.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setFormError(null);
    if (!titulo.trim()) {
      setFormError("Título é obrigatório.");
      return;
    }

    setSubmitting(true);
    try {
      const demanda = await createDemanda.mutateAsync({
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        pdv_solicitante_id: pdvId === "interna" ? undefined : pdvId,
        prioridade,
        prazo: prazo || undefined,
        canal: canal.trim() || undefined,
        brief: brief.trim() || undefined,
      });
      setTitulo("");
      setDescricao("");
      setPdvId("interna");
      setPrioridade("normal");
      setPrazo("");
      setCanal("");
      setBrief("");
      onCreated(demanda);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao criar demanda criativa.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova demanda</DialogTitle>
          <DialogDescription>Registre uma nova demanda para o time criativo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="demanda-titulo">Título</Label>
            <Input id="demanda-titulo" required value={titulo} onChange={(event) => setTitulo(event.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="demanda-descricao">Descrição (opcional)</Label>
            <Textarea
              id="demanda-descricao"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="demanda-pdv">Origem</Label>
            <Select value={pdvId} onValueChange={setPdvId}>
              <SelectTrigger id="demanda-pdv">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interna">Demanda interna</SelectItem>
                {pdvsAtivos.map((pdv) => (
                  <SelectItem key={pdv.id} value={pdv.id}>
                    {pdv.codigo} — {pdv.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="demanda-prioridade">Prioridade</Label>
              <Select
                value={prioridade}
                onValueChange={(value) => setPrioridade(value as DemandaCriativaPrioridade)}
              >
                <SelectTrigger id="demanda-prioridade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADE_OPTIONS.map((valor) => (
                    <SelectItem key={valor} value={valor}>
                      {PRIORIDADE_LABEL[valor]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="demanda-prazo">Prazo (opcional)</Label>
              <Input id="demanda-prazo" type="date" value={prazo} onChange={(event) => setPrazo(event.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="demanda-canal">Canal (opcional)</Label>
            <Input
              id="demanda-canal"
              placeholder="Ex.: Instagram, ponto de venda…"
              value={canal}
              onChange={(event) => setCanal(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="demanda-brief">Brief (opcional)</Label>
            <Textarea id="demanda-brief" value={brief} onChange={(event) => setBrief(event.target.value)} />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Criando…" : "Criar demanda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface RevisorFormRow {
  key: string;
  modo: "interno" | "externo";
  usuario_id?: string;
  nome: string;
  email: string;
}

interface DemandaDetalhePainelProps {
  demandaId: string;
  onClose: () => void;
}

// Fora do corpo de DemandasCriativas pelo mesmo motivo dos dialogs acima — o
// painel tem formulários próprios (comentário, upload, envio para aprovação).
function DemandaDetalhePainel({ demandaId, onClose }: DemandaDetalhePainelProps) {
  const { data: demanda, isLoading: demandaLoading } = useDemandaCriativa(demandaId);
  const { data: arquivos, isLoading: arquivosLoading } = useDemandaCriativaArquivos(demandaId);
  const { data: comentarios, isLoading: comentariosLoading } = useDemandaCriativaComentarios(demandaId);
  const { data: historico, isLoading: historicoLoading } = useDemandaCriativaHistorico(demandaId);
  const { data: usuarios = [] } = useUsuarios();
  const { data: pdvs = [] } = usePdvs();
  const usuariosAtivos = usuarios.filter((usuario) => usuario.status === "ativo");

  const transicionarStatus = useTransicionarStatusDemandaCriativa();
  const adicionarComentario = useAdicionarComentarioDemanda();
  const uploadArquivo = useUploadFoto("demanda-criativa-arquivos");
  const adicionarArquivo = useAdicionarArquivoDemanda();
  const createAprovacaoDraft = useCreateAprovacaoItemDraft();
  const updateAprovacaoDraft = useUpdateAprovacaoItemDraft();
  const uploadAprovacaoArquivo = useUploadFoto("aprovacao-arquivos");
  const enviarParaAprovacao = useEnviarParaAprovacao();
  const vincularAprovacao = useVincularAprovacaoDemanda();

  const [novoStatus, setNovoStatus] = useState<DemandaCriativaStatus>(demanda?.status ?? "solicitada");
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [comentarioTexto, setComentarioTexto] = useState("");
  const [comentarioSubmitting, setComentarioSubmitting] = useState(false);
  const [comentarioError, setComentarioError] = useState<string | null>(null);

  const [arquivoFinal, setArquivoFinal] = useState(false);
  const [arquivoUploading, setArquivoUploading] = useState(false);
  const [arquivoError, setArquivoError] = useState<string | null>(null);

  const [aprovacaoItemId, setAprovacaoItemId] = useState<string | null>(null);
  const [abrindoEnvio, setAbrindoEnvio] = useState(false);
  const [abrirEnvioError, setAbrirEnvioError] = useState<string | null>(null);
  const [envioArquivoUploading, setEnvioArquivoUploading] = useState(false);
  const [envioArquivoError, setEnvioArquivoError] = useState<string | null>(null);
  const [envioArquivoEnviado, setEnvioArquivoEnviado] = useState(false);
  const [revisoresForm, setRevisoresForm] = useState<RevisorFormRow[]>([]);
  const [envioSubmitting, setEnvioSubmitting] = useState(false);
  const [envioError, setEnvioError] = useState<string | null>(null);
  // true quando useEnviarParaAprovacao já teve sucesso (item criado, revisores
  // notificados) mas o vínculo com a demanda ou a transição de status falhou
  // depois — reenviar do zero duplicaria o item de aprovação, então o form de
  // revisores fica escondido e só a retentativa de vínculo fica disponível.
  const [envioFalhaParcial, setEnvioFalhaParcial] = useState(false);

  async function handleMudarStatus() {
    if (statusSubmitting || transicionarStatus.isPending || !demanda) return;
    setStatusError(null);
    setStatusSubmitting(true);
    try {
      await transicionarStatus.mutateAsync({ id: demanda.id, status: novoStatus });
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Erro ao mudar status da demanda.");
    } finally {
      setStatusSubmitting(false);
    }
  }

  async function handleComentar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (comentarioSubmitting || adicionarComentario.isPending || !demanda) return;
    if (!comentarioTexto.trim()) return;

    setComentarioError(null);
    setComentarioSubmitting(true);
    try {
      await adicionarComentario.mutateAsync({ demanda_id: demanda.id, conteudo: comentarioTexto.trim() });
      setComentarioTexto("");
    } catch (error) {
      setComentarioError(error instanceof Error ? error.message : "Erro ao adicionar comentário.");
    } finally {
      setComentarioSubmitting(false);
    }
  }

  async function handleArquivoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !demanda) return;

    setArquivoError(null);
    setArquivoUploading(true);
    try {
      const path = await uploadArquivo.mutateAsync({ entidadeId: demanda.id, file });
      const versaoAtual = arquivos && arquivos.length > 0 ? Math.max(...arquivos.map((item) => item.versao)) : 0;
      await adicionarArquivo.mutateAsync({
        demanda_id: demanda.id,
        arquivo_url: path,
        nome_arquivo: file.name,
        tamanho_bytes: file.size,
        versao: versaoAtual + 1,
        arquivo_final: arquivoFinal,
      });
      setArquivoFinal(false);
      event.target.value = "";
    } catch (error) {
      setArquivoError(error instanceof Error ? error.message : "Erro ao enviar arquivo.");
    } finally {
      setArquivoUploading(false);
    }
  }

  // Cria o rascunho em aprovacao_itens assim que o formulário de envio abre —
  // título/descrição já são conhecidos (vêm da demanda), sem etapa extra de
  // digitação.
  async function handleAbrirEnvio() {
    if (abrindoEnvio || createAprovacaoDraft.isPending || !demanda) return;
    setAbrirEnvioError(null);
    setAbrindoEnvio(true);
    try {
      const item = await createAprovacaoDraft.mutateAsync({
        titulo: demanda.titulo,
        descricao: demanda.descricao ?? undefined,
      });
      setAprovacaoItemId(item.id);
    } catch (error) {
      setAbrirEnvioError(error instanceof Error ? error.message : "Erro ao criar rascunho de aprovação.");
    } finally {
      setAbrindoEnvio(false);
    }
  }

  // Simplificação deliberada desta rodada: sobe um arquivo novo direto pro
  // bucket aprovacao-arquivos — não copia o arquivo já existente em
  // demanda-criativa-arquivos (cópia cross-bucket fica fora de escopo aqui).
  async function handleEnvioArquivoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !aprovacaoItemId) return;

    setEnvioArquivoError(null);
    setEnvioArquivoUploading(true);
    try {
      const path = await uploadAprovacaoArquivo.mutateAsync({ entidadeId: aprovacaoItemId, file });
      await updateAprovacaoDraft.mutateAsync({ id: aprovacaoItemId, arquivo_url: path });
      setEnvioArquivoEnviado(true);
    } catch (error) {
      setEnvioArquivoError(error instanceof Error ? error.message : "Erro ao enviar arquivo de aprovação.");
    } finally {
      setEnvioArquivoUploading(false);
    }
  }

  function addRevisorInterno() {
    setRevisoresForm((rows) => [...rows, { key: crypto.randomUUID(), modo: "interno", nome: "", email: "" }]);
  }

  function addRevisorExterno() {
    setRevisoresForm((rows) => [...rows, { key: crypto.randomUUID(), modo: "externo", nome: "", email: "" }]);
  }

  function removeRevisor(key: string) {
    setRevisoresForm((rows) => rows.filter((row) => row.key !== key));
  }

  function updateRevisorRow(key: string, patch: Partial<RevisorFormRow>) {
    setRevisoresForm((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function handleSelectUsuario(key: string, usuarioId: string) {
    const usuario = usuariosAtivos.find((candidate) => candidate.id === usuarioId);
    if (!usuario) return;
    updateRevisorRow(key, { usuario_id: usuario.id, nome: usuario.nome, email: usuario.email });
  }

  const revisoresValidos = revisoresForm.filter((row) => row.nome.trim() && row.email.trim());
  const podeEnviar = revisoresValidos.length > 0;

  async function handleEnviar() {
    if (envioSubmitting || enviarParaAprovacao.isPending || !demanda || !aprovacaoItemId || !podeEnviar) return;

    setEnvioError(null);
    setEnvioSubmitting(true);

    // Etapa 1, isolada: se ela falhar, nada irreversível aconteceu ainda —
    // pode usar a mensagem genérica e deixar o usuário tentar de novo.
    try {
      await enviarParaAprovacao.mutateAsync({
        item_id: aprovacaoItemId,
        revisores: revisoresValidos.map((row) => ({
          usuario_id: row.usuario_id,
          nome: row.nome.trim(),
          email: row.email.trim(),
        })),
      });
    } catch (error) {
      setEnvioError(error instanceof Error ? error.message : "Erro ao enviar para aprovação executiva.");
      setEnvioSubmitting(false);
      return;
    }

    // A partir daqui o item de aprovação já existe e os revisores já foram
    // notificados — se vincular ou transicionar falhar agora, NÃO pode cair
    // na mensagem genérica: um reenvio do usuário chamaria
    // useEnviarParaAprovacao de novo e duplicaria o item.
    try {
      await vincularAprovacao.mutateAsync({ id: demanda.id, aprovacao_item_id: aprovacaoItemId });
      await transicionarStatus.mutateAsync({ id: demanda.id, status: "aguardando_aprovacao" });
      setAprovacaoItemId(null);
      setRevisoresForm([]);
      setEnvioArquivoEnviado(false);
    } catch (error) {
      setEnvioFalhaParcial(true);
      const detalhe = error instanceof Error ? ` (${error.message})` : "";
      setEnvioError(
        `O item foi enviado para aprovação com sucesso, mas houve um erro ao vincular à demanda${detalhe}. ` +
          `Não envie novamente — isso criaria um segundo item de aprovação duplicado. ` +
          `Use "Tentar vincular novamente" ou contate o suporte.`,
      );
    } finally {
      setEnvioSubmitting(false);
    }
  }

  // Chamada isolada de vincularAprovacao + transicionarStatus para o caso de
  // falha parcial acima — não repete useEnviarParaAprovacao, que já teve
  // sucesso e não pode ser chamado de novo sem duplicar o item.
  async function handleRetentarVinculo() {
    if (envioSubmitting || vincularAprovacao.isPending || transicionarStatus.isPending || !demanda || !aprovacaoItemId) {
      return;
    }

    setEnvioError(null);
    setEnvioSubmitting(true);
    try {
      await vincularAprovacao.mutateAsync({ id: demanda.id, aprovacao_item_id: aprovacaoItemId });
      await transicionarStatus.mutateAsync({ id: demanda.id, status: "aguardando_aprovacao" });
      setEnvioFalhaParcial(false);
      setAprovacaoItemId(null);
      setRevisoresForm([]);
      setEnvioArquivoEnviado(false);
    } catch (error) {
      const detalhe = error instanceof Error ? ` (${error.message})` : "";
      setEnvioError(
        `Ainda não foi possível vincular o item já enviado à demanda${detalhe}. ` +
          `O item de aprovação já existe — não envie novamente, tente vincular de novo ou contate o suporte.`,
      );
    } finally {
      setEnvioSubmitting(false);
    }
  }

  if (demandaLoading || !demanda) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  const pdv = demanda.pdv_solicitante_id ? pdvs.find((candidate) => candidate.id === demanda.pdv_solicitante_id) : null;
  const statusBusy = statusSubmitting || transicionarStatus.isPending;
  const comentarioBusy = comentarioSubmitting || adicionarComentario.isPending;
  const arquivoBusy = arquivoUploading || uploadArquivo.isPending || adicionarArquivo.isPending;
  const envioArquivoBusy = envioArquivoUploading || uploadAprovacaoArquivo.isPending || updateAprovacaoDraft.isPending;
  const envioBusy = envioSubmitting || enviarParaAprovacao.isPending || vincularAprovacao.isPending || transicionarStatus.isPending;

  const mostraBotaoEnviar = demanda.status === "revisao_interna" && !demanda.aprovacao_item_id;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{demanda.titulo}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Criada em {new Date(demanda.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[demanda.status]}>{STATUS_LABEL[demanda.status]}</Badge>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 p-4">
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="font-medium text-foreground">Prioridade: </span>
            <Badge variant={PRIORIDADE_VARIANT[demanda.prioridade]}>{PRIORIDADE_LABEL[demanda.prioridade]}</Badge>
          </div>
          <div>
            <span className="font-medium text-foreground">Origem: </span>
            <span className="text-muted-foreground">{pdv ? `${pdv.codigo} — ${pdv.nome}` : "Demanda interna"}</span>
          </div>
          <div>
            <span className="font-medium text-foreground">Prazo: </span>
            <span className={cn("text-muted-foreground", isDemandaAtrasada(demanda) && "font-medium text-destructive")}>
              {demanda.prazo ? new Date(demanda.prazo).toLocaleDateString("pt-BR") : "—"}
            </span>
          </div>
          <div>
            <span className="font-medium text-foreground">Canal: </span>
            <span className="text-muted-foreground">{demanda.canal ?? "—"}</span>
          </div>
        </div>

        {demanda.descricao && (
          <div>
            <h3 className="text-sm font-medium text-foreground">Descrição</h3>
            <p className="text-sm text-muted-foreground">{demanda.descricao}</p>
          </div>
        )}

        {demanda.brief && (
          <div>
            <h3 className="text-sm font-medium text-foreground">Brief</h3>
            <p className="text-sm text-muted-foreground">{demanda.brief}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end sm:gap-4">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="demanda-novo-status">Mudar status</Label>
            <Select value={novoStatus} onValueChange={(value) => setNovoStatus(value as DemandaCriativaStatus)}>
              <SelectTrigger id="demanda-novo-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {STATUS_LABEL[valor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" disabled={statusBusy} onClick={handleMudarStatus}>
            {statusBusy ? "Confirmando…" : "Confirmar"}
          </Button>
        </div>
        {statusError && (
          <p role="alert" className="text-sm text-destructive">
            {statusError}
          </p>
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground">Aprovação executiva</h3>
          {demanda.aprovacao_item_id ? (
            <p className="text-sm text-muted-foreground">Já enviada para Aprovações Executivas.</p>
          ) : mostraBotaoEnviar ? (
            aprovacaoItemId ? (
              envioFalhaParcial ? (
                <div className="flex flex-col gap-3 rounded-md border border-destructive p-3">
                  {envioError && (
                    <p role="alert" className="text-sm text-destructive">
                      {envioError}
                    </p>
                  )}
                  <Button
                    type="button"
                    disabled={envioBusy}
                    onClick={handleRetentarVinculo}
                    className="w-full sm:w-auto sm:self-end"
                  >
                    {envioBusy ? "Tentando vincular…" : "Tentar vincular novamente"}
                  </Button>
                </div>
              ) : (
              <div className="flex flex-col gap-4 rounded-md border border-border p-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="envio-arquivo">Arquivo para aprovação (opcional)</Label>
                  <Input
                    id="envio-arquivo"
                    type="file"
                    disabled={envioArquivoBusy}
                    onChange={handleEnvioArquivoChange}
                  />
                  {envioArquivoBusy && <p className="text-sm text-muted-foreground">Enviando arquivo…</p>}
                  {envioArquivoEnviado && !envioArquivoBusy && (
                    <p className="text-sm text-muted-foreground">Arquivo enviado.</p>
                  )}
                  {envioArquivoError && (
                    <p role="alert" className="text-sm text-destructive">
                      {envioArquivoError}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Revisores</Label>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={addRevisorInterno}>
                        + Revisor interno
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={addRevisorExterno}>
                        + Revisor externo
                      </Button>
                    </div>
                  </div>

                  {revisoresForm.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Adicione ao menos um revisor para poder enviar para aprovação.
                    </p>
                  )}

                  {revisoresForm.map((row) => (
                    <div
                      key={row.key}
                      className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-end"
                    >
                      {row.modo === "interno" ? (
                        <div className="flex flex-1 flex-col gap-2">
                          <Label htmlFor={`envio-revisor-usuario-${row.key}`}>Usuário interno</Label>
                          <Select
                            value={row.usuario_id}
                            onValueChange={(value) => handleSelectUsuario(row.key, value)}
                          >
                            <SelectTrigger id={`envio-revisor-usuario-${row.key}`}>
                              <SelectValue placeholder="Selecione o usuário" />
                            </SelectTrigger>
                            <SelectContent>
                              {usuariosAtivos.map((usuario) => (
                                <SelectItem key={usuario.id} value={usuario.id}>
                                  {usuario.nome} — {usuario.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor={`envio-revisor-nome-${row.key}`}>Nome</Label>
                            <Input
                              id={`envio-revisor-nome-${row.key}`}
                              value={row.nome}
                              onChange={(event) => updateRevisorRow(row.key, { nome: event.target.value })}
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor={`envio-revisor-email-${row.key}`}>E-mail</Label>
                            <Input
                              id={`envio-revisor-email-${row.key}`}
                              type="email"
                              value={row.email}
                              onChange={(event) => updateRevisorRow(row.key, { email: event.target.value })}
                            />
                          </div>
                        </div>
                      )}
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeRevisor(row.key)}>
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>

                {envioError && (
                  <p role="alert" className="text-sm text-destructive">
                    {envioError}
                  </p>
                )}

                <Button
                  type="button"
                  disabled={!podeEnviar || envioBusy}
                  onClick={handleEnviar}
                  className="w-full sm:w-auto sm:self-end"
                >
                  {envioBusy ? "Enviando…" : "Enviar para aprovação"}
                </Button>
              </div>
              )
            ) : (
              <div className="flex flex-col gap-2">
                <Button type="button" disabled={abrindoEnvio} onClick={handleAbrirEnvio} className="w-full sm:w-auto">
                  {abrindoEnvio ? "Preparando…" : "Enviar para Aprovação Executiva"}
                </Button>
                {abrirEnvioError && (
                  <p role="alert" className="text-sm text-destructive">
                    {abrirEnvioError}
                  </p>
                )}
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              Disponível quando a demanda estiver em "Revisão interna".
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground">Arquivos</h3>
          {arquivosLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : arquivos && arquivos.length > 0 ? (
            <div className="flex flex-col gap-2">
              {arquivos.map((arquivo) => (
                <div
                  key={arquivo.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <DemandaArquivoLink path={arquivo.arquivo_url} nome={arquivo.nome_arquivo} />
                    <span className="text-muted-foreground">v{arquivo.versao}</span>
                    {arquivo.arquivo_final && <Badge variant="soft-success">Final</Badge>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum arquivo enviado ainda.</p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="demanda-arquivo">Novo arquivo</Label>
              <Input id="demanda-arquivo" type="file" disabled={arquivoBusy} onChange={handleArquivoChange} />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id="demanda-arquivo-final"
                checked={arquivoFinal}
                disabled={arquivoBusy}
                onCheckedChange={(checked) => setArquivoFinal(checked === true)}
              />
              <Label htmlFor="demanda-arquivo-final" className="cursor-pointer font-normal">
                Marcar como versão final
              </Label>
            </div>
          </div>
          {arquivoBusy && <p className="text-sm text-muted-foreground">Enviando arquivo…</p>}
          {arquivoError && (
            <p role="alert" className="text-sm text-destructive">
              {arquivoError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground">Comentários</h3>
          {comentariosLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : comentarios && comentarios.length > 0 ? (
            <div className="flex flex-col gap-2">
              {comentarios.map((comentario) => (
                <div key={comentario.id} className="rounded-md border border-border p-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{usuarioLabel(usuarios, comentario.autor_id)}</span>
                    <span className="text-muted-foreground">
                      {new Date(comentario.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{comentario.conteudo}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
          )}

          <form onSubmit={handleComentar} className="flex flex-col gap-2" noValidate>
            <Label htmlFor="demanda-comentario">Novo comentário</Label>
            <Textarea
              id="demanda-comentario"
              value={comentarioTexto}
              onChange={(event) => setComentarioTexto(event.target.value)}
            />
            {comentarioError && (
              <p role="alert" className="text-sm text-destructive">
                {comentarioError}
              </p>
            )}
            <Button type="submit" disabled={comentarioBusy || !comentarioTexto.trim()} className="w-full sm:w-auto sm:self-end">
              {comentarioBusy ? "Enviando…" : "Comentar"}
            </Button>
          </form>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground">Histórico</h3>
          {historicoLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : historico && historico.length > 0 ? (
            <ol className="flex flex-col gap-2 border-l border-border pl-4">
              {historico.map((item) => (
                <li key={item.id} className="text-sm">
                  <span className="font-medium text-foreground">
                    {item.status_antigo ? STATUS_LABEL[item.status_antigo] : "Criada"} → {STATUS_LABEL[item.status_novo]}
                  </span>
                  <div className="text-muted-foreground">
                    {new Date(item.created_at).toLocaleString("pt-BR")} — {usuarioLabel(usuarios, item.alterado_por)}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Sem histórico registrado ainda.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DemandasCriativas() {
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<string>("todas");
  const { data: demandas, isLoading } = useDemandasCriativas({
    status: statusFiltro === "todos" ? undefined : statusFiltro,
    prioridade: prioridadeFiltro === "todas" ? undefined : prioridadeFiltro,
  });
  const createDemanda = useCreateDemandaCriativa();

  const [novaDemandaOpen, setNovaDemandaOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Demandas Criativas</h1>
          <p className="text-muted-foreground">Solicitações de peças e materiais para o time criativo.</p>
        </div>
        <Button onClick={() => setNovaDemandaOpen(true)} className="w-full sm:w-auto">
          Nova demanda
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-col gap-2 sm:w-64">
          <Label htmlFor="demandas-filtro-status">Filtrar por status</Label>
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger id="demandas-filtro-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {STATUS_OPTIONS.map((valor) => (
                <SelectItem key={valor} value={valor}>
                  {STATUS_LABEL[valor]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 sm:w-64">
          <Label htmlFor="demandas-filtro-prioridade">Filtrar por prioridade</Label>
          <Select value={prioridadeFiltro} onValueChange={setPrioridadeFiltro}>
            <SelectTrigger id="demandas-filtro-prioridade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {PRIORIDADE_OPTIONS.map((valor) => (
                <SelectItem key={valor} value={valor}>
                  {PRIORIDADE_LABEL[valor]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Criada em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : demandas && demandas.length > 0 ? (
              demandas.map((demanda) => (
                <TableRow
                  key={demanda.id}
                  onClick={() => setSelectedId(demanda.id)}
                  aria-selected={selectedId === demanda.id}
                  className={cn("cursor-pointer", selectedId === demanda.id && "bg-muted/50")}
                >
                  <TableCell className="font-medium">{demanda.titulo}</TableCell>
                  <TableCell>
                    <Badge variant={PRIORIDADE_VARIANT[demanda.prioridade]}>
                      {PRIORIDADE_LABEL[demanda.prioridade]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[demanda.status]}>{STATUS_LABEL[demanda.status]}</Badge>
                  </TableCell>
                  <TableCell className={cn(isDemandaAtrasada(demanda) && "font-medium text-destructive")}>
                    {demanda.prazo ? new Date(demanda.prazo).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell>{new Date(demanda.created_at).toLocaleDateString("pt-BR")}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      {statusFiltro === "todos" && prioridadeFiltro === "todas"
                        ? "Nenhuma demanda criativa registrada ainda."
                        : "Nenhuma demanda com esses filtros."}
                    </p>
                    <Button size="sm" onClick={() => setNovaDemandaOpen(true)}>
                      Nova demanda
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedId && <DemandaDetalhePainel demandaId={selectedId} onClose={() => setSelectedId(null)} />}

      <NovaDemandaDialog
        key={novaDemandaOpen ? "open" : "closed"}
        open={novaDemandaOpen}
        onOpenChange={setNovaDemandaOpen}
        createDemanda={createDemanda}
        onCreated={(demanda) => {
          setNovaDemandaOpen(false);
          setSelectedId(demanda.id);
        }}
      />
    </div>
  );
}
