/**
 * DAG Builder Helpers
 *
 * Ergonomic builder functions for constructing DAG nodes and edges without
 * manual type casting. Provides a fluent API for building workflow definitions.
 *
 * @example
 * ```ts
 * import { task, gate, fanout, fanin, edge } from './lib/effect-dag/dag-builder'
 *
 * const nodes = [
 *   task("extract", { run: "python extract.py" }),
 *   gate("quality_check", "row_count > 1000"),
 *   fanout("parallel_transform"),
 *   task("transform_a", { run: "python transform_a.py" }),
 *   task("transform_b", { run: "python transform_b.py" }),
 *   fanin("join_results"),
 * ]
 *
 * const edges = [
 *   edge("extract", "quality_check"),
 *   edge("quality_check", "parallel_transform", "expr"),
 *   edge("parallel_transform", "transform_a"),
 *   edge("parallel_transform", "transform_b"),
 *   edge("transform_a", "join_results"),
 *   edge("transform_b", "join_results"),
 * ]
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import type { NodeId } from "./dag-types";
import { TaskNode, GateNode, FanoutNode, FaninNode, Edge, RetryPolicy } from "./dag-types";

/**
 * Creates a task node that runs a shell command or uses an action
 */
export const task = (
  id: string,
  config: {
    uses?: string;
    run?: string;
    env?: Record<string, string>;
    secrets?: Array<string>;
    retry?: typeof RetryPolicy.Type;
  }
): typeof TaskNode.Type => ({
  _tag: "task",
  id: id as NodeId,
  ...config,
} as typeof TaskNode.Type);

/**
 * Creates a gate node that conditionally allows execution
 */
export const gate = (id: string, condition: string): typeof GateNode.Type => ({
  _tag: "gate",
  id: id as NodeId,
  condition,
} as typeof GateNode.Type);

/**
 * Creates a fanout node that triggers parallel execution
 */
export const fanout = (id: string): typeof FanoutNode.Type => ({
  _tag: "fanout",
  id: id as NodeId,
} as typeof FanoutNode.Type);

/**
 * Creates a fanin node that waits for parallel branches to complete
 */
export const fanin = (id: string): typeof FaninNode.Type => ({
  _tag: "fanin",
  id: id as NodeId,
} as typeof FaninNode.Type);

/**
 * Creates an edge connecting two nodes with an optional condition
 */
export const edge = (
  from: string,
  to: string,
  condition?: "expr" | "always" | "never"
): typeof Edge.Type => ({
  from: from as NodeId,
  to: to as NodeId,
  condition: condition ?? "always",
} as typeof Edge.Type);
