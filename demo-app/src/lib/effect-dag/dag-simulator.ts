/**
 * DAG Simulator
 *
 * Interactive step-by-step execution of workflow DAGs for visualization and debugging.
 * Extends the interpreter with event emission and manual stepping.
 */

import { Effect, Stream } from 'effect'
import type { Node, NodeId } from './dag-types'
import type { DagConfigType } from './dag-config'

// Execution events
export type SimulationEvent =
  | { type: 'node_start'; nodeId: string; node: Node }
  | { type: 'node_complete'; nodeId: string; node: Node; result?: unknown }
  | { type: 'node_error'; nodeId: string; node: Node; error: string }
  | { type: 'gate_evaluated'; nodeId: string; passed: boolean }
  | { type: 'collect_waiting'; nodeId: string; formId: string }
  | { type: 'batch_start'; nodeIds: string[] }
  | { type: 'batch_complete'; nodeIds: string[] }
  | { type: 'simulation_complete' }

export interface SimulationState {
  currentBatch: string[]
  completedNodes: Set<string>
  activeNode: string | null
  context: Record<string, unknown>
  events: SimulationEvent[]
}

/**
 * Execute DAG in step-by-step mode, yielding events for each node
 */
export const simulateDag = (config: DagConfigType) =>
  Effect.gen(function* () {
    const events: SimulationEvent[] = []
    const context: Record<string, unknown> = {}
    const completedNodes = new Set<string>()

    // Build adjacency list and compute indegree
    const adjacency = new Map<NodeId, Array<NodeId>>()
    const indegree = new Map<NodeId, number>()
    const nodeMap = new Map<NodeId, Node>()

    // Initialize
    for (const node of config.nodes) {
      nodeMap.set(node.id, node)
      adjacency.set(node.id, [])
      indegree.set(node.id, 0)
    }

    // Build graph
    for (const edge of config.edges) {
      const neighbors = adjacency.get(edge.from) ?? []
      neighbors.push(edge.to)
      adjacency.set(edge.from, neighbors)
      indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1)
    }

    // Find zero-indegree nodes (entry points)
    let batch = config.nodes
      .map((n) => n.id)
      .filter((id) => indegree.get(id) === 0)

    // Execute batches in topological order
    while (batch.length > 0) {
      const batchIds = batch.map(id => id as string)
      events.push({ type: 'batch_start', nodeIds: batchIds })

      // Execute batch sequentially for demo purposes (easier to visualize)
      for (const nodeId of batch) {
        const node = nodeMap.get(nodeId)
        if (!node) continue

        events.push({ type: 'node_start', nodeId: nodeId as string, node })

        // Simulate execution based on node type
        try {
          switch (node._tag) {
            case 'task':
              // Mock task execution - just delay
              yield* Effect.sleep(500)
              events.push({
                type: 'node_complete',
                nodeId: nodeId as string,
                node,
                result: { status: 'success' },
              })
              break

            case 'gate':
              // Mock gate evaluation - random or use simple logic
              yield* Effect.sleep(300)
              const passed = Math.random() > 0.3 // 70% pass rate for demo
              context[`gate_${nodeId}`] = passed
              events.push({ type: 'gate_evaluated', nodeId: nodeId as string, passed })
              events.push({ type: 'node_complete', nodeId: nodeId as string, node })

              if (!passed) {
                // Gate failed - mark node complete but don't propagate
                completedNodes.add(nodeId as string)
                continue
              }
              break

            case 'fanout':
              yield* Effect.sleep(200)
              events.push({ type: 'node_complete', nodeId: nodeId as string, node })
              break

            case 'fanin':
              yield* Effect.sleep(200)
              events.push({ type: 'node_complete', nodeId: nodeId as string, node })
              break

            case 'collect':
              // Mock collect - just show waiting state
              events.push({
                type: 'collect_waiting',
                nodeId: nodeId as string,
                formId: node.formId,
              })
              yield* Effect.sleep(800)
              // Auto-complete for now (will be interactive in Phase 3)
              context[`collect_${nodeId}`] = { submitted: true }
              events.push({ type: 'node_complete', nodeId: nodeId as string, node })
              break
          }

          completedNodes.add(nodeId as string)
        } catch (error) {
          events.push({
            type: 'node_error',
            nodeId: nodeId as string,
            node,
            error: String(error),
          })
        }

        // Decrement indegree of neighbors
        const neighbors = adjacency.get(nodeId) ?? []
        for (const neighbor of neighbors) {
          const newIndegree = (indegree.get(neighbor) ?? 0) - 1
          indegree.set(neighbor, newIndegree)
        }
      }

      events.push({ type: 'batch_complete', nodeIds: batchIds })

      // Find next batch (zero-indegree nodes that haven't been processed)
      const nextBatch = config.nodes
        .map((n) => n.id)
        .filter((id) => indegree.get(id) === 0 && !batch.includes(id))

      batch = nextBatch
    }

    events.push({ type: 'simulation_complete' })

    return {
      events,
      context,
      completedNodes,
    }
  })

/**
 * Create a step-by-step simulator that yields control between nodes
 */
export const createSteppedSimulator = (config: DagConfigType) => {
  // Run full simulation to get all events
  const simulationEffect = simulateDag(config)

  return {
    // Run full simulation and return all events
    runFull: () =>
      Effect.gen(function* () {
        const result = yield* simulationEffect
        return result.events
      }),

    // Get event stream for reactive UIs
    eventStream: () =>
      Stream.fromIterableEffect(
        Effect.gen(function* () {
          const result = yield* simulationEffect
          return result.events
        })
      ),
  }
}
