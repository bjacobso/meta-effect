# RFC: Effect Meta - A Composable Meta-Framework Built on Effect

**Status**: Draft
**Author**: Community Proposal
**Date**: 2025-09-30

---

## Executive Summary

We propose **Effect Meta**, a new meta-framework built entirely on Effect primitives that provides a unified, type-safe, and composable approach to building full-stack web applications.

**Core Thesis**: Effect already contains all the primitives that meta-frameworks need (data loading, caching, error handling, dependency injection, observability). Rather than building yet another meta-framework from scratch, we can expose these primitives through a declarative, framework-agnostic API.

**Key Innovation**: Treat routes, data loaders, and actions as composable Effects, leveraging Effect's runtime for automatic optimization (parallelization, caching, deduplication) and built-in observability.

---

## Problem Statement

### Current Meta-Framework Landscape

The JavaScript ecosystem has multiple competing meta-frameworks:
- **Remix**: Server-first, progressive enhancement, Web Fetch API
- **Next.js App Router**: Server components, streaming, aggressive caching
- **TanStack Start**: File-based routing, type-safe loaders
- **SvelteKit, SolidStart, etc.**: Framework-specific solutions

Each implements similar concerns:
- Data fetching and loading states
- Caching and revalidation
- Error boundaries
- Route-based code splitting
- Form submissions and mutations
- Middleware and authentication
- Request deduplication
- Parallel data loading

**The Problem**: These concerns are re-implemented in each framework with different APIs, different trade-offs, and limited composability. There's no universal abstraction.

### What Developers Actually Need

1. **Type Safety**: End-to-end types from database → API → UI
2. **Composability**: Mix and match concerns without framework lock-in
3. **Performance**: Automatic optimization of data loading patterns
4. **Observability**: Built-in tracing and error tracking
5. **Testability**: Easy mocking and dependency injection
6. **Progressive Enhancement**: Works with or without JavaScript
7. **Error Handling**: Typed errors that propagate correctly

### The Effect Insight

Effect already provides solutions to all of these needs:

| Meta-Framework Concern | Effect Primitive |
|------------------------|------------------|
| Data loading | `Effect<A, E, R>` |
| Caching | `Effect.cached` / `Layer.memoize` |
| Revalidation | `Effect.refresh` / `Ref` |
| Middleware | Effect composition / `Effect.tap` |
| Error boundaries | Effect error channel |
| Streaming | `Stream` |
| Parallel loading | `Effect.all` with `{ concurrency }` |
| Waterfall prevention | `Effect.fork` + `Effect.join` |
| Dependency injection | `Context` + `Layer` |
| Request deduplication | `Effect.cached` |
| Optimistic updates | `Ref` + `Effect.fork` |
| Observability | Built-in spans, tracing |

**Effect Meta = Exposing these primitives through a declarative meta-framework API**

---

## Core Concepts

### 1. Route as an Effect

Every route is fundamentally: `Effect<Response, Error, Context>`

```typescript
import * as Meta from '@effect/meta'

const UserProfile = Meta.Route.make({
  path: '/users/:id',

  // Data is an Effect - automatically optimized by Effect runtime
  data: (params: { id: string }) =>
    Effect.gen(function*() {
      const user = yield* UserService.getById(params.id)
      const posts = yield* PostService.listByAuthor(params.id)
      return { user, posts }
    }),

  component: ({ data }) => (
    <div>
      <h1>{data.user.name}</h1>
      <PostList posts={data.posts} />
    </div>
  )
})
```

### 2. Automatic Parallelization

Effect's runtime automatically optimizes data loading:

```typescript
const Dashboard = Meta.Route.make({
  path: '/dashboard',

  data: Effect.gen(function*() {
    // These run in parallel automatically!
    const [user, tasks, notifications, analytics] = yield* Effect.all([
      UserService.getCurrent(),
      TaskService.list(),
      NotificationService.unread(),
      AnalyticsService.summary()
    ], { concurrency: 'unbounded' })

    return { user, tasks, notifications, analytics }
  }),

  component: ({ data }) => <DashboardView {...data} />
})
```

### 3. Type-Safe Actions with Effect Errors

```typescript
const UserSettings = Meta.Route.make({
  path: '/settings',

  data: () => UserService.getCurrent(),

  actions: {
    updateProfile: Meta.Action.make({
      // Schema validation with Effect Schema
      input: Schema.Struct({
        name: Schema.String.pipe(Schema.minLength(1)),
        email: Schema.String.pipe(Schema.pattern(/^.+@.+$/)),
        bio: Schema.optional(Schema.String)
      }),

      // Effect with typed errors
      effect: (input) =>
        UserService.updateProfile(input).pipe(
          // Revalidate after success
          Effect.tap(() => Meta.revalidate(UserSettings)),
          // Typed error handling
          Effect.catchTag('ValidationError', (error) =>
            Effect.fail(new BadRequest({ message: error.message }))
          )
        )
    })
  },

  component: ({ data, actions }) => (
    <Meta.Form action={actions.updateProfile}>
      {(submit, state) => (
        <form onSubmit={submit}>
          <input name="name" defaultValue={data.name} />
          <input name="email" defaultValue={data.email} />
          <textarea name="bio" defaultValue={data.bio} />

          <button disabled={state.submitting}>
            {state.submitting ? 'Saving...' : 'Save'}
          </button>

          {/* Typed error rendering */}
          {state.error && (
            <ErrorAlert error={state.error} />
          )}
        </form>
      )}
    </Meta.Form>
  )
})
```

