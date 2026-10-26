import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 text-amber-400">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-serif text-amber-200 mb-2">
            SPA EXPERIENCE
          </h1>
          <p className="text-zinc-400 max-w-md text-sm mb-6 leading-relaxed">
            Houve uma interrupção inesperada ao carregar a aplicação. Recarregue a página para tentar novamente.
          </p>
          {this.state.error && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 max-w-lg text-left text-xs text-red-400 font-mono mb-6 overflow-auto max-h-32">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-sm rounded-lg shadow-lg transition-all cursor-pointer"
          >
            <RefreshCw size={16} />
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
