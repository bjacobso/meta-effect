# RFC: Effect Meta Framework

## Status
Draft

## Summary
A modern meta-framework built on Effect-TS that recaptures the developer experience philosophy of early Remix, but reimagined from first principles with contemporary tooling and patterns. This framework aims to provide an end-to-end solution for building fullstack applications with exceptional DX, performance, and scalability.

## Motivation

### The Early Remix Vision
Early Remix demonstrated that web frameworks could prioritize:
- Web fundamentals (forms, links, navigation)
- Progressive enhancement
- Server-side rendering with optimal client hydration
- Simple mental models for data loading and mutations
- Excellent developer experience

### Modern Context
The ecosystem has evolved significantly:
- **Effect-TS**: Mature functional effect system for TypeScript
- **Generators & Async**: Wide adoption of generator functions and async patterns
- **TypeScript**: Universal adoption with sophisticated type inference
- **Meta-frameworks**: Acceptance of code generation and schema-driven development
- **Multi-platform compilation**: tsx compiling to web, mobile, native, TUI
- **Real-time & Local-first**: Growing need for live sync, CRDTs, event streams
- **AI-driven UI**: Emerging patterns for AI-generated interfaces

## Design Principles

### 1. Effect-First Architecture
- Effect-TS as the foundation for all async operations, error handling, and side effects
- Type-safe, composable, testable by default
- Built-in retry, timeout, circuit breaking, and resource management
- Seamless integration between client and server boundaries

### 2. Fullstack TypeScript
- Single language across all targets (web, mobile, native, TUI)
- Shared schemas and business logic
- Type-safe RPC with automatic serialization
- Schema-driven code generation

### 3. Modern Rendering
- Server-side rendering (SSR) by default
- React Server Components support
- Streaming SSR with Suspense
- Progressive enhancement
- Optimal hydration strategies

### 4. Real-time & Local-First
- Built-in event streaming
- CRDT-based conflict resolution
- Optimistic updates with automatic rollback
- Live data synchronization
- Offline-first capabilities

### 5. AI-Native
- Real-time UI generation from AI
- Streaming component updates
- Type-safe AI function calling
- Schema validation for AI outputs

### 6. Developer Experience
- Intuitive mental models
- Minimal boilerplate
- Excellent error messages
- Fast feedback loops
- Built-in development tools

### 7. Deployment Flexibility
- Deploy anywhere: edge, serverless, containers, VPS
- Zero-config deployment for common platforms
- Automatic optimization per platform
- Horizontal scaling by default

## Core Features

### Effect-Based Data Loading
```typescript
// Route with Effect-based loader
export const loader = Effect.gen(function* () {
  const db = yield* DatabaseService
  const user = yield* db.getUser({ id: "123" })
  const posts = yield* db.getUserPosts({ userId: user.id })

  return { user, posts }
})

// Automatic error handling, retries, and timeouts
export const loaderConfig = {
  timeout: Duration.seconds(5),
  retry: Schedule.exponential(Duration.millis(100)),
}
```

### Schema-Driven Routes
```typescript
// Define schema, get routes, validation, and types automatically
export const UserSchema = S.Struct({
  id: S.String,
  email: S.String.pipe(S.email()),
  name: S.String,
  role: S.Literal("admin", "user"),
})

// Generates CRUD routes, forms, validation, API endpoints
export const userRoutes = createResource(UserSchema, {
  list: true,
  create: true,
  read: true,
  update: true,
  delete: true,
})
```

### Real-time Data Streams
```typescript
// Stream data to client with built-in CRDT sync
export const stream = Stream.gen(function* () {
  const events = yield* EventService

  yield* events.subscribe("user.posts")
    .pipe(Stream.filter(event => event.userId === currentUser.id))
})

// Client receives typed events with automatic UI updates
```

### AI-Driven UI Generation
```typescript
// Define AI-generated component with schema validation
export const aiComponent = Effect.gen(function* () {
  const ai = yield* AIService
  const userIntent = yield* parseUserInput(input)

  const component = yield* ai.generateComponent({
    intent: userIntent,
    schema: ComponentSchema,
    constraints: layoutConstraints,
  })

  // Returns validated, type-safe React component
  return component
})
```

### Multi-Platform Compilation
```typescript
// Single codebase compiles to multiple targets
import { createApp } from "effect-meta"

export default createApp({
  targets: ["web", "mobile", "native", "tui"],
  routes: [...routes],
  services: [...services],
})

// Platform-specific optimizations applied automatically
```

## Technical Architecture

### Layers
1. **Effect Runtime**: Core effect system, resource management, concurrency
2. **Schema Layer**: Effect Schema for validation, serialization, code generation
3. **Data Layer**: Database access, caching, real-time sync with CRDTs
4. **Service Layer**: Business logic, API endpoints, background jobs
5. **Rendering Layer**: SSR, RSC, streaming, hydration
6. **Platform Layer**: Web, mobile, native, TUI adapters

