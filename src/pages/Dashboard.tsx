import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, ClipboardList, Megaphone, Wrench } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAprovacaoItens } from "@/hooks/useAprovacoes";
import { useCampanhas } from "@/hooks/useCampanhas";
import { useDemandasCriativas } from "@/hooks/useDemandasCriativas";
import { useManutencoes } from "@/hooks/useManutencoes";
import { useAtividadesRecentes } from "@/hooks/useAtividadesRecentes";
import { useMinhasPermissoes } from "@/hooks/useMinhasPermissoes";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface PendenciaItem {
  id: string;
  titulo: string;
  detalhe: string;
  href: string;
}

const ACESSOS_RAPIDOS = [
  { label: "Criar peça", href: "/estudio" },
  { label: "Nova demanda", href: "/demandas-criativas" },
  { label: "Templates", href: "/estudio/templates" },
  { label: "Biblioteca", href: "/biblioteca-marca" },
  { label: "Aprovações", href: "/aprovacoes" },
  { label: "Relatórios", href: "/analise-estrategica/relatorios" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const aprovacoesPendentes = useAprovacaoItens("pending");
  const campanhasAtivas = useCampanhas("ativa");
  const demandas = useDemandasCriativas();
  const manutencoes = useManutencoes();
  const atividades = useAtividadesRecentes();
  const { podeAcessar } = useMinhasPermissoes();
  const podeVerAtividades = podeAcessar("core", "audit_logs", "ler", "rede_toda");

  const demandasAbertas = (demandas.data ?? []).filter(
    (d) => d.status !== "concluida" && d.status !== "cancelada",
  );
  const manutencoesPendentes = (manutencoes.data ?? []).filter(
    (m) => m.status !== "validada" && m.status !== "cancelada" && m.status !== "rejeitada",
  );

  const kpisLoading =
    aprovacoesPendentes.isLoading || campanhasAtivas.isLoading || demandas.isLoading || manutencoes.isLoading;
  const pendenciasLoading = aprovacoesPendentes.isLoading || demandas.isLoading || manutencoes.isLoading;
  const algumErro =
    aprovacoesPendentes.isError ||
    demandas.isError ||
    manutencoes.isError ||
    campanhasAtivas.isError ||
    atividades.isError;
  const algumFetching =
    aprovacoesPendentes.isFetching ||
    demandas.isFetching ||
    manutencoes.isFetching ||
    campanhasAtivas.isFetching ||
    atividades.isFetching;

  const pendencias: PendenciaItem[] = [
    ...(aprovacoesPendentes.data ?? []).slice(-2).map((item) => ({
      id: item.id,
      titulo: item.titulo,
      detalhe: "Aguardando aprovação",
      href: "/aprovacoes",
    })),
    ...demandasAbertas.slice(-2).map((d) => ({
      id: d.id,
      titulo: d.titulo,
      detalhe: d.prazo ? `Prazo: ${new Date(d.prazo).toLocaleDateString("pt-BR")}` : "Sem prazo definido",
      href: "/demandas-criativas",
    })),
    ...manutencoesPendentes.slice(-2).map((m) => ({
      id: m.id,
      titulo: `Manutenção ${m.urgencia}`,
      detalhe: m.prazo_atendimento
        ? `Prazo: ${new Date(m.prazo_atendimento).toLocaleDateString("pt-BR")}`
        : "Sem prazo definido",
      href: "/manutencoes",
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Olá, {user?.email ?? "usuário"}!</h1>
        <p className="text-muted-foreground">Veja o que precisa da sua atenção hoje.</p>
      </div>

      {algumErro && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar todos os dados do dashboard. Algumas informações podem estar incompletas.{" "}
          <Button
            variant="link"
            className="h-auto p-0 text-destructive underline"
            disabled={algumFetching}
            onClick={() => {
              aprovacoesPendentes.refetch();
              demandas.refetch();
              manutencoes.refetch();
              campanhasAtivas.refetch();
              atividades.refetch();
            }}
          >
            {algumFetching ? "Atualizando…" : "Tentar novamente"}
          </Button>
        </p>
      )}

      {kpisLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[104px] w-full" />
          <Skeleton className="h-[104px] w-full" />
          <Skeleton className="h-[104px] w-full" />
          <Skeleton className="h-[104px] w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            titulo="Aprovações pendentes"
            valor={aprovacoesPendentes.isError ? "—" : String(aprovacoesPendentes.data?.length ?? 0)}
            icon={CheckCircle2}
            accent="warning"
          />
          <KpiCard
            titulo="Demandas em aberto"
            valor={demandas.isError ? "—" : String(demandasAbertas.length)}
            icon={ClipboardList}
            accent="info"
          />
          <KpiCard
            titulo="Campanhas ativas"
            valor={campanhasAtivas.isError ? "—" : String(campanhasAtivas.data?.length ?? 0)}
            icon={Megaphone}
            accent="success"
          />
          <KpiCard
            titulo="Manutenções pendentes"
            valor={manutencoes.isError ? "—" : String(manutencoesPendentes.length)}
            icon={Wrench}
            accent="orange"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pendências urgentes</CardTitle>
          </CardHeader>
          <CardContent>
            {pendenciasLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : pendencias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma pendência no momento.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {pendencias.map((item) => (
                  <li key={item.id}>
                    <Link to={item.href} className="block text-sm hover:underline">
                      <span className="font-medium text-foreground">{item.titulo}</span>
                      <span className="block text-muted-foreground">{item.detalhe}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividades recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {!podeVerAtividades ? (
              <p className="text-sm text-muted-foreground">
                Atividades recentes ficam disponíveis só para quem tem acesso à trilha de auditoria.
              </p>
            ) : atividades.isLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : (atividades.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {(atividades.data ?? []).map((atividade) => (
                  <li key={atividade.id} className="text-sm">
                    <span className="text-foreground">{atividade.label}</span>
                    {atividade.usuarioNome && (
                      <span className="text-muted-foreground"> — por {atividade.usuarioNome}</span>
                    )}
                    <span className="block text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(atividade.createdAt), { locale: ptBR, addSuffix: true })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acesso rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ACESSOS_RAPIDOS.map((acesso) => (
              <Button key={acesso.href} asChild variant="outline">
                <Link to={acesso.href}>{acesso.label}</Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
