import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";

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
            <li>
              <Button variant="ghost" className="w-full justify-start" disabled>
                Dashboard
              </Button>
            </li>
            <li>
              <Button variant="ghost" className="w-full justify-start" disabled>
                Mídia Externa
              </Button>
            </li>
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
