# Inspiration

This document tracks projects, ideas, and philosophies that inspire Meta Effect's design and direction.

## Core Inspirations

### shadcn/ui
**URL**: https://ui.shadcn.com
**Philosophy**: Vendorable components you copy into your codebase

The foundational inspiration for Meta Effect's approach. Rather than npm packages with abstraction boundaries, shadcn/ui provides beautifully crafted components users copy directly into their projects. This gives developers full visibility, zero lock-in, and easy customization.

Meta Effect applies this philosophy to Effect-TS framework bindings: instead of installing `@effect/remix`, you copy `with-effect.ts` (60 lines) into your codebase.

**Key Lessons**:
- Copying > installing for educational value
- ~50-100 lines is the sweet spot
- Users want to own and customize their primitives
- Documentation by example in the code itself

### Effect-TS
**URL**: https://effect.website
**Philosophy**: Composable, type-safe effects for TypeScript

The foundation for all Meta Effect components. Effect provides the primitives (Effect, Layer, Service, Schema) that enable type-safe, composable abstractions.

Meta Effect explores how these primitives naturally compose with web frameworks like Vite, Remix, and HTMX.

**Key Lessons**:
- Services for dependency injection
- Layers for composition
- Schema for validation and serialization
- Effect.gen for readable async flows

## Framework Inspirations

### Remix
**URL**: https://remix.run
**Philosophy**: Web fundamentals, progressive enhancement

Remix's commitment to web standards (loaders, actions, forms) provides a clean foundation for Effect integration. The framework doesn't fight the platform.

**Key Lessons**:
- Work with framework patterns, don't replace them
- Loaders/actions are natural Effect boundaries
- Forms and progressive enhancement still work

### Vite
**URL**: https://vitejs.dev
**Philosophy**: Blazing-fast dev experience with minimal config

Vite's plugin architecture and dev server provide an excellent platform for Effect HttpApi integration.

**Key Lessons**:
- Plugin architecture for extensibility
- Hot module replacement for rapid iteration
- Minimal configuration surface

### HTMX
**URL**: https://htmx.org
**Philosophy**: Hypermedia-driven applications

HTMX proves that rich interactivity doesn't require heavy JavaScript frameworks. Hypermedia patterns compose naturally with Effect's server-side capabilities.

**Key Lessons**:
- Server-driven UI updates
- Progressive enhancement
- Simple attributes over complex APIs

## Effect Ecosystem Inspirations

### effect-http & effect-http-play
**URL**: https://github.com/tim-smart/effect-http
**Playground**: https://github.com/tim-smart/effect-http-play
**Author**: Tim Smart (Founding Engineer at Effect, core contributor)
**Added**: 2025-10-29
**Philosophy**: Runtime-agnostic HTTP toolkit for Effect-TS

Tim Smart's effect-http provides a runtime-agnostic HTTP library that works across Node.js, Bun, and other JavaScript runtimes. It demonstrates how to build Effect-first HTTP abstractions that aren't tied to specific platforms.

**Key Concepts**:
- Runtime-agnostic HTTP routing and handling
- Multi-runtime support (`@effect-http/node`, `@effect-http/bun`)
- HTTP operations as Effect computations
- Router implementation with method/path matching
- Built-in response utilities for common content types
- Effect-native error handling patterns

**Why It Inspires Meta Effect**:
- Shows production-grade Effect HTTP patterns from a core Effect contributor
- Demonstrates how to abstract across runtimes while maintaining Effect semantics
- Validates the router + Effect composition approach we use in effect-vite
- Provides reference implementations for HTTP primitives with Effect
- effect-http-play serves as an experimentation ground for patterns

**Potential Applications**:
- Reference for our effect-vite HTTP components
- Patterns for runtime-agnostic server primitives
- Ideas for effect-http-server components (alternative to effect-vite)
- Cross-runtime testing strategies
- Router composition patterns

**Note**: Tim Smart maintains several Effect ecosystem projects (effect-http, sqlfx, effect-atom, effect-mcp) that demonstrate different patterns for integrating Effect with various domains. His work provides valuable reference implementations for vendorable components.

## Emerging Inspirations

### Liminal
**URL**: https://github.com/harrysolovay/liminal
**Added**: 2025-10-29
**Philosophy**: Effect-based conversation state management for LLMs

Liminal demonstrates an innovative approach to LLM interaction patterns using Effect primitives. Rather than imperative message-passing, it frames conversations as effect computations—declarative, composable operations that manage state functionally.

**Key Concepts**:
- Conversations as Effects (not just async functions)
- Composable dialogue primitives (`L.system`, `L.user`, `L.assistant`)
- Thread abstraction for conversation state
- Service integration within conversation contexts
- Type-safe, testable dialogue logic

**Why It Inspires Meta Effect**:
- Shows how Effect patterns can elegantly model stateful, multi-step processes
- Demonstrates "effects as a mental model" for complex domains (conversations, workflows)
- Validates the vendorable approach for Effect-based tools
- Parallel to our effect-ci work: both use Effect to model sequential, stateful operations

**Potential Applications**:
- `effect-ai` components for LLM integration patterns
- Conversation primitives as vendorable components
- Effect-based agent orchestration
- Multi-step workflow patterns (similar to effect-ci DAGs)

---

## How to Use This Document

When you discover a project, pattern, or idea that could inform Meta Effect's design:

1. Add it to the appropriate section (or create a new section)
2. Include the URL and a brief "Philosophy" statement
3. Extract "Key Lessons" or "Key Concepts"
4. Explain "Why It Inspires Meta Effect"
5. Consider "Potential Applications" for the registry

This document is a living record of influences that shape Meta Effect's direction.
