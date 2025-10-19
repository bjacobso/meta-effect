import { describe, expect } from "vitest"
import { it } from "@effect/vitest"
import { Effect } from "effect"
import {
  validateEdgeReferences,
  validateNoSelfLoops,
  validateGateConditions,
  validateNoCycles,
  validateDAG
} from "./dag-validation"
import type { Node, Edge, NodeId } from "./dag-types"

describe("dag-validation", () => {
  describe("validateEdgeReferences", () => {
    it.effect("should pass when all edges reference existing nodes", () =>
      Effect.gen(function* () {
        const nodes: Node[] = [
          { _tag: "task", id: "a" as NodeId, uses: "action@v1" },
          { _tag: "task", id: "b" as NodeId, uses: "action@v2" }
        ]
        const edges: Edge[] = [
          { from: "a" as NodeId, to: "b" as NodeId, condition: "always" }
        ]

        yield* validateEdgeReferences(nodes, edges)
        // If we get here without error, validation passed
        expect(true).toBe(true)
      })
    )

    it.effect("should fail when edge references non-existent 'from' node", () =>
      Effect.gen(function* () {
        const nodes: Node[] = [
          { _tag: "task", id: "a" as NodeId, uses: "action@v1" }
        ]
        const edges: Edge[] = [
          { from: "nonexistent" as NodeId, to: "a" as NodeId, condition: "always" }
        ]

        const result = yield* Effect.exit(validateEdgeReferences(nodes, edges))
        expect(result._tag).toBe("Failure")
      })
    )

    it.effect("should fail when edge references non-existent 'to' node", () =>
      Effect.gen(function* () {
        const nodes: Node[] = [
          { _tag: "task", id: "a" as NodeId, uses: "action@v1" }
        ]
        const edges: Edge[] = [
          { from: "a" as NodeId, to: "nonexistent" as NodeId, condition: "always" }
        ]

        const result = yield* Effect.exit(validateEdgeReferences(nodes, edges))
        expect(result._tag).toBe("Failure")
      })
    )
  })

  describe("validateNoSelfLoops", () => {
    it.effect("should pass when no self-loops exist", () =>
      Effect.gen(function* () {
        const edges: Edge[] = [
          { from: "a" as NodeId, to: "b" as NodeId, condition: "always" },
          { from: "b" as NodeId, to: "c" as NodeId, condition: "always" }
        ]

        yield* validateNoSelfLoops(edges)
        expect(true).toBe(true)
      })
    )

    it.effect("should fail when self-loop detected", () =>
      Effect.gen(function* () {
        const edges: Edge[] = [
          { from: "a" as NodeId, to: "a" as NodeId, condition: "always" }
        ]

        const result = yield* Effect.exit(validateNoSelfLoops(edges))
        expect(result._tag).toBe("Failure")
      })
    )
  })

  describe("validateGateConditions", () => {
    it.effect("should pass when gate nodes have valid conditions", () =>
      Effect.gen(function* () {
        const nodes: Node[] = [
          { _tag: "gate", id: "gate1" as NodeId, condition: "branch == 'main'" }
        ]
        const edges: Edge[] = [
          { from: "gate1" as NodeId, to: "task1" as NodeId, condition: "always" }
        ]

        yield* validateGateConditions(nodes, edges)
        expect(true).toBe(true)
      })
    )

    it.effect("should fail when gate node has 'never' condition", () =>
      Effect.gen(function* () {
        const nodes: Node[] = [
          { _tag: "gate", id: "gate1" as NodeId, condition: "branch == 'main'" }
        ]
        const edges: Edge[] = [
          { from: "gate1" as NodeId, to: "task1" as NodeId, condition: "never" }
        ]

        const result = yield* Effect.exit(validateGateConditions(nodes, edges))
        expect(result._tag).toBe("Failure")
      })
    )

    it.effect("should pass when non-gate nodes have any condition", () =>
      Effect.gen(function* () {
        const nodes: Node[] = [
          { _tag: "task", id: "task1" as NodeId, uses: "action@v1" }
        ]
        const edges: Edge[] = [
          { from: "task1" as NodeId, to: "task2" as NodeId, condition: "never" }
        ]

        yield* validateGateConditions(nodes, edges)
        expect(true).toBe(true)
      })
    )
  })

  describe("validateNoCycles", () => {
    it.effect("should pass for acyclic graph", () =>
      Effect.gen(function* () {
        const nodes: Node[] = [
          { _tag: "task", id: "a" as NodeId, uses: "action@v1" },
          { _tag: "task", id: "b" as NodeId, uses: "action@v2" },
          { _tag: "task", id: "c" as NodeId, uses: "action@v3" }
        ]
        const edges: Edge[] = [
          { from: "a" as NodeId, to: "b" as NodeId, condition: "always" },
          { from: "b" as NodeId, to: "c" as NodeId, condition: "always" }
        ]

        yield* validateNoCycles(nodes, edges)
        expect(true).toBe(true)
      })
    )

    it.effect("should fail for simple cycle (A -> B -> A)", () =>
      Effect.gen(function* () {
        const nodes: Node[] = [
          { _tag: "task", id: "a" as NodeId, uses: "action@v1" },
          { _tag: "task", id: "b" as NodeId, uses: "action@v2" }
        ]
        const edges: Edge[] = [
          { from: "a" as NodeId, to: "b" as NodeId, condition: "always" },
          { from: "b" as NodeId, to: "a" as NodeId, condition: "always" }
        ]

        const result = yield* Effect.exit(validateNoCycles(nodes, edges))
        expect(result._tag).toBe("Failure")
      })
    )

    it.effect("should fail for complex cycle (A -> B -> C -> A)", () =>
      Effect.gen(function* () {
        const nodes: Node[] = [
          { _tag: "task", id: "a" as NodeId, uses: "action@v1" },
          { _tag: "task", id: "b" as NodeId, uses: "action@v2" },
          { _tag: "task", id: "c" as NodeId, uses: "action@v3" }
        ]
        const edges: Edge[] = [
          { from: "a" as NodeId, to: "b" as NodeId, condition: "always" },
          { from: "b" as NodeId, to: "c" as NodeId, condition: "always" },
          { from: "c" as NodeId, to: "a" as NodeId, condition: "always" }
        ]

        const result = yield* Effect.exit(validateNoCycles(nodes, edges))
        expect(result._tag).toBe("Failure")
      })
    )

    it.effect("should pass for disconnected components", () =>
      Effect.gen(function* () {
        const nodes: Node[] = [
          { _tag: "task", id: "a" as NodeId, uses: "action@v1" },
          { _tag: "task", id: "b" as NodeId, uses: "action@v2" },
          { _tag: "task", id: "c" as NodeId, uses: "action@v3" },
          { _tag: "task", id: "d" as NodeId, uses: "action@v4" }
        ]
        const edges: Edge[] = [
          { from: "a" as NodeId, to: "b" as NodeId, condition: "always" },
          { from: "c" as NodeId, to: "d" as NodeId, condition: "always" }
        ]

        yield* validateNoCycles(nodes, edges)
        expect(true).toBe(true)
      })
    )
  })

  describe("validateDAG", () => {
    it.effect("should pass for valid DAG", () =>
      Effect.gen(function* () {
        const nodes: Node[] = [
          { _tag: "task", id: "checkout" as NodeId, uses: "actions/checkout@v4" },
          { _tag: "task", id: "build" as NodeId, run: "npm run build" },
          { _tag: "task", id: "test" as NodeId, run: "npm test" }
        ]
        const edges: Edge[] = [
          { from: "checkout" as NodeId, to: "build" as NodeId, condition: "always" },
          { from: "build" as NodeId, to: "test" as NodeId, condition: "always" }
        ]

        const result = yield* validateDAG({ nodes, edges })
        expect(result.nodes).toEqual(nodes)
        expect(result.edges).toEqual(edges)
      })
    )

    it.effect("should fail when any validation fails", () =>
      Effect.gen(function* () {
        const nodes: Node[] = [
          { _tag: "task", id: "a" as NodeId, uses: "action@v1" }
        ]
        const edges: Edge[] = [
          { from: "a" as NodeId, to: "a" as NodeId, condition: "always" } // Self-loop
        ]

        const result = yield* Effect.exit(validateDAG({ nodes, edges }))
        expect(result._tag).toBe("Failure")
      })
    )

    it.effect("should return config on success", () =>
      Effect.gen(function* () {
        const config = {
          nodes: [
            { _tag: "task" as const, id: "a" as NodeId, uses: "action@v1" }
          ],
          edges: [] as Edge[]
        }

        const result = yield* validateDAG(config)
        expect(result).toEqual(config)
      })
    )
  })
})
