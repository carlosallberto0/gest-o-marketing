import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  useAprovacaoItens,
  useAprovacaoItem,
  useAprovacaoRevisores,
  useAprovacaoDecisoes,
  useCreateAprovacaoItemDraft,
  useUpdateAprovacaoItemDraft,
  useEnviarParaAprovacao,
  type AprovacaoItem,
  type AprovacaoItemStatus,
  type AprovacaoRevisorStatus,
  type AprovacaoDecisaoTipo,
} from "@/hooks/useAprovacoes";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useUploadFoto, useFotoSignedUrl } from "@/hooks/useFoto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const STATUS_LABEL: Record<AprovacaoItemStatus, string> = {
  draft: "Rascunho",
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  revision_requested: "Revisão solicitada",
};

const STATUS_VARIANT: Record<AprovacaoItemStatus, NonNullable<BadgeProps["variant"]>> = {
  draft: "secondary",
  pending: "soft-warning",
  approved: "soft-success",
  rejected: "soft-danger",
  revision_requested: "soft-info",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABEL) as AprovacaoItemStatus[];

const REVISOR_STATUS_LABEL: Record<AprovacaoRevisorStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  revision_requested: "Revisão solicitada",
  expired: "Expirado",
};

const REVISOR_STATUS_VARIANT: Record<AprovacaoRevisorStatus, NonNullable<BadgeProps["variant"]>> = {
  pending: "soft-warning",
  approved: "soft-success",
  rejected: "soft-danger",
  revision_requested: "soft-info",
  expired: "secondary",
};

const DECISAO_LABEL: Record<AprovacaoDecisaoTipo, string> = {
  approved: "Aprovado",
  rejected: "Rejeitado",
  revision_requested: "Revisão solicitada",
};

interface RevisorFormRow {
  key: string;
  modo: "interno" | "externo";
  usuario_id?: string;
  nome: string;
  email: string;
}

// Fora do corpo do painel de detalhe: cada instância assina a própria signed
// URL, mesmo padrão de AvaliacaoFotoThumb em AvaliacoesOutdoorDialog.tsx.
function AprovacaoPreviewThumb({ path }: { path: string }) {
  const { data: url, isLoading } = useFotoSignedUrl("aprovacao-arquivos", path);
  if (isLoading) return <Skeleton className="h-32 w-32 shrink-0 rounded-md" />;
  if (!url) return null;
  return (
    <img
      src={url}
      alt="Pré-visualização do item de aprovação"
      className="h-32 w-32 shrink-0 rounded-md border border-border object-cover"
    />
  );
}

// Também fora do corpo do pai — assina a signed URL do arquivo original,
// exibido como link de download, nunca como <img>.
function AprovacaoArquivoLink({ path }: { path: string }) {
  const { data: url, isLoading } = useFotoSignedUrl("aprovacao-arquivos", path);
  if (isLoading) return <Skeleton className="h-5 w-40" />;
  if (!url) return <span className="text-sm text-muted-foreground">Arquivo indisponível.</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline">
      Baixar arquivo original
    </a>
  );
}

interface NovaSubmissaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createDraft: ReturnType<typeof useCreateAprovacaoItemDraft>;
  onCreated: (item: AprovacaoItem) => void;
}

