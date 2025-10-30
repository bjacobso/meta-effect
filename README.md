# Meta Effect

> Not a framework. Not an npm package. Just Meta Effects.

## What is Meta Effect?

Meta Effect is a collection of **vendorable components** for building applications with Effect-TS. Inspired by shadcn/ui, these aren't packages you install - they're **Meta Effects** you copy directly into your project and own.

Each component is a concise, focused primitive that demonstrates how to compose Effect primitives with frameworks, databases, workflows, and tooling. Copy what you need, leave what you don't, and customize everything.

**Meta Effects** = Minimal, Effect-based primitives you vendor into your codebase.

**Scope**: From web framework integrations (Vite, Remix) to workflow orchestration (DAGs, CI/CD), data modeling (entities, forms), domain-specific tools (e-signatures), and developer infrastructure (testing, code generation).

### Component Categories

| Category | Examples |
|----------|----------|
| **Web Frameworks** | Vite HttpApi, Remix loaders, HTMX |
| **Workflows** | DAG interpreter, CI automation, human-in-the-loop |
| **Data & Validation** | Forms, expressions, entities, Prisma |
| **Code Generation** | Schema → GHA/Step Functions/TypeScript |
| **Specialized Domains** | E-signatures, testing utilities |

## Installation

Add components to your project with the CLI:

```bash
# Add a single component
npx meta-effect add api-atom

# Add all Vite components
npx meta-effect add vite-full

# Add all Remix components
npx meta-effect add remix-full

# List available components
npx meta-effect list
```

Components are copied to `src/lib/` in your project. You own them. Modify freely.

## Available Components

### Web Framework Integration

**effect-vite** - Build reactive Vite apps with Effect HttpApi
- http-api - Type-safe API definitions
- vite-plugin - Dev server integration
- api-atom - Reactive atoms for APIs
- route-atom - URL-synchronized atoms

**effect-remix** - Compose Effect services with Remix
- with-effect - Simple loader/action helpers
- effect-loader - Advanced loader patterns
- effect-action - Form actions with validation

**effect-htmx** (planned) - Hypermedia-driven apps with Effect
- html-response - HTML rendering utilities
- htmx-attrs - Type-safe HTMX attributes
- sse-stream - Server-sent events

### Workflow & Orchestration

**effect-dag** - General-purpose workflow orchestration with typed DAGs
- dag-types - Node/Edge schemas
- dag-builder - Ergonomic constructors
- dag-validation - Cycle detection, validation
- dag-workflow - Declarative Workflow.make() DSL
- dag-interpreter - Local execution engine
- dag-to-mermaid - Diagram generation

**effect-ci** - Typed CI/CD pipelines with Effect
- ci-types - Schema types for git/GitHub data
- shell-runner - Typed git/gh/claude commands
- transforms - Pipeline transform utilities
- release-plan - Weekly release automation

**effect-collect** - Human-in-the-loop collection primitives
- collect-node - Schema for collection points
- collect-service - Collection Effect service

### Data & Validation

**effect-forms** - Type-safe form definitions that compile to multiple targets
- form-schema - FormIR type definitions
- form-to-json-schema - JSON Schema compiler
- form-to-github-inputs - GHA workflow inputs
- form-to-react-shadcn - React component generator

**effect-expressions** - Safe expression evaluation for workflows
- expr-service - ExpressionEvaluator interface
- expr-simple - Function() based evaluator
- expr-cel - CEL (Common Expression Language) evaluator

**effect-entities** - Domain entity definitions that compile to SQL/Prisma/migrations
- entity-schema - Entity and ValueObject DSL
- entity-relationships - Relation definitions
- entity-to-sql - SQL schema compiler
- entity-to-migration - Migration generator
- entity-to-prisma - Prisma schema compiler
- entity-query-builder - Type-safe queries

**effect-prisma** - Prisma ORM Effect wrappers (✅ Implemented)
- db-client - Basic Prisma Client wrapper
- db-transaction - Advanced transaction patterns

### Code Generation

**effect-compilers** - Multi-target code generation from schemas
- compiler-service - Generic Compiler interface
- dag-to-github-actions - DAG → GHA YAML
- dag-to-step-functions - DAG → AWS Step Functions ASL
- form-to-typescript-types - Form → TypeScript types

### Specialized Domains

