# effect-testing Specification

**Status**: In Development
**Components**: See [`registry/effect-testing/`](../../meta-effect/packages/registry/src/effect-testing/)
**Last Updated**: 2025-10-28

## Overview

`effect-testing` is a collection of vendorable components (~310 lines total) for testing Effect-based applications with Mock Service Worker (MSW) and type-safe mock data generation. These aren't npm packages - they're code you copy into your project with `npx meta-effect add`.

Each component is ~50-100 lines and demonstrates how to:
- Mock Effect HttpApi endpoints with MSW
- Generate type-safe test data from Effect Schemas
- Manage MSW server lifecycle as an Effect Service
- Write tests using Effect's Service pattern

## Core Primitives

### 1. MSW API Handlers

Generate MSW handlers directly from your Effect HttpApi definitions:

```typescript
// test/handlers.ts
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { createMswHandler } from './lib/effect-testing/msw-handlers'
import { TodosApiGroup, Todo, TodoNotFound } from './api'
import { Effect } from 'effect'

// Type-safe handlers from your HttpApi
const handlers = [
  // GET /todos - returns mock array
  createMswHandler(TodosApiGroup, 'getAllTodos', () =>
    Effect.succeed([
      new Todo({ id: 1, text: 'Test todo 1', done: false }),
      new Todo({ id: 2, text: 'Test todo 2', done: true })
    ])
  ),

  // GET /todos/:id - with error handling
  createMswHandler(TodosApiGroup, 'getTodoById', ({ pathParams }) =>
    pathParams.id === '1'
      ? Effect.succeed(new Todo({ id: 1, text: 'Test todo', done: false }))
      : Effect.fail(new TodoNotFound({ id: Number(pathParams.id) }))
  ),

  // POST /todos - validates payload
  createMswHandler(TodosApiGroup, 'createTodo', ({ payload }) =>
    Effect.succeed(
      new Todo({ id: 3, text: payload.text, done: false })
    )
  )
]

export const server = setupServer(...handlers)
```

**Key Features**:
- Automatic path and method extraction from HttpApi
- Type-safe path parameters and payloads
- Effect-based handler logic
- Automatic error to HTTP status mapping

### 2. Mock Data Generation

Generate valid test data from Effect Schemas using `@effect/schema/Arbitrary`:

```typescript
// test/factories.ts
import { Schema } from 'effect'
import { generateMock, createMockFactory } from './lib/effect-testing/mock-data'

// Your domain model
const User = Schema.Struct({
  id: Schema.Number,
  email: Schema.String.pipe(Schema.pattern(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)),
  name: Schema.NonEmptyString,
  age: Schema.Number.pipe(Schema.between(18, 100)),
  role: Schema.Literal('admin', 'user', 'guest')
})

// Generate a single mock
const user = yield* generateMock(User)
// => { id: 42, email: 'test@example.com', name: 'John Doe', age: 25, role: 'user' }

// Generate with overrides
const admin = yield* generateMock(User, { role: 'admin', name: 'Admin User' })

// Generate multiple mocks
const users = yield* generateMockArray(User, 10)

// Create a reusable factory
const UserFactory = createMockFactory(User, {
  role: 'user' // default override
})

const regularUser = yield* UserFactory.create()
const specificUser = yield* UserFactory.create({ email: 'specific@example.com' })
const manyUsers = yield* UserFactory.createMany(5)
```

**Key Features**:
- Uses fast-check for property-based test data
- Respects Schema constraints (patterns, ranges, etc.)
- Override specific fields while keeping others generated
- Factory pattern for consistent defaults

### 3. MSW Service Layer

Manage MSW server lifecycle as an Effect Service:

```typescript
// test/setup.ts
import { setupServer } from 'msw/node'
import { describe, it, beforeAll, afterAll } from 'vitest'
import { Effect } from 'effect'
import { MswService } from './lib/effect-testing/msw-service'
import { handlers } from './test/handlers'

describe('Todo API', () => {
  const server = setupServer(...handlers)

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())

  it.effect('should list all todos', () =>
    Effect.gen(function* () {
      const msw = yield* MswService

      // Call your API (uses MSW mocks)
      const response = yield* Effect.promise(() => fetch('/todos'))
      const todos = yield* Effect.promise(() => response.json())

      expect(todos).toHaveLength(2)
      expect(todos[0].text).toBe('Test todo 1')
    }).pipe(
      Effect.provide(MswService.layer(server))
    )
  )

  it.effect('should handle 404 errors', () =>
    Effect.gen(function* () {
      const msw = yield* MswService

      // Reset handlers for this test
      yield* msw.resetHandlers()

      const response = yield* Effect.promise(() => fetch('/todos/999'))

      expect(response.status).toBe(404)
    }).pipe(
      Effect.provide(MswService.layer(server))
    )
  )
})
```