### 4. Middleware as Composed Effects

```typescript
// Define middleware as Effects
const AuthMiddleware = Meta.Middleware.make('auth', () =>
  Effect.gen(function*() {
    const session = yield* SessionService.getCurrent()
    if (!session) {
      return yield* Effect.fail(new Unauthorized())
    }
    return { user: session.user }
  })
)

const LoggingMiddleware = Meta.Middleware.make('logging', (ctx) =>
  Effect.gen(function*() {
    const start = Date.now()
    yield* Effect.log(`Request to ${ctx.url.pathname}`)

    return yield* Effect.addFinalizer(() =>
      Effect.log(`Request completed in ${Date.now() - start}ms`)
    )
  })
)

const TracingMiddleware = Meta.Middleware.make('tracing', (ctx) =>
  Effect.withSpan(`route.${ctx.route.name}`, {
    attributes: {
      'http.method': ctx.request.method,
      'http.url': ctx.url.toString()
    }
  })
)

// Compose middleware
const ProtectedRoute = Meta.Route.make({
  path: '/admin',

  // Middleware runs in order, composes like Effect.flatMap
  middleware: [
    LoggingMiddleware,
    TracingMiddleware,
    AuthMiddleware
  ],

  data: (_, { user }) => // user is available from AuthMiddleware
    AdminService.getDashboard(user.id),

  component: ({ data }) => <AdminDashboard {...data} />
})
```

### 5. Dependency Injection with Layers

```typescript
// Define services (standard Effect pattern)
class UserService extends Context.Tag('UserService')<
  UserService,
  {
    getById: (id: string) => Effect<User, NotFound>
    updateProfile: (input: UpdateProfileInput) => Effect<User, ValidationError>
  }
>() {}

class TaskService extends Context.Tag('TaskService')<
  TaskService,
  {
    list: () => Effect<Task[], DatabaseError>
    create: (input: CreateTaskInput) => Effect<Task, ValidationError>
  }
>() {}

// Implement services
const UserServiceLive = Layer.succeed(UserService, {
  getById: (id) =>
    Effect.tryPromise({
      try: () => db.user.findUnique({ where: { id } }),
      catch: () => new NotFound({ resource: 'User', id })
    }),
  updateProfile: (input) =>
    Effect.gen(function*() {
      const validated = yield* Schema.decodeUnknown(UpdateProfileSchema)(input)
      return yield* Effect.tryPromise({
        try: () => db.user.update({ where: { id: validated.id }, data: validated }),
        catch: (e) => new ValidationError({ cause: e })
      })
    })
})

const TaskServiceLive = Layer.succeed(TaskService, {
  list: () =>
    Effect.tryPromise({
      try: () => db.task.findMany(),
      catch: () => new DatabaseError()
    }),
  create: (input) =>
    Effect.gen(function*() {
      const validated = yield* Schema.decodeUnknown(CreateTaskSchema)(input)
      return yield* Effect.tryPromise({
        try: () => db.task.create({ data: validated }),
        catch: (e) => new ValidationError({ cause: e })
      })
    })
})

// App composes all dependencies
const app = Meta.App.make({
  routes: [UserProfile, Dashboard, UserSettings],

  // Provide all services at once
  layer: Layer.mergeAll(
    UserServiceLive,
    TaskServiceLive,
    DatabaseLive,
    SessionServiceLive
  )
})
```

---

## Complete API Example

Here's a full route demonstrating all features:

