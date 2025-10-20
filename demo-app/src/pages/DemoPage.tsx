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
import { NodeTypesPanel } from '../components/NodeTypesPanel'
import { parseDAG } from '../lib/effect-dag/dag-config'
import type { DagConfigType } from '../lib/effect-dag/dag-config'
import { dagExamples, type DagExample } from '../examples'

export function DemoPage() {
  const [selectedExample, setSelectedExample] = useState<DagExample>(dagExamples[0])
  const [dag, setDag] = useState<DagConfigType | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | undefined>()

  useEffect(() => {
    // Parse and validate the selected example DAG
    Effect.runPromise(parseDAG(selectedExample.dag))
      .then(setDag)
      .catch(setError)
  }, [selectedExample])

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
      <div className="container mx-auto px-4 py-8 max-w-[1600px]">
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

        {/* Example Selector */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Examples</h2>
            <span className="text-sm text-muted-foreground">{dagExamples.length} available</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dagExamples.map(example => (
              <button
                key={example.id}
                onClick={() => setSelectedExample(example)}
                className={`
                  text-left p-4 rounded-lg border-2 transition-all
                  ${selectedExample.id === example.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 bg-card'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{example.name}</h3>
                  <span className="text-xs px-2 py-1 rounded bg-muted">
                    {example.category}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {example.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {example.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded bg-muted/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - DAG Visualization and IR */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">DAG Visualization</h2>
                <div className="text-sm text-muted-foreground">
                  Click nodes to highlight
                </div>
              </div>
              <DagVisualization
                dag={dag}
                highlightedNodeId={highlightedNodeId}
                onNodeClick={setHighlightedNodeId}
              />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Intermediate Representation (IR)</h2>
              <p className="text-muted-foreground mb-4">
                All IR objects are validated using Effect Schema and can be serialized to JSON/YAML.
              </p>
              <IrObjectPreview
                dag={dag}
                highlightedNodeId={highlightedNodeId}
                onNodeClick={setHighlightedNodeId}
              />
            </section>
          </div>

          {/* Right Column - Node Types Panel */}
          <div className="lg:col-span-1">
            <NodeTypesPanel dag={dag} />
          </div>
        </main>
      </div>
    </div>
  )
}