**Key Features**:
- Service pattern for MSW lifecycle
- Scoped layer with automatic cleanup
- Per-test handler overrides
- Works with vitest and @effect/vitest

## Component Details

### msw-handlers.ts (~155 lines)

**Purpose**: Create MSW request handlers from Effect HttpApi definitions.

**Exports**:
- `createMswHandler<G, Name>()` - Generate handler from HttpApiGroup endpoint
- `mockEffect<A, E>()` - Helper for inline Effect-based responses
- `MockContext<E>` - Type for handler context (params, request, url, payload)

**Dependencies**:
- `msw` - Mock Service Worker core
- `effect` - Effect runtime
- `@effect/platform` - HttpApi types

**Usage Pattern**:
```typescript
const handler = createMswHandler(ApiGroup, 'endpointName', ({ pathParams, payload }) =>
  Effect.gen(function* () {
    // Your Effect logic here
    return { data: 'response' }
  })
)
```

### msw-service.ts (~105 lines)

**Purpose**: Effect Service wrapper for MSW server lifecycle management.

**Exports**:
- `MswService` - Context.Tag for MSW operations
- `MswService.layer(server)` - Create layer from server instance
- `MswService.scopedLayer(server, options)` - Auto-start/stop server

**Service Interface**:
```typescript
{
  server: SetupServer
  use: (...handlers) => Effect<void>
  resetHandlers: (...handlers) => Effect<void>
  restoreHandlers: () => Effect<void>
  close: () => Effect<void>
}
```

**Dependencies**:
- `msw/node` - Node.js MSW setup
- `effect` - Service pattern
- `vitest` - Test integration (example)

### mock-data.ts (~130 lines)

**Purpose**: Generate type-safe mock data from Effect Schemas.

**Exports**:
- `generateMock<A>(schema, overrides?)` - Single mock instance
- `generateMockArray<A>(schema, count, overrides?)` - Multiple instances
- `createMockFactory<A>(schema, defaults?)` - Reusable factory
- `seedMockGenerator(seed)` - Deterministic generation

**Factory Interface**:
```typescript
{
  create: (overrides?) => Effect<A>
  createMany: (count, overrides?) => Effect<A[]>
  createValid: (overrides?) => Effect<A, ParseError> // with validation
}
```

**Dependencies**:
- `@effect/schema/Arbitrary` - Schema to fast-check arbitraries
- `fast-check` - Property-based testing library
- `effect` - Effect runtime

## Testing Patterns

### Pattern 1: API Integration Tests

```typescript
import { setupServer } from 'msw/node'
import { describe, it, beforeAll, afterAll } from 'vitest'
import { createMswHandler } from './lib/effect-testing/msw-handlers'
import { generateMockArray } from './lib/effect-testing/mock-data'
import { UsersApiGroup, User } from './api'

describe('Users API', () => {
  // Generate mock users once
  const mockUsers = yield* generateMockArray(User, 10)

  const server = setupServer(
    createMswHandler(UsersApiGroup, 'listUsers', () =>
      Effect.succeed(mockUsers)
    )
  )

  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it('should fetch users', async () => {
    const response = await fetch('/users')
    const users = await response.json()

    expect(users).toHaveLength(10)
  })
})
```

### Pattern 2: Effect Service Tests

