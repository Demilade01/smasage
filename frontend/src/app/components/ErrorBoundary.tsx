'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallbackMessage?: string
}

interface State {
  hasError: boolean
  error: Error | null
  retryKey: number
}

function ErrorFallback({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-fallback glass-panel">
      <AlertCircle className="error-fallback-icon" size={48} />
      <h2 className="error-fallback-title">An unexpected error occurred</h2>
      <p className="error-fallback-message">{message}</p>
      <p className="error-fallback-hint">Try refreshing, or click Retry.</p>
      <button className="error-retry-btn" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, retryKey: 0 }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      retryKey: prev.retryKey + 1,
    }))
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          message={this.props.fallbackMessage ?? 'Something went wrong.'}
          onRetry={this.handleReset}
        />
      )
    }
    return (
      <React.Fragment key={this.state.retryKey}>
        {this.props.children}
      </React.Fragment>
    )
  }
}
