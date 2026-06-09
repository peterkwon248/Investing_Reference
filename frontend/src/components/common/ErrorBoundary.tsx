import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card p-12">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h3 className="text-title-3 text-foreground mb-1">오류가 발생했습니다</h3>
          <p className="text-body-2 text-muted-foreground mb-4 max-w-sm text-center">
            {this.state.error?.message || '예상치 못한 오류가 발생했습니다'}
          </p>
          <button
            onClick={this.handleRetry}
            className="toss-btn-secondary gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