```typescript
import * as Meta from '@effect/meta'
import { Effect, Schema, Context, Layer } from 'effect'

// ============================================
// Services
// ============================================

class UserService extends Context.Tag('UserService')<
  UserService,
  {
    getById: (id: string) => Effect<User, NotFound>
    getSettings: (id: string) => Effect<UserSettings, NotFound>
    updateSettings: (
      id: string,
      input: UpdateSettingsInput
    ) => Effect<UserSettings, ValidationError | NotFound>
    deleteAccount: (id: string) => Effect<void, NotFound>
  }
>() {}

class NotificationService extends Context.Tag('NotificationService')<
  NotificationService,
  {
    listForUser: (userId: string) => Effect<Notification[], DatabaseError>
    markAsRead: (id: string) => Effect<void, NotFound>
  }
>() {}

// ============================================
// Schemas
// ============================================

const UpdateSettingsSchema = Schema.Struct({
  emailNotifications: Schema.Boolean,
  theme: Schema.Literal('light', 'dark', 'auto'),
  language: Schema.String.pipe(Schema.minLength(2), Schema.maxLength(5))
})

type UpdateSettingsInput = Schema.Schema.Type<typeof UpdateSettingsSchema>

// ============================================
// Route Definition
// ============================================

const UserSettingsRoute = Meta.Route.make({
  path: '/users/:id/settings',
  name: 'user-settings',

  // Middleware - runs before data/actions
  middleware: [
    Meta.Middleware.auth({ required: true }),
    Meta.Middleware.trace({ operation: 'user.settings' }),
    Meta.Middleware.authorize((params, { user }) =>
      // Check if user can access this settings page
      params.id === user.id || user.role === 'admin'
    )
  ],

  // Data loader - automatic parallelization
  data: (params: { id: string }) =>
    Effect.gen(function*() {
      // Both requests happen in parallel
      const [user, settings, notifications] = yield* Effect.all([
        UserService.getById(params.id),
        UserService.getSettings(params.id),
        NotificationService.listForUser(params.id)
      ], { concurrency: 'unbounded' })

      return { user, settings, notifications }
    }),

  // Actions - type-safe mutations
  actions: {
    updateSettings: Meta.Action.make({
      input: UpdateSettingsSchema,
      effect: (input, params) =>
        UserService.updateSettings(params.id, input).pipe(
          // Revalidate after success
          Effect.tap(() => Meta.revalidate(UserSettingsRoute)),
          // Add tracing
          Effect.withSpan('action.updateSettings', {
            attributes: { userId: params.id }
          })
        )
    }),

    deleteAccount: Meta.Action.make({
      input: Schema.Struct({
        confirmation: Schema.Literal('DELETE')
      }),
      effect: (input, params) =>
        UserService.deleteAccount(params.id).pipe(
          Effect.flatMap(() => Meta.redirect('/'))
        )
    }),

    markNotificationRead: Meta.Action.make({
      input: Schema.Struct({
        notificationId: Schema.String
      }),
      effect: (input) =>
        NotificationService.markAsRead(input.notificationId).pipe(
          Effect.tap(() => Meta.revalidate(UserSettingsRoute))
        )
    })
  },

  // Component - server-first by default
  component: ({ data, actions, params }) => {
    return (
      <div className="settings-page">
        <header>
          <h1>{data.user.name}'s Settings</h1>
          <p>{data.user.email}</p>
        </header>

        {/* Settings Form */}
        <section>
          <h2>Preferences</h2>
          <Meta.Form action={actions.updateSettings}>
            {(submit, state) => (
              <form onSubmit={submit}>
                <label>
                  <input
                    type="checkbox"
                    name="emailNotifications"
                    defaultChecked={data.settings.emailNotifications}
                  />
                  Email Notifications
                </label>

                <label>
                  Theme
                  <select name="theme" defaultValue={data.settings.theme}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </label>

                <label>
                  Language
                  <input
                    type="text"
                    name="language"
                    defaultValue={data.settings.language}
                  />
                </label>

                <button disabled={state.submitting}>
                  {state.submitting ? 'Saving...' : 'Save Changes'}
                </button>

                {state.error && (
                  <Meta.ErrorBoundary error={state.error}>
                    {(error) => {
                      if (error._tag === 'ValidationError') {
                        return <p className="error">{error.message}</p>
                      }
                      return <p className="error">Failed to save settings</p>
                    }}
                  </Meta.ErrorBoundary>
                )}

                {state.success && (
                  <p className="success">Settings saved successfully!</p>
                )}
              </form>
            )}
          </Meta.Form>
        </section>

        {/* Notifications */}
        <section>
          <h2>Notifications</h2>
          {data.notifications.map((notification) => (
            <div key={notification.id}>
              <p>{notification.message}</p>
              {!notification.isRead && (
                <Meta.Form action={actions.markNotificationRead}>
                  {(submit) => (
                    <form onSubmit={submit}>
                      <input
                        type="hidden"
                        name="notificationId"
                        value={notification.id}
                      />
                      <button>Mark as Read</button>
                    </form>
                  )}
                </Meta.Form>
              )}
            </div>
          ))}
        </section>

        {/* Danger Zone */}
        <section className="danger-zone">
          <h2>Danger Zone</h2>
          <Meta.Form action={actions.deleteAccount}>
            {(submit, state) => (
              <form onSubmit={submit}>
                <p>Type "DELETE" to confirm account deletion:</p>
                <input
                  type="text"
                  name="confirmation"
                  placeholder="DELETE"
                />
                <button disabled={state.submitting}>
                  {state.submitting ? 'Deleting...' : 'Delete Account'}
                </button>
              </form>
            )}
          </Meta.Form>
        </section>
      </div>
    )
  },

  // Loading state
  loading: () => <div>Loading settings...</div>,

  // Error boundary
  errorBoundary: (error) => {
    if (error._tag === 'NotFound') {
      return <Meta.Redirect to="/404" />
    }
    if (error._tag === 'Unauthorized') {
      return <Meta.Redirect to="/login" />
    }
    return (
      <div className="error-page">
        <h1>Something went wrong</h1>
        <p>{error.message}</p>
      </div>
    )
  }
})

// ============================================
// App Composition
// ============================================

const app = Meta.App.make({
  routes: [
    UserSettingsRoute,
    // ... other routes
  ],

  // Global error handler
  errorBoundary: (error) => <GlobalErrorPage error={error} />,

  // Global loading state
  loadingBoundary: () => <GlobalLoadingSpinner />,

  // Provide all dependencies
  layer: Layer.mergeAll(
    UserServiceLive,
    NotificationServiceLive,
    DatabaseLive,
    AuthServiceLive,
    TracingLive
  )
})

// Export for your meta-framework of choice
export default app.toRemix() // or .toNext() or .toStandalone()
```

