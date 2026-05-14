import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Stops an uncaught render error from blanking the venue display.
// The fallback is intentionally minimal — a dim card on the bg-base
// background so the screen doesn't go full black at an event.
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    void window.log?.error('renderer_crashed', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  override render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          style={{
            position: 'fixed',
            inset: 0,
            background: '#141418',
            color: '#F0EAF5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '5%',
            fontFamily: "'Space Mono', monospace",
          }}
        >
          <div style={{ maxWidth: 800, textAlign: 'center', opacity: 0.5 }}>
            <div
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(28px, 4vw, 56px)',
                letterSpacing: 4,
                marginBottom: 16,
              }}
            >
              VIBES
            </div>
            <div style={{ fontSize: 14, opacity: 0.7 }}>
              Player encountered an issue. Logs written to spaces.log.
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
