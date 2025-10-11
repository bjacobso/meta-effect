# @effect/vite Architecture Overview

[← Back to README](../../README.md) | [← Full RFC](../rfcs/effect-vite-rfc.md)

## Conceptual Architecture

### The Three Pillars

```
┌────────────────────────────────────────────────────────────────┐
│                        @effect/vite                            │
│                                                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   HttpApi    │    │    Atoms     │    │    Vite      │   │
│  │   Contract   │───▶│   Reactive   │───▶│   Dev/Build  │   │
│  │              │    │    State     │    │   + HMR      │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                    │                    │           │
│         └────────────────────┴────────────────────┘           │
│                             │                                 │
│                   ┌─────────▼──────────┐                     │
│                   │  Effect Runtime    │                     │
│                   │  (Services, Trace) │                     │
│                   └────────────────────┘                     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Data Flow

#### 1. Define HttpApi Contract (Single Source of Truth)

```typescript
// src/api/users.api.ts
class UsersApi extends HttpApiGroup.make("users")
  .add(HttpApiEndpoint.get("getById", "/users/:id")
    .setPath(Schema.Struct({ id: Schema.String }))
    .setSuccess(UserSchema)
  ) {}
```

**Used by**: Server routes, client queries, type inference

#### 2. Create Atoms from HttpApi

```typescript
// src/atoms/user.atom.ts
const userAtom = Atom.make(
  Effect.fnUntraced(function* (get) {
    const { id } = get(routeParamsAtom);

    // Type-safe query via HttpApi
    const result = yield* get.result(
      ApiAtom.query("users", "getById", {
        path: { id },
        reactivityKeys: [`user-${id}`],
      })
    );

    return result.value; // ← Fully typed from HttpApi
  })
);
```

**Benefits**: Type-safe, reactive, cached

#### 3. Use in Routes

```typescript
// src/routes/users/[id].route.tsx
export default Route.make({
  path: "/users/:id",
  atoms: [userAtom], // ← Evaluated server-side for SSR
  component: () => {
    const user = useAtomValue(userAtom);
    return <UserProfile user={user} />;
  },
});
```

**Result**: SSR + CSR with one component

---

## Request Lifecycle

### API Request Flow

```
Browser
  │
  │ GET /api/users/123
  ├────────────────────────▶ Vite Dev Server
                              │
                              │ HttpApi Router
                              ├────────────────────▶ UsersApi.getById
                                                     │
                                                     │ Effect.gen(...)
                                                     │ + Layer (DI)
                                                     │
                                                     ▼
                                                   JSON Response
                                                     │
                              ◀────────────────────┤
  ◀────────────────────────┤
```

### Page Request Flow (SSR)

```
Browser
  │
  │ GET /users/123
  ├────────────────────────▶ Vite Dev Server
                              │
                              │ SSR Middleware
                              ├────────────────────▶ Route Registry
                                                     │
                                                     │ Match route
                                                     │ /users/:id
                                                     │
                                                     ├────────▶ Evaluate atoms
                                                     │          (server-side)
                                                     │
                                                     │         userAtom calls
                                                     │         HttpApi directly
                                                     │         (no HTTP overhead)
                                                     │
                                                     ├────────▶ Render React
                                                     │
                                                     │ ┌───────────────────┐
                                                     │ │ <html>            │
                                                     │ │  <script>         │
                                                     │ │   __ATOM_STATE__  │
                                                     │ │  </script>        │
                                                     │ │  <div id="root">  │
                                                     │ │    HTML           │
                                                     │ │  </div>           │
                                                     │ └───────────────────┘
                                                     │
                              ◀────────────────────┤
  ◀────────────────────────┤
  │
  │ Hydrate from __ATOM_STATE__
  │
  ▼
Atoms continue as reactive subscriptions
```

### Client Navigation Flow

```
User clicks <Link to="/users/456">
  │
  ├────▶ Router updates URL
  │
  ├────▶ RouteAtom.params emits { id: "456" }
  │
  ├────▶ userAtom detects dependency change
  │
  ├────▶ ApiAtom.query("users", "getById", { path: { id: "456" } })
  │
  ├────▶ fetch("/api/users/456")
  │
  ├────▶ Response cached + invalidation keys
  │
  └────▶ Component re-renders with new data
```

---

## Type Flow

```
HttpApi Schema Definition
  │
  │ Schema.Struct({ id: String, name: String, email: String })
  │
  ▼
HttpApiEndpoint.setSuccess(UserSchema)
  │
  ▼
ApiAtom.query("users", "getById", ...)
  │
  │ Type inference: Result<Success<User>, Failure<NotFound | ...>>
  │
  ▼
Atom.make(Effect.gen(function* (get) {
  const result = yield* get.result(...)
  return result.value // ← Type: User
}))
  │
  ▼
useAtomValue(userAtom)
  │
  │ Type: Result<User, NotFound | ...>
  │
  ▼
Result.match(userResult, {
  onSuccess: (response) => response.value // ← Type: User
})
```

**Result**: End-to-end type safety from API contract to UI

---

## HMR Flow

### Atom File Changes

```
Developer edits user.atom.ts
  │
  ├────▶ Vite detects change
  │
  ├────▶ Plugin HMR handler
  │
  ├────▶ AtomRegistry.replace("userAtom", newAtom)
  │
  ├────▶ Dependent atoms re-evaluate
  │
  ├────▶ Components re-render
  │
  └────▶ State preserved ✓