---

## Rendering Strategies as Configurations

Different meta-frameworks = different Layer configurations!

```typescript
// ============================================
// Remix-style: Server-first, progressive enhancement
// ============================================

const RemixStrategy = Meta.RenderStrategy.make({
  name: 'remix',
  rendering: 'server',
  hydration: 'progressive',
  forms: 'native-html',
  navigation: 'server-first',
  streaming: false,
  caching: 'none',
})

const app = Meta.App.make({ routes }).pipe(
  Meta.App.provideStrategy(RemixStrategy)
)

export default app.toRemix()

// ============================================
// Next.js App Router: Server components + streaming
// ============================================

const NextStrategy = Meta.RenderStrategy.make({
  name: 'next-app',
  rendering: 'server-components',
  hydration: 'selective',
  streaming: true,
  caching: 'aggressive',
  revalidation: 'on-demand',
})

const app = Meta.App.make({ routes }).pipe(
  Meta.App.provideStrategy(NextStrategy)
)

export default app.toNext()

// ============================================
// SPA: Client-first rendering
// ============================================

const SPAStrategy = Meta.RenderStrategy.make({
  name: 'spa',
  rendering: 'client',
  hydration: 'full',
  navigation: 'client-side',
  forms: 'javascript',
  streaming: false,
})

const app = Meta.App.make({ routes }).pipe(
  Meta.App.provideStrategy(SPAStrategy)
)

export default app.toVite() // Generates SPA

// ============================================
// Custom Strategy: Mix and match
// ============================================

const CustomStrategy = Meta.RenderStrategy.make({
  name: 'custom',
  rendering: 'server',
  hydration: 'islands', // Islands architecture
  streaming: true,
  caching: 'custom',
  cachingLayer: CustomCachingLayer,
})
```

---

## Real-World Refactoring Example

Here's how Effect Meta would simplify a real application route:

### Before (Traditional Remix)

```typescript
// app/routes/_app/analytics.tsx
import { json } from "@remix-run/node"
import type { LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Manual auth check
  const session = await getSession(request)
  const user = await requireUser(session)
  const account = await requireAccount(session)

  // Manual error handling
  try {
    // Manual async orchestration - these run sequentially!
    const customViews = await getAccountCustomViews(user, account)
    const placementCVs = customViews.filter(cv => cv.resourceType === 'PLACEMENT')
    const defaultCV = placementCVs.find(cv => cv.isDefault) || placementCVs[0]

    // More sequential fetches
    const tasks = await getTasks(account.id)
    const analytics = await getAnalytics(account.id)
    const employees = await getEmployees(account.id)

    return json({
      user,
      account,
      customViews,
      placementCVUid: defaultCV?.uid,
      tasks,
      analytics,
      employees
    })
  } catch (error) {
    // Untyped error handling
    if (error instanceof NotFoundError) {
      throw new Response("Not Found", { status: 404 })
    }
    throw error
  }
}

export default function Analytics() {
  const data = useLoaderData<typeof loader>()

  return (
    <Container>
      <h1>Analytics</h1>
      <EmployeeCntChart data={data.employees} />
      <PlacementIncompleteCnt data={data.tasks} />
      <TaskAvgCompletionTime data={data.analytics} />
    </Container>
  )
}
```

### After (Effect Meta)

```typescript
// app/routes/_app/analytics.tsx
import * as Meta from '@effect/meta'
import { Effect } from 'effect'

const AnalyticsRoute = Meta.Route.make({
  path: '/analytics',

  // Auth is middleware - composed, not manual
  middleware: [
    Meta.Middleware.auth({ required: true }),
    Meta.Middleware.trace({ operation: 'analytics.view' })
  ],

  // Data fetching - automatic parallelization!
  data: Effect.gen(function*() {
    const account = yield* AccountService.getCurrent()

    // These 4 requests happen in parallel automatically
    const [customViews, tasks, analytics, employees] = yield* Effect.all([
      CustomViewService.getAccountViews(account.id),
      TaskService.list(account.id),
      AnalyticsService.get(account.id),
      EmployeeService.list(account.id)
    ], { concurrency: 'unbounded' })

    const placementCVs = customViews.filter(cv => cv.resourceType === 'PLACEMENT')
    const defaultCV = placementCVs.find(cv => cv.isDefault) ?? placementCVs[0]

    return {
      account,
      placementCVUid: defaultCV?.uid,
      tasks,
      analytics,
      employees
    }
  }),

  component: ({ data }) => (
    <Container>
      <h1>Analytics</h1>
      <EmployeeCntChart data={data.employees} />
      <PlacementIncompleteCnt data={data.tasks} />
      <TaskAvgCompletionTime data={data.analytics} />
    </Container>
  ),

  // Typed error handling
  errorBoundary: (error) => {
    if (error._tag === 'NotFound') {
      return <Meta.Redirect to="/404" />
    }
    if (error._tag === 'Unauthorized') {
      return <Meta.Redirect to="/login" />
    }
    return <ErrorPage error={error} />
  }
})

export default AnalyticsRoute.toRemix()
```

