import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '40px 24px',
            margin: '24px auto',
            maxWidth: '600px',
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              padding: '12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-error-dim)',
              color: 'var(--color-error)',
              marginBottom: '16px',
            }}
          >
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Something went wrong</h2>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              marginBottom: '20px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="btn-primary"
            style={{ margin: '0 auto' }}
          >
            <RefreshCw size={16} />
            Reload WindDesk
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
