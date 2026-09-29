import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  useAvaliacaoPdv,
  useAvaliacoesPdv,
  useConcluirAvaliacaoPdv,
  useCreateAvaliacaoPdv,
  type AvaliacaoPdv,
} from "@/hooks/useAvaliacoesPdv";
import { useCategoriasChecklist, type CategoriaChecklist } from "@/hooks/useCategoriasChecklist";
import { usePerguntasChecklist, type PerguntaChecklist } from "@/hooks/usePerguntasChecklist";
import {
  useRespostasChecklist,
  useSalvarRespostaChecklist,
  type RespostaChecklist,
} from "@/hooks/useRespostasChecklist";
import { usePdvs } from "@/hooks/usePdvs";
import { useMateriais, type Material } from "@/hooks/useMateriais";
import { useFotoSignedUrl, useUploadFoto } from "@/hooks/useFoto";
import { useCreatePlanoAcao } from "@/hooks/usePlanosAcao";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { cn } from "@/lib/utils";

const VALOR_LABEL: Record<RespostaChecklist["valor"], string> = {
  sim: "Sim",
  nao: "Não",
  na: "N/A",
};

const VALOR_VARIANT: Record<RespostaChecklist["valor"], NonNullable<BadgeProps["variant"]>> = {
  sim: "soft-success",
  nao: "soft-danger",
  na: "outline",
};

function formatPercentual(valor: number | null) {
  return valor != null ? `${Math.round(valor)}%` : "—";
}

// Fora do corpo do pai: cada instância assina a signed URL do seu próprio
// path, nunca dentro de um .map() do componente pai (mesmo padrão de
// AvaliacoesOutdoorDialog).
function AvaliacaoFotoThumb({ path }: { path: string }) {
  const { data: url, isLoading } = useFotoSignedUrl("avaliacao-pdv-fotos", path);
  if (isLoading) return <Skeleton className="h-16 w-16 shrink-0 rounded-md" />;
  if (!url) return null;
  return (
    <img
      src={url}
      alt="Foto anexada à resposta do checklist"
      className="h-16 w-16 shrink-0 rounded-md border border-border object-cover"
    />
  );
}

