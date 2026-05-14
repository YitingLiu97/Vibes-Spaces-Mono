'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // Best-effort surface to the console; integrate with Axiom / Better Stack later.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  override render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return (
        <div
          role="alert"
          className="m-5 rounded-lg border border-danger/40 bg-danger-soft p-5 text-sm text-fg-primary"
        >
          <div className="text-base font-semibold mb-2">Something went wrong.</div>
          <pre className="font-mono text-xs whitespace-pre-wrap break-words text-fg-secondary mb-3">
            {this.state.error.message}
          </pre>
          <button
            onClick={this.reset}
            className="rounded border border-border bg-bg-base px-3 py-2 text-xs uppercase tracking-wider font-mono text-fg-primary hover:border-accent"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
