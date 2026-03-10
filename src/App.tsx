import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ModuleProvider } from "@/contexts/ModuleContext";
import { SystemProvider } from "@/contexts/SystemContext";
import { AlertToastProvider } from "@/contexts/AlertToastContext";
import { AlertToastContainer } from "@/components/ui/alert-toast-container";
import { AlertToastConnector } from "@/components/AlertToastConnector";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Auth from "./pages/Auth";
import AccessLink from "./pages/AccessLink";
import AccessControl, { AccessControlContent } from "./pages/AccessControl";
import Dashboard from "./pages/Dashboard";
import ModuleSelection from "./pages/ModuleSelection";
import MerchDashboard from "./pages/MerchDashboard";
import MediaDashboard from "./pages/MediaDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import Checklist from "./pages/Checklist";
import History from "./pages/History";
import Outdoors from "./pages/Outdoors";
import OutdoorDetail from "./pages/OutdoorDetail";
import OutdoorEvaluation from "./pages/OutdoorEvaluation";
import Contracts from "./pages/Contracts";
import PDVs from "./pages/PDVs";
import Materials from "./pages/Materials";
import MaterialRequests from "./pages/MaterialRequests";
import Campaigns from "./pages/Campaigns";
import Users, { UsersContent } from "./pages/Users";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAprovacoes from "./pages/AdminAprovacoes";
import DiretoriaAprovacoes from "./pages/DiretoriaAprovacoes";
import GerenteValidacoes from "./pages/GerenteValidacoes";
import PDVDetail from "./pages/PDVDetail";
import Settings, { SettingsContent } from "./pages/Settings";
import Reports from "./pages/Reports";
import ServiceOrders from "./pages/ServiceOrders";
import Suppliers, { SuppliersContent } from "./pages/Suppliers";
import MaintenanceRequests from "./pages/MaintenanceRequests";
import MaintenanceApproval from "./pages/MaintenanceApproval";
import GenerateServiceOrder from "./pages/GenerateServiceOrder";
import ResetPassword from "./pages/ResetPassword";
import AuditLogs, { AuditLogsContent } from "./pages/AuditLogs";
import StrategicMapMapbox from "./pages/StrategicMapMapbox";
import OutdoorReviews from "./pages/OutdoorReviews";
import PendingApproval from "./pages/PendingApproval";
import DirectorObservations from "./pages/DirectorObservations";
import BulkImageUpload from "./pages/BulkImageUpload";
import OutdoorStatusControl from "./pages/OutdoorStatusControl";
import SupplierManagement from "./pages/SupplierManagement";
import { CustosExternosContent } from "./pages/CustosExternos";
import { RegistrarCustoContent } from "./pages/RegistrarCusto";
import { AjustarRateioContent } from "./pages/AjustarRateio";
import { FinanceiroDashboardContent } from "./pages/FinanceiroDashboard";
import { FinanceiroLayout } from "./components/layout/FinanceiroLayout";
import { ConfiguracoesLayout } from "./components/layout/ConfiguracoesLayout";
import { AgenciaLayout } from "./components/layout/AgenciaLayout";
import { LoteamentosLayout } from "./components/layout/LoteamentosLayout";
import { AnaliseEstrategicaLayout } from "./components/layout/AnaliseEstrategicaLayout";
import DashboardConfiguracoes from "./pages/configuracoes/DashboardConfiguracoes";
import DashboardAgencia from "./pages/agencia/DashboardAgencia";
import Agencias from "./pages/agencia/Agencias";
import AgenciaDemandas from "./pages/agencia/AgenciaDemandas";
import AgenciaVideos from "./pages/agencia/AgenciaVideos";
import AgenciaFotos from "./pages/agencia/AgenciaFotos";
import DashboardLoteamentos from "./pages/loteamentos/DashboardLoteamentos";
import DashboardAnalise from "./pages/analise-estrategica/DashboardAnalise";
import ClustersConveniencia from "./pages/analise-estrategica/ClustersConveniencia";
import ClustersOutdoors from "./pages/analise-estrategica/ClustersOutdoors";
import ComparativoClusters from "./pages/analise-estrategica/ComparativoClusters";
import InsightsPage from "./pages/analise-estrategica/InsightsPage";
import RelatoriosAnalise from "./pages/analise-estrategica/RelatoriosAnalise";
import ConfigAnaliseEstrategica from "./pages/analise-estrategica/ConfigAnaliseEstrategica";
import NotFound from "./pages/NotFound";
import { RequireRole } from "@/components/auth/RequireRole";
import { RequireManagerMenuPermission } from "@/components/auth/RequireManagerMenuPermission";
import { RequireDirectorMenuPermission } from "@/components/auth/RequireDirectorMenuPermission";

