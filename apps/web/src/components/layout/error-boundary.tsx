'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RotateCcw, MessageSquare } from 'lucide-react';

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
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-slate-100 text-xl font-bold mb-2">Algo deu errado</h2>
          <p className="text-slate-500 text-sm max-w-sm mb-6">
            Ocorreu um erro inesperado. Nossa equipe foi notificada.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Recarregar
            </button>
            <a
              href="/dashboard/feedback"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/8 border border-white/10 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Reportar
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
