import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props  { children: ReactNode }
interface State  { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message:  error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: 12,
          fontFamily: 'sans-serif', background: '#0f0f0f', color: '#f5f5f5',
        }}>
          <p style={{ fontSize: 14, opacity: 0.5 }}>Something went wrong</p>
          <p style={{ fontSize: 12, opacity: 0.35, maxWidth: 400, textAlign: 'center' }}>
            {this.state.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            style={{
              marginTop: 8, padding: '8px 20px', border: '1px solid #444',
              borderRadius: 8, background: 'transparent', color: '#f5f5f5',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
