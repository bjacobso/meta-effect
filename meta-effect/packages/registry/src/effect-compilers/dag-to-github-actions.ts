/**
 * DAG to GitHub Actions Compiler
 *
 * Compiles workflow DAGs to GitHub Actions YAML structure. Maps tasks to jobs,
 * gates to if conditions, and handles dependencies, secrets, and triggers.
 *
 * @example
 * ```ts
 * import { compileDagToGitHubActions } from './lib/effect-compilers/dag-to-github-actions'
 * import { Effect } from 'effect'
 * import YAML from 'yaml'
 *
 * const dag = {
 *   name: "build_and_release",
 *   version: "1.0.0",
 *   triggers: [{ _tag: "push", branches: ["main"] }],
 *   nodes: [
 *     { _tag: "task", id: "build", run: "pnpm build" },
 *     { _tag: "gate", id: "only_main", condition: "github.ref == 'refs/heads/main'" },
 *     { _tag: "task", id: "deploy", run: "pnpm deploy" }
 *   ],
 *   edges: [
 *     { from: "build", to: "only_main" },
 *     { from: "only_main", to: "deploy" }
 *   ]
 * }
 *
 * const program = Effect.gen(function*() {
 *   const workflow = yield* compileDagToGitHubActions(dag)
 *   const yaml = YAML.stringify(workflow)
 *   console.log(yaml)
 * })
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import * as Effect from "effect/Effect";
import type { DagConfigType } from "../effect-ci/dag-config.js";
import type { Node, Trigger } from "../effect-ci/dag-types.js";
import { CompilerError } from "./compiler-service.js";

/**
 * GitHub Actions workflow structure
 */
export interface GitHubActionsWorkflow {
  name: string;
  on: Record<string, any>;
  jobs: Record<string, GitHubActionsJob>;
}

export interface GitHubActionsJob {
  "runs-on": string;
  needs?: string[];
  if?: string;
  steps: Array<{
    name: string;
    uses?: string;
    run?: string;
    env?: Record<string, string>;
  }>;
}

/**
 * Compile DAG to GitHub Actions workflow
 */
export const compileDagToGitHubActions = (
  dag: DagConfigType
): Effect.Effect<GitHubActionsWorkflow, CompilerError> =>
  Effect.gen(function* () {
    const jobs: Record<string, any> = {};

    // Build jobs from task nodes
    for (const node of dag.nodes) {
      if (node._tag === "task") {
        const needs = getTaskDependencies(node.id, dag);
        const condition = getTaskCondition(node.id, dag);

        jobs[node.id] = {
          "runs-on": "ubuntu-latest",
          ...(needs.length > 0 && { needs }),
          ...(condition && { if: condition }),
          steps: [
            {
              name: node.id,
              ...(node.uses && { uses: node.uses }),
              ...(node.run && { run: node.run }),
              ...(node.env || node.secrets
                ? { env: compileEnv(node.env, node.secrets) }
                : {}),
            },
          ],
        };
      }
    }

    // Build triggers
    const triggers = compileTriggers(dag.triggers);

    return {
      name: dag.name,
      on: triggers,
      jobs,
    };
  });

/**
 * Get task dependencies (needs field)
 * Recursively traverses through gates to find actual task dependencies
 */
const getTaskDependencies = (taskId: string, dag: DagConfigType): string[] => {
  const visited = new Set<string>();
  const tasks: string[] = [];

  const traverse = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const incoming = dag.edges.filter((e) => e.to === nodeId);

    for (const edge of incoming) {
      const node = dag.nodes.find((n) => n.id === edge.from);
      if (!node) continue;

      if (node._tag === "task") {
        tasks.push(edge.from);
      } else {
        // Traverse through non-task nodes (gates, fanout, fanin)
        traverse(edge.from);
      }
    }
  };

  traverse(taskId);
  return tasks;
};

/**
 * Get gate condition for a task (if field)
 */
const getTaskCondition = (
  taskId: string,
  dag: DagConfigType
): string | undefined => {
  const incomingGates = dag.edges
    .filter((e) => e.to === taskId)
    .map((e) => dag.nodes.find((n) => n.id === e.from))
    .filter((n): n is Node => n !== undefined && n._tag === "gate");

  return incomingGates.length > 0 ? incomingGates[0].condition : undefined;
};

/**
 * Compile environment variables and secrets
 */
const compileEnv = (
  env?: Record<string, string>,
  secrets?: string[]
): Record<string, string> => {
  const result: Record<string, string> = { ...env };
  secrets?.forEach((secret) => {
    result[secret] = `\${{ secrets.${secret} }}`;
  });
  return result;
};

/**
 * Compile triggers to GitHub Actions 'on' field
 */
const compileTriggers = (triggers: Trigger[]): Record<string, any> => {
  const result: Record<string, any> = {};

  for (const trigger of triggers) {
    switch (trigger._tag) {
      case "push":
        result.push = {
          ...(trigger.branches && { branches: trigger.branches }),
          ...(trigger.paths && { paths: trigger.paths }),
        };
        break;
      case "pull_request":
        result.pull_request = {
          ...(trigger.branches && { branches: trigger.branches }),
        };
        break;
      case "schedule":
        result.schedule = [{ cron: trigger.cron }];
        break;
    }
  }

  return result;
};