// Fora do corpo de Aprovacoes: dentro, o formulário perderia estado a cada
// render do componente pai.
function NovaSubmissaoDialog({ open, onOpenChange, createDraft, onCreated }: NovaSubmissaoDialogProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const busy = submitting || createDraft.isPending;

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
      const item = await createDraft.mutateAsync({ titulo: titulo.trim(), descricao: descricao.trim() || undefined });
      setTitulo("");
      setDescricao("");
      onCreated(item);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao criar rascunho de submissão.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova submissão</DialogTitle>
          <DialogDescription>
            Crie o rascunho da submissão. Depois de salvo, anexe o arquivo e defina os revisores.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="submissao-titulo">Título</Label>
            <Input
              id="submissao-titulo"
              required
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="submissao-descricao">Descrição (opcional)</Label>
            <Textarea
              id="submissao-descricao"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Criando…" : "Criar rascunho e continuar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface AprovacaoDetalhePainelProps {
  itemId: string;
  onClose: () => void;
}

// Fora do corpo de Aprovacoes pelo mesmo motivo dos dialogs acima — o painel
// tem estado de formulário próprio (Etapa B) quando o item ainda é rascunho.
function AprovacaoDetalhePainel({ itemId, onClose }: AprovacaoDetalhePainelProps) {
  const { data: item, isLoading: itemLoading } = useAprovacaoItem(itemId);
  const { data: revisores, isLoading: revisoresLoading } = useAprovacaoRevisores(itemId);
  const { data: decisoes, isLoading: decisoesLoading } = useAprovacaoDecisoes(itemId);
  const { data: usuarios = [] } = useUsuarios();
  const usuariosAtivos = usuarios.filter((usuario) => usuario.status === "ativo");

  const uploadArquivo = useUploadFoto("aprovacao-arquivos");
  const uploadPreview = useUploadFoto("aprovacao-arquivos");
  const updateDraft = useUpdateAprovacaoItemDraft();
  const enviarParaAprovacao = useEnviarParaAprovacao();

  const [arquivoUploading, setArquivoUploading] = useState(false);
  const [arquivoError, setArquivoError] = useState<string | null>(null);
  const [previewUploading, setPreviewUploading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [revisoresForm, setRevisoresForm] = useState<RevisorFormRow[]>([]);
  const [envioSubmitting, setEnvioSubmitting] = useState(false);
  const [envioError, setEnvioError] = useState<string | null>(null);

  async function handleArquivoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !item) return;
    setArquivoError(null);
    setArquivoUploading(true);
    try {
      const path = await uploadArquivo.mutateAsync({ entidadeId: item.id, file });
      await updateDraft.mutateAsync({ id: item.id, arquivo_url: path });
    } catch (error) {
      setArquivoError(error instanceof Error ? error.message : "Erro ao enviar arquivo.");
    } finally {
      setArquivoUploading(false);
    }
  }

  async function handlePreviewChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !item) return;
    setPreviewError(null);
    setPreviewUploading(true);
    try {
      const path = await uploadPreview.mutateAsync({ entidadeId: item.id, file });
      await updateDraft.mutateAsync({ id: item.id, preview_url: path });
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Erro ao enviar imagem de pré-visualização.");
    } finally {
      setPreviewUploading(false);
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
    if (envioSubmitting || enviarParaAprovacao.isPending || !item || !podeEnviar) return;

    setEnvioError(null);
    setEnvioSubmitting(true);
    try {
      await enviarParaAprovacao.mutateAsync({
        item_id: item.id,
        revisores: revisoresValidos.map((row) => ({
          usuario_id: row.usuario_id,
          nome: row.nome.trim(),
          email: row.email.trim(),
        })),
      });
      onClose();
    } catch (error) {
      setEnvioError(error instanceof Error ? error.message : "Erro ao enviar para aprovação.");
    } finally {
      setEnvioSubmitting(false);
    }
  }

  if (itemLoading || !item) {
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

  const arquivoBusy = arquivoUploading || uploadArquivo.isPending || updateDraft.isPending;
  const previewBusy = previewUploading || uploadPreview.isPending || updateDraft.isPending;
  const envioBusy = envioSubmitting || enviarParaAprovacao.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{item.titulo}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Criado em {new Date(item.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 p-4">
        {item.descricao && <p className="text-sm text-foreground">{item.descricao}</p>}

        <div className="flex flex-wrap items-start gap-4">
          {item.preview_url && <AprovacaoPreviewThumb path={item.preview_url} />}
          <div className="flex flex-col gap-2">
            {item.arquivo_url ? (
              <AprovacaoArquivoLink path={item.arquivo_url} />
            ) : (
              <span className="text-sm text-muted-foreground">Nenhum arquivo enviado ainda.</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground">Revisores</h3>
          {revisoresLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : revisores && revisores.length > 0 ? (
            <div className="flex flex-col gap-2">
              {revisores.map((revisor) => (
                <div
                  key={revisor.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
                >
                  <span className="font-medium text-foreground">
                    {revisor.nome} <span className="font-normal text-muted-foreground">({revisor.email})</span>
                  </span>
                  <Badge variant={REVISOR_STATUS_VARIANT[revisor.status]}>
                    {REVISOR_STATUS_LABEL[revisor.status]}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum revisor definido ainda.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground">Decisões</h3>
          {decisoesLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : decisoes && decisoes.length > 0 ? (
            <div className="flex flex-col gap-2">
              {decisoes.map((decisao) => (
                <div key={decisao.id} className="rounded-md border border-border p-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{DECISAO_LABEL[decisao.decisao]}</span>
                    <span className="text-muted-foreground">
                      {new Date(decisao.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {decisao.comentario && <p className="mt-1 text-muted-foreground">{decisao.comentario}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma decisão registrada ainda.</p>
          )}
        </div>

        {item.status === "draft" && (
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <h3 className="text-sm font-medium text-foreground">Completar submissão</h3>

            <div className="flex flex-col gap-2">
              <Label htmlFor="submissao-arquivo">Arquivo</Label>
              <Input id="submissao-arquivo" type="file" disabled={arquivoBusy} onChange={handleArquivoChange} />
              {arquivoBusy && <p className="text-sm text-muted-foreground">Enviando arquivo…</p>}
              {arquivoError && (
                <p role="alert" className="text-sm text-destructive">
                  {arquivoError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="submissao-preview">Imagem de pré-visualização (opcional)</Label>
              <Input
                id="submissao-preview"
                type="file"
                accept="image/*"
                disabled={previewBusy}
                onChange={handlePreviewChange}
              />
              {previewBusy && <p className="text-sm text-muted-foreground">Enviando imagem…</p>}
              {previewError && (
                <p role="alert" className="text-sm text-destructive">
                  {previewError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Revisores a adicionar</Label>
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
                <div key={row.key} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-end">
                  {row.modo === "interno" ? (
                    <div className="flex flex-1 flex-col gap-2">
                      <Label htmlFor={`revisor-usuario-${row.key}`}>Usuário interno</Label>
                      <Select value={row.usuario_id} onValueChange={(value) => handleSelectUsuario(row.key, value)}>
                        <SelectTrigger id={`revisor-usuario-${row.key}`}>
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
                        <Label htmlFor={`revisor-nome-${row.key}`}>Nome</Label>
                        <Input
                          id={`revisor-nome-${row.key}`}
                          value={row.nome}
                          onChange={(event) => updateRevisorRow(row.key, { nome: event.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`revisor-email-${row.key}`}>E-mail</Label>
                        <Input
                          id={`revisor-email-${row.key}`}
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
        )}
      </CardContent>
    </Card>
  );
}

export default function Aprovacoes() {
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const { data: itens, isLoading } = useAprovacaoItens(statusFiltro === "todos" ? undefined : statusFiltro);
  const createDraft = useCreateAprovacaoItemDraft();

  const [novaSubmissaoOpen, setNovaSubmissaoOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Centro de Aprovações</h1>
          <p className="text-muted-foreground">Submissões de material para aprovação e acompanhamento de revisão.</p>
        </div>
        <Button onClick={() => setNovaSubmissaoOpen(true)} className="w-full sm:w-auto">
          Nova submissão
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:w-64">
        <Label htmlFor="aprovacoes-filtro-status">Filtrar por status</Label>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger id="aprovacoes-filtro-status">
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

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : itens && itens.length > 0 ? (
              itens.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  aria-selected={selectedId === item.id}
                  className={cn("cursor-pointer", selectedId === item.id && "bg-muted/50")}
                >
                  <TableCell className="font-medium">{item.titulo}</TableCell>
                  <TableCell>{item.tipo ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                  </TableCell>
                  <TableCell>{new Date(item.created_at).toLocaleDateString("pt-BR")}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      {statusFiltro === "todos"
                        ? "Nenhuma submissão registrada ainda."
                        : "Nenhuma submissão com esse status."}
                    </p>
                    <Button size="sm" onClick={() => setNovaSubmissaoOpen(true)}>
                      Nova submissão
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedId && <AprovacaoDetalhePainel itemId={selectedId} onClose={() => setSelectedId(null)} />}

      <NovaSubmissaoDialog
        key={novaSubmissaoOpen ? "open" : "closed"}
        open={novaSubmissaoOpen}
        onOpenChange={setNovaSubmissaoOpen}
        createDraft={createDraft}
        onCreated={(item) => {
          setNovaSubmissaoOpen(false);
          setSelectedId(item.id);
        }}
      />
    </div>
  );
}
