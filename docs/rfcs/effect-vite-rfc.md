# RFC: @effect/vite - A Unified Vite + HttpApi + Atom Primitive

**Status**: Draft
**Author**: Effect Meta Team
**Date**: 2025-10-10

---

## Executive Summary

We propose **`@effect/vite`**, a deeply integrated TypeScript package that unifies:
- **Vite** (dev server, HMR, build tooling)
- **HttpApi** (Effect's HTTP API layer from `@effect/platform`)
- **Effect Atom** (fine-grained reactive state from `@effect-atom`)

**Core Thesis**: Rather than treating these as separate layers that need glue code, `@effect/vite` treats them as **a single, cohesive primitive** where:
- HttpApi defines your API contract (serves both SSR and client requests)
- Atoms derive from HttpApi queries (reactive, cached, type-safe)
- Vite orchestrates everything (dev server, SSR, HMR, build)
- Effect provides the runtime (parallel execution, error handling, DI, tracing)

**Key Innovation**: This isn't "Vite with Effect support" - it's a **unified development primitive** with zero configuration, RPC-style type safety, and automatic SSR/CSR handoff.

---

## Problem Statement

### Current State of Full-Stack TypeScript

Developers building full-stack TypeScript applications face fragmentation:

1. **API Layer Duplication**
   - Backend: Express/Fastify/Hono routes
   - Frontend: fetch calls with manual types
   - No shared contract, types drift over time

2. **State Management Complexity**
   - Server state (loaders, actions)
   - Client state (React state, query cache)
   - URL state (search params, route params)
   - No unified model

3. **SSR Configuration Hell**
   - Manual Vite SSR setup
   - State serialization boilerplate
   - Hydration mismatch debugging
   - Different code paths for server/client

4. **Limited Type Safety**
   - Types don't flow from API → UI
   - Errors are untyped
   - No compile-time route validation

### What Developers Actually Want

1. **Single Source of Truth**: One API contract for server + client
2. **Automatic SSR**: No configuration, just works
3. **Type-Safe End-to-End**: API contract → state → UI
4. **Reactive State**: Fine-grained updates, no prop drilling
5. **Great DX**: HMR for atoms, routes, and API changes
6. **Effect-Native**: Built on Effect primitives, not a wrapper

---

## Solution: @effect/vite as Unified Primitive

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       @effect/vite                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   HttpApi    │  │  Atom State  │  │    Vite      │     │
│  │   Contract   │◄─┤  Management  │◄─┤   Plugin     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │             │
│         │                 │                  │             │
│  ┌──────▼─────────────────▼──────────────────▼───────┐    │
│  │          Effect Runtime (Services, DI, Trace)      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Vite Plugin**: Orchestrates dev server, SSR, HMR
2. **HttpApi Server**: Serves API routes defined by contract
3. **Atom Runtime**: Evaluates atoms server-side, hydrates client-side
4. **Router**: File-based or code-based route discovery
5. **Type System**: End-to-end type inference from HttpApi to UI

---

## Core Concepts

### 1. HttpApi as Universal Contract

HttpApi from `@effect/platform` becomes the **single source of truth** for your API:

```typescript
// src/api/users.api.ts
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

class UsersApi extends HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("getById", "/users/:id")
      .setPath(Schema.Struct({ id: Schema.String }))
      .setSuccess(
        Schema.Struct({
          id: Schema.String,
          name: Schema.String,
          email: Schema.String,
          createdAt: Schema.Date,
        })
      )
      .setFailure(
        Schema.Union(
          Schema.TaggedStruct("NotFound", { id: Schema.String }),
          Schema.TaggedStruct("Unauthorized", {})
        )
      )
  )
  .add(
    HttpApiEndpoint.post("update", "/users/:id")
      .setPath(Schema.Struct({ id: Schema.String }))
      .setPayload(
        Schema.Struct({
          name: Schema.optional(Schema.String),
          email: Schema.optional(Schema.String),
        })
      )
      .setSuccess(Schema.Struct({ id: Schema.String }))
  ) {}

// Compose into full API
export class AppApi extends HttpApi.make("app")
  .add(UsersApi)
  .add(PostsApi)
  .add(CommentsApi) {}
```

**This contract is used by**:
- Vite dev server (serves `/api/*` routes)
- SSR runtime (calls HttpApi directly, no HTTP overhead)
- Client atoms (type-safe HTTP calls)
- OpenAPI generation (automatic documentation)

**Key Innovation**: **No duplication**. One contract, three consumers.

---

### 2. Atoms Derive from HttpApi

Atoms are **reactive state** that query HttpApi with full type inference:

```typescript
// src/atoms/user.atom.ts
import { Atom, ApiAtom, RouteAtom } from "@effect/vite/client";
import { Effect } from "effect";
import type { AppApi } from "../api/app.api";

// Define API atom from HttpApi contract
export class UserApiAtom extends ApiAtom.Tag<UserApiAtom>()("UserApiAtom", {
  api: AppApi, // ← Type-safe contract
  httpClient: FetchHttpClient.layer,
  baseUrl: import.meta.env.VITE_API_URL || "",
}) {}

// Route params as atom
export const userParamsAtom = RouteAtom.params({
  schema: Schema.Struct({ id: Schema.String }),
});

// Derived atom - queries HttpApi
export const userProfileAtom = Atom.make(
  Effect.fnUntraced(function* (get) {
    const { id } = get(userParamsAtom);

    // Type-safe query via HttpApi contract
    const result = yield* get.result(
      UserApiAtom.query("users", "getById", {
        path: { id },
        reactivityKeys: [`user-${id}`],
        cache: {
          ttl: "5 minutes",
          staleWhileRevalidate: "1 minute",
        },
      })
    );

    return result.value; // ← Fully typed!
  })
);

// Mutation atom
export const updateUserAtom = Atom.make(
  Effect.fn(function* (set, update: { name?: string; email?: string }) {
    const { id } = set.get(userParamsAtom);

    const result = yield* UserApiAtom.mutation("users", "update", {
      path: { id },
      payload: update,
      reactivityKeys: [`user-${id}`], // ← Invalidates userProfileAtom
    });

    return result;
  })
);
```

**Key Benefits**:
- **Type inference**: API schema → atom → UI component
- **Reactivity keys**: Mutations trigger targeted invalidation
- **Cache strategies**: TTL, stale-while-revalidate built-in
- **Same code**: Runs server-side (SSR) and client-side (CSR)

---

### 3. Routes are Atom-First

Routes declare their atom dependencies instead of data loaders:

```typescript
// src/routes/users/[id].route.tsx
import { Route } from "@effect/vite/router";
import { Result, useAtomValue, useAtomSet } from "@effect-atom/atom-react";
import { userProfileAtom, updateUserAtom } from "../../atoms/user.atom";

export default Route.make({
  path: "/users/:id",

  // Declare atoms for SSR (evaluated server-side)
  atoms: [userProfileAtom],

  // Optional: middleware (auth, logging, tracing)
  middleware: [AuthMiddleware, TraceMiddleware],

  // Component (same for SSR + CSR)
  component: () => {
    const profileResult = useAtomValue(userProfileAtom);
    const updateUser = useAtomSet(updateUserAtom);

    return Result.match(profileResult, {
      onInitial: () => <UserProfileSkeleton />,

      onFailure: (error) => {
        if (error._tag === "NotFound") {
          return <NotFoundPage />;
        }
        if (error._tag === "Unauthorized") {
          return <UnauthorizedPage />;
        }
        return <ErrorPage error={error} />;
      },

      onSuccess: (response) => (
        <UserProfile
          user={response.value}
          onUpdate={(data) => updateUser(data)}
        />
      ),
    });
  },

  // Error boundary (optional)
  errorBoundary: (error) => {
    if (error._tag === "NotFound") {
      return <NotFoundPage />;
    }
    return <ErrorPage error={error} />;
  },
});
```

**Key Innovation**:
- Routes don't "load data" - they declare atoms
- Atoms evaluated server-side for SSR
- Same component code for SSR + CSR
- Type-safe error handling via Effect error channel

---

### 4. Vite Plugin (Zero Config)

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { effectVite } from "@effect/vite/plugin";
import { AppApi } from "./src/api/app.api";

export default defineConfig({
  plugins: [
    effectVite({
      // HttpApi contract
      api: AppApi,

      // Route discovery
      routes: {
        dir: "./src/routes",
        pattern: "**/*.route.{ts,tsx}",
      },

      // Atom configuration
      atoms: {
        ssrCache: true, // Cache atom results during SSR
        hydrateStrategy: "progressive", // or "immediate"
      },

      // Server configuration
      server: {
        port: 3000,
        apiPrefix: "/api", // HttpApi routes mount here
        middleware: [
          LoggingMiddleware,
          TracingMiddleware,
        ],
      },

      // Build configuration
      build: {
        ssr: true,
        prerender: [], // Routes to prerender at build time
        splitting: "route", // Code splitting strategy
      },

      // Effect Layer (DI)
      layer: AppLayer, // Provides all services
    }),
  ],
});
```

**The Plugin Provides**:
1. Dev server with HttpApi routes (`/api/*`)
2. SSR middleware for page routes
3. Atom hydration scripts
4. HMR for atoms, routes, and API changes
5. Build-time prerendering
6. OpenAPI spec generation

---

### 5. SSR → CSR Handoff (Automatic)

#### Server-Side (handled by plugin)

```typescript
// Internal: ViteSSRRuntime

import { renderToString } from "react-dom/server";
import { ViteRuntime } from "@effect/vite/runtime";

const runtime = ViteRuntime.make({
  api: AppApi,
  layer: AppLayer,
});

// For each page request
const handleRequest = (request: Request) =>
  Effect.gen(function* () {
    // 1. Match route
    const route = yield* RouteRegistry.match(new URL(request.url));

    // 2. Evaluate atoms server-side
    const atomState = yield* AtomRuntime.evaluate(route.atoms, {
      request,
      params: route.params,
    });

    // 3. Render React with atom state
    const html = renderToString(
      <AtomProvider initialState={atomState}>
        <route.component />
      </AtomProvider>
    );

    // 4. Inject atom state into HTML
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <script type="module" src="/@vite/client"></script>
          <script>
            window.__ATOM_STATE__ = ${serialize(atomState)};
          </script>
        </head>
        <body>
          <div id="root">${html}</div>
          <script type="module" src="/src/entry-client.tsx"></script>
        </body>
      </html>`,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  }).pipe(Effect.provide(runtime.layer));
```

#### Client-Side (handled by plugin)

```typescript
// src/entry-client.tsx (auto-generated by plugin)

import { hydrateRoot } from "react-dom/client";
import { AtomProvider, AtomRuntime } from "@effect/vite/client";
import { App } from "./App";

// Hydrate from server state
const atomRuntime = AtomRuntime.hydrate(
  window.__ATOM_STATE__ // ← Injected by server
);

hydrateRoot(
  document.getElementById("root")!,
  <AtomProvider runtime={atomRuntime}>
    <App />
  </AtomProvider>
);

// HMR support
if (import.meta.hot) {
  import.meta.hot.accept();
}
```

**Key Innovation**:
- Atoms evaluated **once** on server
- State serialized and injected into HTML
- Client picks up where server left off
- **No flash of loading state**
- HMR preserves atom state

---

### 6. HMR Integration (The Magic)

#### Atom HMR

```typescript
// Automatic: Generated by plugin

if (import.meta.hot) {
  import.meta.hot.accept("./atoms/user.atom.ts", (newModule) => {
    // Replace atom definition
    AtomRegistry.replace("userProfileAtom", newModule.userProfileAtom);

    // Re-evaluate if dependencies changed
    if (AtomRegistry.dependenciesChanged("userProfileAtom")) {
      AtomRuntime.invalidate("userProfileAtom");
    }

    console.log("[HMR] Updated userProfileAtom");
  });
}
```

#### HttpApi HMR

```typescript
// Automatic: Generated by plugin

if (import.meta.hot) {
  import.meta.hot.accept("./api/app.api.ts", async (newModule) => {
    // Update HttpApi contract
    HttpApiRegistry.replace("AppApi", newModule.AppApi);

    // Restart dev server's API routes
    await ViteDevServer.restartApiServer(newModule.AppApi);

    // Invalidate atoms that query changed endpoints
    AtomRuntime.invalidateQueriesForApi("AppApi");

    console.log("[HMR] Updated AppApi and restarted server");
  });
}
```

#### Route HMR

```typescript
// Automatic: Generated by plugin

if (import.meta.hot) {
  import.meta.hot.accept("./routes/users/[id].route.tsx", (newModule) => {
    // Update route definition
    RouteRegistry.replace("/users/:id", newModule.default);

    // Re-render route without losing atom state
    ReactRefresh.performReactRefresh();

    console.log("[HMR] Updated route /users/:id");
  });
}
```

**Key Innovation**:
- Edit atom → hot reload, state preserved
- Edit HttpApi → restart server, invalidate queries
- Edit route → hot reload component
- **Developer never sees page refresh**

---

## Advanced Features

### 1. Type-Safe Routing

```typescript
// Router with compile-time route validation
import { Router, Link, useNavigate } from "@effect/vite/router";

// Type-safe link
<Link
  to="/users/:id"
  params={{ id: "123" }} // ✓ Type-checked
  searchParams={{ tab: "profile" }} // ✓ Type-checked
>
  View User
</Link>

// Type-safe navigation
const navigate = useNavigate();
navigate({
  to: "/users/:id",
  params: { id: "123" },
  searchParams: { tab: "posts" },
}); // ✓ All params type-checked

// Type-safe route params in atoms
const paramsAtom = RouteAtom.params({
  schema: Schema.Struct({
    id: Schema.String,
    tab: Schema.optional(Schema.Literal("profile", "posts")),
  }),
});
```

---

### 2. URL State Synchronization

```typescript
// Bidirectional URL ↔ atom binding
const searchParamsAtom = RouteAtom.searchParams({
  schema: Schema.Struct({
    page: Schema.optionalWith(Schema.NumberFromString, {
      default: () => 1,
    }),
    query: Schema.optionalWith(Schema.String, {
      default: () => "",
    }),
    status: Schema.optionalWith(
      Schema.Literal("active", "completed", "archived"),
      { default: () => "active" as const }
    ),
  }),
  replace: false, // Use history.pushState (default: false)
});

// Derived atom - auto-refetches when URL changes
const itemsListAtom = Atom.make(
  Effect.fnUntraced(function* (get) {
    const params = get(searchParamsAtom);

    // Debounce search queries
    yield* Effect.sleep("300 millis");

    const result = yield* get.result(
      ApiAtom.query("items", "list", {
        urlParams: params,
        reactivityKeys: ["items-list", JSON.stringify(params)],
      })
    );

    return result.value;
  })
);

// Component
function ItemsList() {
  const [params, setParams] = useAtomState(searchParamsAtom);
  const itemsResult = useAtomValue(itemsListAtom);

  return (
    <div>
      <input
        value={params.query}
        onChange={(e) => setParams({ ...params, query: e.target.value })}
      />
      {/* URL updates automatically */}
      {/* itemsListAtom refetches automatically */}
    </div>
  );
}
```

**Key Innovation**:
- URL is single source of truth
- Atoms derive from URL params
- URL updates trigger atom re-evaluation
- Shareable URLs with filter state

---

### 3. Optimistic Updates

```typescript
// Optimistic mutation atom
const createTodoAtom = Atom.make(
  Effect.fn(function* (set, text: string) {
    const todosAtom = set.get(todosListAtom);

    // Optimistic update
    const optimisticTodo = {
      id: `temp-${Date.now()}`,
      text,
      completed: false,
      createdAt: new Date(),
    };

    set.set(todosListAtom, (prev) => [...prev, optimisticTodo]);

    // Actual mutation
    try {
      const result = yield* TodoApiAtom.mutation("todos", "create", {
        payload: { text },
        reactivityKeys: ["todos-list"],
      });

      // Replace optimistic with real
      set.set(todosListAtom, (prev) =>
        prev.map((todo) =>
          todo.id === optimisticTodo.id ? result : todo
        )
      );
    } catch (error) {
      // Rollback on error
      set.set(todosListAtom, (prev) =>
        prev.filter((todo) => todo.id !== optimisticTodo.id)
      );
      throw error;
    }
  })
);
```

---

### 4. Real-Time Subscriptions

```typescript
// Stream atom for real-time data
const realtimeMetricsAtom = Atom.make(
  Effect.gen(function* (get) {
    // Initial load
    const initial = yield* get.result(
      ApiAtom.query("metrics", "current", {
        reactivityKeys: ["metrics"],
      })
    );

    // Subscribe to updates via SSE
    yield* Stream.fromEventSource("/api/metrics/stream").pipe(
      Stream.mapEffect((event) =>
        Effect.sync(() => JSON.parse(event.data))
      ),
      Stream.tap((metrics) =>
        Effect.sync(() => {
          // Update atom state
          get.set(realtimeMetricsAtom, metrics);
        })
      ),
      Stream.runDrain
    );

    return initial.value;
  })
);
```

---

### 5. Middleware Composition

```typescript
// Define middleware as Effects
const AuthMiddleware = Middleware.make("auth", (ctx) =>
  Effect.gen(function* () {
    const session = yield* SessionService.getCurrent(ctx.request);
    if (!session) {
      return yield* Effect.fail(new Unauthorized());
    }
    return { user: session.user };
  })
);

