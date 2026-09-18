import { Component, lazy, Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";

const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Pdvs = lazy(() => import("@/pages/Pdvs"));
const Outdoors = lazy(() => import("@/pages/Outdoors"));
const Materiais = lazy(() => import("@/pages/Materiais"));
const SolicitacoesMaterial = lazy(() => import("@/pages/SolicitacoesMaterial"));
const ChecklistConfig = lazy(() => import("@/pages/ChecklistConfig"));
const Manutencoes = lazy(() => import("@/pages/Manutencoes"));
const AvaliacoesPdv = lazy(() => import("@/pages/AvaliacoesPdv"));
const PlanosAcao = lazy(() => import("@/pages/PlanosAcao"));
const Campanhas = lazy(() => import("@/pages/Campanhas"));
const Aprovacoes = lazy(() => import("@/pages/Aprovacoes"));
const AprovacaoPublica = lazy(() => import("@/pages/AprovacaoPublica"));
const DemandasCriativas = lazy(() => import("@/pages/DemandasCriativas"));
const BibliotecaMarca = lazy(() => import("@/pages/BibliotecaMarca"));
const EstudioElementos = lazy(() => import("@/pages/EstudioElementos"));
const EstudioTemplates = lazy(() => import("@/pages/EstudioTemplates"));
const EstudioColaborador = lazy(() => import("@/pages/EstudioColaborador"));
const EstudioHistorico = lazy(() => import("@/pages/EstudioHistorico"));
const AnaliseEstrategicaDashboard = lazy(() => import("@/pages/AnaliseEstrategicaDashboard"));
const AnaliseEstrategicaClustersConveniencia = lazy(() => import("@/pages/AnaliseEstrategicaClustersConveniencia"));
const AnaliseEstrategicaClustersOutdoors = lazy(() => import("@/pages/AnaliseEstrategicaClustersOutdoors"));
const AnaliseEstrategicaClustersComparativo = lazy(() => import("@/pages/AnaliseEstrategicaClustersComparativo"));
const AnaliseEstrategicaInsights = lazy(() => import("@/pages/AnaliseEstrategicaInsights"));
const AnaliseEstrategicaConfig = lazy(() => import("@/pages/AnaliseEstrategicaConfig"));
const AnaliseEstrategicaRelatorios = lazy(() => import("@/pages/AnaliseEstrategicaRelatorios"));

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

// Classe: getDerivedStateFromError não existe como hook. Definido fora de
// App para não perder estado a cada render, como as demais convenções aqui.
class RouteErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center text-muted-foreground">
          <p>Não foi possível carregar esta página.</p>
          <Button onClick={() => window.location.reload()}>Recarregar</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <MobileNav />
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8">
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
              Carregando…
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <RouteErrorBoundary>
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center text-muted-foreground">
                Carregando…
              </div>
            }
          >
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
            <Route
              path="/analise-estrategica/relatorios"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <AnaliseEstrategicaRelatorios />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analise-estrategica/config"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <AnaliseEstrategicaConfig />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route path="/aprovacao/:token" element={<AprovacaoPublica />} />
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          </RouteErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
