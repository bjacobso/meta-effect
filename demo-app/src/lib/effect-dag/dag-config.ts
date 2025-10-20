/**
 * DAG Config
 *
 * Main orchestration for typed workflow DAGs. Combines types, validation,
 * and builder helpers into a validated DagConfig schema with JSON/YAML serialization.
 *
 * @example
 * ```ts
 * import { DagConfig, parseDAG, parseDAGSync } from './lib/effect-dag/dag-config'
 * import { task, gate, edge } from './lib/effect-dag/dag-builder'
 * import { Effect, Schema } from 'effect'
 * import YAML from 'yaml'
 *
 * const dag = {
 *   name: "data_pipeline",
 *   version: "1.0.0",
 *   triggers: [{ _tag: "schedule", cron: "0 2 * * *" }],
 *   nodes: [
 *     task("extract", { run: "python extract.py" }),
 *     gate("quality_check", "row_count > 1000"),
 *     task("transform", { run: "python transform.py" }),
 *   ],
 *   edges: [
 *     edge("extract", "quality_check"),
 *     edge("quality_check", "transform", "expr"),
 *   ]
 * }
 *
 * // Validate and parse (throws on error)
 * const parsed = parseDAGSync(dag)
 *
 * // Or use Effect for better error handling
 * const program = parseDAG(dag).pipe(
 *   Effect.tap(() => Effect.log("DAG validated successfully")),
 *   Effect.map((validated) => ({
 *     json: JSON.stringify(validated, null, 2),
 *     yaml: YAML.stringify(validated),
 *   }))
 * )
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import * as Schema from "effect/Schema";
import * as Effect from "effect/Effect";
import { Trigger, Node, Edge, Defaults } from "./dag-types";
import { validateDAG } from "./dag-validation";

/**
 * Base DAG configuration schema (without validation)
 */
const DagConfigBase = Schema.Struct({
  name: Schema.String.pipe(Schema.nonEmptyString(), Schema.maxLength(100)),
  version: Schema.String.pipe(
    Schema.pattern(/^\d+\.\d+\.\d+$/, {
      message: () => "Version must follow semver format (e.g., 1.0.0)",
    })
  ),
  triggers: Schema.Array(Trigger).pipe(Schema.minItems(1)),
  defaults: Schema.optional(Defaults),
  nodes: Schema.Array(Node).pipe(Schema.minItems(1)),
  edges: Schema.Array(Edge),
});

export type DagConfigType = Schema.Schema.Type<typeof DagConfigBase>;

/**
 * Main DAG configuration with validation
 */
export const DagConfig = DagConfigBase.pipe(
  Schema.filter((config) => {
    // Run synchronous validations
    const result = Effect.runSync(
      validateDAG({ nodes: config.nodes, edges: config.edges }).pipe(
        Effect.as(true),
        Effect.catchAll(() => Effect.succeed(false))
      )
    );

    if (!result) {
      return {
        path: [],
        message: "DAG validation failed",
        actual: config,
      };
    }

    return true;
  })
);

/**
 * Parse and validate a DAG config using Effect (recommended)
 */
export const parseDAG = (input: unknown) =>
  Schema.decodeUnknown(DagConfig)(input);

/**
 * Parse and validate a DAG config synchronously (throws on error)
 */
export const parseDAGSync = (input: unknown) =>
  Schema.decodeUnknownSync(DagConfig)(input);

/**
 * Encode a validated DAG config back to plain object
 */
export const encodeDAG = (config: DagConfigType) =>
  Schema.encodeSync(DagConfig)(config);

// ---------------
// Example Usage
// ---------------

/**
 * Example DAG configuration showing all features
 */
export const exampleDAG = {
  name: "build_and_release",
  version: "1.0.0",
  triggers: [{ _tag: "push" as const, branches: ["main"] }],
  defaults: {
    retry: {
      maxAttempts: 3,
      backoff: {
        _tag: "exponential" as const,
        baseDelayMs: 500,
        factor: 2,
        maxDelayMs: 10_000,
      },
    },
    env: { NODE_ENV: "production" },
  },
  nodes: [
    {
      _tag: "task" as const,
      id: "checkout" as any,
      uses: "actions/checkout@v4",
    },
    {
      _tag: "gate" as const,
      id: "only_main" as any,
      condition: "github.ref == 'refs/heads/main'",
    },
    { _tag: "fanout" as const, id: "fanout_builds" as any },
    {
      _tag: "task" as const,
      id: "build_web" as any,
      run: "pnpm build --filter web",
    },
    {
      _tag: "task" as const,
      id: "build_api" as any,
      run: "pnpm build --filter api",
    },
    {
      _tag: "task" as const,
      id: "build_docs" as any,
      run: "pnpm build --filter docs",
    },
    { _tag: "fanin" as const, id: "join_builds" as any },
    { _tag: "fanout" as const, id: "fanout_deploys" as any },
    {
      _tag: "task" as const,
      id: "deploy_web" as any,
      run: "aws s3 sync ./web/dist s3://my-web-bucket",
      env: { AWS_REGION: "us-east-1" },
    },
    {
      _tag: "task" as const,
      id: "deploy_api" as any,
      run: "kubectl apply -f ./api/k8s/",
      env: { KUBECONFIG: "/etc/k8s/config" },
    },
    {
      _tag: "task" as const,
      id: "deploy_docs" as any,
      run: "vercel deploy --prod",
      secrets: ["VERCEL_TOKEN"],
    },
    { _tag: "fanin" as const, id: "join_deploys" as any },
    {
      _tag: "task" as const,
      id: "send_slack_notification" as any,
      uses: "slackapi/slack-github-action@v1",
      env: { SLACK_MESSAGE: "Deployment to production completed successfully!" },
      secrets: ["SLACK_WEBHOOK_URL"],
    },
  ],
  edges: [
    { from: "checkout" as any, to: "only_main" as any },
    {
      from: "only_main" as any,
      to: "fanout_builds" as any,
      condition: "expr" as const,
    },
    { from: "fanout_builds" as any, to: "build_web" as any },
    { from: "fanout_builds" as any, to: "build_api" as any },
    { from: "fanout_builds" as any, to: "build_docs" as any },
    { from: "build_web" as any, to: "join_builds" as any },
    { from: "build_api" as any, to: "join_builds" as any },
    { from: "build_docs" as any, to: "join_builds" as any },
    { from: "join_builds" as any, to: "fanout_deploys" as any },
    { from: "fanout_deploys" as any, to: "deploy_web" as any },
    { from: "fanout_deploys" as any, to: "deploy_api" as any },
    { from: "fanout_deploys" as any, to: "deploy_docs" as any },
    { from: "deploy_web" as any, to: "join_deploys" as any },
    { from: "deploy_api" as any, to: "join_deploys" as any },
    { from: "deploy_docs" as any, to: "join_deploys" as any },
    { from: "join_deploys" as any, to: "send_slack_notification" as any },
  ],
};
