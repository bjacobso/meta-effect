/**
 * DAG Visualization Component
 *
 * Renders a workflow DAG with nodes and edges using SVG
 */

import { useEffect, useRef, useState } from 'react'
import type { Node, Edge } from '../lib/effect-dag/dag-types'
import type { DagConfigType } from '../lib/effect-dag/dag-config'

interface NodePosition {
  id: string
  x: number
  y: number
  node: Node
}

interface DagVisualizationProps {
  dag: DagConfigType
  highlightedNodeId?: string
  onNodeClick?: (nodeId: string) => void
}

// Simple layered layout algorithm
function computeLayout(nodes: readonly Node[], edges: readonly Edge[]): NodePosition[] {
  const nodeMap = new Map(nodes.map(n => [n.id as string, n]))
  const inDegree = new Map<string, number>()
  const outgoing = new Map<string, string[]>()

  // Initialize
  nodes.forEach(n => {
    inDegree.set(n.id as string, 0)
    outgoing.set(n.id as string, [])
  })

  // Build graph
  edges.forEach(e => {
    inDegree.set(e.to as string, (inDegree.get(e.to as string) || 0) + 1)
    outgoing.get(e.from as string)?.push(e.to as string)
  })

  // Topological sort by layers
  const layers: string[][] = []
  const remaining = new Set(nodes.map(n => n.id as string))
  const currentInDegree = new Map(inDegree)

  while (remaining.size > 0) {
    const layer = Array.from(remaining).filter(id => currentInDegree.get(id) === 0)
    if (layer.length === 0) break // Cycle detected or no more nodes

    layers.push(layer)
    layer.forEach(id => {
      remaining.delete(id)
      outgoing.get(id)?.forEach(targetId => {
        currentInDegree.set(targetId, (currentInDegree.get(targetId) || 0) - 1)
      })
    })
  }

  // Position nodes
  const positions: NodePosition[] = []
  const layerGap = 200
  const nodeGap = 100

  layers.forEach((layer, layerIdx) => {
    layer.forEach((nodeId, nodeIdx) => {
      const node = nodeMap.get(nodeId)!
      positions.push({
        id: nodeId as string,
        x: layerIdx * layerGap + 100,
        y: nodeIdx * nodeGap + 100,
        node,
      })
    })
  })

  return positions
}

function getNodeColor(nodeType: string): { bg: string; border: string; text: string } {
  switch (nodeType) {
    case 'task':
      return { bg: 'bg-blue-100 dark:bg-blue-900', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-900 dark:text-blue-100' }
    case 'gate':
      return { bg: 'bg-amber-100 dark:bg-amber-900', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-900 dark:text-amber-100' }
    case 'fanout':
      return { bg: 'bg-purple-100 dark:bg-purple-900', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-900 dark:text-purple-100' }
    case 'fanin':
      return { bg: 'bg-green-100 dark:bg-green-900', border: 'border-green-300 dark:border-green-700', text: 'text-green-900 dark:text-green-100' }
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-900', border: 'border-gray-300 dark:border-gray-700', text: 'text-gray-900 dark:text-gray-100' }
  }
}

export function DagVisualization({ dag, highlightedNodeId, onNodeClick }: DagVisualizationProps) {
  const [positions, setPositions] = useState<NodePosition[]>([])
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const layout = computeLayout(dag.nodes, dag.edges)
    setPositions(layout)
  }, [dag])

  // Calculate SVG dimensions
  const maxX = Math.max(...positions.map(p => p.x), 0) + 300
  const maxY = Math.max(...positions.map(p => p.y), 0) + 200

  const positionMap = new Map(positions.map(p => [p.id, p]))

  return (
    <div className="relative w-full overflow-auto border rounded-lg bg-muted/20">
      <svg
        ref={svgRef}
        width={maxX}
        height={maxY}
        className="w-full h-auto"
        style={{ minHeight: '400px' }}
      >
        {/* Draw edges first (underneath nodes) */}
        <g>
          {dag.edges.map((edge, idx) => {
            const from = positionMap.get(edge.from)
            const to = positionMap.get(edge.to)
            if (!from || !to) return null

            const x1 = from.x + 80 // Center of node
            const y1 = from.y + 40
            const x2 = to.x + 80
            const y2 = to.y + 40

            // Simple straight line with arrow
            return (
              <g key={idx}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={edge.condition === 'expr' ? 'stroke-amber-500' : 'stroke-gray-400 dark:stroke-gray-600'}
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                  strokeDasharray={edge.condition === 'expr' ? '5,5' : undefined}
                />
                {edge.condition === 'expr' && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 8}
                    className="fill-amber-600 dark:fill-amber-400 text-xs"
                    textAnchor="middle"
                  >
                    conditional
                  </text>
                )}
              </g>
            )
          })}
        </g>

        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3, 0 6"
              className="fill-gray-400 dark:fill-gray-600"
            />
          </marker>
        </defs>

        {/* Draw nodes */}
        <g>
          {positions.map((pos) => {
            const colors = getNodeColor(pos.node._tag)
            const isHighlighted = pos.id === highlightedNodeId

            return (
              <g
                key={pos.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => onNodeClick?.(pos.id)}
                className="cursor-pointer"
              >
                <rect
                  width="160"
                  height="80"
                  rx="8"
                  className={`${colors.bg} ${colors.border} border-2 ${isHighlighted ? 'stroke-[4] !border-primary' : ''} transition-all hover:scale-105`}
                />
                <foreignObject width="160" height="80">
                  <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                    <div className={`text-xs font-semibold mb-1 ${colors.text}`}>
                      {pos.node._tag.toUpperCase()}
                    </div>
                    <div className={`text-sm font-mono ${colors.text} truncate w-full px-2`}>
                      {pos.id}
                    </div>
                    {pos.node._tag === 'task' && pos.node.run && (
                      <div className="text-xs text-muted-foreground truncate w-full px-2 mt-1">
                        {pos.node.run.split(' ')[0]}
                      </div>
                    )}
                    {pos.node._tag === 'task' && pos.node.uses && (
                      <div className="text-xs text-muted-foreground truncate w-full px-2 mt-1">
                        {pos.node.uses.split('@')[0]}
                      </div>
                    )}
                  </div>
                </foreignObject>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
