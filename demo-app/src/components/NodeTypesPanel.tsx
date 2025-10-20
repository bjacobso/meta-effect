/**
 * Node Types Panel Component
 *
 * Displays all available DAG node types with descriptions and usage counts
 */

import type { DagConfigType } from '../lib/effect-dag/dag-config'

interface NodeTypeInfo {
  type: string
  name: string
  description: string
  color: string
  icon: string
}

const nodeTypes: NodeTypeInfo[] = [
  {
    type: 'task',
    name: 'Task',
    description: 'Execute a command or action (run script, call API, etc.)',
    color: 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700',
    icon: '▶',
  },
  {
    type: 'gate',
    name: 'Gate',
    description: 'Conditional branching based on expression evaluation',
    color: 'bg-amber-100 dark:bg-amber-900 border-amber-300 dark:border-amber-700',
    icon: '◆',
  },
  {
    type: 'fanout',
    name: 'Fan-Out',
    description: 'Split execution into parallel branches',
    color: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700',
    icon: '⚡',
  },
  {
    type: 'fanin',
    name: 'Fan-In',
    description: 'Join parallel branches back together',
    color: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700',
    icon: '⚡',
  },
  {
    type: 'collect',
    name: 'Collect',
    description: 'Pause workflow to collect human input via forms',
    color: 'bg-cyan-100 dark:bg-cyan-900 border-cyan-300 dark:border-cyan-700',
    icon: '📋',
  },
]

interface NodeTypesPanelProps {
  dag: DagConfigType
}

export function NodeTypesPanel({ dag }: NodeTypesPanelProps) {
  const getNodeCount = (type: string): number => {
    return dag.nodes.filter(node => node._tag === type).length
  }

  const usedTypes = new Set(dag.nodes.map(node => node._tag as string))

  return (
    <div className="border rounded-lg p-6 bg-card">
      <h3 className="text-xl font-semibold mb-4">Node Types</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Available node types in the DAG system. Counts show usage in current example.
      </p>

      <div className="space-y-3">
        {nodeTypes.map(nodeType => {
          const count = getNodeCount(nodeType.type)
          const isUsed = usedTypes.has(nodeType.type)

          return (
            <div
              key={nodeType.type}
              className={`
                border-2 rounded-lg p-4 transition-all
                ${nodeType.color}
                ${isUsed ? 'opacity-100' : 'opacity-40'}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{nodeType.icon}</span>
                  <div>
                    <h4 className="font-semibold">{nodeType.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {nodeType.description}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-bold">{count}</span>
                  <span className="text-xs text-muted-foreground">
                    {count === 1 ? 'node' : 'nodes'}
                  </span>
                </div>
              </div>

              {isUsed && (
                <div className="mt-3 pt-3 border-t border-current/20">
                  <code className="text-xs bg-muted/50 px-2 py-1 rounded">
                    _tag: "{nodeType.type}"
                  </code>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 pt-6 border-t">
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Total Nodes:</strong> {dag.nodes.length}</p>
          <p><strong>Total Edges:</strong> {dag.edges.length}</p>
          <p><strong>Node Types Used:</strong> {usedTypes.size} of {nodeTypes.length}</p>
        </div>
      </div>
    </div>
  )
}
