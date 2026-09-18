// Configuração da Análise Estratégica — exclusiva super_admin (grant
// analise/config/editar/rede_toda). Duas seções: peso por tipo de PDV (só
// update, sem create/delete — as linhas já vêm seedadas por tipo, ver
// migration) e clusters/faixas (CRUD completo + soft delete). Guarda de rota
// aqui é só UX — a RLS é a barreira real, mesmo padrão comentado em
// EstudioTemplates.tsx.
import { useEffect, useState, type FormEvent } from "react";
import {
  useAnalisePesosTipo,
  useUpdateAnalisePesoTipo,
  useAnaliseClustersConfig,
  useCreateAnaliseClusterConfig,
  useUpdateAnaliseClusterConfig,
  useDesativarAnaliseClusterConfig,
  type AnalisePesoTipo,
  type AnaliseClusterConfig,
} from "@/hooks/useAnaliseEstrategica";
import { useHasPermission } from "@/hooks/useHasPermission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { ClusterBadge } from "@/components/analise-estrategica/ClusterVisual";

type TipoPdv = "POS" | "CONV";

// Mesmo mapeamento de AnaliseEstrategicaInsights.tsx — não exportado de lá,
// duplicado aqui (mesma convenção de EstudioTemplates.tsx pro mapa de tipo de
// elemento).
const TIPO_PDV_LABEL: Record<TipoPdv, string> = {
  CONV: "Conveniência",
  POS: "Outdoor",
};
const TIPO_PDV_OPTIONS: TipoPdv[] = ["CONV", "POS"];

const EPSILON_SOMA_PESO = 0.001;

