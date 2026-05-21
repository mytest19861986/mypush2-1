'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertTriangle className="size-8 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground">خطایی رخ داده است</p>
              <p className="text-sm text-muted-foreground mt-1">
                لطفاً دوباره تلاش کنید
              </p>
              {this.state.error?.message && (
                <p className="text-xs text-destructive/70 mt-2 font-mono bg-destructive/5 rounded-lg p-2 text-right" dir="ltr">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button onClick={this.handleReset} variant="outline" size="sm">
                <RotateCcw className="ml-2 size-4" />
                تلاش مجدد
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                بارگذاری مجدد صفحه
              </Button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
