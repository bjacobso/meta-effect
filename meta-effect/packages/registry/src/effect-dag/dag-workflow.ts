/**
 * DAG Workflow DSL
 *
 * High-level declarative API for defining workflows, inspired by Effect's
 * RpcGroup and HttpApi patterns. Provides a fluent, schema-based interface for
 * building validated workflow definitions.
 *
 * @example
 * ```ts
 * import { Workflow, Task, Gate, Fanout, Fanin, Edge } from './lib/effect-dag/dag-workflow'
 * import { ScheduleTrigger } from './lib/effect-dag/dag-types'
 *
 * class ETLPipeline extends Workflow.make(
 *   "etl_pipeline",
 *   "1.0.0",
 *   {
 *     triggers: [ScheduleTrigger.make({ cron: "0 2 * * *" })],
 *     defaults: {
 *       retry: { maxAttempts: 3 },
 *       env: { PYTHONPATH: "/app" }
 *     }
 *   },
 *   // Nodes
 *   Task.make("extract", { run: "python extract.py" }),
 *   Gate.make("quality_check", { condition: "row_count > 1000" }),
 *   Fanout.make("parallel_transform"),
 *   Task.make("transform_a", { run: "python transform_a.py" }),
 *   Task.make("transform_b", { run: "python transform_b.py" }),
 *   Fanin.make("join_results"),
 *   Task.make("load", { run: "python load.py" }),
 *   // Edges
 *   Edge.make("extract", "quality_check"),
 *   Edge.make("quality_check", "parallel_transform", { condition: "expr" }),
 *   Edge.make("parallel_transform", "transform_a"),
 *   Edge.make("parallel_transform", "transform_b"),
 *   Edge.make("transform_a", "join_results"),
 *   Edge.make("transform_b", "join_results"),
 *   Edge.make("join_results", "load")
 * ) {}
 *
 * // Use the workflow
 * const config = ETLPipeline.config
 * const validated = parseDAGSync(config)
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { TaskNode, GateNode, FanoutNode, FaninNode, Edge as EdgeType, NodeId, Trigger, Defaults } from "./dag-types.js";
import { parseDAG, parseDAGSync, type DagConfigType } from "./dag-config.js";

/**
 * Task node builder with .make() API
 */
export class Task {
  /**
   * Create a task node that runs a shell command or uses an action
   */
  static make(
    id: string,
    config: {
      uses?: string;
      run?: string;
      env?: Record<string, string>;
      secrets?: Array<string>;
      retry?: {
        maxAttempts: number;
        backoff?: {
          _tag: "exponential";
          baseDelayMs: number;
          factor: number;
          maxDelayMs: number;
        };
      };
    }
  ): typeof TaskNode.Type {
    return {
      _tag: "task",
      id: id as NodeId,
      ...config,
    } as typeof TaskNode.Type;
  }
}

/**
 * Gate node builder with .make() API
 */
export class Gate {
  /**
   * Create a gate node that conditionally allows execution
   */
  static make(id: string, config: { condition: string }): typeof GateNode.Type {
    return {
      _tag: "gate",
      id: id as NodeId,
      condition: config.condition,
    } as typeof GateNode.Type;
  }
}

/**
 * Fanout node builder with .make() API
 */
export class Fanout {
  /**
   * Create a fanout node that triggers parallel execution
   */
  static make(id: string): typeof FanoutNode.Type {
    return {
      _tag: "fanout",
      id: id as NodeId,
    } as typeof FanoutNode.Type;
  }
}

/**
 * Fanin node builder with .make() API
 */
export class Fanin {
  /**
   * Create a fanin node that waits for parallel branches to complete
   */
  static make(id: string): typeof FaninNode.Type {
    return {
      _tag: "fanin",
      id: id as NodeId,
    } as typeof FaninNode.Type;
  }
}

/**
 * Edge builder with .make() API
 */
export class Edge {
  /**
   * Create an edge connecting two nodes with an optional condition
   */
  static make(
    from: string,
    to: string,
    config?: { condition?: "expr" | "always" | "never" }
  ): typeof EdgeType.Type {
    return {
      from: from as NodeId,
      to: to as NodeId,
      condition: config?.condition ?? "always",
    } as typeof EdgeType.Type;
  }
}

/**
 * Node type - union of all node builders
 */
type Node = typeof TaskNode.Type | typeof GateNode.Type | typeof FanoutNode.Type | typeof FaninNode.Type;

/**
 * Element type - can be a node or an edge
 */
type Element = Node | typeof EdgeType.Type;

/**
 * Workflow configuration options
 */
interface WorkflowConfig {
  triggers: ReadonlyArray<Trigger>;
  defaults?: typeof Defaults.Type;
}

/**
 * Workflow class - groups nodes and edges into a validated DAG workflow
 */
export class Workflow {
  /**
   * Create a new workflow with nodes and edges
   *
   * @example
   * ```ts
   * class MyWorkflow extends Workflow.make(
   *   "my-workflow",
   *   "1.0.0",
   *   { triggers: [PushTrigger.make({ branches: ["main"] })] },
   *   Task.make("checkout", { uses: "actions/checkout@v4" }),
   *   Edge.make("checkout", "build")
   * ) {}
   * ```
   */
  static make<const Elements extends ReadonlyArray<Element>>(
    name: string,
    version: string,
    config: WorkflowConfig,
    ...elements: Elements
  ) {
    // Separate nodes and edges from elements
    const nodes: Array<Node> = [];
    const edges: Array<typeof EdgeType.Type> = [];

    for (const element of elements) {
      if ("from" in element && "to" in element) {
        // It's an edge
        edges.push(element as typeof EdgeType.Type);
      } else {
        // It's a node
        nodes.push(element as Node);
      }
    }

    // Create the DAG config
    const dagConfig: DagConfigType = {
      name,
      version,
      triggers: config.triggers,
      defaults: config.defaults,
      nodes,
      edges,
    };

    return class {
      /**
       * The validated workflow configuration
       */
      static readonly config = dagConfig;

      /**
       * Parse and validate the workflow (Effect-based)
       */
      static readonly parse = () => parseDAG(dagConfig);

      /**
       * Parse and validate the workflow (sync, throws on error)
       */
      static readonly parseSync = () => parseDAGSync(dagConfig);
    };
  }
}
