/**
 * Meta Effect Registry App
 *
 * Main application component for browsing vendorable Effect components
 */

import { useEffect, useState } from 'react'
import { Effect } from 'effect'
import { loadAllComponents } from '../registry-loader'
import type { ComponentWithCode } from '../registry-types'
import { RegistryTable } from './RegistryTable'

export function App() {
  const [components, setComponents] = useState<ComponentWithCode[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Effect.runPromise(loadAllComponents())
      .then(setComponents)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="text-muted-foreground">Loading registry components...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md w-full border border-destructive rounded-lg p-6 text-center space-y-4">
          <h2 className="text-xl font-semibold text-destructive">Error Loading Registry</h2>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  // Group components by type for stats
  const componentsByType = components.reduce((acc, component) => {
    acc[component.type] = (acc[component.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-[1400px]">
        {/* Header */}
        <header className="text-center mb-12 space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Meta Effect Registry
          </h1>
          <p className="text-xl text-muted-foreground">
            Vendorable Effect components for modern web frameworks
          </p>
          <div className="flex gap-6 justify-center text-sm text-muted-foreground">
            <span>{components.length} components</span>
            <span>{Object.keys(componentsByType).length} categories</span>
          </div>
        </header>

        {/* Main Content */}
        <main>
          <RegistryTable components={components} />
        </main>
      </div>
    </div>
  )
}
