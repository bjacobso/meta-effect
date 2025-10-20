/**
 * Build and Deploy CI/CD DAG
 *
 * Demonstrates a complete CI/CD pipeline with parallel builds and deployments.
 */

import type { DagConfigType } from '../lib/effect-dag/dag-config'

export const buildAndDeployDAG: DagConfigType = {
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
    { from: "checkout" as any, to: "only_main" as any, condition: "always" as const },
    {
      from: "only_main" as any,
      to: "fanout_builds" as any,
      condition: "expr" as const,
    },
    { from: "fanout_builds" as any, to: "build_web" as any, condition: "always" as const },
    { from: "fanout_builds" as any, to: "build_api" as any, condition: "always" as const },
    { from: "fanout_builds" as any, to: "build_docs" as any, condition: "always" as const },
    { from: "build_web" as any, to: "join_builds" as any, condition: "always" as const },
    { from: "build_api" as any, to: "join_builds" as any, condition: "always" as const },
    { from: "build_docs" as any, to: "join_builds" as any, condition: "always" as const },
    { from: "join_builds" as any, to: "fanout_deploys" as any, condition: "always" as const },
    { from: "fanout_deploys" as any, to: "deploy_web" as any, condition: "always" as const },
    { from: "fanout_deploys" as any, to: "deploy_api" as any, condition: "always" as const },
    { from: "fanout_deploys" as any, to: "deploy_docs" as any, condition: "always" as const },
    { from: "deploy_web" as any, to: "join_deploys" as any, condition: "always" as const },
    { from: "deploy_api" as any, to: "join_deploys" as any, condition: "always" as const },
    { from: "deploy_docs" as any, to: "join_deploys" as any, condition: "always" as const },
    { from: "join_deploys" as any, to: "send_slack_notification" as any, condition: "always" as const },
  ],
}
