import React from 'react'

/**
 * Enterprise-grade Error Boundary for SETU-ADAM01
 * Catches unhandled runtime exceptions during React rendering, preventing
 * blank screen crashes and offering an operational recovery interface.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SETU ErrorBoundary] Unhandled component exception:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    try {
      localStorage.removeItem('setu_user_location')
    } catch {
      // Ignore localStorage errors
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100dvh',
            width: '100vw',
            background: '#070c14',
            color: '#f8fafc',
            padding: '20px',
            boxSizing: 'border-box',
            fontFamily: 'Inter, -apple-system, sans-serif',
            textAlign: 'center'
          }}
          role="alert"
        >
          <div
            style={{
              maxWidth: '420px',
              background: 'rgba(13, 20, 32, 0.9)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '14px',
              padding: '24px 20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                borderRadius: '20px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#ef4444',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}
            >
              Telemetric System Alert
            </div>

            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '8px',
                letterSpacing: '-0.02em'
              }}
            >
              SETU Terminal Recovery
            </h2>

            <p
              style={{
                fontSize: '12px',
                color: '#94a3b8',
                lineHeight: 1.5,
                marginBottom: '20px'
              }}
            >
              A transient telemetry rendering error was intercepted. Your operational session can be restored immediately without data loss.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#38bdf8',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Retry View
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  background: '#38bdf8',
                  border: 'none',
                  color: '#070c14',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Reset Station
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
