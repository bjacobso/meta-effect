import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { compileDagToGitHubActions } from "./dag-to-github-actions.js";
import type { DagConfigType } from "../effect-ci/dag-config.js";

describe("dag-to-github-actions", () => {
  it("compiles simple task to job", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push", branches: ["main"] }],
      nodes: [{ _tag: "task", id: "build" as any, run: "pnpm build" }],
      edges: [],
    };

    const workflow = await Effect.runPromise(compileDagToGitHubActions(dag));

    expect(workflow.name).toBe("test");
    expect(workflow.jobs.build).toMatchObject({
      "runs-on": "ubuntu-latest",
      steps: [{ name: "build", run: "pnpm build" }],
    });
  });

  it("compiles task with uses (GitHub Action)", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push" }],
      nodes: [
        { _tag: "task", id: "checkout" as any, uses: "actions/checkout@v4" },
      ],
      edges: [],
    };

    const workflow = await Effect.runPromise(compileDagToGitHubActions(dag));

    expect(workflow.jobs.checkout.steps[0]).toMatchObject({
      name: "checkout",
      uses: "actions/checkout@v4",
    });
  });

  it("compiles gate to if condition", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push" }],
      nodes: [
        { _tag: "task", id: "build" as any, run: "pnpm build" },
        {
          _tag: "gate",
          id: "only_main" as any,
          condition: "github.ref == 'refs/heads/main'",
        },
        { _tag: "task", id: "deploy" as any, run: "pnpm deploy" },
      ],
      edges: [
        { from: "build" as any, to: "only_main" as any },
        { from: "only_main" as any, to: "deploy" as any },
      ],
    };

    const workflow = await Effect.runPromise(compileDagToGitHubActions(dag));

    expect(workflow.jobs.deploy.if).toBe("github.ref == 'refs/heads/main'");
    expect(workflow.jobs.deploy.needs).toEqual(["build"]);
  });

  it("compiles secrets to env vars", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push" }],
      nodes: [
        {
          _tag: "task",
          id: "deploy" as any,
          run: "deploy.sh",
          secrets: ["DEPLOY_TOKEN", "AWS_KEY"],
        },
      ],
      edges: [],
    };

    const workflow = await Effect.runPromise(compileDagToGitHubActions(dag));

    expect(workflow.jobs.deploy.steps[0].env).toEqual({
      DEPLOY_TOKEN: "${{ secrets.DEPLOY_TOKEN }}",
      AWS_KEY: "${{ secrets.AWS_KEY }}",
    });
  });

  it("compiles env vars and secrets together", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push" }],
      nodes: [
        {
          _tag: "task",
          id: "deploy" as any,
          run: "deploy.sh",
          env: { NODE_ENV: "production" },
          secrets: ["DEPLOY_TOKEN"],
        },
      ],
      edges: [],
    };

    const workflow = await Effect.runPromise(compileDagToGitHubActions(dag));

    expect(workflow.jobs.deploy.steps[0].env).toEqual({
      NODE_ENV: "production",
      DEPLOY_TOKEN: "${{ secrets.DEPLOY_TOKEN }}",
    });
  });

  it("compiles push trigger with branches", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push", branches: ["main", "develop"] }],
      nodes: [{ _tag: "task", id: "build" as any, run: "pnpm build" }],
      edges: [],
    };

    const workflow = await Effect.runPromise(compileDagToGitHubActions(dag));

    expect(workflow.on.push).toEqual({
      branches: ["main", "develop"],
    });
  });

  it("compiles push trigger with paths", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push", paths: ["src/**"] }],
      nodes: [{ _tag: "task", id: "build" as any, run: "pnpm build" }],
      edges: [],
    };

    const workflow = await Effect.runPromise(compileDagToGitHubActions(dag));

    expect(workflow.on.push).toEqual({
      paths: ["src/**"],
    });
  });

  it("compiles pull_request trigger", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "pull_request", branches: ["main"] }],
      nodes: [{ _tag: "task", id: "test" as any, run: "pnpm test" }],
      edges: [],
    };

    const workflow = await Effect.runPromise(compileDagToGitHubActions(dag));

    expect(workflow.on.pull_request).toEqual({
      branches: ["main"],
    });
  });

  it("compiles schedule trigger", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "schedule", cron: "0 0 * * *" }],
      nodes: [{ _tag: "task", id: "backup" as any, run: "backup.sh" }],
      edges: [],
    };

    const workflow = await Effect.runPromise(compileDagToGitHubActions(dag));

    expect(workflow.on.schedule).toEqual([{ cron: "0 0 * * *" }]);
  });

  it("compiles multiple triggers", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [
        { _tag: "push", branches: ["main"] },
        { _tag: "pull_request", branches: ["main"] },
      ],
      nodes: [{ _tag: "task", id: "test" as any, run: "pnpm test" }],
      edges: [],
    };

    const workflow = await Effect.runPromise(compileDagToGitHubActions(dag));

    expect(workflow.on.push).toEqual({ branches: ["main"] });
    expect(workflow.on.pull_request).toEqual({ branches: ["main"] });
  });

  it("compiles workflow with dependencies", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push" }],
      nodes: [
        { _tag: "task", id: "checkout" as any, uses: "actions/checkout@v4" },
        { _tag: "task", id: "build" as any, run: "pnpm build" },
        { _tag: "task", id: "test" as any, run: "pnpm test" },
      ],
      edges: [
        { from: "checkout" as any, to: "build" as any },
        { from: "build" as any, to: "test" as any },
      ],
    };

    const workflow = await Effect.runPromise(compileDagToGitHubActions(dag));

    expect(workflow.jobs.build.needs).toEqual(["checkout"]);
    expect(workflow.jobs.test.needs).toEqual(["build"]);
  });
});
