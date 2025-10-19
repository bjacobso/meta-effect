/**
 * DAG Types
 *
 * Branded types and Effect Schema definitions for typed CI/CD DAG workflows.
 * Defines nodes (task, gate, fanout, fanin), edges, triggers, and configuration.
 *
 * @example
 * ```ts
 * import { task, gate, edge, TaskNode } from './lib/effect-ci/dag-types'
 *
 * const checkoutNode: TaskNode = {
 *   _tag: "task",
 *   id: "checkout" as NodeId,
 *   uses: "actions/checkout@v4"
 * }
 *
 * const gateNode: GateNode = {
 *   _tag: "gate",
 *   id: "only_main" as NodeId,
 *   condition: "github.ref == 'refs/heads/main'"
 * }
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import * as Schema from "effect/Schema";
import * as Brand from "effect/Brand";

// ---------------
// Branded Types
// ---------------

export type NodeId = string & Brand.Brand<"NodeId">;
export const NodeId = Schema.String.pipe(
  Schema.pattern(/^[a-z][a-z0-9_]*$/i, {
    message: () => "Node ID must start with a letter and contain only alphanumeric characters and underscores"
  }),
  Schema.brand("NodeId")
);

// ---------------
// Base Schemas
// ---------------

export class BackoffStrategy extends Schema.TaggedStruct("exponential", {
  baseDelayMs: Schema.Number.pipe(Schema.positive()),
  factor: Schema.Number.pipe(Schema.greaterThan(1)),
  maxDelayMs: Schema.Number.pipe(Schema.positive()),
}) {}

export class RetryPolicy extends Schema.Class<RetryPolicy>("RetryPolicy")({
  maxAttempts: Schema.Number.pipe(Schema.int(), Schema.between(1, 10)),
  backoff: Schema.optional(BackoffStrategy),
}) {}

export const EnvVars = Schema.Record({
  key: Schema.String,
  value: Schema.String,
});

export class Defaults extends Schema.Class<Defaults>("Defaults")({
  retry: Schema.optional(RetryPolicy),
  env: Schema.optional(EnvVars),
  timeout: Schema.optional(Schema.DurationFromMillis),
}) {}

// ---------------
// Trigger Schemas
// ---------------

export class PushTrigger extends Schema.TaggedStruct("push", {
  branches: Schema.optional(Schema.Array(Schema.String)),
  paths: Schema.optional(Schema.Array(Schema.String)),
}) {}

export class PullRequestTrigger extends Schema.TaggedStruct("pull_request", {
  branches: Schema.optional(Schema.Array(Schema.String)),
}) {}

export class ScheduleTrigger extends Schema.TaggedStruct("schedule", {
  cron: Schema.String,
}) {}

export const Trigger = Schema.Union(
  PushTrigger,
  PullRequestTrigger,
  ScheduleTrigger
);
export type Trigger = Schema.Schema.Type<typeof Trigger>;

// ---------------
// Node Schemas
// ---------------

export class TaskNode extends Schema.TaggedStruct("task", {
  id: NodeId,
  uses: Schema.optional(Schema.String),
  run: Schema.optional(Schema.String),
  env: Schema.optional(EnvVars),
  secrets: Schema.optional(Schema.Array(Schema.String)),
  retry: Schema.optional(RetryPolicy),
}).pipe(
  Schema.filter((node) => {
    if (!node.uses && !node.run) {
      return {
        path: [],
        message: "Task must have either 'uses' or 'run' specified",
        actual: node,
      };
    }
    if (node.uses && node.run) {
      return {
        path: [],
        message: "Task cannot have both 'uses' and 'run' specified",
        actual: node,
      };
    }
    return true;
  })
) {}

export class GateNode extends Schema.TaggedStruct("gate", {
  id: NodeId,
  condition: Schema.String.pipe(Schema.nonEmptyString()),
}) {}

export class FanoutNode extends Schema.TaggedStruct("fanout", {
  id: NodeId,
}) {}

export class FaninNode extends Schema.TaggedStruct("fanin", {
  id: NodeId,
}) {}

export const Node = Schema.Union(TaskNode, GateNode, FanoutNode, FaninNode);
export type Node = Schema.Schema.Type<typeof Node>;

// ---------------
// Edge Schema
// ---------------

export class Edge extends Schema.Class<Edge>("Edge")({
  from: NodeId,
  to: NodeId,
  condition: Schema.optional(Schema.Literal("expr", "always", "never")).pipe(
    Schema.withDefaults({
      constructor: () => "always" as const,
      decoding: () => "always" as const,
    })
  ),
}) {}