**Improvements**:
- ✅ **Automatic parallelization**: 4 requests instead of 5 sequential
- ✅ **Type-safe errors**: Typed error handling with pattern matching
- ✅ **Composable middleware**: Auth + tracing as reusable Effects
- ✅ **Built-in observability**: Automatic spans and tracing
- ✅ **Testability**: Easy to mock services via Layer
- ✅ **Less boilerplate**: 40% less code, clearer intent

---

## Benefits Over Current Meta-Frameworks

| Feature | Traditional Meta-Frameworks | Effect Meta |
|---------|---------------------------|-------------|
| **Type Safety** | Partial (loader → component) | Full (DB → service → route → UI) |
| **Error Handling** | try/catch, untyped | Typed errors in Effect channel |
| **Parallel Data Loading** | Manual `Promise.all()` | Automatic via `Effect.all` |
| **Request Deduplication** | Manual implementation | Built-in via `Effect.cached` |
| **Caching** | Framework-specific APIs | `Effect.cached`, `Layer.memoize` |
| **Middleware** | Framework-specific | Composable Effects |
| **Dependency Injection** | Manual or framework DI | `Context` + `Layer` |
| **Observability** | Manual instrumentation | Built-in spans + tracing |
| **Testing** | Mock HTTP/DB | Mock services via Layer |
| **Streaming** | Framework-specific | `Stream` primitive |
| **Optimistic Updates** | Manual state management | `Ref` + `Effect.fork` |
| **Framework Lock-in** | High (Remix, Next.js, etc.) | Low (same code, different adapters) |

---

## Implementation Roadmap

### Phase 1: Core Primitives (3-6 months)

**Goal**: Establish foundational abstractions

- [ ] `Meta.Route` - Route definition with data/actions/middleware
- [ ] `Meta.Data` - Composable data loaders
- [ ] `Meta.Action` - Type-safe mutations
- [ ] `Meta.Middleware` - Middleware composition
- [ ] `Meta.App` - Application composition
- [ ] Basic React integration

**Deliverable**: Proof-of-concept that works standalone

### Phase 2: React Integration (3-6 months)

**Goal**: Production-ready React support

- [ ] `Meta.Form` - Progressive enhancement forms
- [ ] `Meta.ErrorBoundary` - Typed error boundaries
- [ ] Server Components support
- [ ] Streaming support
- [ ] Islands architecture support
- [ ] `@effect/react` integration for client-side Effects

**Deliverable**: Full-featured React meta-framework

### Phase 3: Adapter Ecosystem (6-12 months)

**Goal**: Framework adapters + migration paths

- [ ] Remix adapter (`app.toRemix()`)
- [ ] Next.js adapter (`app.toNext()`)
- [ ] Vite/SPA adapter (`app.toVite()`)
- [ ] TanStack Start adapter
- [ ] Migration guides from existing frameworks
- [ ] Codemods for automatic migration

**Deliverable**: Production-ready, framework-agnostic solution

### Phase 4: Advanced Features (Ongoing)

- [ ] Edge runtime support
- [ ] Real-time subscriptions via `Stream`
- [ ] Offline-first with `Ref` + `Effect.fork`
- [ ] Code generation from Effect Schemas
- [ ] Visual route editor
- [ ] Performance monitoring dashboard

---

## Technical Architecture

### Core Abstractions

```typescript
// Meta.Route - the fundamental unit
interface Route<
  Path extends string,
  Params,
  Data,
  DataError,
  DataRequirements,
  Actions extends Record<string, Action<any, any, any>>
> {
  readonly path: Path
  readonly name: string
  readonly data: (params: Params) => Effect<Data, DataError, DataRequirements>
  readonly actions: Actions
  readonly middleware: ReadonlyArray<Middleware<any, any, any>>
  readonly component: Component<{ data: Data; actions: Actions; params: Params }>
  readonly errorBoundary?: (error: DataError) => ReactElement
  readonly loading?: () => ReactElement
}

// Meta.Action - type-safe mutations
interface Action<Input, Success, Error, Requirements> {
  readonly input: Schema.Schema<Input>
  readonly effect: (
    input: Input,
    params: any
  ) => Effect<Success, Error, Requirements>
}

// Meta.Middleware - composable middleware
interface Middleware<Output, Error, Requirements> {
  readonly name: string
  readonly effect: (ctx: RequestContext) => Effect<Output, Error, Requirements>
}

// Meta.App - application composition
interface App<Routes extends ReadonlyArray<Route<any, any, any, any, any, any>>> {
  readonly routes: Routes
  readonly layer: Layer<any, any, any>
  readonly errorBoundary?: (error: unknown) => ReactElement
  readonly loadingBoundary?: () => ReactElement

  // Adapters
  toRemix(): RemixApp
  toNext(): NextApp
  toVite(): ViteApp
  toStandalone(): StandaloneApp
}
```