const RateLimitMiddleware = Middleware.make("rateLimit", (ctx) =>
  Effect.gen(function* () {
    const ip = ctx.request.headers.get("x-forwarded-for");
    const allowed = yield* RateLimiter.check(ip);
    if (!allowed) {
      return yield* Effect.fail(new TooManyRequests());
    }
  })
);

const TracingMiddleware = Middleware.make("tracing", (ctx) =>
  Effect.withSpan(`route.${ctx.route.name}`, {
    attributes: {
      "http.method": ctx.request.method,
      "http.url": ctx.request.url,
    },
  })
);

// Apply to routes
const ProtectedRoute = Route.make({
  path: "/admin/dashboard",
  middleware: [
    RateLimitMiddleware,
    TracingMiddleware,
    AuthMiddleware, // ← Provides { user } to component
  ],
  atoms: [dashboardAtom],
  component: ({ user }) => <AdminDashboard user={user} />,
});
```

---

## Complete Example: Todo App

```typescript
// ============================================
// src/api/todos.api.ts - HttpApi Contract
// ============================================

import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

const Todo = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  completed: Schema.Boolean,
  createdAt: Schema.Date,
});

class TodosApi extends HttpApiGroup.make("todos")
  .add(
    HttpApiEndpoint.get("list", "/todos")
      .setUrlParams(
        Schema.Struct({
          status: Schema.optional(
            Schema.Literal("all", "active", "completed")
          ),
        })
      )
      .setSuccess(Schema.Array(Todo))
  )
  .add(
    HttpApiEndpoint.post("create", "/todos")
      .setPayload(Schema.Struct({ text: Schema.String }))
      .setSuccess(Todo)
  )
  .add(
    HttpApiEndpoint.put("toggle", "/todos/:id/toggle")
      .setPath(Schema.Struct({ id: Schema.String }))
      .setSuccess(Todo)
  )
  .add(
    HttpApiEndpoint.delete("delete", "/todos/:id")
      .setPath(Schema.Struct({ id: Schema.String }))
      .setSuccess(Schema.Struct({ id: Schema.String }))
  ) {}

