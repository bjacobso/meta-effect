import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { compileDagToStepFunctions } from "./dag-to-step-functions.js";
import type { DagConfigType } from "../effect-ci/dag-config.js";

describe("dag-to-step-functions", () => {
  it("compiles simple task to Task state", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push" }],
      nodes: [{ _tag: "task", id: "build" as any, run: "pnpm build" }],
      edges: [],
    };

    const stateMachine = await Effect.runPromise(
      compileDagToStepFunctions(dag)
    );

    expect(stateMachine.Comment).toBe("test");
    expect(stateMachine.StartAt).toBe("build");
    expect(stateMachine.States.build).toMatchObject({
      Type: "Task",
      Resource: "arn:aws:states:::lambda:invoke",
      Parameters: {
        FunctionName: "build-function",
        Payload: {
          command: "pnpm build",
        },
      },
      End: true,
    });
  });

  it("compiles task with uses", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push" }],
      nodes: [
        { _tag: "task", id: "checkout" as any, uses: "actions/checkout@v4" },
      ],
      edges: [],
    };

    const stateMachine = await Effect.runPromise(
      compileDagToStepFunctions(dag)
    );

    expect(stateMachine.States.checkout.Parameters?.Payload.command).toBe(
      "actions/checkout@v4"
    );
  });

  it("compiles gate to Choice state", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push" }],
      nodes: [
        { _tag: "task", id: "build" as any, run: "pnpm build" },
        {
          _tag: "gate",
          id: "only_main" as any,
          condition: "$.ref == 'refs/heads/main'",
        },
        { _tag: "task", id: "deploy" as any, run: "pnpm deploy" },
      ],
      edges: [
        { from: "build" as any, to: "only_main" as any },
        { from: "only_main" as any, to: "deploy" as any },
      ],
    };

    const stateMachine = await Effect.runPromise(
      compileDagToStepFunctions(dag)
    );

    expect(stateMachine.States.only_main).toMatchObject({
      Type: "Choice",
      Choices: [
        {
          Variable: "$.ref",
          StringEquals: "refs/heads/main",
          Next: "deploy",
        },
      ],
      Default: "SuccessState",
    });
  });

  it("compiles sequential tasks with Next transitions", async () => {
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

    const stateMachine = await Effect.runPromise(
      compileDagToStepFunctions(dag)
    );

    expect(stateMachine.StartAt).toBe("checkout");
    expect(stateMachine.States.checkout.Next).toBe("build");
    expect(stateMachine.States.build.Next).toBe("test");
    expect(stateMachine.States.test.End).toBe(true);
  });

  it("compiles task with env vars", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push" }],
      nodes: [
        {
          _tag: "task",
          id: "deploy" as any,
          run: "deploy.sh",
          env: { NODE_ENV: "production", REGION: "us-east-1" },
        },
      ],
      edges: [],
    };

    const stateMachine = await Effect.runPromise(
      compileDagToStepFunctions(dag)
    );

    expect(stateMachine.States.deploy.Parameters?.Payload.env).toEqual({
      NODE_ENV: "production",
      REGION: "us-east-1",
    });
  });

  it("adds SuccessState when referenced by gate", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push" }],
      nodes: [
        { _tag: "task", id: "build" as any, run: "pnpm build" },
        {
          _tag: "gate",
          id: "check" as any,
          condition: "$.status == 'ready'",
        },
      ],
      edges: [{ from: "build" as any, to: "check" as any }],
    };

    const stateMachine = await Effect.runPromise(
      compileDagToStepFunctions(dag)
    );

    expect(stateMachine.States.SuccessState).toEqual({
      Type: "Succeed",
    });
  });

  it("fails when no start node found", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push" }],
      nodes: [
        { _tag: "task", id: "a" as any, run: "echo a" },
        { _tag: "task", id: "b" as any, run: "echo b" },
      ],
      // Circular dependency - both have incoming edges
      edges: [
        { from: "a" as any, to: "b" as any },
        { from: "b" as any, to: "a" as any },
      ],
    };

    const result = await Effect.runPromise(
      Effect.either(compileDagToStepFunctions(dag))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left.message).toContain("No start node found");
    }
  });

  it("compiles fanout to Parallel state", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push" }],
      nodes: [
        { _tag: "task", id: "setup" as any, run: "setup.sh" },
        { _tag: "fanout", id: "parallel" as any },
        { _tag: "task", id: "build_web" as any, run: "build web" },
        { _tag: "task", id: "build_api" as any, run: "build api" },
        { _tag: "fanin", id: "join" as any },
      ],
      edges: [
        { from: "setup" as any, to: "parallel" as any },
        { from: "parallel" as any, to: "build_web" as any },
        { from: "parallel" as any, to: "build_api" as any },
        { from: "build_web" as any, to: "join" as any },
        { from: "build_api" as any, to: "join" as any },
      ],
    };

    const stateMachine = await Effect.runPromise(
      compileDagToStepFunctions(dag)
    );

    expect(stateMachine.States.parallel).toMatchObject({
      Type: "Parallel",
      Branches: expect.arrayContaining([
        expect.objectContaining({ StartAt: "build_web" }),
        expect.objectContaining({ StartAt: "build_api" }),
      ]),
    });
  });

  it("compiles fanin to Succeed state", async () => {
    const dag: DagConfigType = {
      name: "test",
      version: "1.0.0",
      triggers: [{ _tag: "push" }],
      nodes: [
        { _tag: "task", id: "build" as any, run: "build" },
        { _tag: "fanin", id: "join" as any },
      ],
      edges: [{ from: "build" as any, to: "join" as any }],
    };

    const stateMachine = await Effect.runPromise(
      compileDagToStepFunctions(dag)
    );

    expect(stateMachine.States.join).toEqual({
      Type: "Succeed",
    });
  });
});
