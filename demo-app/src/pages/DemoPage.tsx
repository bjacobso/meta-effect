/**
 * DAG Demo Page
 *
 * Demonstrates the effect-dag components with interactive visualization
 */

import { useState, useEffect } from 'react'
import { Effect } from 'effect'
import { Navigation } from '../components/Navigation'
import { DagVisualization } from '../components/DagVisualization'
import { IrObjectPreview } from '../components/IrObjectPreview'
import { exampleDAG, parseDAG } from '../lib/effect-dag/dag-config'
import type { DagConfigType } from '../lib/effect-dag/dag-config'

export function DemoPage() {
  const [dag, setDag] = useState<DagConfigType | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | undefined>()

  useEffect(() => {
    // Parse and validate the example DAG
    Effect.runPromise(parseDAG(exampleDAG))
      .then(setDag)
      .catch(setError)
  }, [])

  if (error) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-[1400px]">
          <div className="border border-destructive rounded-lg p-6 text-center space-y-4">
            <h2 className="text-xl font-semibold text-destructive">Failed to load DAG</h2>
            <p className="text-muted-foreground">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!dag) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="text-muted-foreground">Loading DAG...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-[1400px]">
        <header className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-bold">Effect DAG Visualization</h1>
          <p className="text-lg text-muted-foreground">
            Interactive demonstration of <code className="text-sm bg-muted px-2 py-1 rounded">effect-dag</code> components
          </p>
          <div className="flex gap-6 justify-center text-sm text-muted-foreground">
            <span>{dag.nodes.length} nodes</span>
            <span>{dag.edges.length} edges</span>
            <span>{dag.triggers.length} triggers</span>
          </div>
        </header>

        <main className="space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">DAG Visualization</h2>
              <div className="text-sm text-muted-foreground">
                Click nodes to highlight in IR preview below
              </div>
            </div>
            <DagVisualization
              dag={dag}
              highlightedNodeId={highlightedNodeId}
              onNodeClick={setHighlightedNodeId}
            />
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Intermediate Representation (IR) Objects</h2>
            <p className="text-muted-foreground mb-4">
              All IR objects are validated using Effect Schema and can be serialized to JSON/YAML.
            </p>
            <IrObjectPreview
              dag={dag}
              highlightedNodeId={highlightedNodeId}
              onNodeClick={setHighlightedNodeId}
            />
          </section>
        </main>
      </div>
    </div>
  )
}