// Fora do corpo do pai: definido dentro, o input de comentário/valor perderia
// estado a cada render de AvaliacoesPdv (ex.: refetch de outra pergunta).
function PerguntaChecklistItem({
  avaliacaoId,
  pergunta,
  resposta,
  materiais,
}: {
  avaliacaoId: string;
  pergunta: PerguntaChecklist;
  resposta: RespostaChecklist | undefined;
  materiais: Material[];
}) {
  const [valor, setValor] = useState<RespostaChecklist["valor"] | "">(resposta?.valor ?? "");
  const [comentario, setComentario] = useState(resposta?.comentario ?? "");
  const [materialId, setMaterialId] = useState(resposta?.material_id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  const salvarResposta = useSalvarRespostaChecklist();
  const uploadFoto = useUploadFoto("avaliacao-pdv-fotos");

  const busy = salvarResposta.isPending || uploadFoto.isPending;
  const respondida = !!resposta;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  async function handleSalvar() {
    if (busy) return;
    setFormError(null);

    if (!valor) {
      setFormError("Selecione uma resposta.");
      return;
    }
    if (pergunta.exige_comentario && !comentario.trim()) {
      setFormError("Comentário obrigatório para esta pergunta.");
      return;
    }
    if (pergunta.exige_material && !materialId) {
      setFormError("Selecione o material para esta pergunta.");
      return;
    }

    try {
      let foto_url = resposta?.foto_url ?? null;
      if (file) {
        foto_url = await uploadFoto.mutateAsync({ entidadeId: avaliacaoId, file });
      }
      await salvarResposta.mutateAsync({
        avaliacao_id: avaliacaoId,
        pergunta_id: pergunta.id,
        valor,
        comentario: pergunta.exige_comentario ? comentario.trim() : null,
        foto_url,
        material_id: pergunta.exige_material ? materialId : null,
      });
      setFile(null);
      setFileInputKey((key) => key + 1);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao salvar resposta.");
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border p-3",
        respondida ? "border-border" : "border-dashed border-muted-foreground/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{pergunta.texto}</p>
            {pergunta.is_critica && <Badge variant="soft-danger">Crítica</Badge>}
          </div>
          {pergunta.dica && <p className="text-sm text-muted-foreground">{pergunta.dica}</p>}
        </div>
        <Badge variant={respondida ? "soft-success" : "outline"}>{respondida ? "Respondida" : "Pendente"}</Badge>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">Resposta</legend>
        <RadioGroup
          value={valor || undefined}
          onValueChange={(value) => setValor(value as RespostaChecklist["valor"])}
          className="flex flex-row flex-wrap gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="sim" id={`pergunta-${pergunta.id}-sim`} />
            <Label htmlFor={`pergunta-${pergunta.id}-sim`}>Sim</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="nao" id={`pergunta-${pergunta.id}-nao`} />
            <Label htmlFor={`pergunta-${pergunta.id}-nao`}>Não</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="na" id={`pergunta-${pergunta.id}-na`} />
            <Label htmlFor={`pergunta-${pergunta.id}-na`}>N/A</Label>
          </div>
        </RadioGroup>
      </fieldset>

      {pergunta.exige_comentario && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`pergunta-${pergunta.id}-comentario`}>Comentário</Label>
          <Textarea
            id={`pergunta-${pergunta.id}-comentario`}
            value={comentario}
            onChange={(event) => setComentario(event.target.value)}
          />
        </div>
      )}

      {pergunta.exige_material && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`pergunta-${pergunta.id}-material`}>Material</Label>
          <Select value={materialId} onValueChange={setMaterialId}>
            <SelectTrigger id={`pergunta-${pergunta.id}-material`}>
              <SelectValue placeholder="Selecione o material" />
            </SelectTrigger>
            <SelectContent>
              {materiais.map((material) => (
                <SelectItem key={material.id} value={material.id}>
                  {material.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {pergunta.exige_foto && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`pergunta-${pergunta.id}-foto`}>Foto</Label>
          {resposta?.foto_url && <AvaliacaoFotoThumb path={resposta.foto_url} />}
          <Input
            key={fileInputKey}
            id={`pergunta-${pergunta.id}-foto`}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
      )}

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={handleSalvar} className="self-start">
        {busy ? "Salvando…" : "Salvar resposta"}
      </Button>
    </div>
  );
}

// Fora do corpo do pai pelo mesmo motivo: chama usePerguntasChecklist da sua
// própria categoria, isolado por instância.
function CategoriaSecao({
  avaliacaoId,
  categoria,
  respostas,
  materiais,
}: {
  avaliacaoId: string;
  categoria: CategoriaChecklist;
  respostas: RespostaChecklist[];
  materiais: Material[];
}) {
  const { data: perguntas, isLoading } = usePerguntasChecklist(categoria.id);
  const perguntasAtivas = (perguntas ?? []).filter((pergunta) => pergunta.is_active);
  const respostaPorPergunta = new Map(respostas.map((resposta) => [resposta.pergunta_id, resposta]));

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-foreground">{categoria.nome}</h3>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : perguntasAtivas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma pergunta cadastrada nesta categoria.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {perguntasAtivas.map((pergunta) => (
            <PerguntaChecklistItem
              key={pergunta.id}
              avaliacaoId={avaliacaoId}
              pergunta={pergunta}
              resposta={respostaPorPergunta.get(pergunta.id)}
              materiais={materiais}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// Fora do corpo do pai: contém o botão "Concluir avaliação" com estado de
// loading próprio, redefinir a cada render do pai o desmontaria.
function AvaliacaoFormulario({
  avaliacao,
  categorias,
  categoriasLoading,
  materiais,
}: {
  avaliacao: AvaliacaoPdv;
  categorias: CategoriaChecklist[];
  categoriasLoading: boolean;
  materiais: Material[];
}) {
  const { data: respostas } = useRespostasChecklist(avaliacao.id);
  const concluirAvaliacao = useConcluirAvaliacaoPdv();
  const [concluirError, setConcluirError] = useState<string | null>(null);

  async function handleConcluir() {
    if (concluirAvaliacao.isPending) return;
    setConcluirError(null);
    try {
      await concluirAvaliacao.mutateAsync({ id: avaliacao.id });
    } catch (error) {
      setConcluirError(error instanceof Error ? error.message : "Erro ao concluir avaliação.");
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-foreground">Preenchimento do checklist</h2>
        <Button type="button" disabled={concluirAvaliacao.isPending} onClick={handleConcluir}>
          {concluirAvaliacao.isPending ? "Concluindo…" : "Concluir avaliação"}
        </Button>
      </div>

      {concluirError && (
        <p role="alert" className="text-sm text-destructive">
          {concluirError}
        </p>
      )}

      {categoriasLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : categorias.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma categoria de checklist cadastrada ainda.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {categorias.map((categoria) => (
            <CategoriaSecao
              key={categoria.id}
              avaliacaoId={avaliacao.id}
              categoria={categoria}
              respostas={respostas ?? []}
              materiais={materiais}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// Fora do corpo do pai: cada instância tem seu próprio dialog e estado de
// formulário, um por resposta "não" — dentro do .map() do pai perderia
// estado a cada render (mesmo motivo de PerguntaChecklistItem).
function CriarPlanoAcaoButton({ respostaId }: { respostaId: string }) {
  const [open, setOpen] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const createPlanoAcao = useCreatePlanoAcao();
  const busy = submitting || createPlanoAcao.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setFormError(null);

    if (!descricao.trim()) {
      setFormError("Descrição é obrigatória.");
      return;
    }
    if (!prazo) {
      setFormError("Prazo é obrigatório.");
      return;
    }

    setSubmitting(true);
    try {
      await createPlanoAcao.mutateAsync({ resposta_id: respostaId, descricao: descricao.trim(), prazo });
      setOpen(false);
      setDescricao("");
      setPrazo("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao criar plano de ação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Criar plano de ação
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar plano de ação</DialogTitle>
            <DialogDescription>Registre a ação corretiva para esta resposta "Não".</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`plano-acao-${respostaId}-descricao`}>Descrição</Label>
              <Textarea
                id={`plano-acao-${respostaId}-descricao`}
                required
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`plano-acao-${respostaId}-prazo`}>Prazo</Label>
              <Input
                id={`plano-acao-${respostaId}-prazo`}
                type="date"
                required
                value={prazo}
                onChange={(event) => setPrazo(event.target.value)}
              />
            </div>

            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={busy}>
                {busy ? "Criando…" : "Criar plano de ação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Fora do corpo do pai pelo mesmo motivo dos demais subcomponentes de formulário/visão.
function AvaliacaoResumo({
  avaliacao,
  categorias,
  perguntas,
  materiais,
}: {
  avaliacao: AvaliacaoPdv;
  categorias: CategoriaChecklist[];
  perguntas: PerguntaChecklist[];
  materiais: Material[];
}) {
  const { data: respostas, isLoading } = useRespostasChecklist(avaliacao.id);
  const categoriaNomePorId = new Map(categorias.map((categoria) => [categoria.id, categoria.nome]));
  const materialNomePorId = new Map(materiais.map((material) => [material.id, material.nome]));
  const perguntaPorId = new Map(perguntas.map((pergunta) => [pergunta.id, pergunta]));

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">Avaliação concluída</h2>
        <p className="text-sm text-muted-foreground">
          Concluída em{" "}
          {avaliacao.concluida_em ? new Date(avaliacao.concluida_em).toLocaleString("pt-BR") : "—"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-border p-3">
          <p className="text-sm text-muted-foreground">Percentual geral</p>
          <p className="text-2xl font-semibold text-foreground">{formatPercentual(avaliacao.percentual_total)}</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-sm text-muted-foreground">Pontos</p>
          <p className="text-2xl font-semibold text-foreground">
            {avaliacao.pontos_total ?? "—"}/{avaliacao.pontos_possiveis_total ?? "—"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-foreground">Por categoria</h3>
        {avaliacao.scores_categoria.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem detalhamento por categoria.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {avaliacao.scores_categoria.map((score) => (
              <li
                key={score.categoria_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="text-foreground">{categoriaNomePorId.get(score.categoria_id) ?? "Categoria removida"}</span>
                <span className="font-medium text-foreground">
                  {formatPercentual(score.percentual)} ({score.pontos}/{score.possiveis})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-foreground">Respostas</h3>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !respostas || respostas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma resposta registrada.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {respostas.map((resposta) => {
              const pergunta = perguntaPorId.get(resposta.pergunta_id);
              return (
                <li key={resposta.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{pergunta?.texto ?? "Pergunta removida"}</p>
                    <Badge variant={VALOR_VARIANT[resposta.valor]}>{VALOR_LABEL[resposta.valor]}</Badge>
                  </div>
                  {resposta.comentario && <p className="text-sm text-muted-foreground">{resposta.comentario}</p>}
                  {resposta.material_id && (
                    <p className="text-sm text-muted-foreground">
                      Material: {materialNomePorId.get(resposta.material_id) ?? "—"}
                    </p>
                  )}
                  {resposta.foto_url && <AvaliacaoFotoThumb path={resposta.foto_url} />}
                  {resposta.valor === "nao" && (
                    <div>
                      <CriarPlanoAcaoButton respostaId={resposta.id} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function AvaliacoesPdv() {
  const { data: pdvs, isLoading: pdvsLoading } = usePdvs();
  const pdvsAtivos = (pdvs ?? []).filter((pdv) => pdv.status === "ativo");

  const [pdvId, setPdvId] = useState("");
  const [avaliacaoId, setAvaliacaoId] = useState<string | null>(null);
  const [erroNovaAvaliacao, setErroNovaAvaliacao] = useState<string | null>(null);

  const { data: avaliacoes, isLoading: avaliacoesLoading } = useAvaliacoesPdv(pdvId || undefined);
  const { data: avaliacaoDetalhe, isLoading: avaliacaoDetalheLoading } = useAvaliacaoPdv(avaliacaoId ?? "");
  const createAvaliacao = useCreateAvaliacaoPdv();

  const { data: categoriasRaw, isLoading: categoriasLoading } = useCategoriasChecklist();
  const categoriasAtivas = (categoriasRaw ?? []).filter((categoria) => categoria.is_active);
  const { data: perguntasTodas } = usePerguntasChecklist();

  const { data: materiaisRaw } = useMateriais();
  const materiaisAtivos = (materiaisRaw ?? []).filter((material) => material.status === "ativo");

  function handlePdvChange(value: string) {
    setPdvId(value);
    setAvaliacaoId(null);
    setErroNovaAvaliacao(null);
  }

  async function handleNovaAvaliacao() {
    if (!pdvId || createAvaliacao.isPending) return;
    setErroNovaAvaliacao(null);
    try {
      const created = await createAvaliacao.mutateAsync({ pdv_id: pdvId });
      setAvaliacaoId(created.id);
    } catch (error) {
      setErroNovaAvaliacao(error instanceof Error ? error.message : "Erro ao criar avaliação.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Merchandising" }, { label: "Avaliação de PDV" }]}
        title="Avaliação de PDV"
        description="Preencha o checklist de qualidade de um ponto de venda."
      />

      <div className="flex flex-col gap-2 sm:w-80">
        <Label htmlFor="avaliacao-pdv-select">PDV</Label>
        <Select value={pdvId} onValueChange={handlePdvChange}>
          <SelectTrigger id="avaliacao-pdv-select">
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

      {!pdvId ? (
        <p className="text-muted-foreground">Selecione um PDV para ver ou iniciar uma avaliação.</p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-foreground">Histórico de avaliações</h2>
              <Button size="sm" disabled={createAvaliacao.isPending} onClick={handleNovaAvaliacao} className="sm:w-auto">
                {createAvaliacao.isPending ? "Criando…" : "Nova avaliação"}
              </Button>
            </div>

            {erroNovaAvaliacao && (
              <p role="alert" className="text-sm text-destructive">
                {erroNovaAvaliacao}
              </p>
            )}

            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Percentual</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {avaliacoesLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={4}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !avaliacoes || avaliacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada ainda para este PDV.</p>
                          <Button size="sm" disabled={createAvaliacao.isPending} onClick={handleNovaAvaliacao}>
                            Nova avaliação
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    avaliacoes.map((avaliacao) => (
                      <TableRow key={avaliacao.id} className={cn(avaliacao.id === avaliacaoId && "bg-muted/50")}>
                        <TableCell>{new Date(avaliacao.data_avaliacao).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <Badge variant={avaliacao.status === "concluida" ? "success" : "outline"}>
                            {avaliacao.status === "concluida" ? "Concluída" : "Rascunho"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {avaliacao.status === "concluida" ? formatPercentual(avaliacao.percentual_total) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setAvaliacaoId(avaliacao.id)}>
                            {avaliacao.status === "concluida" ? "Ver detalhes" : "Continuar preenchimento"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          {avaliacaoId &&
            (avaliacaoDetalheLoading || !avaliacaoDetalhe ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-40 w-full" />
              </div>
            ) : avaliacaoDetalhe.status === "rascunho" ? (
              <AvaliacaoFormulario
                key={avaliacaoDetalhe.id}
                avaliacao={avaliacaoDetalhe}
                categorias={categoriasAtivas}
                categoriasLoading={categoriasLoading}
                materiais={materiaisAtivos}
              />
            ) : (
              <AvaliacaoResumo
                key={avaliacaoDetalhe.id}
                avaliacao={avaliacaoDetalhe}
                categorias={categoriasRaw ?? []}
                perguntas={perguntasTodas ?? []}
                materiais={materiaisRaw ?? []}
              />
            ))}
        </>
      )}
    </div>
  );
}