### Request Lifecycle

1. **Request arrives** → Parsed into `RequestContext`
2. **Middleware runs** → Composed as `Effect.flatMap` chain
3. **Route matching** → Type-safe params extraction
4. **Data loading** → `Effect.all` with automatic parallelization
5. **Rendering** → Server-side or client-side based on strategy
6. **Actions** → Mutations run as Effects, trigger revalidation
7. **Error handling** → Typed errors propagate through Effect channel
8. **Response** → Serialized based on rendering strategy

### Effect Runtime Integration

```typescript
// Internal: How Effect Meta uses Effect runtime

class EffectMetaRuntime {
  constructor(
    private readonly app: App<any>,
    private readonly strategy: RenderStrategy
  ) {}

  async handleRequest(request: Request): Promise<Response> {
    // Create request-scoped runtime
    const runtime = this.createRequestRuntime(request)

    // Match route
    const route = this.matchRoute(request.url)
    if (!route) {
      return new Response('Not Found', { status: 404 })
    }

    // Execute route as Effect
    const effect = Effect.gen(function*() {
      // 1. Run middleware
      const middlewareCtx = yield* Effect.forEach(
        route.middleware,
        (mw) => mw.effect({ request, route })
      )

      // 2. Parse params
      const params = yield* parseParams(route.path, request.url)

      // 3. Load data (automatically parallelized)
      const data = yield* route.data(params)

      // 4. Render component
      const html = yield* renderComponent({
        component: route.component,
        data,
        params,
        strategy: this.strategy
      })

      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      })
    }).pipe(
      // Add tracing
      Effect.withSpan(`route.${route.name}`),
      // Error handling
      Effect.catchAll((error) =>
        route.errorBoundary
          ? Effect.succeed(renderError(route.errorBoundary(error)))
          : Effect.fail(error)
      ),
      // Provide dependencies
      Effect.provide(this.app.layer)
    )

    // Run effect with runtime
    return Effect.runPromise(effect, { runtime })
  }

  private createRequestRuntime(request: Request) {
    // Create fiber-per-request for:
    // - Request-scoped services (session, etc.)
    // - Proper cancellation
    // - Isolated tracing
    return Runtime.make({
      context: Context.empty().pipe(
        Context.add(RequestService, { request }),
        Context.add(TracingService, createSpan(request))
      )
    })
  }
}
```

---

## Testing Story

Effect Meta makes testing trivial via Layer-based DI:

```typescript
import { describe, it, expect } from 'vitest'
import { Effect, Layer } from 'effect'
import * as Meta from '@effect/meta'

describe('UserSettingsRoute', () => {
  // Mock implementations
  const MockUserService = Layer.succeed(UserService, {
    getById: (id) =>
      Effect.succeed({
        id,
        name: 'Test User',
        email: 'test@example.com'
      }),
    getSettings: (id) =>
      Effect.succeed({
        emailNotifications: true,
        theme: 'dark',
        language: 'en'
      }),
    updateSettings: (id, input) =>
      Effect.succeed({ ...input })
  })

  const MockNotificationService = Layer.succeed(NotificationService, {
    listForUser: (userId) =>
      Effect.succeed([
        { id: '1', message: 'Welcome!', isRead: false }
      ]),
    markAsRead: (id) => Effect.unit
  })

  const TestLayer = Layer.mergeAll(
    MockUserService,
    MockNotificationService
  )

  it('loads user settings', async () => {
    const result = await UserSettingsRoute.data({ id: 'user-123' }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )

    expect(result.user.name).toBe('Test User')
    expect(result.settings.theme).toBe('dark')
    expect(result.notifications).toHaveLength(1)
  })

  it('updates settings', async () => {
    const result = await UserSettingsRoute.actions.updateSettings.effect(
      { emailNotifications: false, theme: 'light', language: 'es' },
      { id: 'user-123' }
    ).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    )

    expect(result.theme).toBe('light')
  })

  it('handles validation errors', async () => {
    const result = await UserSettingsRoute.actions.updateSettings.effect(
      { emailNotifications: false, theme: 'invalid', language: 'es' },
      { id: 'user-123' }
    ).pipe(
      Effect.provide(TestLayer),
      Effect.flip // Swap success/error channels for testing errors
    )

    expect(Effect.isEffect(result)).toBe(true)
  })
})
```

**Benefits**:
- ✅ No HTTP mocking needed
- ✅ No database setup needed
- ✅ Fast, isolated unit tests
- ✅ Test data loading and actions separately
- ✅ Test error cases easily with `Effect.flip`

---

## Migration Path

### From Remix

