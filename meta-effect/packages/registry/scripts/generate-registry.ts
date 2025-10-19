#!/usr/bin/env tsx
/**
 * Registry Generator
 *
 * Automatically generates registry.json from source files by parsing:
 * - File header comments for title and description
 * - Import statements for dependencies
 * - Directory structure for component type
 *
 * Usage:
 *   pnpm tsx scripts/generate-registry.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { globSync } from "glob";

interface Component {
  name: string;
  type: string;
  description: string;
  files: string[];
  dependencies: string[];
  tags: string[];
}

interface Preset {
  name: string;
  description: string;
  components: string[];
}

interface Registry {
  $schema: string;
  components: Component[];
  presets: Preset[];
}

/**
 * Parse header comment from a TypeScript file
 */
function parseHeader(content: string): { title: string; description: string } {
  const headerMatch = content.match(/^\/\*\*\n \* (.+?)\n \*\n([\s\S]*?) \*\n \* @example/);

  if (!headerMatch) {
    return { title: "", description: "" };
  }

  const title = headerMatch[1].trim();
  const descLines = headerMatch[2]
    .split("\n")
    .map((line) => line.replace(/^ \* /, "").trim())
    .filter((line) => line.length > 0);

  const description = descLines.join(" ");

  return { title, description };
}

/**
 * Extract npm package dependencies from import statements
 */
function extractDependencies(content: string): string[] {
  const deps = new Set<string>();

  // Match import statements
  const importRegex = /import\s+.*?from\s+["']([^"']+)["']/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];

    // Skip relative imports
    if (importPath.startsWith(".")) continue;

    // Extract package name (handle scoped packages)
    const pkg = importPath.startsWith("@")
      ? importPath.split("/").slice(0, 2).join("/")
      : importPath.split("/")[0];

    deps.add(pkg);
  }

  return Array.from(deps).sort();
}

/**
 * Infer tags from component type and file name
 */
function inferTags(type: string, name: string): string[] {
  const tags = new Set<string>();

  // Add type-based tags
  if (type === "effect-vite") {
    tags.add("vite");
  } else if (type === "effect-remix") {
    tags.add("remix");
  } else if (type === "effect-ci") {
    tags.add("ci");
  } else if (type === "effect-dag") {
    tags.add("dag");
    tags.add("workflow");
  } else if (type === "effect-livestore") {
    tags.add("livestore");
  } else if (type === "effect-prisma") {
    tags.add("prisma");
    tags.add("database");
  }

  // Add name-based tags
  if (name.includes("api")) tags.add("api");
  if (name.includes("atom")) tags.add("atoms");
  if (name.includes("loader")) tags.add("loader");
  if (name.includes("action")) tags.add("action");
  if (name.includes("schema") || name.includes("types")) tags.add("schema");
  if (name.includes("validation")) tags.add("validation");
  if (name.includes("interpreter")) tags.add("execution");
  if (name.includes("mermaid")) {
    tags.add("visualization");
    tags.add("diagrams");
  }

  return Array.from(tags).sort();
}

/**
 * Generate component entry from source file
 */
function generateComponent(filePath: string, srcDir: string): Component | null {
  const content = fs.readFileSync(filePath, "utf-8");
  const { title, description } = parseHeader(content);

  if (!title || !description) {
    console.warn(`Skipping ${filePath}: missing header comment`);
    return null;
  }

  // Extract relative path from src/
  const relativePath = path.relative(srcDir, filePath);

  // Determine type from directory (effect-vite, effect-remix, etc.)
  const type = relativePath.split(path.sep)[0];

  // Component name is kebab-case of title
  const name = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const dependencies = extractDependencies(content);
  const tags = inferTags(type, name);

  return {
    name,
    type,
    description,
    files: [relativePath],
    dependencies,
    tags,
  };
}

/**
 * Generate presets based on component types
 */
function generatePresets(components: Component[]): Preset[] {
  const presets: Preset[] = [];

  // Group components by type
  const byType = new Map<string, Component[]>();
  for (const comp of components) {
    const existing = byType.get(comp.type) ?? [];
    existing.push(comp);
    byType.set(comp.type, existing);
  }

  // Generate full and minimal presets for each type
  for (const [type, comps] of byType.entries()) {
    const typeLabel = type.replace("effect-", "");

    // Full preset
    presets.push({
      name: `${typeLabel}-full`,
      description: `Complete ${type} setup with all components`,
      components: comps.map((c) => c.name),
    });

    // Minimal preset (first component only)
    if (comps.length > 1) {
      presets.push({
        name: `${typeLabel}-minimal`,
        description: `Minimal ${type} with essential components`,
        components: [comps[0].name],
      });
    }
  }

  return presets;
}

/**
 * Main generator function
 */
function generateRegistry(): void {
  const srcDir = path.join(process.cwd(), "src");

  // Find all TypeScript files (excluding tests)
  const files = globSync("effect-*/*.ts", {
    cwd: srcDir,
    absolute: true,
  }).filter((f) => !f.endsWith(".test.ts"));

  console.log(`Found ${files.length} source files`);

  // Generate components
  const components: Component[] = [];
  for (const file of files) {
    const component = generateComponent(file, srcDir);
    if (component) {
      components.push(component);
    }
  }

  console.log(`Generated ${components.length} components`);

  // Sort components by type then name
  components.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.name.localeCompare(b.name);
  });

  // Generate presets
  const presets = generatePresets(components);
  console.log(`Generated ${presets.length} presets`);

  // Build registry
  const registry: Registry = {
    $schema: "./schema.json",
    components,
    presets,
  };

  // Write to file
  const outputPath = path.join(process.cwd(), "registry.json");
  fs.writeFileSync(outputPath, JSON.stringify(registry, null, 2) + "\n");

  console.log(`✓ Generated registry.json with ${components.length} components and ${presets.length} presets`);
}

// Run generator
generateRegistry();
