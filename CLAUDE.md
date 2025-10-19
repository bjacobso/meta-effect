# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Philosophy

**Meta Effect** is NOT a framework or npm package. It's a collection of vendorable components (called "Meta Effects") that users copy directly into their codebase. Think shadcn/ui, but for Effect-TS bindings with web frameworks.

> Not a framework. Not an npm package. Just Meta Effects.

**Core Principle**: Each component is ~50-100 lines of focused, Effect-based code that demonstrates how to compose Effect primitives with frameworks like Vite, Remix, and HTMX. Users vendor these into their projects and customize them freely.

## Repository Structure

```
/
├── registry/                    # The vendorable components (main deliverable)
│   ├── registry.json           # Component metadata and dependencies
│   ├── effect-vite/            # Vite + HttpApi + Atom components (~275 lines)
│   ├── effect-remix/           # Remix + Effect components (~245 lines)
│   └── effect-htmx/            # HTMX + Effect components (planned)
├── meta-effect/                # Legacy monorepo (being phased out)
│   └── packages/
│       ├── cli/                # CLI for copying components (future: npx meta-effect add)
│       ├── effect-vite/        # Old package structure
│       └── effect-remix/       # Old package structure
└── docs/
    ├── specs/                  # Living specifications for each component type
    ├── core/                   # Architecture and philosophy docs
    └── rfcs/                   # Historical design documents
```

### Key Insight: Registry is the Product

The `registry/` directory contains the actual deliverable - minimal, copy-paste-able TypeScript files. Everything else (monorepo, CLI, docs) exists to support this registry.

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

When adding a new component to `registry/`:

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

3. **Update `registry/registry.json`**:
   ```json
   {
     "name": "component-name",
     "type": "effect-vite",
     "description": "Brief description",
     "files": ["effect-vite/component-name.ts"],
     "dependencies": ["effect", "@effect/platform"],
     "tags": ["relevant", "tags"]
   }
   ```

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

### Declarative DSL Pattern

For complex configurations, provide a declarative API inspired by Effect RPC/HttpApi:

```typescript
// Example: dag-workflow.ts
class BuildWorkflow extends Workflow.make(
  "build",
  "1.0.0",
  { triggers: [...], defaults: {...} },
  // Nodes (like Rpc.make)
  Task.make("checkout", { uses: "..." }),
  Gate.make("only_main", { condition: "..." }),
  // Edges
  Edge.make("checkout", "only_main")
) {}

// Usage
const validated = BuildWorkflow.parseSync()
```

**When to use**:
- Configuration involves many related entities (nodes + edges, endpoints + groups)
- Type inference benefits from variadic arguments
- Users are familiar with Effect RPC/HttpApi patterns
- The DSL layer composes validated primitives (not implementing core logic)

### Vendorable Component Pattern

Each vendorable component follows this structure:

1. **Header comment** with description and examples
2. **Type definitions** using Effect Schema
3. **Implementation** (the minimal primitive)
4. **No tests** (users test after copying)

Example from `registry/effect-remix/with-effect.ts`:
- 60 lines total
- Wraps Remix loaders/actions to run Effect programs
- Provides automatic Layer provision
- Simple, focused, customizable

### Registry Schema

`registry/registry.json` defines:
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

### Adding a New Framework Type

To add `effect-solidjs`:

1. Create `registry/effect-solidjs/` directory
2. Build 3-5 core components (~50-100 lines each)
3. Create `docs/specs/effect-solidjs.md`
4. Update `registry/registry.json` with new components
5. Update root `README.md` with new section

### Creating a Declarative DSL Component

When configuration complexity warrants a RPC-like DSL (like `dag-workflow.ts`):

1. **Start with primitives** - Build validated base schemas first (types, validation)
2. **Create builders** - Simple `.make()` functions for each entity type
3. **Build DSL layer** - Variadic `YourThing.make()` that groups entities
4. **Keep it composable** - DSL should orchestrate, not reimplement
5. **Provide both APIs** - DSL for ergonomics, builders for flexibility

Example structure:
- `thing-types.ts` (~100-150 lines) - Base schemas
- `thing-validation.ts` (~150-200 lines) - Pure validation
- `thing-builder.ts` (~80-100 lines) - Simple builders
- `thing-dsl.ts` (~200-250 lines) - Declarative API ⭐

### Updating Component Line Counts

When components grow/shrink, update counts in:
- `registry/README.md` (table)
- `README.md` (component list)
- `registry/registry.json` (if significantly different)

### Testing Registry Components

Components are tested by:
1. Copy into a test project
2. Verify TypeScript compilation
3. Check dependencies are correct
4. Ensure examples in header work

No unit tests in registry - users test after vendoring.

## Gotchas

### Don't Abstract Too Early

Resist urge to extract shared utilities across registry components. Each component should be self-contained and copy-paste-able, even if it means slight duplication.

### Monorepo vs Registry

The `meta-effect/` monorepo is legacy. New development focuses on `registry/`. The monorepo may be removed in future.

### Component Size Discipline

If a component exceeds 100 lines, split it. Example: `effect-loader` could become:
- `effect-loader-basic.ts` (~60 lines)
- `effect-loader-errors.ts` (~40 lines)

**Exception for DSL layers**: Components that provide declarative APIs (like `dag-workflow.ts` at ~210 lines) can exceed 100 lines if they're focused, self-contained, and provide significant ergonomic value. These should:
- Be primarily type definitions and builders (not complex logic)
- Compose smaller, validated primitives (dag-types, dag-validation, etc.)
- Follow established Effect patterns (RpcGroup.make, HttpApi, etc.)
- Remain readable and understandable in one sitting

### Version-Free Philosophy

Components aren't versioned like npm packages. Users copy a snapshot and own it. Registry updates are optional migrations, not required upgrades.

## References

- Effect-TS Docs: https://effect.website
- shadcn/ui: https://ui.shadcn.com (inspiration)
- Effect Schema: Core primitive for validation
- Effect Service: Dependency injection pattern
- Effect Layer: Composition and providing dependencies
