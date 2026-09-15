import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Pdvs from "@/pages/Pdvs";
import Outdoors from "@/pages/Outdoors";
import Materiais from "@/pages/Materiais";
import SolicitacoesMaterial from "@/pages/SolicitacoesMaterial";
import ChecklistConfig from "@/pages/ChecklistConfig";
import Manutencoes from "@/pages/Manutencoes";
import AvaliacoesPdv from "@/pages/AvaliacoesPdv";
import PlanosAcao from "@/pages/PlanosAcao";
import Campanhas from "@/pages/Campanhas";
import Aprovacoes from "@/pages/Aprovacoes";
import AprovacaoPublica from "@/pages/AprovacaoPublica";
import DemandasCriativas from "@/pages/DemandasCriativas";
import BibliotecaMarca from "@/pages/BibliotecaMarca";
import EstudioElementos from "@/pages/EstudioElementos";
import EstudioTemplates from "@/pages/EstudioTemplates";
import EstudioColaborador from "@/pages/EstudioColaborador";
import EstudioHistorico from "@/pages/EstudioHistorico";
import AnaliseEstrategicaDashboard from "@/pages/AnaliseEstrategicaDashboard";
import AnaliseEstrategicaClustersConveniencia from "@/pages/AnaliseEstrategicaClustersConveniencia";
import AnaliseEstrategicaClustersOutdoors from "@/pages/AnaliseEstrategicaClustersOutdoors";
import AnaliseEstrategicaClustersComparativo from "@/pages/AnaliseEstrategicaClustersComparativo";
import AnaliseEstrategicaInsights from "@/pages/AnaliseEstrategicaInsights";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/pdvs", label: "PDVs", end: false },
  { to: "/outdoors", label: "Outdoors", end: false },
  { to: "/materiais", label: "Materiais", end: false },
  { to: "/solicitacoes-material", label: "Solicitações de Material", end: false },
  { to: "/checklist-config", label: "Config. Checklist", end: false },
  { to: "/avaliacoes-pdv", label: "Avaliação de PDV", end: false },
  { to: "/planos-acao", label: "Planos de Ação", end: false },
  { to: "/manutencoes", label: "Manutenções", end: false },
  { to: "/campanhas", label: "Campanhas", end: false },
  { to: "/aprovacoes", label: "Aprovações", end: false },
  { to: "/demandas-criativas", label: "Demandas Criativas", end: false },
  { to: "/biblioteca-marca", label: "Biblioteca de Marca", end: false },
  { to: "/estudio", label: "Estúdio", end: false },
  { to: "/estudio/elementos", label: "Elementos do Estúdio", end: false },
  { to: "/estudio/templates", label: "Templates do Estúdio", end: false },
  { to: "/estudio/historico", label: "Histórico de Peças", end: false },
  { to: "/analise-estrategica/dashboard", label: "Análise Estratégica", end: false },
  { to: "/analise-estrategica/clusters/conveniencia", label: "Clusters — Conveniência", end: false },
  { to: "/analise-estrategica/clusters/outdoors", label: "Clusters — Outdoor", end: false },
  { to: "/analise-estrategica/clusters/comparativo", label: "Clusters — Comparativo", end: false },
  { to: "/analise-estrategica/insights", label: "Insights", end: false },
] as const;

const queryClient = new QueryClient();

// Definidos fora de App: componente aninhado no corpo do pai perde estado a
// cada render.
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <nav
        aria-label="Navegação principal"
        className="flex shrink-0 items-center justify-between gap-4 border-b border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:w-56 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r"
      >
        <div className="flex flex-1 flex-col gap-4 md:flex-none">
          <p className="text-lg font-semibold">Marketing OS</p>
          <ul className="flex gap-2 md:flex-col">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex h-9 w-full items-center justify-start rounded-md px-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>
          Sair
        </Button>
      </nav>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Dashboard />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pdvs"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Pdvs />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/outdoors"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Outdoors />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/materiais"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Materiais />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/solicitacoes-material"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <SolicitacoesMaterial />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/checklist-config"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <ChecklistConfig />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/avaliacoes-pdv"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <AvaliacoesPdv />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/planos-acao"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PlanosAcao />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manutencoes"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Manutencoes />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/campanhas"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Campanhas />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/aprovacoes"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Aprovacoes />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/demandas-criativas"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <DemandasCriativas />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/biblioteca-marca"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <BibliotecaMarca />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/estudio"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <EstudioColaborador />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/estudio/elementos"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <EstudioElementos />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/estudio/templates"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <EstudioTemplates />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/estudio/historico"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <EstudioHistorico />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analise-estrategica/dashboard"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <AnaliseEstrategicaDashboard />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analise-estrategica/clusters/conveniencia"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <AnaliseEstrategicaClustersConveniencia />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analise-estrategica/clusters/outdoors"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <AnaliseEstrategicaClustersOutdoors />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analise-estrategica/clusters/comparativo"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <AnaliseEstrategicaClustersComparativo />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analise-estrategica/insights"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <AnaliseEstrategicaInsights />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route path="/aprovacao/:token" element={<AprovacaoPublica />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
