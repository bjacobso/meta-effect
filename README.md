# Meta Effect

> Building Effect bindings from first principles - a systematic exploration of composing Effect-TS primitives with modern web frameworks.

## What is Meta Effect?

Meta Effect is an exploration of building shared Effect bindings for different web frameworks and rendering strategies. Rather than creating a new meta-framework, we're discovering the fundamental primitives needed to compose Effect with Vite, Remix, HTMX, and beyond.

Each package in `meta-effect/` represents a first-principles implementation of Effect bindings for a specific framework, with corresponding living documentation in `docs/specs/`.

## Project Structure

```
meta-effect/
├── packages/
│   ├── effect-vite/     → Vite + HttpApi + Atom integration
│   ├── effect-remix/    → Remix with Effect data loading
│   └── effect-htmx/     → HTMX with Effect backend (planned)
docs/specs/
├── effect-vite.md       → Living spec for Vite bindings
├── effect-remix.md      → Living spec for Remix bindings
└── effect-htmx.md       → Living spec for HTMX bindings
```

Each package is designed from first principles to answer:
- How do Effect primitives naturally compose with this framework?
- What shared abstractions emerge across different rendering strategies?
- Can we build a unified mental model for Effect-based web applications?

## Overview

Meta Effect explores how Effect's battle-tested primitives - Services, Layers, Effects, Schemas - can be composed with modern web frameworks. We're not abstracting frameworks away; we're finding the natural integration points.

### Principles

- **Effect-First** - Every operation is an Effect - services, data loading, mutations
- **Framework Integration** - Compose with existing frameworks rather than replace them
- **Type-Safe End-to-End** - From database to UI with Effect Schema validation
- **Shared Primitives** - Discover common patterns across different rendering strategies
- **Living Documentation** - Each package has a living spec that evolves with implementation

## Bindings

### 🔨 effect-vite
**Status**: In Development
**Spec**: [docs/specs/effect-vite.md](docs/specs/effect-vite.md)

Vite + HttpApi + Atom integration providing a unified primitive for building reactive Effect applications with Vite's dev server.

**Core Concepts**:
- HttpApi routes served via Vite dev server
- Reactive atoms for client state with Effect integration
- Type-safe RPC between client and server
- Hot module replacement for Effect services

### 🎵 effect-remix
**Status**: In Development
**Spec**: [docs/specs/effect-remix.md](docs/specs/effect-remix.md)

Remix bindings that compose Effect services with Remix loaders, actions, and routes.

**Core Concepts**:
- Effect services in Remix loaders
- Type-safe action handlers with Effect error handling
- Layer-based dependency injection for routes
- Progressive enhancement with Effect

### 🔗 effect-htmx
**Status**: Planned
**Spec**: [docs/specs/effect-htmx.md](docs/specs/effect-htmx.md)

HTMX with Effect backend for hypermedia-driven applications.

**Core Concepts**:
- Effect HttpApi as HTMX backend
- HTML-first responses with Effect Schema validation
- Stream-based partial updates
- Effect services for server-side state

## Documentation

### Living Specifications

- [**effect-vite Spec**](docs/specs/effect-vite.md) - Vite integration specification
- [**effect-remix Spec**](docs/specs/effect-remix.md) - Remix integration specification
- [**effect-htmx Spec**](docs/specs/effect-htmx.md) - HTMX integration specification

### Core Framework Concepts

- [**Framework Overview**](docs/core/overview.md) - Meta Effect architecture and philosophy
- [**Architecture Guide**](docs/core/architecture.md) - Technical deep-dive into the design
- [**@effect/vite Architecture**](docs/core/effect-vite-architecture.md) - Visual guide to Vite + HttpApi + Atom
- [**Remix Vision**](docs/core/remix-vision.md) - Effect with Remix philosophy

### Tools & Development

- [**CLI Documentation**](docs/tools/cli.md) - AST-aware codebase exploration tools
- [**Worktree Management**](docs/tools/worktree.md) - Git worktree integration

### Advanced Integrations

- [**AI Primitives**](docs/integrations/ai.md) - Schema-driven AI tool generation
- [**Git Operations**](docs/integrations/git.md) - Git as composable Effects

### RFCs & Design History

