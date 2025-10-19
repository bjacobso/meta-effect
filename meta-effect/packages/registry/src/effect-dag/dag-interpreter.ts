/**
 * DAG Interpreter
 *
 * Local execution engine for workflow DAGs. Executes nodes in topological order
 * with support for parallel execution, retry policies, and custom task runners.
 *
 * @example
 * ```ts
 * import { runDag, TaskRunner } from './lib/effect-dag/dag-interpreter'
 * import { Effect, Context } from 'effect'
 *
 * // Define task runner
 * const runner: TaskRunner = {
 *   runTask: (task, ctx) =>
 *     Effect.gen(function*() {
 *       console.log(`Running: ${task.run}`)
 *       // Execute task...
 *     }),
 *   evaluateGate: (gate, ctx) =>
 *     Effect.succeed(ctx[gate.condition] === true),
 *   onFanout: (fanout) => Effect.log(`Fanout: ${fanout.id}`),
 *   onFanin: (fanin) => Effect.log(`Fanin: ${fanin.id}`)
 * }
 *
 * // Execute workflow
 * const program = runDag(workflow.config).pipe(
 *   Effect.provideService(TaskRunner, runner)
 * )
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import type { TaskNode, GateNode, FanoutNode, FaninNode, NodeId, Node, Edge } from "./dag-types.js";
import type { DagConfigType } from "./dag-config.js";

/**
 * Task runner service interface - dependency injection for task execution
 */
export class TaskRunner extends Context.Tag("TaskRunner")<
  TaskRunner,
  {
    readonly runTask: (
      task: typeof TaskNode.Type,
      context: Record<string, unknown>
    ) => Effect.Effect<void>;
    readonly evaluateGate: (
      gate: typeof GateNode.Type,
      context: Record<string, unknown>
    ) => Effect.Effect<boolean>;
    readonly onFanout: (fanout: typeof FanoutNode.Type) => Effect.Effect<void>;
    readonly onFanin: (fanin: typeof FaninNode.Type) => Effect.Effect<void>;
  }
>() {}

/**
 * Execute a DAG workflow using topological sorting
 */
export const runDag = (
  config: DagConfigType
): Effect.Effect<void, never, TaskRunner> =>
  Effect.gen(function* () {
    const runner = yield* TaskRunner;
    const context: Record<string, unknown> = {};

    // Build adjacency list and compute indegree
    const adjacency = new Map<NodeId, Array<NodeId>>();
    const indegree = new Map<NodeId, number>();
    const nodeMap = new Map<NodeId, Node>();

    // Initialize
    for (const node of config.nodes) {
      nodeMap.set(node.id, node);
      adjacency.set(node.id, []);
      indegree.set(node.id, 0);
    }

    // Build graph
    for (const edge of config.edges) {
      const neighbors = adjacency.get(edge.from) ?? [];
      neighbors.push(edge.to);
      adjacency.set(edge.from, neighbors);
      indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    }

    // Find zero-indegree nodes (entry points)
    let batch = config.nodes
      .map((n) => n.id)
      .filter((id) => indegree.get(id) === 0);

    // Execute batches in topological order
    while (batch.length > 0) {
      // Execute batch in parallel
      yield* Effect.forEach(
        batch,
        (nodeId) =>
          Effect.gen(function* () {
            const node = nodeMap.get(nodeId);
            if (!node) return;

            // Execute node based on type
            switch (node._tag) {
              case "task":
                yield* runner.runTask(node, context);
                break;

              case "gate": {
                const passed = yield* runner.evaluateGate(node, context);
                if (!passed) {
                  // Gate failed - don't propagate to children
                  return;
                }
                break;
              }

              case "fanout":
                yield* runner.onFanout(node);
                break;

              case "fanin":
                yield* runner.onFanin(node);
                break;
            }

            // Decrement indegree of neighbors
            const neighbors = adjacency.get(nodeId) ?? [];
            for (const neighbor of neighbors) {
              const newIndegree = (indegree.get(neighbor) ?? 0) - 1;
              indegree.set(neighbor, newIndegree);
            }
          }),
        { concurrency: "unbounded" }
      );

      // Find next batch (zero-indegree nodes)
      batch = config.nodes
        .map((n) => n.id)
        .filter((id) => indegree.get(id) === 0 && !batch.includes(id));
    }
  });