```typescript
// Before: Remix loader
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const user = await requireUser(request)
  const post = await getPost(params.id)
  return json({ user, post })
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const formData = await request.formData()
  const title = formData.get('title')
  await updatePost(params.id, { title })
  return redirect(`/posts/${params.id}`)
}

// After: Effect Meta
const PostEditRoute = Meta.Route.make({
  path: '/posts/:id/edit',

  middleware: [Meta.Middleware.auth({ required: true })],

  data: (params) =>
    Effect.all([
      UserService.getCurrent(),
      PostService.getById(params.id)
    ]),

  actions: {
    update: Meta.Action.make({
      input: Schema.Struct({ title: Schema.String }),
      effect: (input, params) =>
        PostService.update(params.id, input).pipe(
          Effect.flatMap(() => Meta.redirect(`/posts/${params.id}`))
        )
    })
  },

  component: ({ data: [user, post], actions }) => (
    <Meta.Form action={actions.update}>
      {(submit) => (
        <form onSubmit={submit}>
          <input name="title" defaultValue={post.title} />
          <button>Save</button>
        </form>
      )}
    </Meta.Form>
  )
})

// Export as Remix route
export default PostEditRoute.toRemix()
```

### From Next.js App Router

```typescript
// Before: Next.js Server Component
export default async function Page({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  const post = await getPost(params.id)

  return (
    <div>
      <h1>{post.title}</h1>
      <UpdateForm post={post} />
    </div>
  )
}

// After: Effect Meta
const PostPage = Meta.Route.make({
  path: '/posts/:id',

  data: (params) =>
    Effect.all([
      UserService.getCurrent(),
      PostService.getById(params.id)
    ]),

  actions: {
    update: Meta.Action.make({
      input: Schema.Struct({ title: Schema.String }),
      effect: (input, params) =>
        PostService.update(params.id, input).pipe(
          Effect.tap(() => Meta.revalidate(PostPage))
        )
    })
  },

  component: ({ data: [user, post], actions }) => (
    <div>
      <h1>{post.title}</h1>
      <UpdateForm post={post} action={actions.update} />
    </div>
  )
})

// Export as Next.js page
export default PostPage.toNext()
```

---

## Community & Ecosystem

### What This Enables

1. **Universal Effect Libraries**: Packages that work across all meta-frameworks
2. **Composable Auth**: `@effect/auth` that works everywhere
3. **Unified State Management**: `@effect/state` for client+server
4. **Portable Business Logic**: Write once, run in any framework
5. **Effect-Native CMS**: Content management built on Effect primitives
6. **Shared Component Libraries**: UI components with built-in data loading

### Example: Universal Auth Library

```typescript
// @effect/auth - works in any Effect Meta app

export const AuthMiddleware = Meta.Middleware.make('auth', (ctx) =>
  Effect.gen(function*() {
    const session = yield* SessionService.getFromRequest(ctx.request)

    if (!session) {
      return yield* Effect.fail(new Unauthorized())
    }

    return { user: session.user, session }
  })
)

export const AuthButton = () => {
  // Works in any Effect Meta app!
  const { user } = Meta.useMiddleware(AuthMiddleware)

  return user ? (
    <div>Welcome, {user.name}</div>
  ) : (
    <a href="/login">Login</a>
  )
}
```

---

## Open Questions & Discussion Points

### 1. Client-Side Effect Runtime

**Question**: How should client-side Effects work?

**Options**:
- A) Server-only Effects (traditional meta-framework approach)
- B) Full client-side Effect runtime (most powerful, but larger bundle)
- C) Selective client Effects via islands

**Proposal**: Support all three via rendering strategies

### 2. Server Components vs. Server-First

**Question**: Should Effect Meta embrace server components or server-first rendering?

**Trade-offs**:
- Server components: Better performance, but React-specific
- Server-first: More portable, progressive enhancement

**Proposal**: Support both as rendering strategies

### 3. Effect Schema vs. Other Validation Libraries

**Question**: Should Effect Meta require Effect Schema, or support Zod/others?

**Proposal**:
- Primary support for Effect Schema (best integration)
- Adapters for Zod, Valibot, etc. via Schema.make

### 4. Relationship to @effect/platform's HttpApi

**Question**: Should Effect Meta be built on top of `@effect/platform` HttpApi?

**Benefits**:
- Reuse existing HttpApi infrastructure
- Unified API layer
- Automatic OpenAPI generation

**Challenges**:
- HttpApi is lower-level than routes
- Need additional abstractions for rendering

**Proposal**: Build Effect Meta as a layer above HttpApi, reusing its primitives

### 5. SSR Streaming

**Question**: How should streaming work with Effect's `Stream`?

**Ideas**:
```typescript
const StreamingRoute = Meta.Route.make({
  path: '/feed',

  // Return Stream instead of Effect
  data: () => Stream.fromIterable(feedItems).pipe(
    Stream.mapEffect((item) => enrichItem(item)),
    Stream.throttle({ duration: '100 millis' })
  ),

  component: ({ stream }) => (
    <Suspense fallback={<Loading />}>
      {stream.map((item) => <FeedItem key={item.id} {...item} />)}
    </Suspense>
  )
})
```