**effect-esign** - Electronic signature workflow components
- signature-capture - Signature input modalities
- signature-crypto - Web Crypto API wrapper
- document-state-machine - Signing workflow state
- audit-trail - Event sourcing for compliance
- signature-field-parser - PDF field extraction
- signing-session - Session management
- consent-tracking - ESIGN Act compliance
- pdf-signer - Apply signatures to PDF

**effect-testing** - Testing utilities for Effect applications (🚧 In Development)
- msw-handlers - MSW handlers from HttpApi
- msw-service - MSW lifecycle service
- mock-data - Schema-based mock generation

## Why Vendorable?

Traditional npm packages create abstraction boundaries. You can't see inside them, and customizing behavior means fighting the abstraction.

With vendored components:

- ✅ **Full Visibility**: See exactly what's happening (~50 lines)
- ✅ **Zero Lock-in**: Update on your schedule
- ✅ **Easy Customization**: Modify the source directly
- ✅ **Educational**: Learn Effect patterns by reading
- ✅ **Framework Flexibility**: Adapt to your framework version

Like shadcn/ui, but for Effect.

## Philosophy

Meta Effect is an exploration of Effect from first principles. We're not building abstractions - we're discovering primitives that compose.

Each component asks:
- How do Effect primitives naturally compose with this system (framework, database, workflow engine, etc.)?
- What's the minimal code needed to demonstrate the pattern?
- Does this generalize across domains?

**Core Themes**:
1. **Composition Over Frameworks** - Effect primitives compose with anything (Vite, Remix, Prisma, GitHub Actions)
2. **Schema-Driven Design** - Use Effect Schema as source of truth (forms, entities, workflows, compilers)
3. **Multi-Target Compilation** - Define once, compile to many (DAGs → GHA/Step Functions, Forms → React/JSON Schema)
4. **Human-in-the-Loop** - Workflows can pause for human input (approvals, forms, signatures)
5. **Type-Safe Everything** - From database queries to CI pipelines to electronic signatures

The goal is discovery, not invention. We find patterns that emerge naturally from Effect's primitives.

### Principles

- **Minimal** - Each component is concise and focused
- **Vendorable** - Copy into your codebase, you own it
- **Composable** - Mix and match what you need
- **Educational** - Learn Effect patterns by reading
- **Framework-Aware** - Integrate with, don't replace
- **Schema-Driven** - Effect Schema as source of truth
- **Multi-Target** - Compile once, deploy everywhere

## Component Registry

All components live in [`meta-effect/packages/registry/src/`](./meta-effect/packages/registry/src/) with metadata in [`registry.json`](./meta-effect/packages/registry/registry.json).

**Component Structure**:
```
meta-effect/packages/registry/src/
├── effect-vite/
│   ├── http-api.ts        # ~65 lines
│   ├── vite-plugin.ts     # ~60 lines
│   ├── api-atom.ts        # ~80 lines
│   └── route-atom.ts      # ~70 lines
├── effect-remix/
│   ├── with-effect.ts     # ~60 lines
│   ├── effect-loader.ts   # ~90 lines
│   └── effect-action.ts   # ~95 lines
├── effect-ci/
│   ├── types.ts           # ~60 lines
│   ├── shell-runner.ts    # ~140 lines
│   ├── transforms.ts      # ~130 lines
│   ├── release-plan.ts    # ~180 lines
│   └── dag-*.ts           # DAG workflow components
├── effect-livestore/      # LiveStore integration
├── effect-prisma/         # Prisma database integration
└── effect-htmx/           # Coming soon
```

See [registry README](./meta-effect/packages/registry/README.md) for details.

## Documentation

### Component Specifications

Each component type has a living specification that evolves with implementation:

**Web Framework Integration**:
- [**effect-vite Spec**](docs/specs/effect-vite.md) - Vite + HttpApi + Atom components
- [**effect-remix Spec**](docs/specs/effect-remix.md) - Remix loaders, actions, and Effect integration
- [**effect-htmx Spec**](docs/specs/effect-htmx.md) - HTMX hypermedia patterns (planned)

**Workflow & Orchestration**:
- [**effect-dag Spec**](docs/specs/effect-dag.md) - General-purpose DAG workflow primitives
- [**effect-ci Spec**](docs/specs/effect-ci.md) - CI/CD automation with git/GitHub
- [**effect-collect Spec**](docs/specs/effect-collect.md) - Human-in-the-loop collection

