/**
 * DAG to AWS Step Functions Compiler
 *
 * Compiles workflow DAGs to AWS Step Functions ASL (Amazon States Language).
 * Maps tasks to Task states, gates to Choice states, and handles parallel execution.
 *
 * @example
 * ```ts
 * import { compileDagToStepFunctions } from './lib/effect-compilers/dag-to-step-functions'
 * import { Effect } from 'effect'
 *
 * const dag = {
 *   name: "build_and_release",
 *   version: "1.0.0",
 *   triggers: [{ _tag: "push", branches: ["main"] }],
 *   nodes: [
 *     { _tag: "task", id: "build", run: "pnpm build" },
 *     { _tag: "gate", id: "only_main", condition: "$.ref == 'refs/heads/main'" },
 *     { _tag: "task", id: "deploy", run: "pnpm deploy" }
 *   ],
 *   edges: [
 *     { from: "build", to: "only_main" },
 *     { from: "only_main", to: "deploy" }
 *   ]
 * }
 *
 * const program = Effect.gen(function*() {
 *   const stateMachine = yield* compileDagToStepFunctions(dag)
 *   console.log(JSON.stringify(stateMachine, null, 2))
 * })
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import * as Effect from "effect/Effect";
import type { DagConfigType } from "../effect-ci/dag-config.js";
import type { Node } from "../effect-ci/dag-types.js";
import { CompilerError } from "./compiler-service.js";

/**
 * AWS Step Functions state machine structure
 */
export interface StepFunctionsStateMachine {
  Comment: string;
  StartAt: string;
  States: Record<string, StepFunctionsState>;
}

export type StepFunctionsState =
  | TaskState
  | ChoiceState
  | SucceedState
  | ParallelState;

export interface TaskState {
  Type: "Task";
  Resource: string;
  Parameters?: Record<string, any>;
  Next?: string;
  End?: boolean;
}

export interface ChoiceState {
  Type: "Choice";
  Choices: Array<{
    Variable: string;
    StringEquals?: string;
    Next: string;
  }>;
  Default?: string;
}

export interface SucceedState {
  Type: "Succeed";
}

export interface ParallelState {
  Type: "Parallel";
  Branches: Array<{ StartAt: string; States: Record<string, StepFunctionsState> }>;
  Next?: string;
  End?: boolean;
}

/**
 * Compile DAG to AWS Step Functions state machine
 */
export const compileDagToStepFunctions = (
  dag: DagConfigType
): Effect.Effect<StepFunctionsStateMachine, CompilerError> =>
  Effect.gen(function* () {
    const states: Record<string, StepFunctionsState> = {};

    // Find start node (first task node without incoming edges)
    const startNode = dag.nodes.find(
      (n) =>
        n._tag === "task" && !dag.edges.some((e) => e.to === n.id)
    );

    if (!startNode) {
      yield* Effect.fail(
        new CompilerError({
          _tag: "CompilerError" as const,
          phase: "validation" as const,
          message: "No start node found (task without incoming edges)",
          source: dag,
        })
      );
    }

    // Build states
    for (const node of dag.nodes) {
      const next = getNextState(node.id, dag);

      switch (node._tag) {
        case "task":
          states[node.id] = {
            Type: "Task",
            Resource: "arn:aws:states:::lambda:invoke",
            Parameters: {
              FunctionName: `${node.id}-function`,
              Payload: {
                command: node.run || node.uses,
                env: node.env || {},
              },
            },
            ...(next ? { Next: next } : { End: true }),
          };
          break;

        case "gate":
          const gateNext = getNextState(node.id, dag);
          states[node.id] = {
            Type: "Choice",
            Choices: [
              {
                Variable: "$.ref",
                StringEquals: extractGateValue(node.condition),
                Next: gateNext || "SuccessState",
              },
            ],
            Default: "SuccessState",
          };
          break;

        case "fanout":
          // Fanout creates a Parallel state
          const branches = getParallelBranches(node.id, dag);
          states[node.id] = {
            Type: "Parallel",
            Branches: branches.map((branchNodeId) => ({
              StartAt: branchNodeId,
              States: {
                [branchNodeId]: states[branchNodeId] || {
                  Type: "Succeed",
                },
              },
            })),
            ...(next ? { Next: next } : { End: true }),
          };
          break;

        case "fanin":
          // Fanin is implicit in Step Functions (Parallel state completes when all branches complete)
          // We just create a pass-through succeed state
          states[node.id] = {
            Type: "Succeed",
          };
          break;
      }
    }

    // Add success state if referenced
    if (
      Object.values(states).some(
        (s) =>
          (s as ChoiceState).Default === "SuccessState" ||
          (s as ChoiceState).Choices?.some((c) => c.Next === "SuccessState")
      )
    ) {
      states["SuccessState"] = {
        Type: "Succeed",
      };
    }

    return {
      Comment: dag.name,
      StartAt: startNode!.id,
      States: states,
    };
  });

/**
 * Get the next state for a node
 */
const getNextState = (nodeId: string, dag: DagConfigType): string | undefined => {
  const outgoingEdge = dag.edges.find((e) => e.from === nodeId);
  return outgoingEdge?.to;
};

/**
 * Extract value from gate condition (simplified)
 */
const extractGateValue = (condition: string): string => {
  // Simple extraction: "$.ref == 'refs/heads/main'" -> "refs/heads/main"
  const match = condition.match(/['"]([^'"]+)['"]/);
  return match ? match[1] : condition;
};

/**
 * Get parallel branches from fanout node
 */
const getParallelBranches = (fanoutId: string, dag: DagConfigType): string[] => {
  return dag.edges
    .filter((e) => e.from === fanoutId)
    .map((e) => e.to);
};