export class AppApi extends HttpApi.make("app").add(TodosApi) {}

// ============================================
// src/atoms/todos.atom.ts - Reactive State
// ============================================

import { Atom, ApiAtom, RouteAtom } from "@effect/vite/client";
import { Effect } from "effect";
import type { AppApi } from "../api/todos.api";

export class TodoApiAtom extends ApiAtom.Tag<TodoApiAtom>()("TodoApiAtom", {
  api: AppApi,
  httpClient: FetchHttpClient.layer,
  baseUrl: "",
}) {}

// URL state
export const filterAtom = RouteAtom.searchParams({
  schema: Schema.Struct({
    status: Schema.optionalWith(
      Schema.Literal("all", "active", "completed"),
      { default: () => "all" as const }
    ),
  }),
});

// Todo list atom
export const todosListAtom = Atom.make(
  Effect.fnUntraced(function* (get) {
    const filter = get(filterAtom);

    const result = yield* get.result(
      TodoApiAtom.query("todos", "list", {
        urlParams: filter,
        reactivityKeys: ["todos-list"],
        cache: { ttl: "30 seconds" },
      })
    );

    return result.value;
  })
);

// Create todo atom
export const createTodoAtom = Atom.make(
  Effect.fn(function* (set, text: string) {
    const result = yield* TodoApiAtom.mutation("todos", "create", {
      payload: { text },
      reactivityKeys: ["todos-list"],
    });
    return result;
  })
);