```

### HttpApi File Changes

```
Developer edits users.api.ts
  │
  ├────▶ Vite detects change
  │
  ├────▶ Plugin HMR handler
  │
  ├────▶ HttpApiServer restarts
  │
  ├────▶ ApiAtom queries invalidated
  │
  ├────▶ Dependent atoms refetch
  │
  └────▶ Components re-render with fresh data
```

### Route File Changes

```
Developer edits [id].route.tsx
  │
  ├────▶ Vite detects change
  │
  ├────▶ Plugin HMR handler
  │
  ├────▶ RouteRegistry.replace("/users/:id", newRoute)
  │
  ├────▶ React Fast Refresh
  │
  └────▶ Component updates, atom state preserved ✓
```

---

## Caching Architecture

### Multi-Level Cache

```
┌─────────────────────────────────────────────────────────────┐
│                     Request for User Data                    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │  Atom Cache        │  TTL: 5 minutes
                    │  (Client Memory)   │  SWR: 1 minute
                    └─────────┬──────────┘
                              │ Cache Miss
                              ▼
                    ┌────────────────────┐
                    │  HTTP Cache        │  Cache-Control
                    │  (Browser)         │  headers
                    └─────────┬──────────┘
                              │ Cache Miss
                              ▼
                    ┌────────────────────┐
                    │  ApiAtom.query     │  Fetches from
                    │  (fetch call)      │  HttpApi server
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │  HttpApi Server    │  Effect Layer
                    │  (Vite Dev Server) │  with DI
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │  Service Layer     │  UserService,
                    │  (Effect)          │  Database, etc.
                    └────────────────────┘
```

### Cache Invalidation via Reactivity Keys

```typescript
// Query atom
const userAtom = ApiAtom.query("users", "getById", {
  path: { id: "123" },
  reactivityKeys: ["user-123"], // ← Subscribe to this key
});

// Mutation atom
const updateUserAtom = ApiAtom.mutation("users", "update", {
  path: { id: "123" },
  payload: { name: "New Name" },
  reactivityKeys: ["user-123"], // ← Invalidates subscribers
});

// Result: userAtom automatically refetches after mutation
```

---

## Deployment Scenarios

### 1. Development

```
npm run dev

Vite Dev Server
  ├─ HttpApi routes at /api/*
  ├─ SSR middleware for pages
  ├─ HMR for atoms/routes/api
  └─ AtomProvider with SSR hydration
```

### 2. Production (Node.js)

```
npm run build
npm start

Node.js Server
  ├─ HttpApi routes (optimized)
  ├─ SSR for all routes
  ├─ Static assets served
  └─ Client hydration with preloaded state
```

### 3. Serverless (Vercel, Netlify)

```
npm run build

Output:
  ├─ api/ (serverless functions)
  ├─ _ssr/ (SSR handler)
  └─ assets/ (static files)
```

### 4. Edge (Cloudflare Workers)

```
npm run build --edge

Output:
  ├─ worker.js (HttpApi + SSR)
  └─ assets/ (CDN)
```

### 5. Static (SPA with Prerendering)

```
npm run build --prerender

Output:
  ├─ index.html (prerendered)
  ├─ users/123/index.html (prerendered)
  └─ assets/
```

---

## Comparison with Other Approaches

### Traditional Approach (Next.js, Remix)

```
Route Loader
  │
  ├─ Fetch data (sequential or manual Promise.all)
  │
  ├─ Return data
  │
  └─ Component receives data via props
      │
      └─ Client state managed separately (useState, etc.)
```

**Issues**: Prop drilling, no fine-grained reactivity, manual optimization

### @effect/vite Approach

```
HttpApi Contract (single source of truth)
  │
  ├─ Server routes
  │
  └─ Atoms derive from HttpApi
      │
      ├─ Server-side: Direct Effect calls (no HTTP)
      │
      └─ Client-side: Type-safe fetch via ApiAtom
          │
          └─ Components subscribe to atoms (fine-grained)
```

**Benefits**: Type-safe, reactive, optimized, no prop drilling

---

## Key Innovations Summary

### 1. HttpApi as Universal Contract
- Single definition for server + client
- No code duplication
- Full type inference

### 2. Atoms Everywhere
- Server-side atom evaluation for SSR
- Client-side hydration + reactivity
- Unified state model

### 3. Zero-Config SSR
- Vite plugin handles everything
- Automatic atom hydration
- HMR that understands Effects

### 4. Effect-Native Runtime
- Services via Layer (DI)
- Typed errors via Effect channel
- Built-in tracing and observability

---

## Related Documents

- [Full @effect/vite RFC](../rfcs/effect-vite-rfc.md) - Complete technical specification
- [Framework Overview](overview.md) - Effect Meta introduction
- [Main Framework RFC](../rfcs/effect-meta-rfc.md) - Core Effect Meta design

---

*For a deep dive into implementation details, API design, and examples, see the [full RFC](../rfcs/effect-vite-rfc.md).*
