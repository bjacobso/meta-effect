# effect-vite Specification

**Status**: In Development
**Components**: See [`registry/effect-vite/`](../../registry/effect-vite/)
**Last Updated**: 2025-10-10

## Overview

`effect-vite` is a collection of vendorable components (~275 lines total) for integrating Effect's HttpApi with Vite's dev server and reactive atoms. These aren't npm packages - they're code you copy into your project with `npx meta-effect add`.

Each component is ~50-100 lines and designed to be modified for your needs.

## Core Primitives

### 1. HttpApi Routes via Vite Dev Server

Effect's HttpApi runs directly in the Vite dev server, providing a type-safe API layer with hot module replacement.

```typescript
// server/api.ts
import { HttpApi } from "@effect/platform"
import * as Schema from "@effect/schema/Schema"

export class UserApi extends HttpApi.Tag<UserApi>()("UserApi", {
  listUsers: HttpApi.get("users", "/api/users"),
  getUser: HttpApi.get("user", "/api/users/:id"),
  createUser: HttpApi.post("createUser", "/api/users")
    .pipe(HttpApi.setPayload(Schema.Struct({
      name: Schema.String,
      email: Schema.String
    })))
}) {}
```

### 2. Vite Plugin Integration

The Vite plugin bridges HttpApi with Vite's middleware system:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { effectVite } from '@effect/vite'
import { UserApi } from './server/api'

export default defineConfig({
  plugins: [
    effectVite({
      apis: [UserApi],
      layer: AppLayer,
      middleware: [LoggingMiddleware, AuthMiddleware]
    })
  ]
})
```

**Plugin Responsibilities**:
- Mount HttpApi routes as Vite middleware
- Provide Effect Layer to all routes
- Enable HMR for Effect services
- Type-safe client generation

### 3. Type-Safe Client Generation

The plugin generates a typed client for consuming APIs:

```typescript
// Auto-generated client
import { createClient } from '@effect/vite/client'
import type { UserApi } from './server/api'

export const userClient = createClient<UserApi>('/api')

// Usage in client code
const users = await userClient.listUsers()  // Fully typed!
const user = await userClient.getUser({ params: { id: "123" } })
```

### 4. Reactive Atom Integration

`ApiAtom` wraps HttpApi calls in reactive atoms for fine-grained reactivity:

```typescript
// client/atoms.ts
import { ApiAtom } from '@effect/vite/atoms'
import { userClient } from './client'

// Query atom - automatically refetches based on dependencies
export const usersAtom = ApiAtom.query(
  userClient.listUsers,
  {
    reactivityKeys: ['users-list'],
    cacheTime: 5000
  }
)

// Mutation atom - invalidates related queries
export const createUserAtom = ApiAtom.mutation(
  userClient.createUser,
  {
    onSuccess: () => ApiAtom.invalidate(['users-list'])
  }
)

// Component usage
function UserList() {
  const users = useAtomValue(usersAtom)
  const createUser = useAtomSet(createUserAtom)

  return (
    <div>
      {users.map(u => <div key={u.id}>{u.name}</div>)}
      <button onClick={() => createUser({ name: "Alice", email: "alice@example.com" })}>
        Add User
      </button>
    </div>
  )
}
```

### 5. RouteAtom for URL State

Synchronize atoms with URL search params and path params:

```typescript
// Route atom - synced with URL
const searchAtom = RouteAtom.searchParams({
  schema: Schema.Struct({
    query: Schema.optionalWith(Schema.String, { default: () => "" }),
    page: Schema.optionalWith(Schema.NumberFromString, { default: () => 1 })
  })
})

// Automatically updates URL when atom changes
function SearchInput() {
  const [search, setSearch] = useAtom(searchAtom)

  return (
    <input
      value={search.query}
      onChange={(e) => setSearch({ ...search, query: e.target.value })}
    />
  )
}

