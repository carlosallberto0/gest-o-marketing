import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import AccessControl from "./pages/AccessControl";
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
import Users from "./pages/Users";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAprovacoes from "./pages/AdminAprovacoes";
import DiretoriaAprovacoes from "./pages/DiretoriaAprovacoes";
import GerenteValidacoes from "./pages/GerenteValidacoes";
import PDVDetail from "./pages/PDVDetail";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import ServiceOrders from "./pages/ServiceOrders";
import Suppliers from "./pages/Suppliers";
import MaintenanceRequests from "./pages/MaintenanceRequests";
import MaintenanceApproval from "./pages/MaintenanceApproval";
import GenerateServiceOrder from "./pages/GenerateServiceOrder";
import ResetPassword from "./pages/ResetPassword";
import AuditLogs from "./pages/AuditLogs";
import StrategicMapMapbox from "./pages/StrategicMapMapbox";
import OutdoorReviews from "./pages/OutdoorReviews";
import PendingApproval from "./pages/PendingApproval";
import DirectorObservations from "./pages/DirectorObservations";
import BulkImageUpload from "./pages/BulkImageUpload";
import OutdoorStatusControl from "./pages/OutdoorStatusControl";
import SupplierManagement from "./pages/SupplierManagement";
import CustosExternos from "./pages/CustosExternos";
import RegistrarCusto from "./pages/RegistrarCusto";
import AjustarRateio from "./pages/AjustarRateio";
import NotFound from "./pages/NotFound";
import { RequireRole } from "@/components/auth/RequireRole";

const queryClient = new QueryClient();

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
          <MediaDashboard />
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
          <Outdoors />
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
            <MaterialRequests />
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
            <MaintenanceRequests />
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
    <Route 
      path="/custos-externos" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin']}>
            <CustosExternos />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/custos-externos/registrar" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin']}>
            <RegistrarCusto />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/custos-externos/:id/rateio" 
      element={
        <ProtectedRoute>
          <RequireRole allowedRoles={['super_admin']}>
            <AjustarRateio />
          </RequireRole>
        </ProtectedRoute>
      } 
    />
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
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </AlertToastProvider>
        </SystemProvider>
      </ModuleProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
