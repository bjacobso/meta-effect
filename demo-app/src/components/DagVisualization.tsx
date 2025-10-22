/**
 * DAG Visualization Component
 *
 * Renders a workflow DAG with nodes and edges using React Flow
 */

import { useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node as FlowNode,
  type Edge as FlowEdge,
} from '@xyflow/react'
import type { Node, Edge } from '../lib/effect-dag/dag-types'
import type { DagConfigType } from '../lib/effect-dag/dag-config'

interface DagVisualizationProps {
  dag: DagConfigType
  highlightedNodeId?: string
  onNodeClick?: (nodeId: string) => void
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
    case 'collect':
      return { bg: 'bg-cyan-100 dark:bg-cyan-900', border: 'border-cyan-300 dark:border-cyan-700', text: 'text-cyan-900 dark:text-cyan-100' }
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-900', border: 'border-gray-300 dark:border-gray-700', text: 'text-gray-900 dark:text-gray-100' }
  }
}

// Custom node component
function DagNode({ data }: { data: { node: Node; isHighlighted: boolean; onClick: () => void } }) {
  const colors = getNodeColor(data.node._tag)

  return (
    <>
      {/* Input handle (left side) */}
      <Handle type="target" position={Position.Left} />

      <div
        onClick={data.onClick}
        className={`
          ${colors.bg} ${colors.border} border-2 rounded-lg p-3 min-w-[160px]
          ${data.isHighlighted ? '!border-4 !border-primary ring-2 ring-primary/50' : ''}
          transition-all cursor-pointer hover:scale-105 shadow-md
        `}
      >
        <div className={`text-xs font-semibold mb-1 ${colors.text}`}>
          {data.node._tag.toUpperCase()}
        </div>
        <div className={`text-sm font-mono ${colors.text} truncate`}>
          {data.node.id}
        </div>
        {data.node._tag === 'task' && data.node.run && (
          <div className="text-xs text-muted-foreground truncate mt-1">
            {data.node.run.split(' ')[0]}
          </div>
        )}
        {data.node._tag === 'task' && data.node.uses && (
          <div className="text-xs text-muted-foreground truncate mt-1">
            {data.node.uses.split('@')[0]}
          </div>
        )}
        {data.node._tag === 'collect' && (
          <div className="text-xs text-muted-foreground truncate mt-1">
            {data.node.formId}
          </div>
        )}
      </div>

      {/* Output handle (right side) */}
      <Handle type="source" position={Position.Right} />
    </>
  )
}

const nodeTypes = {
  dagNode: DagNode,
}

// Simple layered layout algorithm
function computeLayout(nodes: readonly Node[], edges: readonly Edge[]): Map<string, { x: number; y: number }> {
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
  const positions = new Map<string, { x: number; y: number }>()
  const layerGap = 250
  const nodeGap = 120

  layers.forEach((layer, layerIdx) => {
    layer.forEach((nodeId, nodeIdx) => {
      positions.set(nodeId, {
        x: layerIdx * layerGap,
        y: nodeIdx * nodeGap,
      })
    })
  })

  return positions
}

export function DagVisualization({ dag, highlightedNodeId, onNodeClick }: DagVisualizationProps) {
  // Convert DAG to React Flow format
  const { initialNodes, initialEdges } = useMemo(() => {
    const positions = computeLayout(dag.nodes, dag.edges)

    const flowNodes: FlowNode[] = dag.nodes.map((node) => {
      const pos = positions.get(node.id) || { x: 0, y: 0 }
      return {
        id: node.id,
        type: 'dagNode',
        position: pos,
        data: {
          node,
          isHighlighted: node.id === highlightedNodeId,
          onClick: () => onNodeClick?.(node.id),
        },
      }
    })

    const flowEdges: FlowEdge[] = dag.edges.map((edge, idx) => ({
      id: `${edge.from}-${edge.to}-${idx}`,
      source: String(edge.from),
      target: String(edge.to),
      type: 'smoothstep',
      animated: edge.condition === 'expr',
      label: edge.condition === 'expr' ? 'conditional' : undefined,
      style: {
        stroke: edge.condition === 'expr' ? '#f59e0b' : '#9ca3af',
        strokeWidth: 2,
      },
      labelStyle: {
        fill: '#f59e0b',
        fontSize: 12,
      },
      markerEnd: {
        type: 'arrowclosed',
        color: edge.condition === 'expr' ? '#f59e0b' : '#9ca3af',
      },
    }))

    return { initialNodes: flowNodes, initialEdges: flowEdges }
  }, [dag, highlightedNodeId, onNodeClick])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes when DAG or highlight changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isHighlighted: node.id === highlightedNodeId,
        },
      }))
    )
  }, [highlightedNodeId, setNodes])

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [dag, initialNodes, initialEdges, setNodes, setEdges])

  return (
    <div className="relative w-full h-[600px] border rounded-lg bg-muted/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const dagNode = dag.nodes.find(n => n.id === node.id)
            if (!dagNode) return '#e5e7eb'
            const colors = getNodeColor(dagNode._tag)
            return colors.border.includes('blue') ? '#60a5fa' :
                   colors.border.includes('amber') ? '#fbbf24' :
                   colors.border.includes('purple') ? '#a78bfa' :
                   colors.border.includes('green') ? '#34d399' :
                   colors.border.includes('cyan') ? '#06b6d4' :
                   '#9ca3af'
          }}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  )
}
