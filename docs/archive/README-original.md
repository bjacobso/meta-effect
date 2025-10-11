# Effect Meta: Composable Meta-Framework Built on Effect

> A meta-framework built entirely on Effect primitives that provides unified, type-safe, and composable full-stack web applications with fine-grained reactivity.

**Status**: Draft � **Date**: 2025-09-30

---

## Table of Contents

1. [Vision](#vision)
2. [Core Thesis](#core-thesis)
3. [Key Innovations](#key-innovations)
4. [Architecture](#architecture)
5. [Developer Experience](#developer-experience)
6. [Technical Design](#technical-design)
7. [Roadmap](#roadmap)
8. [Getting Involved](#getting-involved)

---

## Vision

**Effect Meta aims to become the killer app for Effect-TS** by solving the meta-framework problem through composable primitives rather than framework-specific abstractions.

### The Problem

Modern meta-frameworks (Remix, Next.js, TanStack Start) each reimplement similar concerns with different APIs:

- Data fetching and loading states
- Caching and revalidation
- Error boundaries
- Middleware and authentication
- Request deduplication
- Parallel data loading

**Result**: Framework lock-in, limited composability, inconsistent developer experience.

### The Solution

**Leverage Effect's battle-tested primitives** that already solve these problems:

| Meta-Framework Concern | Effect Primitive                  |
| ---------------------- | --------------------------------- |
| Data loading           | `Effect<A, E, R>`                 |
| Caching                | `Effect.cached` / `Layer.memoize` |
| Client reactivity      | `@effect-atom/atom-react`         |
| Middleware             | Effect composition                |
| Error boundaries       | Typed error channel               |
| Streaming              | `Stream`                          |
| Parallel loading       | `Effect.all`                      |
| Dependency injection   | `Context` + `Layer`               |
| Observability          | Built-in spans & tracing          |

---

## Core Thesis

**Effect already contains all the primitives that meta-frameworks need.**

Rather than building yet another meta-framework from scratch, Effect Meta exposes these primitives through a declarative, framework-agnostic API.

### What Makes This Different

1. **Atoms for Client Reactivity**: Fine-grained reactive state via `@effect-atom/atom-react`
2. **Routes as Effects**: Every route is `Effect<Response, Error, Context>`
3. **Type-Safe Throughout**: End-to-end types from database � API � atom � UI
4. **Framework Agnostic**: Same code, different adapters (Remix, Next.js, SPA)
5. **Automatic Optimization**: Effect runtime handles parallelization, caching, deduplication

---

## Key Innovations

### 1. Routes as Effects with Reactive Atoms

```typescript
import { Atom, Result, useAtomValue } from "@effect-atom/atom-react";
import * as Meta from "@effect/meta";

// Route params as reactive atom
const userParamsAtom = RouteAtom.params({
  schema: Schema.Struct({ id: Schema.String }),
});

// Data atom - automatically refetches when params change
const userProfileAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const params = get(userParamsAtom);

    const [user, posts] = yield* Effect.all([
      get.result(
        ApiAtom.query("users", "getById", {
          path: { id: params.id },
          reactivityKeys: [`user-${params.id}`],
        })
      ),
      get.result(
        ApiAtom.query("posts", "listByAuthor", {
          urlParams: { authorId: params.id },
          reactivityKeys: [`posts-author-${params.id}`],
        })
      ),
    ]);

    return { user: user.value, posts: posts.value };
  })
);

const UserProfile = Meta.Route.make({
  path: "/users/:id",
  component: () => {
    const profileResult = useAtomValue(userProfileAtom);

    return Result.match(profileResult, {
      onInitial: () => <div>Loading...</div>,
      onFailure: (error) => <ErrorView error={error} />,
      onSuccess: (response) => <ProfileView data={response.value} />,
    });
  },
});
```

**Benefits**:

-  Atoms auto-refetch when route params change
-  Parallel data loading via `Effect.all`
-  Type-safe loading/error/success states
-  No prop drilling

### 2. AtomHttpApi Integration

```typescript
import { AtomHttpApi } from "@effect-atom/atom-react";

// Define API atom from your ts-rest contract
export class ApiAtom extends AtomHttpApi.Tag<ApiAtom>()("ApiAtom", {
  api: InternalApi, // Your API contract
  httpClient: FetchHttpClient.layer,
  baseUrl: window.location.origin,
}) {}

// Query atoms for reads
const userAtom = ApiAtom.query("users", "getById", {
  path: { id: "123" },
  reactivityKeys: ["user-123"],
});

// Mutation atoms for writes
const updateUserAtom = ApiAtom.mutation("users", "updateById");

// Use in components
function UserProfile() {
  const userResult = useAtomValue(userAtom);
  const updateUser = useAtomSet(updateUserAtom);

  const handleUpdate = (data: UserUpdate) => {
    updateUser({
      path: { id: "123" },
      payload: data,
      reactivityKeys: ["user-123"], // Triggers userAtom refetch
    });
  };

  return Result.match(userResult, {
    onInitial: () => <Loading />,
    onFailure: (error) => <Error error={error} />,
    onSuccess: (response) => <UserView user={response.value} />,
  });
}
```

**Benefits**:

-  Type inference from API contract to UI
-  Automatic query/mutation distinction
-  Granular cache invalidation via reactivity keys
-  Built-in loading states

### 3. URL State Synchronization

```typescript
// Bidirectional URL � atom binding
const searchParamsAtom = RouteAtom.searchParams({
  schema: Schema.Struct({
    page: Schema.optionalWith(Schema.NumberFromString, { default: () => 1 }),
    query: Schema.optionalWith(Schema.String, { default: () => "" }),
    status: Schema.optionalWith(Schema.Literal("active", "completed"), {
      default: () => "active" as const,
    }),
  }),
  replace: false,
});

// Derived atom - auto-derives from search params
const itemsListAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const params = get(searchParamsAtom);

    yield* Effect.sleep("200 millis"); // Debounce

    return yield* get.result(
      ApiAtom.query("items", "list", {
        urlParams: params,
        reactivityKeys: ["items-list", JSON.stringify(params)],
      })
    );
  })
);
```

**Benefits**:

-  URL is single source of truth
-  Type-safe search params via Effect Schema
-  Automatic URL updates
-  Shareable URLs with filter state

### 4. Composable Middleware

```typescript
const AuthMiddleware = Meta.Middleware.make("auth", () =>
  Effect.gen(function* () {
    const session = yield* SessionService.getCurrent();
    if (!session) return yield* Effect.fail(new Unauthorized());
    return { user: session.user };
  })
);

const ProtectedRoute = Meta.Route.make({
  path: "/admin",
  middleware: [LoggingMiddleware, TracingMiddleware, AuthMiddleware],
  data: (_, { user }) => AdminService.getDashboard(user.id),
  component: ({ data }) => <AdminDashboard {...data} />,
});
```

---

## Architecture

### Core Abstractions

```typescript
// Route - fundamental unit
interface Route<Path, Params, Data, Error, Deps> {
  path: Path;
  data: (params: Params) => Effect<Data, Error, Deps>;
  middleware: ReadonlyArray<Middleware<any, any, any>>;
  component: Component<{ data: Data; params: Params }>;
}

// Middleware - composable effects
interface Middleware<Output, Error, Deps> {
  name: string;
  effect: (ctx: RequestContext) => Effect<Output, Error, Deps>;
}

// App - composition root
interface App<Routes> {
  routes: Routes;
  layer: Layer<any, any, any>;
  toRemix(): RemixApp;
  toNext(): NextApp;
  toVite(): ViteApp;
}
```

### Request Lifecycle

1. **Request** � Parsed into `RequestContext`
2. **Middleware** � Composed as `Effect.flatMap` chain
3. **Route matching** � Type-safe params extraction
4. **Data loading** � Atoms fetch in parallel via `Effect.all`
5. **Rendering** � Server/client based on strategy
6. **Mutations** � Trigger atom updates via reactivity keys
7. **Error handling** � Typed errors through Effect channel

### Effect Runtime Integration

Effect Meta creates a fiber-per-request runtime for:

- Request-scoped services (session, tracing)
- Proper cancellation
- Isolated observability spans

---

## Developer Experience

### Real-World Example: Analytics Dashboard

**Before (Traditional Remix)**:

```typescript
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await getSession(request);
  const user = await requireUser(session);
  const account = await requireAccount(session);

  // Sequential fetches (waterfall)
  const customViews = await getAccountCustomViews(user, account);
  const tasks = await getTasks(account.id);
  const analytics = await getAnalytics(account.id);
  const employees = await getEmployees(account.id);

  return json({ user, account, customViews, tasks, analytics, employees });
};
```

**After (Effect Meta with Atoms)**:

```typescript
// Individual atoms
const tasksAtom = Atom.make(/* ... */);
const analyticsAtom = Atom.make(/* ... */);
const employeesAtom = Atom.make(/* ... */);

// Composite atom - parallel fetching
const dashboardDataAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const [tasks, analytics, employees] = yield* Effect.all([
      get.result(tasksAtom),
      get.result(analyticsAtom),
      get.result(employeesAtom),
    ]);

    return {
      tasks: tasks.value,
      analytics: analytics.value,
      employees: employees.value,
    };
  })
);

const AnalyticsRoute = Meta.Route.make({
  path: "/analytics",
  component: () => {
    const dataResult = useAtomValue(dashboardDataAtom);
    return Result.match(dataResult, {
      onInitial: () => <Loading />,
      onFailure: (error) => <ErrorPage error={error} />,
      onSuccess: (response) => <DashboardView {...response.value} />,
    });
  },
});
```

**Improvements**:

-  Automatic parallelization (4 concurrent requests)
-  Fine-grained reactivity (charts subscribe to specific atoms)
-  Reusable atoms across routes
-  Built-in caching with TTL
-  Type-safe errors
-  No prop drilling

### Testing Story

```typescript
import { Effect, Layer } from "effect";

describe("UserSettingsRoute", () => {
  const MockUserService = Layer.succeed(UserService, {
    getById: (id) => Effect.succeed({ id, name: "Test User" }),
    updateSettings: (id, input) => Effect.succeed({ ...input }),
  });

  const TestLayer = Layer.mergeAll(MockUserService, MockNotificationService);

  it("loads user settings", async () => {
    const result = await UserSettingsRoute.data({ id: "user-123" }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    );

    expect(result.user.name).toBe("Test User");
  });
});
```

**Benefits**:

-  No HTTP/database mocking
-  Fast, isolated unit tests
-  Test atoms independently
-  Easy error case testing with `Effect.flip`

---

## Technical Design

### Rendering Strategies

Different meta-frameworks = different configurations:

```typescript
// Remix-style: Server-first, progressive enhancement
const RemixStrategy = Meta.RenderStrategy.make({
  rendering: "server",
  hydration: "progressive",
  forms: "native-html",
  caching: "none",
});

// Next.js: Server components + streaming
const NextStrategy = Meta.RenderStrategy.make({
  rendering: "server-components",
  streaming: true,
  caching: "aggressive",
});

// SPA: Client-first
const SPAStrategy = Meta.RenderStrategy.make({
  rendering: "client",
  hydration: "full",
  navigation: "client-side",
});
```

### Comparison with Existing Frameworks

| Feature           | Traditional            | Effect Meta                |
| ----------------- | ---------------------- | -------------------------- |
| Type Safety       | Partial                | Full (DB � atom � UI)      |
| Error Handling    | try/catch              | Typed Effect errors        |
| Parallel Loading  | Manual `Promise.all()` | Automatic via atoms        |
| Client Reactivity | Manual state sync      | Automatic atoms            |
| URL State Sync    | Manual                 | `RouteAtom.searchParams()` |
| Caching           | Framework-specific     | Atom TTL + reactivity keys |
| Testing           | Mock HTTP/DB           | Mock services via Layer    |
| Framework Lock-in | High                   | Low (adapters)             |

---

## Roadmap

### Phase 1: Core Primitives (3-6 months)

- [ ] `Meta.Route` with data/actions/middleware
- [ ] Atom integration for client reactivity
- [ ] Basic React support
- [ ] Proof-of-concept

### Phase 2: React Integration (3-6 months)

- [ ] `Meta.Form` with progressive enhancement
- [ ] Server Components support
- [ ] Streaming support
- [ ] Islands architecture
- [ ] Full `@effect-atom/atom-react` integration

### Phase 3: Adapters (6-12 months)

- [ ] Remix adapter (`app.toRemix()`)
- [ ] Next.js adapter (`app.toNext()`)
- [ ] Vite/SPA adapter (`app.toVite()`)
- [ ] Migration guides & codemods

### Phase 4: Advanced Features (Ongoing)

- [ ] Edge runtime support
- [ ] Real-time subscriptions via `Stream`
- [ ] Offline-first patterns
- [ ] Code generation from Effect Schemas
- [ ] Visual route editor
- [ ] Performance monitoring

---

## Getting Involved

Effect Meta is in early design phase. We're seeking:

### Community Feedback

- **Discord**: [Effect Discord #ideas](https://discord.gg/effect-ts)
- **GitHub**: [Effect Discussions](https://github.com/Effect-TS/effect/discussions)
- **Twitter**: Share thoughts with #EffectMeta

### Key Questions for Community

1. Should Effect Meta require Effect Schema or support Zod/others?
2. Server Components vs. server-first rendering?
3. Client-side Effect runtime strategy (full, selective, none)?
4. File-based routing or code-based?
5. Relationship to `@effect/platform` HttpApi?

### How to Contribute

1. **Design Feedback**: Review RFCs and provide input
2. **Prototype Development**: Help build proof-of-concept
3. **Documentation**: Improve examples and guides
4. **Migration Tooling**: Build codemods and adapters

---

## Resources

- **[EFFECT_META_RFC.md](./EFFECT_META_RFC.md)**: Detailed technical RFC with complete API examples
- **[RFC.md](./RFC.md)**: High-level vision and design principles
- **[EFFECT_META_CLI_RFC.md](./EFFECT_META_CLI_RFC.md)**: CLI tooling for AST-aware codebase exploration
- **[context-clean.md](./context-clean.md)**: Initial brainstorming and raw context

---

## Success Criteria

- **DX**: Install to deploy in < 5 minutes
- **Performance**: Lighthouse score > 95 out of box
- **Type Safety**: 100% coverage including runtime boundaries
- **Bundle Size**: < 50kb framework overhead
- **Learning Curve**: Productive within first day for Remix/Next developers

---

## Conclusion

Effect Meta represents a paradigm shift: **leverage Effect's battle-tested primitives with fine-grained reactive atoms** rather than reinventing the wheel.

By combining Effect's composable abstractions with `@effect-atom/atom-react`'s reactivity, we achieve:

-  End-to-end type safety
-  Fine-grained client reactivity
-  Automatic parallelization & caching
-  URL state synchronization
-  Built-in observability
-  Framework portability
-  Testability by design

**This could be the killer app that makes Effect the standard for full-stack TypeScript.**

---

_Last updated: 2025-09-30_
