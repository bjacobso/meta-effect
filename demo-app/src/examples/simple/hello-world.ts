/**
 * Simple Hello World DAG
 *
 * A basic linear workflow demonstrating task nodes in sequence.
 */

import type { DagConfigType } from '../../lib/effect-dag/dag-config'

export const helloWorldDAG: DagConfigType = {
  name: "hello_world",
  version: "1.0.0",
  triggers: [{ _tag: "push" as const, branches: ["main"] }],
  nodes: [
    {
      _tag: "task" as const,
      id: "checkout" as any,
      uses: "actions/checkout@v4",
    },
    {
      _tag: "task" as const,
      id: "build" as any,
      run: "npm run build",
    },
    {
      _tag: "task" as const,
      id: "test" as any,
      run: "npm test",
    },
  ],
  edges: [
    { from: "checkout" as any, to: "build" as any, condition: "always" as const },
    { from: "build" as any, to: "test" as any, condition: "always" as const },
  ],
}