- [**Main Framework RFC**](docs/rfcs/effect-meta-rfc.md) - Original meta-framework vision
- [**@effect/vite RFC**](docs/rfcs/effect-vite-rfc.md) - Vite + HttpApi + Atom primitive RFC
- [**CLI Tooling RFC**](docs/rfcs/cli-rfc.md) - CLI design and implementation
- [**Original Vision RFC**](docs/rfcs/original-rfc.md) - Initial framework vision

## Quick Examples

### effect-vite: Type-Safe RPC with Atoms

```typescript
// server/api.ts - Define HttpApi
export class UserApi extends HttpApi.Tag<UserApi>()("UserApi", {
  listUsers: HttpApi.get("users", "/users"),
  getUser: HttpApi.get("user", "/users/:id")
}) {}

// client/atoms.ts - Consume via atoms
const userAtom = ApiAtom.query(UserApi, "getUser", {
  params: { id: "123" }
})

// client/component.tsx
function UserProfile() {
  const user = useAtomValue(userAtom)
  return <div>{user.name}</div>
}
```

### effect-remix: Effect Services in Loaders

```typescript
// routes/users.$id.tsx
export const loader = async ({ params }: LoaderFunctionArgs) => {
  return await Effect.runPromise(
    Effect.gen(function* () {
      const user = yield* UserService.findById(params.id)
      const posts = yield* PostService.findByAuthor(params.id)
      return { user, posts }
    }).pipe(Effect.provide(AppLayer))
  )
}
```

### effect-htmx: Hypermedia with Effect

```typescript
// server/routes.ts
export const TodosApi = HttpApi.make({
  createTodo: HttpApi.post("create", "/todos")
    .pipe(HttpApi.setPayload(CreateTodoSchema))
    .pipe(HttpApi.setResponse(Html.html))
})

// Returns HTML fragment for HTMX
Effect.gen(function* () {
  const todo = yield* TodoService.create(input)
  return Html.render(<TodoItem todo={todo} />)
})
```

## Project Status

**Status**: Early Exploration Phase

We're building first-principles implementations of Effect bindings for different frameworks to discover shared patterns and abstractions.

## Roadmap

### Phase 1: First Implementations (Current)
- ✅ effect-vite: Basic HttpApi + Vite integration
- 🚧 effect-vite: Atom integration with type-safe RPC
- 🚧 effect-remix: Service composition with loaders
- 📋 effect-htmx: HTML-first responses with HttpApi

### Phase 2: Shared Primitives
- Discover common patterns across bindings
- Extract shared Effect composition utilities
- Unified error handling strategies
- Common testing patterns

### Phase 3: Developer Experience
- CLI tools for scaffolding
- Dev server integrations
- Hot module replacement for Effect services
- Visual debugging tools

## Contributing

Meta Effect is an open exploration and we welcome contributions!

### How to Contribute

1. **Try a Binding**
   - Clone the repo and experiment with `meta-effect/packages/`
   - Share your experience and findings

2. **Improve Living Specs**
   - Each binding has a living spec in `docs/specs/`
   - Suggest improvements or clarifications

3. **Build New Bindings**
   - Interested in effect-solidjs? effect-qwik? effect-fresh?
   - Start from first principles and document your journey

4. **Join the Discussion**
   - [Effect Discord #ideas channel](https://discord.gg/effect-ts)
   - Share patterns and abstractions you discover

### Key Questions We're Exploring

- What are the minimal primitives needed for Effect + web framework integration?
- Which patterns are universal across Vite, Remix, HTMX, and others?
- How can we maintain framework idioms while gaining Effect benefits?
- What does "Effect-native" web development feel like?

## Philosophy

Meta Effect is not trying to create a new framework. We're exploring how Effect's composable primitives naturally integrate with existing frameworks. Each binding teaches us something about the shared patterns, and those patterns inform future bindings.

The goal is discovery, not invention.

## License

MIT

## Acknowledgments

Meta Effect builds on:
- The Effect-TS team and ecosystem
- Vite's brilliant dev server architecture
- Remix's web fundamentals philosophy
- HTMX's hypermedia-driven approach
- The `@effect-atom` reactive state library

---

*Meta Effect: Building Effect bindings from first principles, one framework at a time.*