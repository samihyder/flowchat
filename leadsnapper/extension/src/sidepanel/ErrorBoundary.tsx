import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, color: '#dc2626', fontFamily: 'monospace', fontSize: 12 }}>
          <b>LeadSnapper crashed</b>
          <br /><br />
          {this.state.error.message}
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, fontSize: 11 }}>
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