### Key Technologies
- **Effect-TS**: Effect system, Schema, Stream, STM
- **React**: UI rendering (with RSC support)
- **Automerge/Yjs**: CRDT implementation for real-time sync
- **Platform Adapters**:
  - Web: Vite/esbuild
  - Mobile: React Native
  - Native: Tauri
  - TUI: Ink/blessed

### Routing
- File-based routing (Remix-style)
- Nested routes with layout inheritance
- Type-safe route parameters from schemas
- Automatic API route generation
- Support for route groups and parallel routes

### State Management
- Local state: React hooks
- Server state: Effect-based loaders/actions
- Real-time state: CRDT-synced stores
- Global state: Effect Context
- Form state: Progressive enhancement with optimistic updates

### Error Handling
- Effect-based error types
- Automatic error boundaries
- User-friendly error messages
- Error recovery strategies
- Distributed tracing

## Developer Experience Features

### Code Generation
- Generate routes from schemas
- Generate forms with validation
- Generate API clients
- Generate database queries
- Generate tests

### Development Tools
- Real-time type checking
- Hot module replacement
- Time-travel debugging for CRDTs
- Effect trace visualization
- Performance profiling

### Testing
- Effect-based testing utilities
- Built-in test database seeding
- Snapshot testing for AI components
- Integration testing helpers
- E2E testing framework

## Deployment

### Supported Platforms
- **Edge**: Cloudflare Workers, Deno Deploy, Netlify Edge
- **Serverless**: AWS Lambda, Vercel, Netlify Functions
- **Containers**: Docker, Kubernetes
- **VPS**: Any Node.js environment
- **Mobile**: iOS/Android app stores
- **Desktop**: Native apps for macOS/Windows/Linux

### Configuration
```typescript
// Zero-config for common platforms
export default defineConfig({
  deploy: {
    platform: "auto", // Detects platform automatically
    regions: ["global"], // Or specific regions
    scaling: "auto", // Horizontal scaling config
  }
})
```

## Migration Path

### From Remix
- Similar file-based routing
- Loader/action patterns map to Effect
- Forms work the same way
- Progressive migration possible

### From Next.js
- App Router patterns supported
- Server Components compatible
- API routes map to Effect services
- Incremental migration via adapters

## Open Questions

1. **Build System**: Vite vs custom bundler for multi-platform?
2. **Database**: Built-in ORM or bring-your-own?
3. **Authentication**: Framework-provided or ecosystem solution?
4. **Hosting**: Should we provide managed hosting?
5. **Plugin System**: How extensible should the core be?
6. **Backward Compatibility**: Support for non-Effect code?

## Success Metrics

- **DX**: Time from install to first deploy < 5 minutes
- **Performance**: Lighthouse score > 95 out of the box
- **Type Safety**: 100% type coverage including runtime boundaries
- **Bundle Size**: < 50kb base framework overhead
- **Learning Curve**: Productive within first day for Remix/Next developers

## Timeline

### Phase 1: Foundation (Months 1-3)
- Core Effect runtime integration
- Basic SSR and routing
- Schema-driven code generation
- Single platform (web)

### Phase 2: Real-time (Months 4-6)
- CRDT integration
- Event streaming
- Live synchronization
- Optimistic updates

### Phase 3: Multi-platform (Months 7-9)
- Mobile compilation
- Native compilation
- TUI support
- Platform adapters

### Phase 4: AI Integration (Months 10-12)
- AI component generation
- Streaming UI updates
- Schema validation for AI
- Production hardening

## Alternatives Considered

### Use Existing Frameworks
- **Remix**: Lacks Effect integration, no built-in real-time
- **Next.js**: Complex mental model, not Effect-first
- **SolidStart**: Different reactive model
- **Qwik**: Resumability vs Effect patterns

### Build on Top of Existing
- Could extend Remix/Next with Effect layer
- Decided against: Framework assumptions conflict with Effect patterns
- Better to build from first principles

## Prior Art

- **Remix**: Web fundamentals, progressive enhancement
- **Next.js**: Meta-framework patterns, deployment
- **Blitz.js**: Fullstack integration, code generation
- **RedwoodJS**: Schema-driven development
- **Meteor**: Real-time data, fullstack simplicity
- **Effect-TS**: Effect system, functional architecture

## Conclusion

This framework combines the best ideas from web development history with modern tools to create something that's both familiar and forward-thinking. By building on Effect-TS, we get type safety, composability, and testability by default. By learning from Remix, we maintain web fundamentals and great DX. By embracing real-time, local-first, and AI-native patterns, we prepare for the future of application development.

The goal is simple: make it easy to build applications that are fast, reliable, scalable, and delightful to develop.