const queryClient = new QueryClient();

// AppContent is rendered inside providers so ProtectedRoute can use useAuth
function AppContent() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/login" element={<Login />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/acesso/:token" element={<AccessLink />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route 
      path="/pending-approval" 
      element={
        <ProtectedRoute>
          <PendingApproval />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/modules" 
      element={
        <ProtectedRoute>
          <ModuleSelection />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/dashboard" 
      element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/merchandising/dashboard" 
      element={
        <ProtectedRoute>
          <MerchDashboard />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/supervisor/dashboard" 
      element={
        <ProtectedRoute>
          <SupervisorDashboard />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/media/dashboard" 
      element={
        <ProtectedRoute>
          <RequireDirectorMenuPermission>
            <MediaDashboard />
          </RequireDirectorMenuPermission>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/mapa" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin', 'director', 'manager']}>
            <StrategicMapMapbox />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/admin/aprovacoes"
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin']}>
            <AdminAprovacoes />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/diretoria/aprovacoes" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin', 'director']}>
            <DiretoriaAprovacoes />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/gerente/validacoes" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin', 'director', 'manager']}>
            <GerenteValidacoes />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route
      path="/checklist" 
      element={
        <ProtectedRoute>
          <Checklist />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/history" 
      element={
        <ProtectedRoute>
          <History />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/outdoors" 
      element={
        <ProtectedRoute>
          <RequireDirectorMenuPermission>
            <Outdoors />
          </RequireDirectorMenuPermission>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/outdoor/:id" 
      element={
        <ProtectedRoute>
          <OutdoorDetail />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/outdoor-evaluation" 
      element={
        <ProtectedRoute>
          <OutdoorEvaluation />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/contracts"
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin', 'director', 'manager']}>
            <Contracts />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/pdvs" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin', 'director', 'manager']}>
            <PDVs />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/materials" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin', 'director', 'manager']}>
            <Materials />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/material-requests" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin', 'director', 'manager', 'collaborator']}>
            <RequireManagerMenuPermission>
              <MaterialRequests />
            </RequireManagerMenuPermission>
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route
      path="/campaigns" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin', 'director']}>
            <Campaigns />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/users" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin']}>
            <Users />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/admin" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin']}>
            <AdminDashboard />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/pdv/:id" 
      element={
        <ProtectedRoute>
          <PDVDetail />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/settings" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin']}>
            <Settings />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/reports" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin', 'director', 'manager']}>
            <Reports />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/service-orders" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin', 'director']}>
            <ServiceOrders />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/audit-logs" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin']}>
            <AuditLogs />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/admin/controle-de-acessos" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin']}>
            <AccessControl />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/suppliers" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin']}>
            <Suppliers />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/maintenance-requests" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin', 'director', 'manager']}>
            <RequireManagerMenuPermission>
              <MaintenanceRequests />
            </RequireManagerMenuPermission>
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/generate-service-order" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin']}>
            <GenerateServiceOrder />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/outdoor-reviews" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin', 'director']}>
            <OutdoorReviews />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/maintenance-approval" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin', 'director']}>
            <MaintenanceApproval />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/director-observations" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['director']}>
            <DirectorObservations />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/bulk-image-upload" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin']}>
            <BulkImageUpload />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/admin/controle-status-outdoors" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin']}>
            <OutdoorStatusControl />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/supplier-management" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'admin']}>
            <SupplierManagement />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    {/* Financeiro Module Routes - using FinanceiroLayout */}
    <Route 
      path="/financeiro"
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'director', 'coordenador_compras']}>
            <FinanceiroLayout>
              <Outlet />
            </FinanceiroLayout>
          </RequireRole>
        </ProtectedRoute>
      }
    >
      <Route path="dashboard" element={<FinanceiroDashboardContent />} />
      <Route path="custos" element={<CustosExternosContent />} />
      <Route 
        path="custos/registrar" 
        element={
          <RequireRole allowedRoles={['super_admin']}>
            <RegistrarCustoContent />
          </RequireRole>
        } 
      />
      <Route 
        path="custos/:id/rateio" 
        element={
          <RequireRole allowedRoles={['super_admin']}>
            <AjustarRateioContent />
          </RequireRole>
        } 
      />
      <Route 
        path="fornecedores" 
        element={
          <RequireRole allowedRoles={['super_admin']}>
            <SuppliersContent />
          </RequireRole>
        } 
      />
      <Route 
        path="audit-logs" 
        element={
          <RequireRole allowedRoles={['super_admin']}>
            <AuditLogsContent />
          </RequireRole>
        } 
      />
      <Route 
        path="settings" 
        element={
          <RequireRole allowedRoles={['super_admin']}>
            <SettingsContent />
          </RequireRole>
        } 
      />
    </Route>
    
    {/* Configurações Module Routes - using ConfiguracoesLayout */}
    <Route 
      path="/configuracoes"
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin']}>
            <ConfiguracoesLayout>
              <Outlet />
            </ConfiguracoesLayout>
          </RequireRole>
        </ProtectedRoute>
      }
    >
      <Route path="dashboard" element={<DashboardConfiguracoes />} />
      <Route path="geral" element={<SettingsContent />} />
      <Route path="usuarios" element={<UsersContent />} />
      <Route path="fornecedores" element={<SuppliersContent />} />
      <Route path="perfis" element={<AccessControlContent />} />
    </Route>

    {/* Agência Module Routes - using AgenciaLayout */}
    <Route 
      path="/agencia"
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin']}>
            <AgenciaLayout>
              <Outlet />
            </AgenciaLayout>
          </RequireRole>
        </ProtectedRoute>
      }
    >
      <Route path="dashboard" element={<DashboardAgencia />} />
      <Route path="agencias" element={<Agencias />} />
      <Route path="demandas" element={<AgenciaDemandas />} />
      <Route path="videos" element={<AgenciaVideos />} />
      <Route path="fotos" element={<AgenciaFotos />} />
    </Route>

    {/* Loteamentos Module Routes - using LoteamentosLayout */}
    <Route 
      path="/loteamentos"
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin']}>
            <LoteamentosLayout>
              <Outlet />
            </LoteamentosLayout>
          </RequireRole>
        </ProtectedRoute>
      }
    >
      <Route path="dashboard" element={<DashboardLoteamentos />} />
    </Route>

    {/* Análise Estratégica Module Routes */}
    <Route 
      path="/analise-estrategica"
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin', 'director']}>
            <AnaliseEstrategicaLayout>
              <Outlet />
            </AnaliseEstrategicaLayout>
          </RequireRole>
        </ProtectedRoute>
      }
    >
      <Route path="dashboard" element={<DashboardAnalise />} />
      <Route path="clusters/conveniencia" element={<ClustersConveniencia />} />
      <Route path="clusters/outdoors" element={<ClustersOutdoors />} />
      <Route path="clusters/comparativo" element={<ComparativoClusters />} />
      <Route path="insights" element={<InsightsPage />} />
      <Route path="relatorios" element={<RelatoriosAnalise />} />
      <Route 
        path="config" 
        element={
          <RequireRole allowedRoles={['super_admin']}>
            <ConfigAnaliseEstrategica />
          </RequireRole>
        } 
      />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ModuleProvider>
        <SystemProvider>
          <AlertToastProvider>
            <TooltipProvider>
              <AlertToastContainer />
              <AlertToastConnector />
              <AppContent />
            </TooltipProvider>
          </AlertToastProvider>
        </SystemProvider>
      </ModuleProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