**Data & Validation**:
- [**effect-forms Spec**](docs/specs/effect-forms.md) - Type-safe form definitions and compilers
- [**effect-expressions Spec**](docs/specs/effect-expressions.md) - Safe expression evaluators
- [**effect-entities Spec**](docs/specs/effect-entities.md) - Domain entities to SQL/Prisma/migrations
- [**effect-prisma Spec**](docs/specs/effect-prisma.md) - Prisma ORM Effect wrappers (✅ Implemented)

**Code Generation**:
- [**effect-compilers Spec**](docs/specs/effect-compilers.md) - Multi-target code generation

**Specialized Domains**:
- [**effect-esign Spec**](docs/specs/effect-esign.md) - Electronic signature workflows (ESIGN Act, eIDAS)
- [**effect-testing Spec**](docs/specs/effect-testing.md) - MSW and mock data for Effect (🚧 In Development)

### Design & Philosophy

- [**Framework Overview**](docs/core/overview.md) - Meta Effect architecture and philosophy
- [**Architecture Guide**](docs/core/architecture.md) - Technical deep-dive
- [**Remix Vision**](docs/core/remix-vision.md) - Effect + web fundamentals

### Historical RFCs

The original vision explored a meta-framework. We pivoted to vendorable components:

- [**Effect Meta RFC**](docs/rfcs/effect-meta-rfc.md) - Original meta-framework idea
- [**@effect/vite RFC**](docs/rfcs/effect-vite-rfc.md) - Vite integration exploration
- [**Original Vision**](docs/rfcs/original-rfc.md) - Where it all started

## Quick Examples

After adding components with `npx meta-effect add`, use them in your app:

### effect-vite

```typescript
// 1. Add components
// npx meta-effect add vite-full

// 2. Define your API (src/server/api.ts)
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "effect"

export class UserApi extends HttpApiGroup.make("users")
  .add(HttpApiEndpoint.get("list", "/users"))
{}

// 3. Use in Vite config
import { effectVite } from './lib/effect-vite/vite-plugin'

export default defineConfig({
  plugins: [effectVite({ api: UserApi, layer: AppLayer })]
})

// 4. Create reactive atoms (src/atoms/users.ts)
import { apiAtom } from './lib/effect-vite/api-atom'

export const usersAtom = apiAtom({
  query: () => fetch('/api/users').then(r => r.json()),
  key: 'users-list'
})

// 5. Use in component
import { useAtomValue } from 'jotai'

function UserList() {
  const users = useAtomValue(usersAtom)
  return <ul>{users.map(u => <li>{u.name}</li>)}</ul>
}
```

### effect-remix

```typescript
// 1. Add components
// npx meta-effect add remix-full

// 2. Use in route loader (app/routes/users.$id.tsx)
import { withEffect } from '~/lib/effect-remix/with-effect'
import { UserService } from '~/services'
import { AppLayer } from '~/server/layer'

export const loader = withEffect(AppLayer, ({ params }) =>
  Effect.gen(function* () {
    const user = yield* UserService.findById(params.id)
    const posts = yield* PostService.findByAuthor(params.id)
    return { user, posts }
  })
)

// 3. Use in action
import { effectAction } from '~/lib/effect-remix/effect-action'

export const action = effectAction({
  layer: AppLayer,
  schema: CreateUserSchema,
  handler: ({ validated }) =>
    Effect.gen(function* () {
      const user = yield* UserService.create(validated)
      return redirect(`/users/${user.id}`)
    })
})
```

### effect-ci

```bash
# 1. Add components
# npx meta-effect add ci-full

# 2. Run locally to generate weekly release notes
npx tsx lib/effect-ci/release-plan.ts run

# 3. Preview without side effects
npx tsx lib/effect-ci/release-plan.ts run --dry-run

# 4. Custom date range
npx tsx lib/effect-ci/release-plan.ts run \
  --since 2025-10-10T00:00:00Z \
  --until 2025-10-17T00:00:00Z

# 5. Generate GitHub Actions workflow
npx tsx lib/effect-ci/release-plan.ts emit-workflow > .github/workflows/weekly.yml

# Environment variables needed:
# export ANTHROPIC_API_KEY=sk-...
# export GITHUB_TOKEN=ghp_...
```

