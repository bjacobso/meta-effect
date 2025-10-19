/**
 * DAG Builder Helpers
 *
 * Ergonomic builder functions for constructing DAG nodes and edges without
 * manual type casting. Provides a fluent API for building workflow definitions.
 *
 * @example
 * ```ts
 * import { task, gate, fanout, fanin, edge } from './lib/effect-ci/dag-builder'
 *
 * const nodes = [
 *   task("checkout", { uses: "actions/checkout@v4" }),
 *   gate("only_main", "github.ref == 'refs/heads/main'"),
 *   fanout("parallel_builds"),
 *   task("build_web", { run: "pnpm build --filter web" }),
 *   task("build_api", { run: "pnpm build --filter api" }),
 *   fanin("join_builds"),
 * ]
 *
 * const edges = [
 *   edge("checkout", "only_main"),
 *   edge("only_main", "parallel_builds", "expr"),
 *   edge("parallel_builds", "build_web"),
 *   edge("parallel_builds", "build_api"),
 *   edge("build_web", "join_builds"),
 *   edge("build_api", "join_builds"),
 * ]
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import type { NodeId } from "./dag-types.js";
import { TaskNode, GateNode, FanoutNode, FaninNode, Edge, RetryPolicy } from "./dag-types.js";

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
