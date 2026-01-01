import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  onNavigateBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MapErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MapErrorBoundary] Erro capturado:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleNavigateBack = () => {
    if (this.props.onNavigateBack) {
      this.props.onNavigateBack();
    } else {
      window.location.href = '/modules';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4 p-6">
          <AlertTriangle className="h-16 w-16 text-destructive" />
          <h2 className="text-xl font-semibold text-foreground">Erro ao renderizar o mapa</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Ocorreu um erro inesperado ao carregar o mapa estratégico. 
            Por favor, tente recarregar a página.
          </p>
          {this.state.error && (
            <details className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md max-w-md">
              <summary className="cursor-pointer">Detalhes técnicos</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <div className="flex gap-3 mt-4">
            <Button onClick={this.handleReload} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Recarregar Página
            </Button>
            <Button variant="outline" onClick={this.handleNavigateBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar aos Módulos
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