// URL: /?query=hello&page=2
// Atom value: { query: "hello", page: 2 }
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Vite Dev Server                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          effect-vite Plugin                          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  • Mount HttpApi as middleware                       │  │
│  │  • Provide Effect Layer                              │  │
│  │  • Generate typed client                             │  │
│  │  • Enable HMR for services                           │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               HttpApi Routes                         │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  GET  /api/users     → UserApi.listUsers()          │  │
│  │  GET  /api/users/:id → UserApi.getUser()            │  │
│  │  POST /api/users     → UserApi.createUser()         │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Effect Services Layer                     │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  UserService → Database → Cache → Logging           │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↕ Type-Safe RPC
┌─────────────────────────────────────────────────────────────┐
│                       Client (Browser)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Generated Client                        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  userClient.listUsers()  → GET /api/users           │  │
│  │  userClient.getUser()    → GET /api/users/:id       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              ApiAtom (Reactive Layer)                │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  usersAtom → userClient.listUsers()                 │  │
│  │  createUserAtom → userClient.createUser()           │  │
│  │                                                       │  │
│  │  • Automatic refetching                              │  │
│  │  • Cache management                                  │  │
│  │  • Optimistic updates                                │  │
│  │  • Reactivity keys                                   │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              React Components                        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  useAtomValue(usersAtom)                            │  │
│  │  useAtomSet(createUserAtom)                         │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Why Vite?

- **Fast HMR**: Sub-100ms updates for Effect services
- **Native ESM**: Direct import of Effect code
- **Plugin API**: Clean integration point for HttpApi
- **Framework Agnostic**: Works with React, Solid, Vue, etc.

### 2. Why HttpApi?

- **Type-Safe**: End-to-end type safety with Schema validation
- **Composable**: Effect services compose naturally
- **Error Handling**: Typed error channels with Effect
- **Testable**: Mock services in Layer for testing

### 3. Why Atoms?

- **Fine-Grained**: Only re-render what changed
- **Composable**: Atoms can derive from other atoms
- **Effect Integration**: Atoms can contain Effect computations
- **URL Sync**: RouteAtom syncs with browser URL

## Implementation Status

### ✅ Implemented
- Basic Vite plugin structure
- HttpApi route mounting
- Effect Layer provision
- Simple client generation

### 🚧 In Progress
- ApiAtom query/mutation primitives
- RouteAtom for URL synchronization
- HMR for Effect services
- Cache invalidation strategies

### 📋 Planned
- Optimistic updates
- Streaming responses
- WebSocket support via Effect Stream
- DevTools integration

## Example Application Structure

```
my-app/
├── server/
│   ├── api/
│   │   ├── users.ts      # UserApi definition
│   │   ├── posts.ts      # PostApi definition
│   │   └── index.ts      # Combine all APIs
│   ├── services/
│   │   ├── UserService.ts
│   │   └── PostService.ts
│   └── layer.ts          # AppLayer composition
├── client/
│   ├── atoms/
│   │   ├── users.ts      # User-related atoms
│   │   └── posts.ts      # Post-related atoms
│   ├── components/
│   │   ├── UserList.tsx
│   │   └── PostList.tsx
│   └── main.tsx
├── vite.config.ts
└── package.json
```

## Testing Strategy

### Server-Side Tests

```typescript
import { describe, it, expect } from 'vitest'
import { Effect } from 'effect'
import { UserApi } from './api'

describe('UserApi', () => {
  it('lists users', () =>
    Effect.gen(function* () {
      const users = yield* UserApi.listUsers()
      expect(users).toHaveLength(3)
    }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )
  )
})
```

### Client-Side Tests

```typescript
import { renderHook } from '@testing-library/react'
import { useAtomValue } from 'jotai'
import { usersAtom } from './atoms'

it('fetches users', async () => {
  const { result } = renderHook(() => useAtomValue(usersAtom))

  await waitFor(() => {
    expect(result.current).toHaveLength(3)
  })
})
```

## Performance Characteristics

- **Bundle Size**: ~15kb (Effect + Vite plugin + Atom bindings)
- **Initial Load**: HttpApi schema validation happens server-side
- **Updates**: Atom granularity means minimal re-renders
- **Network**: Automatic request deduplication via atoms

## Open Questions

1. **Streaming**: How to handle Effect Stream responses in atoms?
2. **SSR**: Should we support server-side rendering with Vite SSR?
3. **File Upload**: Best pattern for FormData with HttpApi?
4. **WebSockets**: How to integrate Effect Stream with WS?
5. **Error Boundaries**: React error boundaries vs Effect error channel?

## Related Documents

- [Effect Vite Architecture](../core/effect-vite-architecture.md) - Visual architecture guide
- [Effect Vite RFC](../rfcs/effect-vite-rfc.md) - Original RFC document
- [Framework Overview](../core/overview.md) - Meta Effect philosophy

## Contributing

This is a living document. As we implement `effect-vite`, we update this spec with:
- Implementation discoveries
- Pattern improvements
- Performance optimizations
- Community feedback

See [package README](../../meta-effect/packages/effect-vite/README.md) for current implementation status.
