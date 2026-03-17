import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; componentStack?: string; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.setState({ componentStack: info.componentStack });
    // Report error to API if available
    this.reportError(error, info);
  }

  private reportError(error: Error, info: ErrorInfo): void {
    const payload = {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      timestamp: new Date().toISOString(),
    };
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Silent fail if reporting endpoint unavailable
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: '2rem', background: '#3d444d', borderRadius: '0.375rem', border: '1px solid #f85149' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '1.5rem' }}>⚠️</div>
            <h2 style={{ margin: 0, color: '#f85149' }}>Dashboard Error</h2>
          </div>
          <p style={{ color: '#8b949e', margin: '0 0 1rem 0', fontSize: '0.875rem' }}>
            Something went wrong. Please refresh the page or try again.
          </p>
          <details style={{ marginBottom: '1rem' }}>
            <summary style={{ cursor: 'pointer', color: '#8b949e', fontSize: '0.875rem' }}>Error details</summary>
            <pre style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: '0.5rem', overflow: 'auto', maxHeight: '200px', background: '#21262d', padding: '0.75rem', borderRadius: '0.25rem' }}>
              {this.state.error?.message}
              {this.state.componentStack && `\n\nComponent Stack:\n${this.state.componentStack}`}
            </pre>
          </details>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => this.setState({ hasError: false })}
              style={{ padding: '0.5rem 1rem', background: '#1f6feb', color: '#e6edf3', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>
              Try Again
            </button>
            <button onClick={() => window.location.reload()}
              style={{ padding: '0.5rem 1rem', background: '#21262d', color: '#e6edf3', border: '1px solid #30363d', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