// Toggle todo atom
export const toggleTodoAtom = Atom.make(
  Effect.fn(function* (set, id: string) {
    const result = yield* TodoApiAtom.mutation("todos", "toggle", {
      path: { id },
      reactivityKeys: ["todos-list"],
    });
    return result;
  })
);

// Delete todo atom
export const deleteTodoAtom = Atom.make(
  Effect.fn(function* (set, id: string) {
    const result = yield* TodoApiAtom.mutation("todos", "delete", {
      path: { id },
      reactivityKeys: ["todos-list"],
    });
    return result;
  })
);

// ============================================
// src/routes/index.route.tsx - Route Definition
// ============================================

import { Route } from "@effect/vite/router";
import { Result, useAtomValue, useAtomSet, useAtomState } from "@effect-atom/atom-react";
import {
  filterAtom,
  todosListAtom,
  createTodoAtom,
  toggleTodoAtom,
  deleteTodoAtom,
} from "../atoms/todos.atom";

export default Route.make({
  path: "/",
  atoms: [todosListAtom],

  component: () => {
    const [filter, setFilter] = useAtomState(filterAtom);
    const todosResult = useAtomValue(todosListAtom);
    const createTodo = useAtomSet(createTodoAtom);
    const toggleTodo = useAtomSet(toggleTodoAtom);
    const deleteTodo = useAtomSet(deleteTodoAtom);

    return (
      <div className="todo-app">
        <h1>Todos</h1>

        {/* Filter tabs - synced to URL */}
        <div className="filters">
          <button
            className={filter.status === "all" ? "active" : ""}
            onClick={() => setFilter({ status: "all" })}
          >
            All
          </button>
          <button
            className={filter.status === "active" ? "active" : ""}
            onClick={() => setFilter({ status: "active" })}
          >
            Active
          </button>
          <button
            className={filter.status === "completed" ? "active" : ""}
            onClick={() => setFilter({ status: "completed" })}
          >
            Completed
          </button>
        </div>

        {/* Todo list */}
        {Result.match(todosResult, {
          onInitial: () => <div>Loading todos...</div>,

          onFailure: (error) => <div>Error: {error.message}</div>,

          onSuccess: (response) => (
            <ul className="todo-list">
              {response.value.map((todo) => (
                <li key={todo.id}>
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                  />
                  <span className={todo.completed ? "completed" : ""}>
                    {todo.text}
                  </span>
                  <button onClick={() => deleteTodo(todo.id)}>Delete</button>
                </li>
              ))}
            </ul>
          ),
        })}

        {/* Create todo form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem(
              "text"
            ) as HTMLInputElement;
            createTodo(input.value);
            input.value = "";
          }}
        >
          <input type="text" name="text" placeholder="What needs to be done?" />
          <button type="submit">Add</button>
        </form>
      </div>
    );
  },
});

// ============================================
// vite.config.ts - Zero Config
// ============================================

import { defineConfig } from "vite";
import { effectVite } from "@effect/vite/plugin";
import { AppApi } from "./src/api/todos.api";
import { AppLayer } from "./src/services";

export default defineConfig({
  plugins: [
    effectVite({
      api: AppApi,
      routes: { dir: "./src/routes" },
      layer: AppLayer,
    }),
  ],
});
```

**Result**:
- ~150 lines of app code
- Type-safe API contract
- Reactive atom state
- SSR out of the box
- URL state sync
- HMR for everything

---

## Benefits Over Existing Solutions

| Feature | Next.js | Remix | TanStack Start | **@effect/vite** |
|---------|---------|-------|----------------|------------------|
| Type Safety | Partial | Partial | Full (tRPC-style) | **Full (HttpApi → Atom → UI)** |
| API Contract | Route handlers | Actions/loaders | Server functions | **HttpApi (shared contract)** |
| Client Reactivity | useState | useState/useLoaderData | TanStack Query | **Atoms (fine-grained)** |
| SSR | ✅ Manual config | ✅ Built-in | ✅ Built-in | **✅ Zero config** |
| HMR | Basic | Basic | Basic | **Atoms + API + Routes** |
| Caching | fetch cache | Manual | TanStack Query | **Atom TTL + reactivity keys** |
| URL State Sync | useSearchParams | useSearchParams | useSearch | **RouteAtom.searchParams** |
| DI | Manual | Manual | Manual | **Effect Layer** |
| Error Handling | Untyped errors | Untyped errors | Partial types | **Typed Effect errors** |
| Optimistic Updates | Manual | Manual | TanStack | **Atom primitives** |
| Real-Time | Manual SSE/WS | Manual SSE/WS | Manual | **Stream atoms** |
| Testing | Mock HTTP | Mock HTTP | Mock HTTP | **Mock services via Layer** |

---

## Technical Architecture

### Package Structure

```
@effect/vite/
├── plugin/         - Vite plugin (dev server, SSR, HMR)
│   ├── index.ts
│   ├── dev-server.ts
│   ├── ssr-middleware.ts
│   ├── hmr-integration.ts
│   └── build.ts
├── runtime/        - SSR/CSR coordination
│   ├── server.ts
│   ├── client.ts
│   └── atom-runtime.ts
├── router/         - Route discovery and matching
│   ├── file-based.ts
│   ├── route-registry.ts
│   └── route-atoms.ts
├── client/         - Browser entry point
│   ├── index.ts
│   ├── api-atom.ts
│   └── route-atom.ts
└── server/         - Node entry point
    ├── index.ts
    └── httpapi-server.ts
```

---

### Request Flow

#### API Request (`/api/*`)
```
Request → ViteDevServer → HttpApiServer → Effect.provide(Layer) → Response
```

#### Page Request (SSR)
```
Request
  ↓
ViteDevServer
  ↓
SSRMiddleware
  ↓
RouteRegistry.match("/users/123")
  ↓
AtomRuntime.evaluate([userProfileAtom])
  ↓
Effect.provide(Layer) + Effect.runPromise
  ↓
renderToString(<Component />) + inject __ATOM_STATE__
  ↓
HTML Response
  ↓
Browser hydrates from __ATOM_STATE__
  ↓
Client atoms continue as reactive subscriptions
```

#### Client Navigation
```
User clicks <Link to="/users/456">
  ↓
Router updates URL
  ↓
RouteAtom.params emits new value { id: "456" }
  ↓
Dependent atoms (userProfileAtom) re-evaluate
  ↓
ApiAtom.query makes fetch("/api/users/456")
  ↓
Component re-renders with new data
```

---

### HMR Architecture

```
Atom file changes
  ↓
Vite detects change
  ↓
Plugin reloads atom module
  ↓
AtomRegistry.replace(atomId, newAtom)
  ↓
Dependent atoms re-evaluate
  ↓
Components re-render
  ↓
State preserved ✓
```

```
HttpApi file changes
  ↓
Vite detects change
  ↓
Plugin reloads API module
  ↓
HttpApiServer restarts with new contract
  ↓
Dependent atoms invalidated
  ↓
Components re-fetch data
```

---

## Implementation Roadmap

### Phase 1: Core Primitives (Months 1-3)
- [ ] Vite plugin skeleton
- [ ] HttpApi server integration
- [ ] Basic SSR runtime
- [ ] Atom hydration system
- [ ] File-based routing
- [ ] Type inference from HttpApi to atoms

**Deliverable**: Basic SSR app with HttpApi + atoms

### Phase 2: Developer Experience (Months 4-6)
- [ ] HMR for atoms
- [ ] HMR for HttpApi
- [ ] HMR for routes
- [ ] Type-safe router (`<Link>`, `useNavigate`)
- [ ] DevTools panel (atom inspector, API logs)
- [ ] Error overlays (typed errors)

**Deliverable**: Production-quality DX

### Phase 3: Advanced Features (Months 7-9)
- [ ] Optimistic updates
- [ ] Real-time subscriptions (SSE, WebSocket)
- [ ] Prerendering / SSG
- [ ] ISR (Incremental Static Regeneration)
- [ ] Edge runtime support
- [ ] OpenAPI spec generation

**Deliverable**: Feature-complete framework

### Phase 4: Ecosystem (Months 10-12)
- [ ] Auth middleware library
- [ ] Database integration examples
- [ ] Deployment adapters (Vercel, Netlify, Cloudflare)
- [ ] Migration tools (Next.js, Remix → @effect/vite)
- [ ] Starter templates
- [ ] Documentation site

**Deliverable**: Production-ready ecosystem

---

## Open Questions

### 1. Server Components Support?

**Question**: Should we support React Server Components?

**Options**:
- A) No (simpler, atoms-only)
- B) Yes (more flexibility, but complex)

**Proposal**: Start without RSC, add later if needed.

### 2. Streaming Rendering?

**Question**: Should SSR support streaming (renderToPipeableStream)?

**Benefits**: Faster TTFB, better UX
**Challenges**: Complex atom evaluation order

**Proposal**: Support both non-streaming (default) and streaming (opt-in).

### 3. File-Based vs Code-Based Routing?

**Question**: Which should be the default?

**Options**:
- A) File-based (Next.js, Remix style)
- B) Code-based (Hono, tRPC style)

**Proposal**: File-based by default, code-based opt-in.

### 4. Multi-Framework Support?

**Question**: Should we support Vue, Svelte, Solid?

**Proposal**: Start with React, abstract later.

---

## Success Metrics

### Developer Experience
- Install to first page render: **< 5 minutes**
- HMR update time: **< 100ms**
- Type inference depth: **Full (HttpApi → UI)**

### Performance
- Lighthouse score: **> 95** out of the box
- Bundle size overhead: **< 30kb** (gzipped)
- SSR time: **< 50ms** for simple routes

### Adoption
- GitHub stars: **1000+** in first 6 months
- Production apps: **10+** in first year
- Community plugins: **5+** in first year

---

## Related Work

### Inspiration
- **Remix**: Server-first philosophy, progressive enhancement
- **TanStack Start**: Type-safe loaders, modern DX
- **Hono**: Minimal API, RPC-style types
- **tRPC**: End-to-end type safety
- **SolidStart**: Fine-grained reactivity
- **@effect/platform**: HttpApi contracts

### Differentiation
- **HttpApi as contract**: No code generation, runtime-based types
- **Atoms everywhere**: Unified state model (server + client)
- **Effect-native**: Built on Effect primitives, not a wrapper
- **Zero config**: SSR, HMR, routing all automatic

---

## Conclusion

`@effect/vite` represents a **new paradigm** for full-stack TypeScript development:

1. **HttpApi** defines your API (type-safe, universal)
2. **Atoms** derive from HttpApi (reactive, cached, typed)
3. **Vite** orchestrates everything (dev, SSR, HMR, build)
4. **Effect** provides the runtime (parallel, traced, DI)

**This isn't "Vite with Effect support"** - it's a deeply integrated primitive where all pieces work together seamlessly.

**The result**: Zero-config, type-safe, reactive full-stack apps with best-in-class DX.

---

## Appendix: API Reference

### Plugin API

```typescript
effectVite(options: {
  api: HttpApi<any>;
  routes?: {
    dir?: string;
    pattern?: string;
  };
  atoms?: {
    ssrCache?: boolean;
    hydrateStrategy?: "immediate" | "progressive";
  };
  server?: {
    port?: number;
    apiPrefix?: string;
    middleware?: Middleware<any, any, any>[];
  };
  build?: {
    ssr?: boolean;
    prerender?: string[];
    splitting?: "route" | "manual";
  };
  layer: Layer<any, any, any>;
})
```

### Route API

```typescript
Route.make<Path, Atoms, Middleware>({
  path: Path;
  atoms?: Atoms[];
  middleware?: Middleware[];
  component: (props: {
    params: RouteParams<Path>;
    middlewareContext: MiddlewareOutput<Middleware>;
  }) => ReactElement;
  errorBoundary?: (error: any) => ReactElement;
  loading?: () => ReactElement;
})
```

### Atom API

```typescript
// Query atom
ApiAtom.query<Group, Endpoint>(
  group: Group,
  endpoint: Endpoint,
  options: {
    path?: PathParams;
    urlParams?: UrlParams;
    reactivityKeys: string[];
    cache?: {
      ttl?: Duration;
      staleWhileRevalidate?: Duration;
    };
  }
)

// Mutation atom
ApiAtom.mutation<Group, Endpoint>(
  group: Group,
  endpoint: Endpoint,
  options: {
    path?: PathParams;
    payload: Payload;
    reactivityKeys: string[];
  }
)
```

### Router API

```typescript
// Type-safe link
<Link
  to={Path}
  params={RouteParams<Path>}
  searchParams={SearchParams}
/>

// Type-safe navigation
const navigate = useNavigate();
navigate({
  to: Path,
  params: RouteParams<Path>,
  searchParams: SearchParams,
})

// Route atoms
RouteAtom.params<Schema>(options: { schema: Schema })
RouteAtom.searchParams<Schema>(options: { schema: Schema; replace?: boolean })
```

---

**Status**: Draft for community review
**Next Steps**: Gather feedback, build proof-of-concept
**Discussion**: [Effect Discord #ideas](https://discord.gg/effect-ts)

---

*Last updated: 2025-10-10*
