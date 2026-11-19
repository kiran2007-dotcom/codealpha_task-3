import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center p-6">
          <div className="max-w-lg w-full border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-400 mb-4">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Something went wrong
              </h1>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
              ConnectSphere encountered an error while syncing with the database.
            </p>
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 mb-6 overflow-x-auto">
              <code className="text-xs font-mono text-zinc-700 dark:text-zinc-300 break-all">
                {this.state.errorMessage}
              </code>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
