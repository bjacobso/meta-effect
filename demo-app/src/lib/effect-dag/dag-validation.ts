/**
 * DAG Validation
 *
 * Pure validation functions for workflow DAGs. Validates edge references,
 * detects cycles, checks for self-loops, and ensures gate nodes have valid conditions.
 *
 * @example
 * ```ts
 * import { validateDAG } from './lib/effect-dag/dag-validation'
 * import { Effect } from 'effect'
 *
 * const result = await Effect.runPromise(
 *   validateDAG({ nodes, edges })
 * )
 * // Returns validated config or fails with detailed ParseResult errors
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import * as Effect from "effect/Effect";
import * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";
import * as HashSet from "effect/HashSet";
import * as HashMap from "effect/HashMap";
import { GateNode } from "./dag-types";
import type { Node, Edge, NodeId } from "./dag-types";

/**
 * Validates that all edges reference existing nodes
 */
export const validateEdgeReferences = (
  nodes: ReadonlyArray<Node>,
  edges: ReadonlyArray<Edge>
): Effect.Effect<void, ParseResult.ParseIssue> =>
  Effect.gen(function* () {
    const nodeIds = HashSet.fromIterable(nodes.map((n) => n.id));

    for (const edge of edges) {
      if (!HashSet.has(nodeIds, edge.from)) {
        yield* ParseResult.fail(
          new ParseResult.Type(
            Schema.String.ast,
            edge.from,
            `Edge references non-existent node: ${edge.from}`
          )
        );
      }
      if (!HashSet.has(nodeIds, edge.to)) {
        yield* ParseResult.fail(
          new ParseResult.Type(
            Schema.String.ast,
            edge.to,
            `Edge references non-existent node: ${edge.to}`
          )
        );
      }
    }
  }).pipe(Effect.asVoid);

/**
 * Validates that no edges form self-loops (node -> same node)
 */
export const validateNoSelfLoops = (
  edges: ReadonlyArray<Edge>
): Effect.Effect<void, ParseResult.ParseIssue> =>
  Effect.gen(function* () {
    for (const edge of edges) {
      if (edge.from === edge.to) {
        yield* ParseResult.fail(
          new ParseResult.Type(
            Schema.Class<Edge>("Edge")({
              from: Schema.String as any,
              to: Schema.String as any,
              condition: Schema.optional(Schema.String) as any,
            }).ast,
            edge,
            `Self-loop detected: ${edge.from} -> ${edge.to}`
          )
        );
      }
    }
  }).pipe(Effect.asVoid);

/**
 * Validates that gate nodes don't have 'never' conditions on outgoing edges
 */
export const validateGateConditions = (
  nodes: ReadonlyArray<Node>,
  edges: ReadonlyArray<Edge>
): Effect.Effect<void, ParseResult.ParseIssue> =>
  Effect.gen(function* () {
    const gateNodes = nodes.filter(
      (n): n is typeof GateNode.Type => n._tag === "gate"
    );
    const edgeMap = HashMap.fromIterable(
      edges.map((e) => [e.from, e] as const)
    );

    for (const gate of gateNodes) {
      const outgoingEdge = HashMap.get(edgeMap, gate.id);
      if (
        outgoingEdge._tag === "Some" &&
        outgoingEdge.value.condition === "never"
      ) {
        yield* ParseResult.fail(
          new ParseResult.Type(
            Schema.Class<Edge>("Edge")({
              from: Schema.String as any,
              to: Schema.String as any,
              condition: Schema.optional(Schema.String) as any,
            }).ast,
            outgoingEdge.value,
            `Gate node ${gate.id} cannot have 'never' condition`
          )
        );
      }
    }
  }).pipe(Effect.asVoid);

/**
 * Detects cycles in the DAG using depth-first search
 */
export const validateNoCycles = (
  nodes: ReadonlyArray<Node>,
  edges: ReadonlyArray<Edge>
): Effect.Effect<void, ParseResult.ParseIssue> =>
  Effect.gen(function* () {
    // Build adjacency list
    const adjacency = new Map<NodeId, Array<NodeId>>();
    for (const edge of edges) {
      const neighbors = adjacency.get(edge.from) ?? [];
      neighbors.push(edge.to);
      adjacency.set(edge.from, neighbors);
    }

    const visited = new Set<NodeId>();
    const recursionStack = new Set<NodeId>();

    const hasCycle = (node: NodeId): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = adjacency.get(node) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    const nodeIds = nodes.map((n) => n.id);
    for (const nodeId of nodeIds) {
      if (!visited.has(nodeId) && hasCycle(nodeId)) {
        yield* ParseResult.fail(
          new ParseResult.Type(
            Schema.Array(
              Schema.Class<Edge>("Edge")({
                from: Schema.String as any,
                to: Schema.String as any,
                condition: Schema.optional(Schema.String) as any,
              })
            ).ast,
            edges,
            "DAG contains cycles"
          )
        );
      }
    }
  }).pipe(Effect.asVoid);

/**
 * Runs all DAG validations in sequence
 */
export const validateDAG = (config: {
  nodes: ReadonlyArray<Node>;
  edges: ReadonlyArray<Edge>;
}): Effect.Effect<typeof config, ParseResult.ParseIssue> =>
  Effect.gen(function* () {
    yield* validateEdgeReferences(config.nodes, config.edges);
    yield* validateNoSelfLoops(config.edges);
    yield* validateGateConditions(config.nodes, config.edges);
    yield* validateNoCycles(config.nodes, config.edges);
    return config;
  });
