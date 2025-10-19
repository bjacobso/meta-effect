# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Philosophy

**Meta Effect** is NOT a framework or npm package. It's a collection of vendorable components (called "Meta Effects") that users copy directly into their codebase. Think shadcn/ui, but for Effect-TS bindings with web frameworks.

> Not a framework. Not an npm package. Just Meta Effects.

**Core Principle**: Each component is ~50-100 lines of focused, Effect-based code that demonstrates how to compose Effect primitives with frameworks like Vite, Remix, and HTMX. Users vendor these into their projects and customize them freely.

## Repository Structure

```
/
├── meta-effect/                # Monorepo containing registry and packages
│   └── packages/
│       ├── registry/           # The vendorable components (main deliverable)
│       │   ├── registry.json   # Component metadata and dependencies
│       │   └── src/
│       │       ├── effect-vite/    # Vite + HttpApi + Atom components
│       │       ├── effect-remix/   # Remix + Effect components
│       │       ├── effect-ci/      # CI/CD and DAG workflow components
│       │       ├── effect-livestore/ # LiveStore integration components
│       │       └── effect-prisma/  # Prisma database components
│       ├── cli/                # CLI for copying components (npx meta-effect add)
│       ├── effect-vite/        # Package for npm distribution
│       └── effect-remix/       # Package for npm distribution
└── docs/
    ├── specs/                  # Living specifications for each component type
    ├── core/                   # Architecture and philosophy docs
    ├── rfcs/                   # Design documents and proposals
    ├── integrations/           # Integration guides
    └── tools/                  # Development tooling docs
```

### Key Insight: Registry is the Product

The `meta-effect/packages/registry/` directory contains the actual deliverable - minimal, copy-paste-able TypeScript files. Everything else (monorepo, CLI, docs) exists to support this registry.

## Development Commands

### Monorepo Operations (meta-effect/)

```bash
# From meta-effect/ directory
pnpm build                  # Build all packages
pnpm test                   # Run all tests
pnpm check                  # Type-check without building
pnpm lint                   # Lint all packages
pnpm lint-fix              # Auto-fix linting issues

# Run TypeScript directly
pnpm tsx ./path/to/file.ts
```

### Git Workflow

This project uses conventional commits with co-authorship:

```bash
# Commit format
git commit -m "type: subject

Body explaining changes...

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Component Development Guidelines

### Creating New Components

When adding a new component to `meta-effect/packages/registry/src/`:

1. **Keep it minimal**: Target 50-100 lines
2. **Add comprehensive header documentation**:
   ```typescript
   /**
    * Component Name
    *
    * Description of what it does and why.
    *
    * @example
    * ```ts
    * // Complete working example
    * import { component } from './lib/effect-vite/component'
    *
    * const result = component(...)
    * ```
    *
    * Copy this file into your project and customize for your needs.
    */
   ```

3. **Regenerate registry**: Run the generator to auto-update `registry.json`:
   ```bash
   cd meta-effect/packages/registry
   pnpm exec tsx scripts/generate-registry.ts
   ```
   The generator will automatically extract metadata, dependencies, and tags from your component's JSDoc.

4. **Document in spec**: Update corresponding `docs/specs/effect-{type}.md`

### Component Design Principles

- **Effect-First**: Every operation should be an Effect
- **Composable**: Components should compose with each other
- **Framework-Aware**: Integrate with frameworks, don't replace them
- **Zero Magic**: No hidden behavior; everything visible in ~50 lines
- **Educational**: Code should teach Effect patterns by example

## Architecture Patterns

### Effect Service Pattern

Components often use Effect's service pattern:

```typescript
export class MyService extends Effect.Service<MyService>()("MyService", {
  effect: Effect.gen(function*() {
    // Service implementation
    return {
      method1: () => Effect.succeed(...),
      method2: () => Effect.gen(function*() { ... })
    } as const
  })
}) {}
```

### Vendorable Component Pattern

Each vendorable component follows this structure:

1. **Header comment** with description and examples
2. **Type definitions** using Effect Schema
3. **Implementation** (the minimal primitive)
4. **No tests** (users test after copying)

Example from `meta-effect/packages/registry/src/effect-remix/with-effect.ts`:
- 60 lines total
- Wraps Remix loaders/actions to run Effect programs
- Provides automatic Layer provision
- Simple, focused, customizable

### Registry Schema

`meta-effect/packages/registry/registry.json` defines:
- **Components**: Individual vendorable files
- **Presets**: Bundles of related components (e.g., "vite-full")
- **Dependencies**: Peer deps users must install
- **Tags**: For filtering and discovery

## CLI Design (Planned Implementation)

The CLI (when built) will follow Effect patterns:

```typescript
// Commands as Effect programs
const AddCommand = Command.make("add", ...)

