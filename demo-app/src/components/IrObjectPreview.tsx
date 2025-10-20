/**
 * IR Object Preview Component
 *
 * Displays DAG intermediate representation objects in expandable cards
 */

import { useState } from 'react'
import type { Node, Edge, Trigger } from '../lib/effect-dag/dag-types'
import type { DagConfigType } from '../lib/effect-dag/dag-config'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface IrSectionProps {
  title: string
  count: number
  children: React.ReactNode
  defaultExpanded?: boolean
}

function IrSection({ title, count, children, defaultExpanded = false }: IrSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-muted/50 hover:bg-muted transition-colors flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-semibold">{title}</span>
          <span className="text-sm text-muted-foreground">({count})</span>
        </div>
      </button>
      {expanded && (
        <div className="p-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

interface NodeCardProps {
  node: Node
  onClick?: () => void
  highlighted?: boolean
}

function NodeCard({ node, onClick, highlighted }: NodeCardProps) {
  return (
    <div
      onClick={onClick}
      className={`border rounded p-3 space-y-1 transition-colors ${
        onClick ? 'cursor-pointer hover:bg-muted/50' : ''
      } ${highlighted ? 'ring-2 ring-primary bg-primary/5' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold">{node.id}</span>
        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
          {node._tag}
        </span>
      </div>

      {node._tag === 'task' && (
        <div className="text-sm text-muted-foreground space-y-0.5">
          {node.uses && <div><span className="font-medium">uses:</span> {node.uses}</div>}
          {node.run && <div><span className="font-medium">run:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded">{node.run}</code></div>}
          {node.env && <div><span className="font-medium">env:</span> {Object.keys(node.env).length} vars</div>}
          {node.secrets && <div><span className="font-medium">secrets:</span> {node.secrets.join(', ')}</div>}
        </div>
      )}

      {node._tag === 'gate' && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">condition:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded">{node.condition}</code>
        </div>
      )}
    </div>
  )
}

interface EdgeCardProps {
  edge: Edge
  onClick?: () => void
}

function EdgeCard({ edge, onClick }: EdgeCardProps) {
  return (
    <div
      onClick={onClick}
      className={`border rounded p-3 space-y-1 ${onClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono">{edge.from}</span>
        <span className="text-muted-foreground">→</span>
        <span className="font-mono">{edge.to}</span>
        {edge.condition !== 'always' && (
          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
            {edge.condition}
          </span>
        )}
      </div>
    </div>
  )
}

interface TriggerCardProps {
  trigger: Trigger
}

function TriggerCard({ trigger }: TriggerCardProps) {
  return (
    <div className="border rounded p-3 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          {trigger._tag}
        </span>
      </div>
      <div className="text-sm text-muted-foreground">
        {trigger._tag === 'push' && trigger.branches && (
          <div><span className="font-medium">branches:</span> {trigger.branches.join(', ')}</div>
        )}
        {trigger._tag === 'pull_request' && trigger.branches && (
          <div><span className="font-medium">branches:</span> {trigger.branches.join(', ')}</div>
        )}
        {trigger._tag === 'schedule' && (
          <div><span className="font-medium">cron:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded">{trigger.cron}</code></div>
        )}
      </div>
    </div>
  )
}

interface IrObjectPreviewProps {
  dag: DagConfigType
  highlightedNodeId?: string
  onNodeClick?: (nodeId: string) => void
}

export function IrObjectPreview({ dag, highlightedNodeId, onNodeClick }: IrObjectPreviewProps) {
  return (
    <div className="space-y-4">
      <IrSection title="Triggers" count={dag.triggers.length} defaultExpanded>
        {dag.triggers.map((trigger, idx) => (
          <TriggerCard key={idx} trigger={trigger} />
        ))}
      </IrSection>

      <IrSection title="Nodes" count={dag.nodes.length} defaultExpanded>
        {dag.nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            onClick={onNodeClick ? () => onNodeClick(node.id) : undefined}
            highlighted={node.id === highlightedNodeId}
          />
        ))}
      </IrSection>

      <IrSection title="Edges" count={dag.edges.length} defaultExpanded>
        {dag.edges.map((edge, idx) => (
          <EdgeCard key={idx} edge={edge} />
        ))}
      </IrSection>

      {dag.defaults && (
        <IrSection title="Defaults" count={1}>
          <div className="border rounded p-3 space-y-2 text-sm">
            {dag.defaults.retry && (
              <div>
                <span className="font-medium">Retry Policy:</span>
                <div className="ml-4 text-muted-foreground space-y-0.5">
                  <div>Max attempts: {dag.defaults.retry.maxAttempts}</div>
                  {dag.defaults.retry.backoff && (
                    <div>
                      Backoff: {dag.defaults.retry.backoff._tag}
                      (base: {dag.defaults.retry.backoff.baseDelayMs}ms,
                      factor: {dag.defaults.retry.backoff.factor},
                      max: {dag.defaults.retry.backoff.maxDelayMs}ms)
                    </div>
                  )}
                </div>
              </div>
            )}
            {dag.defaults.env && (
              <div>
                <span className="font-medium">Environment:</span>
                <div className="ml-4 text-muted-foreground">
                  {Object.entries(dag.defaults.env).map(([key, value]) => (
                    <div key={key}>{key}: {value}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </IrSection>
      )}
    </div>
  )
}
