import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
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
import AnaliseEstrategicaConfig from "@/pages/AnaliseEstrategicaConfig";
import AnaliseEstrategicaRelatorios from "@/pages/AnaliseEstrategicaRelatorios";

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
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <MobileNav />
      <AppSidebar />
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
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