### 6. File-Based Routing

**Question**: Should Effect Meta support file-based routing?

**Options**:
- A) File-based only (like Remix, Next.js)
- B) Code-based only (like Hono, tRPC)
- C) Support both

**Proposal**: Code-based by default, optional file-based via bundler plugin

---

## Call to Action

We believe Effect Meta could be a game-changer for:
- **Effect users** wanting to build full-stack apps
- **Meta-framework users** wanting better type safety and composability
- **Library authors** wanting portable, framework-agnostic code

### Next Steps

1. **Community Feedback**: Gather input on API design and priorities
2. **Proof of Concept**: Build minimal working example
3. **RFC Process**: Formalize through Effect's RFC process
4. **Prototype**: Develop alpha version for early adopters
5. **Ecosystem**: Build adapters and migration tools

### How to Participate

- **Discord**: Join discussion in #ideas channel
- **GitHub**: Comment on RFC issue (TBD)
- **Twitter**: Share feedback with #EffectMeta
- **Contribute**: Help with prototype implementation

---

## Appendix: Additional Code Examples

### Example: Nested Routes

```typescript
const UserLayout = Meta.Route.make({
  path: '/users/:id',

  data: (params) => UserService.getById(params.id),

  component: ({ data: user }) => (
    <div>
      <UserHeader user={user} />
      <Meta.Outlet /> {/* Renders nested routes */}
    </div>
  )
})

const UserProfile = Meta.Route.make({
  path: '', // Relative to parent

  data: (params) => ProfileService.get(params.id),

  component: ({ data: profile }) => <ProfileView profile={profile} />
})

const UserSettings = Meta.Route.make({
  path: 'settings',

  data: (params) => SettingsService.get(params.id),

  component: ({ data: settings }) => <SettingsView settings={settings} />
})

// Compose nested routes
const routes = [
  UserLayout,
  UserProfile.pipe(Meta.Route.nest(UserLayout)),
  UserSettings.pipe(Meta.Route.nest(UserLayout))
]
```

### Example: Optimistic Updates

```typescript
const TodoListRoute = Meta.Route.make({
  path: '/todos',

  data: () => TodoService.list(),

  actions: {
    create: Meta.Action.make({
      input: Schema.Struct({ text: Schema.String }),

      // Optimistic update
      effect: (input) =>
        Effect.gen(function*() {
          // Get current data
          const todos = yield* Meta.useRouteData(TodoListRoute)

          // Optimistic update
          const optimisticTodo = { id: 'temp', text: input.text, done: false }
          yield* Meta.setRouteData(TodoListRoute, [...todos, optimisticTodo])

          // Actual mutation
          const newTodo = yield* TodoService.create(input)

          // Replace optimistic with real
          yield* Meta.setRouteData(
            TodoListRoute,
            todos.filter((t) => t.id !== 'temp').concat(newTodo)
          )

          return newTodo
        }).pipe(
          // Rollback on error
          Effect.catchAll((error) =>
            Meta.revalidate(TodoListRoute).pipe(
              Effect.flatMap(() => Effect.fail(error))
            )
          )
        )
    })
  },

  component: ({ data: todos, actions }) => (
    <div>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
      <CreateTodoForm action={actions.create} />
    </div>
  )
})
```

### Example: Real-Time Data with Stream

```typescript
const RealtimeDashboard = Meta.Route.make({
  path: '/dashboard',

  // Initial data load
  data: () =>
    Effect.all([
      MetricsService.getCurrent(),
      EventService.getRecent()
    ]),

  // Real-time stream
  stream: () =>
    Stream.fromEventSource('/api/events').pipe(
      Stream.mapEffect((event) => EventService.parse(event)),
      Stream.tap((event) => Meta.updateRouteData(
        RealtimeDashboard,
        (data) => ({
          ...data,
          events: [event, ...data.events].slice(0, 100)
        })
      ))
    ),

  component: ({ data, stream }) => (
    <div>
      <MetricsPanel metrics={data.metrics} />

      {/* Auto-updates from stream */}
      <EventFeed events={data.events} />
    </div>
  )
})
```

---

## Conclusion

Effect Meta represents a paradigm shift in meta-framework design: **leverage Effect's battle-tested primitives** rather than reinventing the wheel. By treating routes, data loading, and actions as composable Effects, we get:

- ✅ **Type safety**: End-to-end, from database to UI
- ✅ **Performance**: Automatic parallelization and caching
- ✅ **Observability**: Built-in tracing and spans
- ✅ **Testability**: Layer-based dependency injection
- ✅ **Portability**: Framework-agnostic core
- ✅ **Composability**: Middleware and services as Effects

**This could be the killer app that makes Effect the standard for full-stack TypeScript.**

---

**Discussion**: [Effect Discord #ideas](https://discord.gg/effect-ts)
**Feedback**: [GitHub Discussions](https://github.com/Effect-TS/effect/discussions) (TBD)
**Status**: Open for community input

---

*Last updated: 2025-09-30*