```typescript
import { Effect, Layer } from 'effect'
import { describe, it } from '@effect/vitest'
import { MswService } from './lib/effect-testing/msw-service'
import { UserService } from './services/UserService'
import { generateMock } from './lib/effect-testing/mock-data'

describe('UserService', () => {
  const testLayer = Layer.mergeAll(
    MswService.scopedLayer(server),
    UserService.Default
  )

  it.effect('should find user by id', () =>
    Effect.gen(function* () {
      const mockUser = yield* generateMock(User, { id: 1 })
      const msw = yield* MswService

      // Override handler for this test
      yield* msw.use(
        createMswHandler(UsersApiGroup, 'getUserById', () =>
          Effect.succeed(mockUser)
        )
      )

      const userService = yield* UserService
      const user = yield* userService.findById(1)

      expect(user).toEqual(mockUser)
    }).pipe(Effect.provide(testLayer))
  )
})
```

### Pattern 3: Error Scenarios

```typescript
import { createMswHandler } from './lib/effect-testing/msw-handlers'
import { UserNotFound } from './api'

const errorHandler = createMswHandler(UsersApiGroup, 'getUserById', ({ pathParams }) =>
  Effect.fail(new UserNotFound({ id: Number(pathParams.id) }))
)

it('should handle not found errors', async () => {
  server.use(errorHandler)

  const response = await fetch('/users/999')

  expect(response.status).toBe(404)

  const error = await response.json()
  expect(error.error).toBeDefined()
})
```

## Design Decisions

### Why MSW?

Mock Service Worker intercepts network requests at the service worker / network layer, providing:
- **Framework agnostic** - Works with any HTTP client (fetch, axios, etc.)
- **Same mocks everywhere** - Use in unit tests, integration tests, and Storybook
- **Type-safe with Effect** - Our components bridge MSW with Effect HttpApi types
- **Network layer mocking** - No need to mock individual services

### Why Effect Schemas for Mock Data?

- **Single source of truth** - Your Schema *is* your validation and mock generator
- **Constraint-aware** - Generated data respects patterns, ranges, brands
- **Composable** - Schemas compose, so do mock generators
- **Type-safe** - Generated mocks match Schema types exactly

### Service Pattern Benefits

Wrapping MSW in an Effect Service provides:
- **Composability** - Layer composition with other test services
- **Lifecycle management** - Automatic setup/teardown with scoped layers
- **Dependency injection** - Pass MSW config through Effect context
- **Pure test logic** - Tests are pure Effect programs

## Registry Metadata

```json
{
  "components": [
    {
      "name": "msw-handlers",
      "type": "effect-testing",
      "files": ["effect-testing/msw-handlers.ts"],
      "dependencies": ["msw", "effect", "@effect/platform"]
    },
    {
      "name": "msw-service",
      "type": "effect-testing",
      "files": ["effect-testing/msw-service.ts"],
      "dependencies": ["msw/node", "effect", "vitest"]
    },
    {
      "name": "mock-data",
      "type": "effect-testing",
      "files": ["effect-testing/mock-data.ts"],
      "dependencies": ["@effect/schema/Arbitrary", "fast-check", "effect"]
    }
  ],
  "presets": [
    {
      "name": "testing-full",
      "components": ["msw-handlers", "msw-service", "mock-data"]
    },
    {
      "name": "testing-minimal",
      "components": ["msw-handlers", "mock-data"]
    }
  ]
}
```

## Installation

### Via CLI (Recommended)

```bash
# Add all testing components
npx meta-effect add testing-full

# Or add individually
npx meta-effect add msw-handlers
npx meta-effect add mock-data
npx meta-effect add msw-service
```

### Manual Installation

1. Copy files from `registry/src/effect-testing/` to your project
2. Install peer dependencies:

```bash
pnpm add -D msw @effect/vitest fast-check
pnpm add effect @effect/platform @effect/schema
```

## Next Steps

- [ ] Add Playwright integration (effect-testing/playwright.ts)
- [ ] Add GraphQL handler support
- [ ] Add streaming/SSE mock helpers
- [ ] Add WebSocket mock service
- [ ] Document integration with @effect/vitest
- [ ] Add snapshot testing utilities

## Related Specs

- [effect-vite](./effect-vite.md) - HttpApi definitions for testing
- [effect-remix](./effect-remix.md) - Testing Remix loaders/actions
- [effect-dag](./effect-dag.md) - Testing workflow execution

## References

- [MSW Documentation](https://mswjs.io/)
- [Effect Testing Docs](https://effect.website/docs/testing)
- [fast-check Guide](https://fast-check.dev/)
- [@effect/vitest](https://effect.website/docs/testing/vitest)