// Services for core functionality
class RegistryService extends Effect.Service<RegistryService>()(...) {}
class FileSystemService extends Effect.Service<FileSystemService>()(...) {}
class PromptService extends Effect.Service<PromptService>()(...) {}
```

See `meta-effect/packages/cli/CLI_DESIGN.md` for full architecture.

## Documentation Updates

### When to Update Specs

Update `docs/specs/effect-{type}.md` when:
- Adding new components to that type
- Changing component APIs
- Discovering new patterns
- Implementation status changes

Specs are "living documents" that evolve with the components.

### Historical Context

The project pivoted from building a meta-framework (see `docs/rfcs/`) to vendorable components. Old RFCs remain for historical context but aren't the current direction.

## Common Tasks

### Regenerating the Registry

The `registry.json` file is **auto-generated** from component source files. Never edit it manually!

**When to regenerate**:
- After adding new components
- After updating component JSDoc comments
- After changing component dependencies
- After modifying component descriptions

**How to regenerate**:
```bash
cd meta-effect/packages/registry
pnpm exec tsx scripts/generate-registry.ts         # Generate registry.json
pnpm exec tsx scripts/generate-registry.ts --dry-run  # Preview changes
```

**What the generator does**:
1. Scans all `.ts` files in `src/` subdirectories (skips `.test.ts`)
2. Extracts component metadata from JSDoc:
   - Title (first line of JSDoc)
   - Description (lines before `@example`)
   - Validates `@example` block exists
   - Validates "Copy this file into your project" footer exists
3. Parses `import` statements to extract external dependencies
4. Infers tags from component type, filename, and description
5. Auto-generates presets (`{type}-full`, `{type}-minimal`, special presets for CI)

**Component requirements for generator**:
- Must have JSDoc comment at top of file
- JSDoc must include `@example` block
- JSDoc must include "Copy this file into your project" footer
- Must import external dependencies (warnings shown if none found)

**Example valid component header**:
```typescript
/**
 * Effect Loader
 *
 * Wraps Remix loaders to run Effect programs with automatic error handling.
 *
 * @example
 * ```ts
 * import { withEffect } from './lib/effect-remix/with-effect'
 *
 * export const loader = withEffect(...)
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */
```

### Adding a New Framework Type

To add `effect-solidjs`:

1. Create `meta-effect/packages/registry/src/effect-solidjs/` directory
2. Build 3-5 core components (~50-100 lines each)
3. Create `docs/specs/effect-solidjs.md`
4. Regenerate registry: `cd meta-effect/packages/registry && pnpm exec tsx scripts/generate-registry.ts`
5. Update root `README.md` with new section

### Updating Component Line Counts

When components grow/shrink, update counts in:
- `meta-effect/packages/registry/README.md` (table)
- `README.md` (component list)
- `meta-effect/packages/registry/registry.json` (if significantly different)

### Testing Registry Components

**Registry Maintainers** (us): The registry components have comprehensive tests using vitest and @effect/vitest to ensure correctness:
1. Pure functions (transforms, validation) have 100% coverage
2. Effect-based logic uses `it.effect` from @effect/vitest
3. Tests live co-located with source: `src/effect-ci/transforms.test.ts`
4. Run with: `pnpm test` (already configured in package.json)

**Component Users** (them): After vendoring components into their project:
1. Users own the code and can modify it freely
2. Users add their own tests in their test suite
3. Examples in component headers serve as test inspiration
4. Registry tests serve as reference for expected behavior

**Testing Patterns**:
- Pure functions: Direct unit tests (see `transforms.test.ts`)
- Effect validation: Use `it.effect` and `Effect.exit` (see `dag-validation.test.ts`)
- Services: Mock dependencies with Effect's TestServices
- Framework integrations: Test in isolation with mocked framework APIs

## Gotchas

### Don't Abstract Too Early

Resist urge to extract shared utilities across registry components. Each component should be self-contained and copy-paste-able, even if it means slight duplication.

### Registry Structure

The registry lives inside the monorepo at `meta-effect/packages/registry/`. The vendorable components are in `src/` subdirectories (effect-vite/, effect-remix/, effect-ci/, etc.). The monorepo structure supports both the registry and optional npm packages for those who prefer traditional installation.

### Component Size Discipline

If a component exceeds 100 lines, split it. Example: `effect-loader` could become:
- `effect-loader-basic.ts` (~60 lines)
- `effect-loader-errors.ts` (~40 lines)

### Version-Free Philosophy

Components aren't versioned like npm packages. Users copy a snapshot and own it. Registry updates are optional migrations, not required upgrades.

## References

- Effect-TS Docs: https://effect.website
- shadcn/ui: https://ui.shadcn.com (inspiration)
- Effect Schema: Core primitive for validation
- Effect Service: Dependency injection pattern
- Effect Layer: Composition and providing dependencies
