# effect-remix Specification

**Status**: In Development
**Components**: See [`registry/effect-remix/`](../../registry/effect-remix/)
**Last Updated**: 2025-10-10

## Overview

`effect-remix` is a collection of vendorable components (~245 lines total) for composing Effect services with Remix loaders, actions, and routes. These aren't npm packages - they're code you copy into your project with `npx meta-effect add`.

Each component is ~50-100 lines and maintains Remix's web fundamentals while adding Effect's type safety.

## Core Primitives

### 1. Effect Services in Loaders

Remix loaders run Effect programs with automatic Layer provision:

```typescript
// routes/users.$id.tsx
import { LoaderFunctionArgs } from "@remix-run/node"
import { Effect } from "effect"
import { UserService, PostService } from "~/services"
import { AppLayer } from "~/server/layer"

export const loader = async ({ params }: LoaderFunctionArgs) => {
  return await Effect.runPromise(
    Effect.gen(function* () {
      // Effect services compose naturally
      const user = yield* UserService.findById(params.id!)
      const posts = yield* PostService.findByAuthor(params.id!)

      // Parallel data loading
      const [recentPosts, stats] = yield* Effect.all([
        PostService.recent(user.id),
        UserService.stats(user.id)
      ], { concurrency: "unbounded" })

      return { user, posts, recentPosts, stats }
    }).pipe(Effect.provide(AppLayer))
  )
}

export default function UserRoute() {
  const data = useLoaderData<typeof loader>()

  return (
    <div>
      <h1>{data.user.name}</h1>
      <p>Posts: {data.stats.postCount}</p>
      <PostList posts={data.posts} />
    </div>
  )
}
```

### 2. Effect Actions

Actions use Effect for type-safe mutations with proper error handling:

```typescript
// routes/users.$id.edit.tsx
import { ActionFunctionArgs } from "@remix-run/node"
import { redirect } from "@remix-run/node"
import * as Schema from "@effect/schema/Schema"
import { Effect } from "effect"

// Schema-based validation
const UpdateUserSchema = Schema.Struct({
  name: Schema.String,
  email: Schema.String.pipe(Schema.pattern(/^.+@.+$/)),
  bio: Schema.optional(Schema.String)
})

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const formData = await request.formData()
  const data = Object.fromEntries(formData)

  return await Effect.runPromise(
    Effect.gen(function* () {
      // Parse and validate with Effect Schema
      const input = yield* Schema.decode(UpdateUserSchema)(data)

      // Update user via Effect service
      const user = yield* UserService.update(params.id!, input)

      // Effect-aware redirect
      return redirect(`/users/${user.id}`)
    }).pipe(
      Effect.catchTag("ParseError", (error) =>
        Effect.succeed({
          errors: error.message,
          values: data
        })
      ),
      Effect.provide(AppLayer)
    )
  )
}

export default function EditUserRoute() {
  const actionData = useActionData<typeof action>()

  return (
    <Form method="post">
      <input name="name" defaultValue={actionData?.values?.name} />
      {actionData?.errors && <p>{actionData.errors}</p>}
      <button>Save</button>
    </Form>
  )
}
```

### 3. Middleware as Effect Layers

Common patterns like auth become reusable Effect services:

```typescript
// server/middleware/auth.ts
import { Effect, Context } from "effect"
import { SessionService } from "../services/session"

export class AuthUser extends Context.Tag("AuthUser")<
  AuthUser,
  { id: string; email: string; role: string }
>() {}

export const requireAuth = Effect.gen(function* () {
  const session = yield* SessionService.current()

  if (!session) {
    return yield* Effect.fail(new UnauthorizedError())
  }

  return Effect.provideService(AuthUser, session.user)
})

// routes/dashboard.tsx
export const loader = async (args: LoaderFunctionArgs) => {
  return await Effect.runPromise(
    Effect.gen(function* () {
      // AuthUser is now available in context
      const user = yield* AuthUser

      const dashboard = yield* DashboardService.load(user.id)

      return { dashboard, user }
    }).pipe(
      requireAuth,  // Adds AuthUser to context
      Effect.provide(AppLayer)
    )
  )
}
```

### 4. Resource Routes

Remix resource routes work seamlessly with Effect:

```typescript
// routes/api.users.ts
import { LoaderFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { Effect } from "effect"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url)
  const query = url.searchParams.get("q") || ""

  return await Effect.runPromise(
    Effect.gen(function* () {
      const users = yield* UserService.search(query)

      return json({ users })
    }).pipe(Effect.provide(AppLayer))
  )
}
```

### 5. Error Handling

Effect's typed error channel integrates with Remix error boundaries:

