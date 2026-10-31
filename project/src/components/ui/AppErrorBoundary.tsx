import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page failed to render', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="surface max-w-md p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-error-50 text-error-600 dark:bg-error-900/30 dark:text-error-500">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">This page could not load</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Something went wrong while showing this page. Try reloading, or head back to the home page.
          </p>
          <p className="mt-3 break-words rounded-lg bg-slate-100 px-3 py-2 text-left font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {this.state.error.message}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={() => window.location.reload()}>Reload page</Button>
            <Button variant="outline" onClick={() => window.location.assign('/')}>Go to home</Button>
          </div>
        </div>
      </div>
    );
  }
}
