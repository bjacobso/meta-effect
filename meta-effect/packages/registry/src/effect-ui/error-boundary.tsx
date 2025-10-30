/**
 * Effect Error Boundary
 *
 * React Error Boundary that integrates with Effect's error handling.
 * Catches React errors and Effect failures, providing fallback UI.
 *
 * @example
 * ```tsx
 * import { ErrorBoundary } from './lib/effect-ui/error-boundary'
 * import { Cause } from 'effect'
 *
 * function App() {
 *   return (
 *     <ErrorBoundary
 *       fallback={(error, reset) => (
 *         <div>
 *           <h2>Something went wrong</h2>
 *           <pre>{Cause.pretty(error)}</pre>
 *           <button onClick={reset}>Try again</button>
 *         </div>
 *       )}
 *     >
 *       <YourApp />
 *     </ErrorBoundary>
 *   )
 * }
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import React from 'react'
import type * as Cause from 'effect/Cause'

export interface ErrorBoundaryProps {
  /** Fallback UI to render on error */
  fallback: (error: unknown, reset: () => void) => React.ReactNode
  /** Optional error logger */
  onError?: (error: unknown, errorInfo: React.ErrorInfo) => void
  /** Children to render */
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: unknown
}

/**
 * Error Boundary that works with Effect errors
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo)
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback(this.state.error, this.reset)
    }

    return this.props.children
  }
}

/**
 * Default fallback component
 */
export function DefaultErrorFallback({
  error,
  reset,
}: {
  error: unknown
  reset: () => void
}): React.ReactElement {
  return (
    <div style={{ padding: '20px', border: '1px solid red' }}>
      <h2>Error</h2>
      <pre style={{ whiteSpace: 'pre-wrap' }}>
        {error instanceof Error ? error.message : String(error)}
      </pre>
      <button onClick={reset}>Reset</button>
    </div>
  )
}