```typescript
// routes/users.$id.tsx
import { isRouteErrorResponse, useRouteError } from "@remix-run/react"

export const loader = async ({ params }: LoaderFunctionArgs) => {
  return await Effect.runPromise(
    Effect.gen(function* () {
      const user = yield* UserService.findById(params.id!)

      return { user }
    }).pipe(
      Effect.catchTag("NotFoundError", () =>
        Effect.fail(new Response("User not found", { status: 404 }))
      ),
      Effect.catchTag("UnauthorizedError", () =>
        Effect.fail(new Response("Unauthorized", { status: 401 }))
      ),
      Effect.provide(AppLayer)
    )
  )
}

export function ErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>{error.status} {error.statusText}</h1>
        <p>{error.data}</p>
      </div>
    )
  }

  return <div>Something went wrong!</div>
}
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Remix Application                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Route Module                       │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  export const loader = (args) => {                   │  │
│  │    return Effect.runPromise(                         │  │
│  │      Effect.gen(function* () {                       │  │
│  │        const user = yield* UserService               │  │
│  │        return { user }                               │  │
│  │      }).pipe(Effect.provide(AppLayer))               │  │
│  │    )                                                  │  │
│  │  }                                                    │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Effect Runtime                          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  • Effect.runPromise()                               │  │
│  │  • Provide AppLayer                                  │  │
│  │  • Handle typed errors                               │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   AppLayer                           │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  UserService → Database                              │  │
│  │  PostService → Database                              │  │
│  │  SessionService → Cache                              │  │
│  │  EmailService → SMTP                                 │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Remix Loader Response                     │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  return { user, posts }                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              React Component                         │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  const data = useLoaderData()                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Why Remix?

- **Web Fundamentals**: Form POST, progressive enhancement
- **Nested Routes**: Natural composition with Effect services
- **Server-First**: Effect services run on server naturally
- **Type Safety**: TypeScript throughout, enhanced by Effect

### 2. Loader Integration Strategy

We don't abstract Remix loaders; we enhance them:

```typescript
// ❌ Don't: Create a custom abstraction
export const loader = createEffectLoader((args) => {
  // Custom API that hides Remix
})

// ✅ Do: Enhance standard Remix patterns
export const loader = async (args: LoaderFunctionArgs) => {
  return await Effect.runPromise(
    // Standard Effect code
    Effect.gen(function* () {
      // ...
    }).pipe(Effect.provide(AppLayer))
  )
}
```

### 3. Error Handling Philosophy

- Effect errors map to HTTP responses
- Remix error boundaries catch Effect failures
- Type-safe error channels for business logic
- Let Remix handle rendering errors

### 4. Form Validation

- Effect Schema for input validation
- Parse/validate in actions
- Return errors to component via actionData
- Progressive enhancement friendly

## Implementation Status

### ✅ Implemented
- Basic loader/action Effect composition
- AppLayer provision pattern
- Schema validation in actions
- Error handling with catchTag

### 🚧 In Progress
- Middleware composition helpers
- Session management with Effect
- Typed error responses
- Testing utilities

### 📋 Planned
- Deferred data loading patterns
- Streaming responses
- Optimistic UI helpers
- Effect Context in React components

## Example Application Structure

```
my-remix-app/
├── app/
│   ├── routes/
│   │   ├── _index.tsx
│   │   ├── users.$id.tsx
│   │   ├── users.$id.edit.tsx
│   │   └── api.users.ts
│   ├── services/
│   │   ├── UserService.ts
│   │   ├── PostService.ts
│   │   └── SessionService.ts
│   ├── server/
│   │   ├── layer.ts            # AppLayer composition
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── logging.ts
│   │   └── db.ts
│   ├── schemas/
│   │   ├── user.ts
│   │   └── post.ts
│   └── root.tsx
└── package.json
```

## Testing Strategy

### Loader Tests

```typescript
import { describe, it, expect } from 'vitest'
import { Effect, Layer } from 'effect'
import { loader } from './routes/users.$id'

const TestLayer = Layer.succeed(UserService, {
  findById: (id) => Effect.succeed({ id, name: "Alice" })
})

it('loads user data', async () => {
  const request = new Request('http://localhost/users/123')
  const response = await loader({
    params: { id: '123' },
    request,
    context: {}
  })

  expect(response.user.name).toBe("Alice")
})
```

### Service Tests

```typescript
describe('UserService', () => {
  it('finds user by id', () =>
    Effect.gen(function* () {
      const user = yield* UserService.findById("123")
      expect(user.name).toBe("Alice")
    }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )
  )
})
```

## Performance Characteristics

- **Server Rendering**: Effect services run synchronously on server
- **Parallel Loading**: Effect.all for concurrent data fetching
- **Caching**: Layer memoization for request-scoped caching
- **Error Handling**: Zero runtime overhead for typed errors

## Patterns

### Request-Scoped Services

```typescript
// Create a request-scoped service
export class RequestContext extends Context.Tag("RequestContext")<
  RequestContext,
  { request: Request; params: Params }
>() {}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const requestLayer = Layer.succeed(RequestContext, { request, params })

  return await Effect.runPromise(
    Effect.gen(function* () {
      const { request } = yield* RequestContext
      // Use request in services
    }).pipe(
      Effect.provide(requestLayer),
      Effect.provide(AppLayer)
    )
  )
}
```

### Progressive Enhancement

```typescript
// Works without JS, enhanced with JS
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData()

  return await Effect.runPromise(
    Effect.gen(function* () {
      const data = yield* Schema.decode(CreatePostSchema)(
        Object.fromEntries(formData)
      )

      const post = yield* PostService.create(data)

      return redirect(`/posts/${post.id}`)
    }).pipe(Effect.provide(AppLayer))
  )
}

// Component works with native form submission
<Form method="post">
  <input name="title" required />
  <button>Create</button>
</Form>
```

## Open Questions

1. **Deferred Data**: How to integrate Effect with Remix's defer()?
2. **Streaming**: Can we stream Effect computation results?
3. **Client State**: Should we integrate atoms on client side?
4. **Resource Routes**: Best patterns for API-only routes?
5. **Session Management**: Effect service vs Remix session?

## Related Documents

- [Remix Vision](../core/remix-vision.md) - Effect with Remix philosophy
- [Framework Overview](../core/overview.md) - Meta Effect philosophy
- [Effect Meta RFC](../rfcs/effect-meta-rfc.md) - Original vision

## Contributing

This is a living document that evolves with the implementation. We're discovering:
- Best patterns for Effect + Remix
- Common middleware compositions
- Testing strategies
- Performance optimizations

See [package README](../../meta-effect/packages/effect-remix/README.md) for current implementation status.
