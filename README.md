# Effect Meta

> A composable meta-framework built entirely on Effect-TS primitives, providing unified, type-safe, and composable full-stack web applications with fine-grained reactivity.

## Quick Start

```bash
# Coming soon - Effect Meta is in early design phase
npm create effect-meta@latest my-app
cd my-app
npm run dev
```

## Overview

Effect Meta represents a paradigm shift in web framework design: instead of reinventing common patterns, we leverage Effect's battle-tested primitives with fine-grained reactive atoms to build a truly composable meta-framework.

### Key Features

- **Effect-First Architecture** - Every route, middleware, and data loader is an Effect
- **Fine-Grained Reactivity** - Powered by `@effect-atom/atom-react` for optimal client state management
- **Type-Safe End-to-End** - From database to UI with zero runtime overhead
- **Framework Agnostic** - Same code runs on Remix, Next.js, or as an SPA
- **Built-in Best Practices** - Automatic parallelization, caching, error handling, and observability

## Documentation

### Core Framework

- [**Framework Overview**](docs/core/overview.md) - Detailed introduction to Effect Meta's architecture and philosophy
- [**Architecture Guide**](docs/core/architecture.md) - Technical deep-dive into the framework design
- [**@effect/vite Architecture**](docs/core/effect-vite-architecture.md) - Visual guide to Vite + HttpApi + Atom integration
- [**Remix Vision**](docs/core/remix-vision.md) - How Effect Meta captures the early Remix philosophy

### Tools & CLI

- [**CLI Documentation**](docs/tools/cli.md) - AST-aware codebase exploration and management tools
- [**Worktree Management**](docs/tools/worktree.md) - Git worktree integration for Effect Meta projects

### Integrations

- [**AI Primitives**](docs/integrations/ai.md) - Schema-driven AI tool generation and integration
- [**Git Operations**](docs/integrations/git.md) - Git operations as composable Effects

### RFCs & Design Documents

- [**Main Framework RFC**](docs/rfcs/effect-meta-rfc.md) - Complete technical specification
- [**@effect/vite RFC**](docs/rfcs/effect-vite-rfc.md) - Unified Vite + HttpApi + Atom primitive
- [**CLI Tooling RFC**](docs/rfcs/cli-rfc.md) - CLI design and implementation details
- [**Original Vision RFC**](docs/rfcs/original-rfc.md) - Initial framework vision and principles

## Core Concepts

### Routes as Effects

```typescript
const UserRoute = Meta.Route.make({
  path: "/users/:id",
  data: Effect.gen(function* () {
    const { id } = yield* RouteParams
    const user = yield* UserService.findById(id)
    const posts = yield* PostService.findByAuthor(id)
    return { user, posts }
  }),
  component: ({ data }) => <UserProfile {...data} />
})
```

### Reactive Atoms for Client State

```typescript
const searchAtom = RouteAtom.searchParams({
  schema: Schema.Struct({
    query: Schema.String,
    page: Schema.NumberFromString
  })
})

const resultsAtom = Atom.make(
  Effect.gen(function* (get) {
    const params = get(searchAtom)
    return yield* SearchService.query(params)
  })
)
```

### Composable Middleware

```typescript
const AuthMiddleware = Meta.Middleware.make("auth",
  Effect.gen(function* () {
    const session = yield* SessionService.current
    if (!session) return yield* Effect.fail(new Unauthorized())
    return { user: session.user }
  })
)
```

## Project Status

**Status**: Early Design Phase (RFC Stage)

We're currently gathering community feedback on the design and API. See our [Contributing](#contributing) section to get involved.

## Roadmap

### Phase 1: Core Primitives (Current)
- Define Route, Middleware, and App abstractions
- Atom integration design
- React component patterns

### Phase 2: Implementation
- Core framework implementation
- React integration
- Basic routing and data loading

### Phase 3: Adapters & Primitives
- **@effect/vite** - First-class Vite + HttpApi + Atom primitive (see [RFC](docs/rfcs/effect-vite-rfc.md))
- Remix adapter
- Next.js adapter

### Phase 4: Ecosystem
- CLI tools
- DevTools
- Visual route editor

## Contributing

Effect Meta is in early design phase and we welcome community input!

### How to Contribute

1. **Join the Discussion**
   - [Effect Discord #ideas channel](https://discord.gg/effect-ts)
   - [GitHub Discussions](https://github.com/Effect-TS/effect/discussions)

2. **Review RFCs**
   - Read our [design documents](docs/rfcs/)
   - Provide feedback on proposed APIs

3. **Share Ideas**
   - Tweet with #EffectMeta
   - Open issues for feature requests

### Key Questions for Community

- Should Effect Meta require Effect Schema or support other validation libraries?
- Server Components vs. server-first rendering preference?
- File-based vs. code-based routing?
- Integration with existing Effect ecosystem packages?

## Success Metrics

- **DX**: Install to deploy in < 5 minutes
- **Performance**: Lighthouse score > 95 out of the box
- **Type Safety**: 100% type coverage including runtime boundaries
- **Bundle Size**: < 50kb framework overhead
- **Learning Curve**: Productive within first day for Remix/Next developers

## License

MIT

## Acknowledgments

Effect Meta builds on the incredible work of:
- The Effect-TS team and ecosystem
- Early Remix's vision of web fundamentals
- The React Server Components architecture
- The `@effect-atom` reactive state management library

---

*Effect Meta aims to become the killer app for Effect-TS by solving the meta-framework problem through composable primitives rather than framework-specific abstractions.*