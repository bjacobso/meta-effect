/**
 * DAG to Mermaid
 *
 * Generate Mermaid diagrams from workflow DAGs for visualization and documentation.
 * GitHub automatically renders Mermaid in markdown files.
 *
 * @example
 * ```ts
 * import { dagToMermaid } from './lib/effect-dag/dag-to-mermaid'
 * import fs from 'node:fs'
 *
 * const diagram = dagToMermaid(workflow.config)
 * fs.writeFileSync('docs/workflow.md', `\`\`\`mermaid\n${diagram}\n\`\`\``)
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import type { DagConfigType } from "./dag-config.js";
import type { Node } from "./dag-types.js";

/**
 * Convert a DAG workflow to Mermaid diagram syntax
 */
export const dagToMermaid = (config: DagConfigType): string => {
  const lines: Array<string> = ["graph TD"];

  // Add edges
  for (const edge of config.edges) {
    const fromShape = getNodeShape(config.nodes.find((n) => n.id === edge.from));
    const toShape = getNodeShape(config.nodes.find((n) => n.id === edge.to));

    const arrow = edge.condition === "never" ? "-.-x" : "-->";
    lines.push(`  ${edge.from}${arrow}${edge.to}`);
  }

  // Add node shapes (styling)
  for (const node of config.nodes) {
    const shape = getNodeMermaidShape(node);
    if (shape) {
      lines.push(`  ${shape}`);
    }
  }

  return lines.join("\n");
};

/**
 * Get the shape classification for a node
 */
const getNodeShape = (node: Node | undefined): string => {
  if (!node) return "rectangle";

  switch (node._tag) {
    case "task":
      return "rectangle";
    case "gate":
      return "diamond";
    case "fanout":
    case "fanin":
      return "circle";
  }
};

/**
 * Get the Mermaid shape syntax for a node
 */
const getNodeMermaidShape = (node: Node): string | null => {
  switch (node._tag) {
    case "task":
      // Rectangle (default)
      return null;
    case "gate":
      // Diamond
      return `${node.id}{${node.id}}`;
    case "fanout":
    case "fanin":
      // Circle
      return `${node.id}((${node.id}))`;
  }
};
