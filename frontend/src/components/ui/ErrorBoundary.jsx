import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          background: '#fee2e2',
          color: '#991b1b',
          minHeight: '100vh'
        }}>
          <h1>Error</h1>
          <p>{this.state.error?.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}