Customize the plan in [release-plan.ts](meta-effect/packages/registry/src/effect-ci/release-plan.ts#L50):

```typescript
export const weeklyPlan: ReleasePlan = {
  name: "weekly-release",
  window: { kind: "lastDays", days: 7 },
  model: "claude-3-5-sonnet-latest",
  maxChangelog: 70,
  labelFilter: ["user-facing"],  // Optional: filter by PR labels
  output: {
    toMarkdownFile: "release_notes.md",
    toJsonFile: "release_notes.json",
    toGithubRelease: (d) => ({
      tag: `weekly-${d.toISOString().slice(0, 10)}`,
      title: `Weekly Release Notes – ${d.toISOString().slice(0, 10)}`
    })
  }
}
```

## Project Status

**Vision**: A comprehensive collection of vendorable Effect primitives spanning web frameworks, workflows, data modeling, and specialized domains.

### Implemented (✅)
- **effect-vite** - 4 components
- **effect-remix** - 3 components
- **effect-ci** - 4 components
- **effect-prisma** - 2 components
- Component registry structure
- Registry metadata (registry.json)

### In Development (🚧)
- **effect-testing** - MSW and mock data utilities
- CLI `add` command implementation
- Component documentation improvements
- Example applications

### Planned - Core Infrastructure (📋)
- **effect-dag** - General-purpose workflow DAGs
- **effect-collect** - Human-in-the-loop primitives
- **effect-forms** - Type-safe form schemas
- **effect-expressions** - Safe expression evaluation
- **effect-compilers** - Multi-target code generation

### Planned - Data & Entities (📋)
- **effect-entities** - Domain modeling to SQL/Prisma

### Planned - Specialized Domains (📋)
- **effect-esign** - Electronic signature workflows
- **effect-htmx** - Hypermedia-driven patterns

### Future Enhancements
- Interactive component browser
- Video tutorials and workshops
- More framework integrations (SolidJS, Svelte, etc.)
- Additional specialized domain components

## Contributing

Found a useful pattern? Add it to the registry!

### Adding a Component

1. **Keep it Small**: ~50-100 lines maximum
2. **Document Usage**: Include a detailed header comment with examples
3. **List Dependencies**: Only peer dependencies (user installs them)
4. **Add to Registry**: Update `meta-effect/packages/registry/registry.json` with metadata

Example component structure:

```typescript
/**
 * Component Name
 *
 * Brief description of what this component does and why it's useful.
 *
 * @example
 * ```ts
 * // Show a complete, working example
 * import { component } from './lib/effect-vite/component'
 *
 * // Usage example
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

// Implementation (~50-100 lines)
```

### Building New Component Types

Interested in effect-solidjs? effect-qwik? effect-fresh?

1. Create `meta-effect/packages/registry/src/effect-framework/` directory
2. Build 3-5 core components (~50-100 lines each)
3. Add spec doc in `docs/specs/effect-framework.md`
4. Update `registry.json`

### Join the Discussion

- [Effect Discord #ideas channel](https://discord.gg/effect-ts)
- Share your customizations and patterns
- Ask questions about Effect integration

## License

MIT - Copy freely!

## Acknowledgments

Meta Effect builds on brilliant work from:

- **Effect-TS** - Composable, type-safe effects
- **shadcn/ui** - Vendorable component philosophy
- **Vite** - Blazing-fast dev server
- **Remix** - Web fundamentals done right
- **HTMX** - Hypermedia-driven simplicity
- **Jotai** - Primitive and flexible React state

## Inspiration

This project asks: "What if shadcn/ui's philosophy applied to Effect primitives across all domains?"

Instead of installing `@effect/remix`, you copy `with-effect.ts` into your codebase. Instead of installing a workflow engine, you copy `dag-interpreter.ts`. Instead of using a form library, you copy `form-schema.ts` and generate your forms.

You see exactly how Effect composes with Remix, Prisma, GitHub Actions, and more. You modify it for your needs. You own it.

**Meta Effect** explores Effect primitives across:
- **Web Frameworks** - Vite, Remix, HTMX integrations
- **Workflows** - DAG orchestration, CI/CD automation, human-in-the-loop
- **Data** - Forms, expressions, entities, database layers
- **Code Generation** - Schema → multiple targets (SQL, React, YAML)
- **Specialized Domains** - E-signatures, testing utilities

That's a **Meta Effect**: A minimal, composable primitive you vendor and own.

---

**Not a framework. Not an npm package. Just Meta Effects.**