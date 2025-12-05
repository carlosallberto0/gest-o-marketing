import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Checklist from "./pages/Checklist";
import History from "./pages/History";
import Outdoors from "./pages/Outdoors";
import Contracts from "./pages/Contracts";
import PDVs from "./pages/PDVs";
import Materials from "./pages/Materials";
import Campaigns from "./pages/Campaigns";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/login" element={<Login />} />
    <Route 
      path="/dashboard" 
      element={
        <ProtectedRoute>
          <Dashboard />
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
      path="/contracts" 
      element={
        <ProtectedRoute>
          <Contracts />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/pdvs" 
      element={
        <ProtectedRoute>
          <PDVs />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/materials" 
      element={
        <ProtectedRoute>
          <Materials />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/campaigns" 
      element={
        <ProtectedRoute>
          <Campaigns />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/users" 
      element={
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      } 
    />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