// Fora do corpo do componente pai: cada linha guarda o próprio estado de
// input dos dois campos e perderia tudo a cada render da lista se estivesse
// dentro de ConfigConteudo.
function PesoTipoRow({ peso }: { peso: AnalisePesoTipo }) {
  const updatePeso = useUpdateAnalisePesoTipo();
  const [pesoMidia, setPesoMidia] = useState(peso.peso_midia);
  const [pesoMerch, setPesoMerch] = useState(peso.peso_merchandising);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setPesoMidia(peso.peso_midia);
    setPesoMerch(peso.peso_merchandising);
  }, [peso.peso_midia, peso.peso_merchandising]);

  async function handleSalvar() {
    if (updatePeso.isPending) return;
    if (Math.abs(pesoMidia + pesoMerch - 1) > EPSILON_SOMA_PESO) {
      setErro("peso mídia + peso merchandising precisa somar 1");
      return;
    }
    setErro(null);
    try {
      await updatePeso.mutateAsync({ id: peso.id, peso_midia: pesoMidia, peso_merchandising: pesoMerch });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar o peso.");
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{TIPO_PDV_LABEL[peso.tipo_pdv as TipoPdv] ?? peso.tipo_pdv}</TableCell>
      <TableCell>
        <Label htmlFor={`peso-midia-${peso.id}`} className="sr-only">
          Peso mídia — {peso.tipo_pdv}
        </Label>
        <Input
          id={`peso-midia-${peso.id}`}
          type="number"
          min="0"
          max="1"
          step="0.1"
          className="w-24"
          value={pesoMidia}
          onChange={(event) => setPesoMidia(Number(event.target.value))}
        />
      </TableCell>
      <TableCell>
        <Label htmlFor={`peso-merch-${peso.id}`} className="sr-only">
          Peso merchandising — {peso.tipo_pdv}
        </Label>
        <Input
          id={`peso-merch-${peso.id}`}
          type="number"
          min="0"
          max="1"
          step="0.1"
          className="w-24"
          value={pesoMerch}
          onChange={(event) => setPesoMerch(Number(event.target.value))}
        />
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <Button type="button" size="sm" disabled={updatePeso.isPending} onClick={handleSalvar}>
            {updatePeso.isPending ? "Salvando…" : "Salvar"}
          </Button>
          {erro && (
            <p role="alert" className="text-xs text-destructive">
              {erro}
            </p>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

interface ClusterFormValues {
  nome: string;
  tipoPdv: TipoPdv;
  corHex: string;
  faixaMin: number;
  faixaMax: number;
  ordem: number;
}

// Fora do corpo do componente pai pelo mesmo motivo dos demais forms em
// Dialog do projeto (ex. CategoriaFormDialog em EstudioTemplates.tsx).
function ClusterConfigFormDialog({
  open,
  onOpenChange,
  cluster,
  tipoPdvPadrao,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cluster: AnaliseClusterConfig | null;
  tipoPdvPadrao: TipoPdv;
  onSubmit: (values: ClusterFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [nome, setNome] = useState("");
  const [tipoPdv, setTipoPdv] = useState<TipoPdv>(tipoPdvPadrao);
  const [corHex, setCorHex] = useState("#64748b");
  const [faixaMin, setFaixaMin] = useState(0);
  const [faixaMax, setFaixaMax] = useState(100);
  const [ordem, setOrdem] = useState(0);

  useEffect(() => {
    if (open) {
      setNome(cluster?.nome ?? "");
      setTipoPdv((cluster?.tipo_pdv as TipoPdv) ?? tipoPdvPadrao);
      setCorHex(cluster?.cor_hex ?? "#64748b");
      setFaixaMin(cluster?.faixa_min ?? 0);
      setFaixaMax(cluster?.faixa_max ?? 100);
      setOrdem(cluster?.ordem ?? 0);
    }
  }, [open, cluster, tipoPdvPadrao]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    onSubmit({ nome, tipoPdv, corHex, faixaMin, faixaMax, ordem });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cluster ? "Editar cluster" : "Novo cluster"}</DialogTitle>
          <DialogDescription>
            {cluster
              ? "Atualize nome, cor e faixa deste cluster. O tipo de PDV não pode ser alterado aqui."
              : "Cadastre um novo cluster de pontuação para um tipo de PDV."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cluster-nome">Nome</Label>
            <Input id="cluster-nome" required value={nome} onChange={(event) => setNome(event.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cluster-tipo">Tipo de PDV</Label>
            <Select value={tipoPdv} onValueChange={(value) => setTipoPdv(value as TipoPdv)} disabled={!!cluster}>
              <SelectTrigger id="cluster-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_PDV_OPTIONS.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {TIPO_PDV_LABEL[valor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cluster-cor">Cor</Label>
            <div className="flex items-center gap-2">
              <input
                id="cluster-cor"
                type="color"
                value={corHex}
                onChange={(event) => setCorHex(event.target.value)}
                className="h-9 w-14 rounded border border-input bg-background p-1"
              />
              <Input
                aria-label="Código hexadecimal da cor"
                value={corHex}
                onChange={(event) => setCorHex(event.target.value)}
                className="w-32"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="cluster-faixa-min">Faixa mínima</Label>
              <Input
                id="cluster-faixa-min"
                type="number"
                required
                value={faixaMin}
                onChange={(event) => setFaixaMin(Number(event.target.value))}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="cluster-faixa-max">Faixa máxima</Label>
              <Input
                id="cluster-faixa-max"
                type="number"
                required
                value={faixaMax}
                onChange={(event) => setFaixaMax(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cluster-ordem">Ordem</Label>
            <Input
              id="cluster-ordem"
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

// Fora do corpo do componente pai: uma tabela por tipo de PDV, reaproveitada
// pelas duas seções (Conveniência e Outdoor).
function ClustersConfigTable({
  tipoPdv,
  titulo,
  clusters,
  onNovo,
  onEditar,
  onDesativar,
  desativando,
}: {
  tipoPdv: TipoPdv;
  titulo: string;
  clusters: AnaliseClusterConfig[];
  onNovo: (tipoPdv: TipoPdv) => void;
  onEditar: (cluster: AnaliseClusterConfig) => void;
  onDesativar: (cluster: AnaliseClusterConfig) => void;
  desativando: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-foreground">{titulo}</h3>
        <Button size="sm" onClick={() => onNovo(tipoPdv)} className="sm:w-auto">
          Novo cluster
        </Button>
      </div>

      {clusters.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-8 text-center">
          <p className="text-muted-foreground">Nenhum cluster cadastrado para {titulo.toLowerCase()} ainda.</p>
          <Button size="sm" onClick={() => onNovo(tipoPdv)}>
            Criar cluster
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cluster</TableHead>
                <TableHead>Faixa</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clusters.map((cluster) => (
                <TableRow key={cluster.id}>
                  <TableCell>
                    <ClusterBadge nome={cluster.nome} cor={cluster.cor_hex} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {cluster.faixa_min} – {cluster.faixa_max}
                  </TableCell>
                  <TableCell>{cluster.ordem}</TableCell>
                  <TableCell>
                    <Badge variant={cluster.is_active ? "success" : "outline"}>
                      {cluster.is_active ? "ativo" : "inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => onEditar(cluster)}>
                        Editar
                      </Button>
                      {cluster.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={desativando}
                          onClick={() => onDesativar(cluster)}
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
    </div>
  );
}

// Fora do corpo do componente pai: conteúdo só monta depois que a permissão
// já foi confirmada — evita disparar as queries de peso/cluster pra quem não
// tem grant nenhum.
function ConfigConteudo() {
  const pesosQuery = useAnalisePesosTipo();
  const clustersQuery = useAnaliseClustersConfig();
  const createCluster = useCreateAnaliseClusterConfig();
  const updateCluster = useUpdateAnaliseClusterConfig();
  const desativarCluster = useDesativarAnaliseClusterConfig();

  const [clusterDialogOpen, setClusterDialogOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<AnaliseClusterConfig | null>(null);
  const [tipoPdvPadrao, setTipoPdvPadrao] = useState<TipoPdv>("CONV");
  const [clusterFormError, setClusterFormError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<AnaliseClusterConfig | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function openCreateClusterDialog(tipoPdv: TipoPdv) {
    setEditingCluster(null);
    setTipoPdvPadrao(tipoPdv);
    setClusterFormError(null);
    setClusterDialogOpen(true);
  }

  function openEditClusterDialog(cluster: AnaliseClusterConfig) {
    setEditingCluster(cluster);
    setTipoPdvPadrao((cluster.tipo_pdv as TipoPdv) ?? "CONV");
    setClusterFormError(null);
    setClusterDialogOpen(true);
  }

  async function handleClusterSubmit(values: ClusterFormValues) {
    setClusterFormError(null);
    try {
      if (editingCluster) {
        await updateCluster.mutateAsync({
          id: editingCluster.id,
          nome: values.nome,
          cor_hex: values.corHex,
          faixa_min: values.faixaMin,
          faixa_max: values.faixaMax,
          ordem: values.ordem,
        });
      } else {
        await createCluster.mutateAsync({
          nome: values.nome,
          tipo_pdv: values.tipoPdv,
          cor_hex: values.corHex,
          faixa_min: values.faixaMin,
          faixa_max: values.faixaMax,
          ordem: values.ordem,
        });
      }
      setClusterDialogOpen(false);
    } catch (err) {
      // Erro cru do Postgres (inclui a constraint EXCLUDE de sobreposição de
      // faixa) propaga sem tradução — já é autoexplicativo pro super_admin.
      setClusterFormError(err instanceof Error ? err.message : "Não foi possível salvar o cluster.");
    }
  }

  function handleDesativarCluster(cluster: AnaliseClusterConfig) {
    setConfirmError(null);
    setConfirmando(cluster);
  }

  async function confirmDesativarCluster() {
    if (!confirmando) return;
    try {
      await desativarCluster.mutateAsync(confirmando.id);
      setConfirmando(null);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Não foi possível desativar o cluster.");
    }
  }

  const clusters = clustersQuery.data ?? [];
  const clustersConv = clusters.filter((cluster) => cluster.tipo_pdv === "CONV");
  const clustersPos = clusters.filter((cluster) => cluster.tipo_pdv === "POS");
  const isClusterSubmitting = createCluster.isPending || updateCluster.isPending;

  return (
    <>
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Peso por tipo de PDV</h2>
          <p className="text-sm text-muted-foreground">
            Peso mídia e peso merchandising precisam somar 1 para cada tipo de PDV.
          </p>
        </div>

        {pesosQuery.isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : pesosQuery.isError ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-sm text-destructive">
              {pesosQuery.error instanceof Error ? pesosQuery.error.message : "Não foi possível carregar os pesos."}
            </p>
            <Button variant="outline" size="sm" onClick={() => pesosQuery.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : (pesosQuery.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-8 text-center">
            <p className="text-muted-foreground">Nenhum peso configurado ainda.</p>
            <Button variant="outline" size="sm" onClick={() => pesosQuery.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de PDV</TableHead>
                  <TableHead>Peso mídia</TableHead>
                  <TableHead>Peso merchandising</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pesosQuery.data!.map((peso) => (
                  <PesoTipoRow key={peso.id} peso={peso} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Clusters (faixas)</h2>
          <p className="text-sm text-muted-foreground">
            Faixas de pontuação não podem se sobrepor entre clusters ativos do mesmo tipo de PDV.
          </p>
        </div>

        {clustersQuery.isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : clustersQuery.isError ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-sm text-destructive">
              {clustersQuery.error instanceof Error
                ? clustersQuery.error.message
                : "Não foi possível carregar os clusters."}
            </p>
            <Button variant="outline" size="sm" onClick={() => clustersQuery.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <ClustersConfigTable
              tipoPdv="CONV"
              titulo="Conveniência"
              clusters={clustersConv}
              onNovo={openCreateClusterDialog}
              onEditar={openEditClusterDialog}
              onDesativar={handleDesativarCluster}
              desativando={desativarCluster.isPending}
            />
            <ClustersConfigTable
              tipoPdv="POS"
              titulo="Outdoor"
              clusters={clustersPos}
              onNovo={openCreateClusterDialog}
              onEditar={openEditClusterDialog}
              onDesativar={handleDesativarCluster}
              desativando={desativarCluster.isPending}
            />
          </>
        )}
      </section>

      <ClusterConfigFormDialog
        open={clusterDialogOpen}
        onOpenChange={setClusterDialogOpen}
        cluster={editingCluster}
        tipoPdvPadrao={tipoPdvPadrao}
        onSubmit={handleClusterSubmit}
        submitting={isClusterSubmitting}
        error={clusterFormError}
      />

      <ConfirmDialog
        open={!!confirmando}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmando(null);
            setConfirmError(null);
          }
        }}
        titulo="Desativar cluster"
        descricao={`Desativar o cluster "${confirmando?.nome}"?`}
        rotuloAcao="Desativar"
        pendente={desativarCluster.isPending}
        erro={confirmError}
        onConfirm={confirmDesativarCluster}
      />
    </>
  );
}

export default function AnaliseEstrategicaConfig() {
  const podeConfig = useHasPermission("analise", "config", "editar", "rede_toda");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configuração da Análise</h1>
        <p className="text-muted-foreground">Peso por tipo de PDV e faixas de cluster usadas no recálculo.</p>
      </div>

      {podeConfig.isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !podeConfig.data ? (
        <p role="alert" className="text-muted-foreground">
          Você não tem permissão para acessar esta página.
        </p>
      ) : (
        <ConfigConteudo />
      )}
    </div>
  );
}
