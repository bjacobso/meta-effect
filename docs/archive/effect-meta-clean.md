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

| Meta-Framework Concern | Effect Primitive                    |
| ---------------------- | ----------------------------------- |
| Data loading           | `Effect<A, E, R>`                   |
| Caching                | `Effect.cached` / `Layer.memoize`   |
| Revalidation           | `Effect.refresh` / `Ref`            |
| Middleware             | Effect composition / `Effect.tap`   |
| Error boundaries       | Effect error channel                |
| Streaming              | `Stream`                            |
| Parallel loading       | `Effect.all` with `{ concurrency }` |
| Waterfall prevention   | `Effect.fork` + `Effect.join`       |
| Dependency injection   | `Context` + `Layer`                 |
| Request deduplication  | `Effect.cached`                     |
| Optimistic updates     | `Ref` + `Effect.fork`               |
| Observability          | Built-in spans, tracing             |

**Effect Meta = Exposing these primitives through a declarative meta-framework API**

---

## Core Concepts

### 1. Route as an Effect with Atoms

Every route uses **reactive atoms** that automatically re-compute when dependencies change.

```typescript
import * as Meta from "@effect/meta";
import { Atom, Result, useAtomValue } from "@effect-atom/atom-react";
import { Effect, Schema } from "effect";

// Route params as a reactive atom
const userParamsAtom = RouteAtom.params({
  schema: Schema.Struct({
    id: Schema.String,
  }),
});

// Data atoms - automatically re-fetch when params change
const userProfileAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const params = get(userParamsAtom);

    // Parallel data loading - both happen concurrently
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

  // Component uses atoms for reactive data
  component: () => {
    const profileResult = useAtomValue(userProfileAtom);

    return Result.match(profileResult, {
      onInitial: () => <div>Loading profile...</div>,

      onFailure: (error) => (
        <div>Error: {Cause.pretty(error.cause)}</div>
      ),

      onSuccess: (response) => {
        const { user, posts } = response.value;
        return (
          <div>
            <h1>{user.name}</h1>
            <PostList posts={posts} />
          </div>
        );
      },
    });
  },
});
```

**Benefits:**
- ✅ Atoms automatically re-fetch when route params change
- ✅ Reactivity keys enable granular cache invalidation
- ✅ Result.match provides type-safe loading/error/success states
- ✅ Client-side reactivity without prop drilling

### 2. Automatic Parallelization with Composable Atoms

Atoms compose elegantly and fetch data in parallel automatically:

```typescript
// Individual atoms for each data source
const currentUserAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    return yield* get.result(
      ApiAtom.query("users", "getCurrent", {
        reactivityKeys: ["current-user"],
      })
    );
  })
).pipe(Atom.setIdleTTL("1 minute"));

const tasksAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    return yield* get.result(
      ApiAtom.query("tasks", "list", {
        reactivityKeys: ["tasks-list"],
      })
    );
  })
);

const notificationsAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    return yield* get.result(
      ApiAtom.query("notifications", "unread", {
        reactivityKeys: ["notifications-unread"],
      })
    );
  })
);

const analyticsAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    return yield* get.result(
      ApiAtom.query("analytics", "summary", {
        reactivityKeys: ["analytics-summary"],
      })
    );
  })
);

// Composite atom - fetches all in parallel when any dependency updates
const dashboardDataAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    // These all run in parallel automatically!
    const [user, tasks, notifications, analytics] = yield* Effect.all([
      get.result(currentUserAtom),
      get.result(tasksAtom),
      get.result(notificationsAtom),
      get.result(analyticsAtom),
    ]);

    return {
      user: user.value,
      tasks: tasks.value,
      notifications: notifications.value,
      analytics: analytics.value,
    };
  })
);

const Dashboard = Meta.Route.make({
  path: "/dashboard",

  component: () => {
    const dashboardResult = useAtomValue(dashboardDataAtom);

    return Result.match(dashboardResult, {
      onInitial: () => <DashboardSkeleton />,
      onFailure: (error) => <ErrorPage error={error} />,
      onSuccess: (response) => <DashboardView {...response.value} />,
    });
  },
});
```

**Benefits:**
- ✅ Each atom can be used independently or composed
- ✅ Granular TTL and caching per data source
- ✅ Components can subscribe to individual atoms for fine-grained updates
- ✅ Automatic parallelization via Effect.all

### 3. Type-Safe Actions with Mutation Atoms

```typescript
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";

// Data atom for current user
const currentUserAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    return yield* get.result(
      ApiAtom.query("users", "getCurrent", {
        reactivityKeys: ["current-user"],
      })
    );
  })
);

// Mutation atom for updating profile
const updateProfileAtom = ApiAtom.mutation("users", "updateProfile");

// Schema validation with Effect Schema
const UpdateProfileSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
  email: Schema.String.pipe(Schema.pattern(/^.+@.+$/)),
  bio: Schema.optional(Schema.String),
});

type UpdateProfileInput = Schema.Schema.Type<typeof UpdateProfileSchema>;

const UserSettings = Meta.Route.make({
  path: "/settings",

  component: () => {
    const userResult = useAtomValue(currentUserAtom);
    const updateProfile = useAtomSet(updateProfileAtom);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const input = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        bio: formData.get("bio") as string,
      };

      // Mutation with automatic cache invalidation
      updateProfile({
        payload: input,
        reactivityKeys: ["current-user"], // Auto-refresh currentUserAtom
      });
    };

    return Result.match(userResult, {
      onInitial: () => <div>Loading settings...</div>,

      onFailure: (error) => <ErrorPage error={error} />,

      onSuccess: (response) => {
        const user = response.value;
        return (
          <form onSubmit={handleSubmit}>
            <input name="name" defaultValue={user.name} />
            <input name="email" defaultValue={user.email} />
            <textarea name="bio" defaultValue={user.bio} />

            <button type="submit">Save Changes</button>

            {/* Loading state from response.waiting */}
            {response.waiting && <span>Saving...</span>}
          </form>
        );
      },
    });
  },
});
```

**Benefits:**
- ✅ Mutation atoms automatically invalidate related query atoms
- ✅ `reactivityKeys` trigger granular cache updates
- ✅ `response.waiting` provides optimistic UI states
- ✅ Type-safe from schema to mutation to UI

### 4. AtomHttpApi Integration

`AtomHttpApi` provides a type-safe HTTP client that creates query and mutation atoms directly from your API contract:

```typescript
import { AtomHttpApi } from "@effect-atom/atom-react";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import { InternalApi } from "@repo/domain/internal";
import { Layer } from "effect";

// Define your API atom - reuse across the app
export class ApiAtom extends AtomHttpApi.Tag<ApiAtom>()(
  "ApiAtom",
  {
    api: InternalApi, // Your ts-rest or OpenAPI contract
    httpClient: FetchHttpClient.layer.pipe(
      Layer.provide(
        Layer.succeed(FetchHttpClient.RequestInit, {
          credentials: "include", // Include cookies for auth
        })
      )
    ),
    baseUrl:
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000",
  }
) {}

// Query atoms - for GET requests
const userAtom = ApiAtom.query("users", "getById", {
  path: { id: "123" },
  reactivityKeys: ["user-123"],
});

// Mutation atoms - for POST/PUT/DELETE
const updateUserAtom = ApiAtom.mutation("users", "updateById");

// Use in components
function UserProfile() {
  const userResult = useAtomValue(userAtom);
  const updateUser = useAtomSet(updateUserAtom);

  // Mutation automatically invalidates related queries
  const handleUpdate = (data: UserUpdate) => {
    updateUser({
      path: { id: "123" },
      payload: data,
      reactivityKeys: ["user-123"], // Triggers userAtom to refetch
    });
  };

  return Result.match(userResult, {
    onInitial: () => <Loading />,
    onFailure: (error) => <Error error={error} />,
    onSuccess: (response) => <UserView user={response.value} />,
  });
}
```

**Benefits:**
- ✅ Type inference from API contract to UI
- ✅ Automatic query/mutation distinction
- ✅ Built-in loading/error/success states via Result type
- ✅ Granular cache invalidation via reactivity keys

### 5. URL State Synchronization with RouteAtom

`RouteAtom.searchParams()` creates a bidirectional binding between URL search parameters and atom state:

```typescript
import { RouteAtom } from "@/shared/RouteAtom";
import { Schema } from "effect";

// Define search params schema
const searchParamsAtom = RouteAtom.searchParams({
  schema: Schema.Struct({
    page: Schema.optionalWith(Schema.NumberFromString, { default: () => 1 }),
    limit: Schema.optionalWith(Schema.NumberFromString, { default: () => 20 }),
    query: Schema.optionalWith(Schema.String, { default: () => "" }),
    status: Schema.optionalWith(
      Schema.Literal("active", "completed", "archived"),
      { default: () => "active" as const }
    ),
  }),
  replace: false, // Use pushState instead of replaceState
});

// List atom automatically derives from search params
const itemsListAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const params = get(searchParamsAtom);

    // Debounce for better UX with text input
    yield* Effect.sleep("200 millis");

    return yield* get.result(
      ApiAtom.query("items", "list", {
        urlParams: {
          page: params.page,
          per_page: params.limit,
          query: params.query,
          status: params.status,
        },
        reactivityKeys: ["items-list", JSON.stringify(params)],
      })
    );
  })
).pipe(Atom.setIdleTTL("30 seconds"));

// Use in component
function ItemsList() {
  const [params, setParams] = useAtom(searchParamsAtom);
  const itemsResult = useAtomValue(itemsListAtom);

  // Update URL and trigger refetch
  const handleSearch = (query: string) => {
    setParams({ ...params, query, page: 1 });
  };

  return (
    <div>
      <input
        value={params.query}
        onChange={(e) => handleSearch(e.target.value)}
      />

      {Result.match(itemsResult, {
        onInitial: () => <Loading />,
        onFailure: (error) => <Error error={error} />,
        onSuccess: (response) => (
          <div>
            {response.value.data.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}

            <Pagination
              page={params.page}
              onChange={(page) => setParams({ ...params, page })}
            />
          </div>
        ),
      })}
    </div>
  );
}
```

**Benefits:**
- ✅ URL is single source of truth
- ✅ Automatic URL updates when params change
- ✅ Type-safe search params via Effect Schema
- ✅ Default values for missing params
- ✅ Debouncing built into atom
- ✅ Shareable URLs with current filter state

### 6. Derived Atoms Pattern

Atoms can derive from other atoms, creating an automatic dependency graph:

```typescript
// Base atoms
const selectedClientIdAtom = Atom.make<ClientId | null>(null);

// Derived atom - automatically refetches when selectedClientIdAtom changes
const selectedClientAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const clientId = get(selectedClientIdAtom);

    if (!clientId) {
      return null;
    }

    const queryAtom = ApiAtom.query("clients", "findById", {
      path: { uid: clientId },
      reactivityKeys: [`client-${clientId}`],
    });

    return yield* get.result(queryAtom);
  })
);

// Further derived atom - client's tasks
const selectedClientTasksAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const client = yield* get.result(selectedClientAtom);

    if (!client.value) {
      return [];
    }

    return yield* get.result(
      ApiAtom.query("tasks", "list", {
        urlParams: { clientId: client.value.id },
        reactivityKeys: [`tasks-client-${client.value.id}`],
      })
    );
  })
);

// Use in components - automatic reactivity!
function ClientDetailSheet() {
  const setSelectedClientId = useAtomSet(selectedClientIdAtom);
  const clientResult = useAtomValue(selectedClientAtom);
  const tasksResult = useAtomValue(selectedClientTasksAtom);

  // Changing selectedClientId automatically triggers:
  // 1. selectedClientAtom to refetch client data
  // 2. selectedClientTasksAtom to refetch tasks for new client
  const handleSelectClient = (id: ClientId) => {
    setSelectedClientId(id);
  };

  // Both atoms update automatically!
  return (
    <div>
      {Result.match(clientResult, {
        onInitial: () => <div>Loading client...</div>,
        onFailure: (error) => <div>Error: {Cause.pretty(error.cause)}</div>,
        onSuccess: (clientResponse) => (
          <div>
            <h1>{clientResponse.value.name}</h1>

            {Result.match(tasksResult, {
              onInitial: () => <div>Loading tasks...</div>,
              onFailure: (error) => <div>Error loading tasks</div>,
              onSuccess: (tasksResponse) => (
                <TasksList tasks={tasksResponse.value.data} />
              ),
            })}
          </div>
        ),
      })}
    </div>
  );
}
```

**Benefits:**
- ✅ Automatic dependency tracking
- ✅ Cascading updates when base atoms change
- ✅ No manual useEffect or dependency arrays
- ✅ Composable and testable
- ✅ Prevents stale data

### 7. Reactivity Keys for Cache Control

Reactivity keys provide granular control over cache invalidation:

```typescript
// Query with reactivity keys
const clientAtom = ApiAtom.query("clients", "findById", {
  path: { uid: clientId },
  reactivityKeys: [`client-${clientId}`, "clients-list"], // Listen to multiple keys
});

// Mutation that invalidates related queries
const updateClientAtom = ApiAtom.mutation("clients", "updateById");

const handleUpdate = (clientId: ClientId, data: ClientUpdate) => {
  updateClientAtom({
    path: { uid: clientId },
    payload: data,
    // Invalidate specific client AND the list
    reactivityKeys: [`client-${clientId}`, "clients-list"],
  });
};

// Strategy patterns for reactivity keys
const patterns = {
  // Entity-specific: `resource-${id}`
  specificEntity: [`user-${userId}`],

  // List queries: `resource-list`
  listQuery: ["users-list"],

  // Filtered lists: Include filter state in key
  filteredList: [`users-list-${JSON.stringify(filterParams)}`],

  // Related entities: Multiple keys
  relatedEntities: [`task-${taskId}`, `client-${clientId}`, "tasks-list"],

  // Global invalidation: Shared key
  globalRefresh: ["current-user", "global-refetch"],

  // Time-based: Include timestamp
  timeBased: [`analytics-${date.toISOString()}`],
};

// Example: Client list with search
const clientsListAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const searchParams = get(searchParamsAtom);

    return yield* get.result(
      ApiAtom.query("clients", "list", {
        urlParams: searchParams,
        // Include search params in reactivity key
        reactivityKeys: ["clients-list", JSON.stringify(searchParams)],
      })
    );
  })
);

// Mutation invalidates all relevant queries
const createClientAtom = ApiAtom.mutation("clients", "create");

const handleCreate = (data: ClientCreate) => {
  createClientAtom({
    payload: data,
    // Only invalidate the list, not individual clients
    reactivityKeys: ["clients-list"],
  });
};
```

**Benefits:**
- ✅ Granular cache invalidation (no full page refresh)
- ✅ Multiple queries can share reactivity keys
- ✅ Mutations specify exactly what to invalidate
- ✅ Pattern-based naming for consistency
- ✅ Prevents over-fetching and under-fetching

### 8. Middleware as Composed Effects

```typescript
// Define middleware as Effects
const AuthMiddleware = Meta.Middleware.make("auth", () =>
  Effect.gen(function* () {
    const session = yield* SessionService.getCurrent();
    if (!session) {
      return yield* Effect.fail(new Unauthorized());
    }
    return { user: session.user };
  })
);

const LoggingMiddleware = Meta.Middleware.make("logging", (ctx) =>
  Effect.gen(function* () {
    const start = Date.now();
    yield* Effect.log(`Request to ${ctx.url.pathname}`);

    return yield* Effect.addFinalizer(() =>
      Effect.log(`Request completed in ${Date.now() - start}ms`)
    );
  })
);

const TracingMiddleware = Meta.Middleware.make("tracing", (ctx) =>
  Effect.withSpan(`route.${ctx.route.name}`, {
    attributes: {
      "http.method": ctx.request.method,
      "http.url": ctx.url.toString(),
    },
  })
);

// Compose middleware
const ProtectedRoute = Meta.Route.make({
  path: "/admin",

  // Middleware runs in order, composes like Effect.flatMap
  middleware: [LoggingMiddleware, TracingMiddleware, AuthMiddleware],

  data: (
    _,
    { user } // user is available from AuthMiddleware
  ) => AdminService.getDashboard(user.id),

  component: ({ data }) => <AdminDashboard {...data} />,
});
```

### 5. Dependency Injection with Layers

```typescript
// Define services (standard Effect pattern)
class UserService extends Context.Tag("UserService")<
  UserService,
  {
    getById: (id: string) => Effect<User, NotFound>;
    updateProfile: (input: UpdateProfileInput) => Effect<User, ValidationError>;
  }
>() {}

class TaskService extends Context.Tag("TaskService")<
  TaskService,
  {
    list: () => Effect<Task[], DatabaseError>;
    create: (input: CreateTaskInput) => Effect<Task, ValidationError>;
  }
>() {}

// Implement services
const UserServiceLive = Layer.succeed(UserService, {
  getById: (id) =>
    Effect.tryPromise({
      try: () => db.user.findUnique({ where: { id } }),
      catch: () => new NotFound({ resource: "User", id }),
    }),
  updateProfile: (input) =>
    Effect.gen(function* () {
      const validated = yield* Schema.decodeUnknown(UpdateProfileSchema)(input);
      return yield* Effect.tryPromise({
        try: () =>
          db.user.update({ where: { id: validated.id }, data: validated }),
        catch: (e) => new ValidationError({ cause: e }),
      });
    }),
});

const TaskServiceLive = Layer.succeed(TaskService, {
  list: () =>
    Effect.tryPromise({
      try: () => db.task.findMany(),
      catch: () => new DatabaseError(),
    }),
  create: (input) =>
    Effect.gen(function* () {
      const validated = yield* Schema.decodeUnknown(CreateTaskSchema)(input);
      return yield* Effect.tryPromise({
        try: () => db.task.create({ data: validated }),
        catch: (e) => new ValidationError({ cause: e }),
      });
    }),
});

// App composes all dependencies
const app = Meta.App.make({
  routes: [UserProfile, Dashboard, UserSettings],

  // Provide all services at once
  layer: Layer.mergeAll(
    UserServiceLive,
    TaskServiceLive,
    DatabaseLive,
    SessionServiceLive
  ),
});
```

---

## Complete API Example with Atoms

Here's a full route demonstrating all atom-based features:

```typescript
import * as Meta from "@effect/meta";
import { Atom, Result, useAtomValue, useAtomSet } from "@effect-atom/atom-react";
import { Effect, Schema } from "effect";
import * as Cause from "effect/Cause";

// ============================================
// Schemas
// ============================================

const UpdateSettingsSchema = Schema.Struct({
  emailNotifications: Schema.Boolean,
  theme: Schema.Literal("light", "dark", "auto"),
  language: Schema.String.pipe(Schema.minLength(2), Schema.maxLength(5)),
});

type UpdateSettingsInput = Schema.Schema.Type<typeof UpdateSettingsSchema>;

// ============================================
// Atoms
// ============================================

// Route params atom
const userSettingsParamsAtom = RouteAtom.params({
  schema: Schema.Struct({
    id: Schema.String,
  }),
});

// User data atom
const userAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const params = get(userSettingsParamsAtom);

    return yield* get.result(
      ApiAtom.query("users", "getById", {
        path: { id: params.id },
        reactivityKeys: [`user-${params.id}`],
      })
    );
  })
);

// User settings atom
const userSettingsAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const params = get(userSettingsParamsAtom);

    return yield* get.result(
      ApiAtom.query("users", "getSettings", {
        path: { id: params.id },
        reactivityKeys: [`user-settings-${params.id}`],
      })
    );
  })
);

// Notifications atom
const notificationsAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const params = get(userSettingsParamsAtom);

    return yield* get.result(
      ApiAtom.query("notifications", "listForUser", {
        urlParams: { userId: params.id },
        reactivityKeys: [`notifications-${params.id}`],
      })
    );
  })
);

// Composite atom - fetches all data in parallel
const settingsPageDataAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const [user, settings, notifications] = yield* Effect.all([
      get.result(userAtom),
      get.result(userSettingsAtom),
      get.result(notificationsAtom),
    ]);

    return {
      user: user.value,
      settings: settings.value,
      notifications: notifications.value,
    };
  })
);

// Mutation atoms
const updateSettingsAtom = ApiAtom.mutation("users", "updateSettings");
const deleteAccountAtom = ApiAtom.mutation("users", "deleteAccount");
const markNotificationReadAtom = ApiAtom.mutation("notifications", "markAsRead");

// ============================================
// Components
// ============================================

function SettingsForm({ userId }: { userId: string }) {
  const settingsResult = useAtomValue(userSettingsAtom);
  const updateSettings = useAtomSet(updateSettingsAtom);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    updateSettings({
      path: { id: userId },
      payload: {
        emailNotifications: formData.get("emailNotifications") === "on",
        theme: formData.get("theme") as "light" | "dark" | "auto",
        language: formData.get("language") as string,
      },
      reactivityKeys: [`user-settings-${userId}`],
    });
  };

  return Result.match(settingsResult, {
    onInitial: () => <div>Loading settings...</div>,
    onFailure: (error) => <div>Error: {Cause.pretty(error.cause)}</div>,
    onSuccess: (response) => {
      const settings = response.value;
      return (
        <form onSubmit={handleSubmit}>
          <label>
            <input
              type="checkbox"
              name="emailNotifications"
              defaultChecked={settings.emailNotifications}
            />
            Email Notifications
          </label>

          <label>
            Theme
            <select name="theme" defaultValue={settings.theme}>
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
              defaultValue={settings.language}
            />
          </label>

          <button type="submit" disabled={response.waiting}>
            {response.waiting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      );
    },
  });
}

function NotificationsList({ userId }: { userId: string }) {
  const notificationsResult = useAtomValue(notificationsAtom);
  const markAsRead = useAtomSet(markNotificationReadAtom);

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead({
      path: { id: notificationId },
      reactivityKeys: [`notifications-${userId}`],
    });
  };

  return Result.match(notificationsResult, {
    onInitial: () => <div>Loading notifications...</div>,
    onFailure: (error) => <div>Error: {Cause.pretty(error.cause)}</div>,
    onSuccess: (response) => {
      const notifications = response.value;
      return (
        <div>
          {notifications.map((notification) => (
            <div key={notification.id}>
              <p>{notification.message}</p>
              {!notification.isRead && (
                <button onClick={() => handleMarkAsRead(notification.id)}>
                  Mark as Read
                </button>
              )}
            </div>
          ))}
        </div>
      );
    },
  });
}

function DangerZone({ userId }: { userId: string }) {
  const deleteAccount = useAtomSet(deleteAccountAtom);
  const [confirmation, setConfirmation] = React.useState("");

  const handleDelete = () => {
    if (confirmation === "DELETE") {
      deleteAccount({
        path: { id: userId },
        reactivityKeys: [`user-${userId}`],
      });
      // Navigate to home after deletion
      window.location.href = "/";
    }
  };

  return (
    <section className="danger-zone">
      <h2>Danger Zone</h2>
      <p>Type "DELETE" to confirm account deletion:</p>
      <input
        type="text"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        placeholder="DELETE"
      />
      <button onClick={handleDelete} disabled={confirmation !== "DELETE"}>
        Delete Account
      </button>
    </section>
  );
}

// ============================================
// Route Definition
// ============================================

const UserSettingsRoute = Meta.Route.make({
  path: "/users/:id/settings",
  name: "user-settings",

  component: () => {
    const dataResult = useAtomValue(settingsPageDataAtom);
    const params = useAtomValue(userSettingsParamsAtom);

    return Result.match(dataResult, {
      onInitial: () => <div>Loading user settings...</div>,

      onFailure: (error) => {
        // Type-safe error handling
        if (Cause.isFailType(error.cause)) {
          const failure = Cause.failureOption(error.cause);
          if (failure._tag === "Some") {
            if (failure.value._tag === "NotFound") {
              return <Meta.Redirect to="/404" />;
            }
            if (failure.value._tag === "Unauthorized") {
              return <Meta.Redirect to="/login" />;
            }
          }
        }
        return (
          <div className="error-page">
            <h1>Something went wrong</h1>
            <pre>{Cause.pretty(error.cause)}</pre>
          </div>
        );
      },

      onSuccess: (response) => {
        const { user, settings, notifications } = response.value;

        return (
          <div className="settings-page">
            <header>
              <h1>{user.name}'s Settings</h1>
              <p>{user.email}</p>
            </header>

            <section>
              <h2>Preferences</h2>
              <SettingsForm userId={params.id} />
            </section>

            <section>
              <h2>Notifications</h2>
              <NotificationsList userId={params.id} />
            </section>

            <DangerZone userId={params.id} />
          </div>
        );
      },
    });
  },
});

```

**Key Atom Patterns Demonstrated:**

1. **Route Params as Atoms**: `RouteAtom.params()` makes route params reactive
2. **Derived Atoms**: Individual atoms (`userAtom`, `userSettingsAtom`, `notificationsAtom`) derive from params
3. **Composite Atoms**: `settingsPageDataAtom` combines multiple atoms with parallel fetching
4. **Mutation Atoms**: `ApiAtom.mutation()` for type-safe mutations with automatic cache invalidation
5. **Reactivity Keys**: Granular cache control with keys like `user-${userId}`
6. **Result Pattern Matching**: Type-safe loading/error/success states
7. **Component Composition**: Each section subscribes to only the atoms it needs
8. **Optimistic UI**: `response.waiting` provides immediate feedback

**Benefits Over Traditional Approach:**

- ✅ **Fine-grained reactivity**: Components re-render only when their specific atoms change
- ✅ **Automatic cache invalidation**: Mutations trigger updates via reactivity keys
- ✅ **No prop drilling**: Components access data directly through atoms
- ✅ **Parallel data loading**: Effect.all automatically parallelizes requests
- ✅ **Type safety**: Full inference from API schema to UI components
- ✅ **Composable state**: Atoms can be mixed, matched, and reused across routes

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
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Manual auth check
  const session = await getSession(request);
  const user = await requireUser(session);
  const account = await requireAccount(session);

  // Manual error handling
  try {
    // Manual async orchestration - these run sequentially!
    const customViews = await getAccountCustomViews(user, account);
    const placementCVs = customViews.filter(
      (cv) => cv.resourceType === "PLACEMENT"
    );
    const defaultCV =
      placementCVs.find((cv) => cv.isDefault) || placementCVs[0];

    // More sequential fetches
    const tasks = await getTasks(account.id);
    const analytics = await getAnalytics(account.id);
    const employees = await getEmployees(account.id);

    return json({
      user,
      account,
      customViews,
      placementCVUid: defaultCV?.uid,
      tasks,
      analytics,
      employees,
    });
  } catch (error) {
    // Untyped error handling
    if (error instanceof NotFoundError) {
      throw new Response("Not Found", { status: 404 });
    }
    throw error;
  }
};

export default function Analytics() {
  const data = useLoaderData<typeof loader>();

  return (
    <Container>
      <h1>Analytics</h1>
      <EmployeeCntChart data={data.employees} />
      <PlacementIncompleteCnt data={data.tasks} />
      <TaskAvgCompletionTime data={data.analytics} />
    </Container>
  );
}
```

### After (Effect Meta with Atoms)

```typescript
// app/routes/_app/analytics.tsx
import * as Meta from "@effect/meta";
import { Atom, Result, useAtomValue } from "@effect-atom/atom-react";
import { Effect } from "effect";
import * as Cause from "effect/Cause";

// Current account atom (shared across app)
const currentAccountAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    return yield* get.result(
      ApiAtom.query("accounts", "getCurrent", {
        reactivityKeys: ["current-account"],
      })
    );
  })
).pipe(Atom.setIdleTTL("5 minutes"));

// Custom views atom
const customViewsAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const account = yield* get.result(currentAccountAtom);

    return yield* get.result(
      ApiAtom.query("customViews", "getAccountViews", {
        path: { accountId: account.value.id },
        reactivityKeys: [`custom-views-${account.value.id}`],
      })
    );
  })
);

// Analytics data atoms - all fetch in parallel
const tasksAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const account = yield* get.result(currentAccountAtom);

    return yield* get.result(
      ApiAtom.query("tasks", "list", {
        urlParams: { accountId: account.value.id },
        reactivityKeys: [`tasks-${account.value.id}`],
      })
    );
  })
);

const analyticsAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const account = yield* get.result(currentAccountAtom);

    return yield* get.result(
      ApiAtom.query("analytics", "get", {
        path: { accountId: account.value.id },
        reactivityKeys: [`analytics-${account.value.id}`],
      })
    );
  })
);

const employeesAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const account = yield* get.result(currentAccountAtom);

    return yield* get.result(
      ApiAtom.query("employees", "list", {
        urlParams: { accountId: account.value.id },
        reactivityKeys: [`employees-${account.value.id}`],
      })
    );
  })
);

// Derived atom for default placement custom view
const defaultPlacementCVAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const customViews = yield* get.result(customViewsAtom);

    const placementCVs = customViews.value.filter(
      (cv) => cv.resourceType === "PLACEMENT"
    );
    return placementCVs.find((cv) => cv.isDefault) ?? placementCVs[0];
  })
);

// Composite atom - fetches all data in parallel
const analyticsPageDataAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const [tasks, analytics, employees, defaultCV] = yield* Effect.all([
      get.result(tasksAtom),
      get.result(analyticsAtom),
      get.result(employeesAtom),
      get.result(defaultPlacementCVAtom),
    ]);

    return {
      tasks: tasks.value,
      analytics: analytics.value,
      employees: employees.value,
      placementCVUid: defaultCV?.uid,
    };
  })
);

const AnalyticsRoute = Meta.Route.make({
  path: "/analytics",

  component: () => {
    const dataResult = useAtomValue(analyticsPageDataAtom);

    return Result.match(dataResult, {
      onInitial: () => (
        <Container>
          <div>Loading analytics...</div>
        </Container>
      ),

      onFailure: (error) => {
        if (Cause.isFailType(error.cause)) {
          const failure = Cause.failureOption(error.cause);
          if (failure._tag === "Some") {
            if (failure.value._tag === "NotFound") {
              return <Meta.Redirect to="/404" />;
            }
            if (failure.value._tag === "Unauthorized") {
              return <Meta.Redirect to="/login" />;
            }
          }
        }
        return (
          <Container>
            <div>Error loading analytics</div>
            <pre>{Cause.pretty(error.cause)}</pre>
          </Container>
        );
      },

      onSuccess: (response) => {
        const { tasks, analytics, employees } = response.value;

        return (
          <Container>
            <h1>Analytics</h1>
            <EmployeeCntChart data={employees} />
            <PlacementIncompleteCnt data={tasks} />
            <TaskAvgCompletionTime data={analytics} />

            {/* Show loading overlay while refetching */}
            {response.waiting && (
              <div className="loading-overlay">Updating...</div>
            )}
          </Container>
        );
      },
    });
  },
});

export default AnalyticsRoute;
```

**Improvements Over Traditional Remix**:

- ✅ **Automatic parallelization**: 4 API requests happen concurrently via atoms
- ✅ **Fine-grained reactivity**: Each chart can subscribe to its specific atom
- ✅ **Derived state**: `defaultPlacementCVAtom` automatically recomputes when custom views change
- ✅ **Reusable atoms**: `currentAccountAtom` shared across multiple routes
- ✅ **Built-in caching**: `Atom.setIdleTTL("5 minutes")` for account data
- ✅ **Type-safe errors**: Pattern matching on typed failure cases
- ✅ **Optimistic UI**: `response.waiting` shows loading state during refetch
- ✅ **No prop drilling**: Components access atoms directly
- ✅ **Testability**: Easy to mock atoms in tests

---

## Benefits Over Current Meta-Frameworks

| Feature                   | Traditional Meta-Frameworks  | Effect Meta with Atoms              |
| ------------------------- | ---------------------------- | ----------------------------------- |
| **Type Safety**           | Partial (loader → component) | Full (DB → service → atom → UI)     |
| **Error Handling**        | try/catch, untyped           | Typed errors + Result.match         |
| **Parallel Data Loading** | Manual `Promise.all()`       | Automatic via atom composition      |
| **Request Deduplication** | Manual implementation        | Built-in via reactivity keys        |
| **Caching**               | Framework-specific APIs      | Atom TTL + reactivity keys          |
| **Client Reactivity**     | Manual state sync            | Automatic atom re-computation       |
| **URL State Sync**        | Manual searchParams handling | `RouteAtom.searchParams()`          |
| **Derived State**         | Manual computations          | Atoms derive from other atoms       |
| **Fine-grained Updates**  | Full component re-renders    | Only affected atoms trigger updates |
| **Middleware**            | Framework-specific           | Composable Effects                  |
| **Dependency Injection**  | Manual or framework DI       | `Context` + `Layer`                 |
| **Observability**         | Manual instrumentation       | Built-in spans + tracing            |
| **Testing**               | Mock HTTP/DB                 | Mock atoms via test implementations |
| **Streaming**             | Framework-specific           | `Stream` primitive                  |
| **Optimistic Updates**    | Manual state management      | Mutation atoms + reactivity keys    |
| **Framework Lock-in**     | High (Remix, Next.js, etc.)  | Low (same code, different adapters) |

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
  readonly path: Path;
  readonly name: string;
  readonly data: (params: Params) => Effect<Data, DataError, DataRequirements>;
  readonly actions: Actions;
  readonly middleware: ReadonlyArray<Middleware<any, any, any>>;
  readonly component: Component<{
    data: Data;
    actions: Actions;
    params: Params;
  }>;
  readonly errorBoundary?: (error: DataError) => ReactElement;
  readonly loading?: () => ReactElement;
}

// Meta.Action - type-safe mutations
interface Action<Input, Success, Error, Requirements> {
  readonly input: Schema.Schema<Input>;
  readonly effect: (
    input: Input,
    params: any
  ) => Effect<Success, Error, Requirements>;
}

// Meta.Middleware - composable middleware
interface Middleware<Output, Error, Requirements> {
  readonly name: string;
  readonly effect: (ctx: RequestContext) => Effect<Output, Error, Requirements>;
}

// Meta.App - application composition
interface App<
  Routes extends ReadonlyArray<Route<any, any, any, any, any, any>>
> {
  readonly routes: Routes;
  readonly layer: Layer<any, any, any>;
  readonly errorBoundary?: (error: unknown) => ReactElement;
  readonly loadingBoundary?: () => ReactElement;

  // Adapters
  toRemix(): RemixApp;
  toNext(): NextApp;
  toVite(): ViteApp;
  toStandalone(): StandaloneApp;
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
    const runtime = this.createRequestRuntime(request);

    // Match route
    const route = this.matchRoute(request.url);
    if (!route) {
      return new Response("Not Found", { status: 404 });
    }

    // Execute route as Effect
    const effect = Effect.gen(function* () {
      // 1. Run middleware
      const middlewareCtx = yield* Effect.forEach(route.middleware, (mw) =>
        mw.effect({ request, route })
      );

      // 2. Parse params
      const params = yield* parseParams(route.path, request.url);

      // 3. Load data (automatically parallelized)
      const data = yield* route.data(params);

      // 4. Render component
      const html = yield* renderComponent({
        component: route.component,
        data,
        params,
        strategy: this.strategy,
      });

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
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
    );

    // Run effect with runtime
    return Effect.runPromise(effect, { runtime });
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
      ),
    });
  }
}
```

---

## Testing Story

Effect Meta makes testing trivial via Layer-based DI:

```typescript
import * as Meta from "@effect/meta";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

describe("UserSettingsRoute", () => {
  // Mock implementations
  const MockUserService = Layer.succeed(UserService, {
    getById: (id) =>
      Effect.succeed({
        id,
        name: "Test User",
        email: "test@example.com",
      }),
    getSettings: (id) =>
      Effect.succeed({
        emailNotifications: true,
        theme: "dark",
        language: "en",
      }),
    updateSettings: (id, input) => Effect.succeed({ ...input }),
  });

  const MockNotificationService = Layer.succeed(NotificationService, {
    listForUser: (userId) =>
      Effect.succeed([{ id: "1", message: "Welcome!", isRead: false }]),
    markAsRead: (id) => Effect.unit,
  });

  const TestLayer = Layer.mergeAll(MockUserService, MockNotificationService);

  it("loads user settings", async () => {
    const result = await UserSettingsRoute.data({ id: "user-123" }).pipe(
      Effect.provide(TestLayer),
      Effect.runPromise
    );

    expect(result.user.name).toBe("Test User");
    expect(result.settings.theme).toBe("dark");
    expect(result.notifications).toHaveLength(1);
  });

  it("updates settings", async () => {
    const result = await UserSettingsRoute.actions.updateSettings
      .effect(
        { emailNotifications: false, theme: "light", language: "es" },
        { id: "user-123" }
      )
      .pipe(Effect.provide(TestLayer), Effect.runPromise);

    expect(result.theme).toBe("light");
  });

  it("handles validation errors", async () => {
    const result = await UserSettingsRoute.actions.updateSettings
      .effect(
        { emailNotifications: false, theme: "invalid", language: "es" },
        { id: "user-123" }
      )
      .pipe(
        Effect.provide(TestLayer),
        Effect.flip // Swap success/error channels for testing errors
      );

    expect(Effect.isEffect(result)).toBe(true);
  });
});
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
  const user = await requireUser(request);
  const post = await getPost(params.id);
  return json({ user, post });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const title = formData.get("title");
  await updatePost(params.id, { title });
  return redirect(`/posts/${params.id}`);
};

// After: Effect Meta
const PostEditRoute = Meta.Route.make({
  path: "/posts/:id/edit",

  middleware: [Meta.Middleware.auth({ required: true })],

  data: (params) =>
    Effect.all([UserService.getCurrent(), PostService.getById(params.id)]),

  actions: {
    update: Meta.Action.make({
      input: Schema.Struct({ title: Schema.String }),
      effect: (input, params) =>
        PostService.update(params.id, input).pipe(
          Effect.flatMap(() => Meta.redirect(`/posts/${params.id}`))
        ),
    }),
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
  ),
});

// Export as Remix route
export default PostEditRoute.toRemix();
```

### From Next.js App Router

```typescript
// Before: Next.js Server Component
export default async function Page({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const post = await getPost(params.id);

  return (
    <div>
      <h1>{post.title}</h1>
      <UpdateForm post={post} />
    </div>
  );
}

// After: Effect Meta
const PostPage = Meta.Route.make({
  path: "/posts/:id",

  data: (params) =>
    Effect.all([UserService.getCurrent(), PostService.getById(params.id)]),

  actions: {
    update: Meta.Action.make({
      input: Schema.Struct({ title: Schema.String }),
      effect: (input, params) =>
        PostService.update(params.id, input).pipe(
          Effect.tap(() => Meta.revalidate(PostPage))
        ),
    }),
  },

  component: ({ data: [user, post], actions }) => (
    <div>
      <h1>{post.title}</h1>
      <UpdateForm post={post} action={actions.update} />
    </div>
  ),
});

// Export as Next.js page
export default PostPage.toNext();
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

export const AuthMiddleware = Meta.Middleware.make("auth", (ctx) =>
  Effect.gen(function* () {
    const session = yield* SessionService.getFromRequest(ctx.request);

    if (!session) {
      return yield* Effect.fail(new Unauthorized());
    }

    return { user: session.user, session };
  })
);

export const AuthButton = () => {
  // Works in any Effect Meta app!
  const { user } = Meta.useMiddleware(AuthMiddleware);

  return user ? <div>Welcome, {user.name}</div> : <a href="/login">Login</a>;
};
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
  path: "/feed",

  // Return Stream instead of Effect
  data: () =>
    Stream.fromIterable(feedItems).pipe(
      Stream.mapEffect((item) => enrichItem(item)),
      Stream.throttle({ duration: "100 millis" })
    ),

  component: ({ stream }) => (
    <Suspense fallback={<Loading />}>
      {stream.map((item) => (
        <FeedItem key={item.id} {...item} />
      ))}
    </Suspense>
  ),
});
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

### Example: Nested Routes with Shared Atoms

```typescript
// Shared atoms across nested routes
const userParamsAtom = RouteAtom.params({
  schema: Schema.Struct({
    id: Schema.String,
  }),
});

// Parent route atom - shared by all nested routes
const userAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const params = get(userParamsAtom);

    return yield* get.result(
      ApiAtom.query("users", "getById", {
        path: { id: params.id },
        reactivityKeys: [`user-${params.id}`],
      })
    );
  })
);

// Nested route atoms - derive from parent
const userProfileAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const params = get(userParamsAtom);

    return yield* get.result(
      ApiAtom.query("profiles", "get", {
        path: { userId: params.id },
        reactivityKeys: [`profile-${params.id}`],
      })
    );
  })
);

const userSettingsAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const params = get(userParamsAtom);

    return yield* get.result(
      ApiAtom.query("settings", "get", {
        path: { userId: params.id },
        reactivityKeys: [`settings-${params.id}`],
      })
    );
  })
);

// Layout component - uses shared user atom
const UserLayout = Meta.Route.make({
  path: "/users/:id",

  component: () => {
    const userResult = useAtomValue(userAtom);

    return Result.match(userResult, {
      onInitial: () => <div>Loading user...</div>,
      onFailure: (error) => <div>Error: {Cause.pretty(error.cause)}</div>,
      onSuccess: (response) => (
        <div>
          <UserHeader user={response.value} />
          <Meta.Outlet /> {/* Nested routes access the same userAtom */}
        </div>
      ),
    });
  },
});

// Nested profile route
const UserProfile = Meta.Route.make({
  path: "",

  component: () => {
    const profileResult = useAtomValue(userProfileAtom);

    return Result.match(profileResult, {
      onInitial: () => <div>Loading profile...</div>,
      onFailure: (error) => <div>Error loading profile</div>,
      onSuccess: (response) => <ProfileView profile={response.value} />,
    });
  },
});

// Nested settings route
const UserSettings = Meta.Route.make({
  path: "settings",

  component: () => {
    const settingsResult = useAtomValue(userSettingsAtom);

    return Result.match(settingsResult, {
      onInitial: () => <div>Loading settings...</div>,
      onFailure: (error) => <div>Error loading settings</div>,
      onSuccess: (response) => <SettingsView settings={response.value} />,
    });
  },
});

// Compose nested routes - atoms are shared automatically
const routes = [
  UserLayout,
  UserProfile.pipe(Meta.Route.nest(UserLayout)),
  UserSettings.pipe(Meta.Route.nest(UserLayout)),
];
```

**Benefits of Atom-Based Nested Routes:**
- ✅ **Shared state**: Parent and child routes share `userAtom` without prop drilling
- ✅ **Independent loading**: Each nested route loads independently
- ✅ **Granular caching**: Each atom has its own TTL and reactivity keys
- ✅ **No waterfalls**: All nested route atoms can fetch in parallel

### Example: Optimistic Updates with Atoms

```typescript
import { useState } from "react";

// Todos list atom
const todosListAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    return yield* get.result(
      ApiAtom.query("todos", "list", {
        reactivityKeys: ["todos-list"],
      })
    );
  })
);

// Create todo mutation atom
const createTodoAtom = ApiAtom.mutation("todos", "create");

// Toggle todo mutation atom
const toggleTodoAtom = ApiAtom.mutation("todos", "toggle");

const TodoListRoute = Meta.Route.make({
  path: "/todos",

  component: () => {
    const todosResult = useAtomValue(todosListAtom);
    const createTodo = useAtomSet(createTodoAtom);
    const toggleTodo = useAtomSet(toggleTodoAtom);

    // Local optimistic state
    const [optimisticTodos, setOptimisticTodos] = useState<Todo[]>([]);

    const handleCreate = async (text: string) => {
      // Create optimistic todo
      const optimisticTodo = {
        id: `temp-${Date.now()}`,
        text,
        done: false,
        createdAt: new Date(),
      };

      // Add to optimistic list immediately
      setOptimisticTodos((prev) => [...prev, optimisticTodo]);

      try {
        // Perform actual mutation
        await createTodo({
          payload: { text },
          reactivityKeys: ["todos-list"], // Triggers todosListAtom to refetch
        });

        // Clear optimistic state on success
        setOptimisticTodos((prev) =>
          prev.filter((t) => t.id !== optimisticTodo.id)
        );
      } catch (error) {
        // Rollback optimistic update on error
        setOptimisticTodos((prev) =>
          prev.filter((t) => t.id !== optimisticTodo.id)
        );
        console.error("Failed to create todo:", error);
      }
    };

    const handleToggle = async (todoId: string) => {
      // Optimistically toggle in place
      setOptimisticTodos((prev) =>
        prev.map((t) => (t.id === todoId ? { ...t, done: !t.done } : t))
      );

      try {
        await toggleTodo({
          path: { id: todoId },
          reactivityKeys: ["todos-list"],
        });

        setOptimisticTodos((prev) => prev.filter((t) => t.id !== todoId));
      } catch (error) {
        // Revert on error
        setOptimisticTodos((prev) => prev.filter((t) => t.id !== todoId));
      }
    };

    return Result.match(todosResult, {
      onInitial: () => <div>Loading todos...</div>,

      onFailure: (error) => (
        <div>Error loading todos: {Cause.pretty(error.cause)}</div>
      ),

      onSuccess: (response) => {
        // Merge server todos with optimistic todos
        const allTodos = [...response.value, ...optimisticTodos];

        return (
          <div>
            <h1>Todos</h1>

            {allTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={() => handleToggle(todo.id)}
                isOptimistic={todo.id.startsWith("temp-")}
              />
            ))}

            <CreateTodoForm onSubmit={handleCreate} />

            {/* Show background refetch state */}
            {response.waiting && (
              <div className="sync-indicator">Syncing...</div>
            )}
          </div>
        );
      },
    });
  },
});
```

**Benefits of Atom-Based Optimistic Updates:**
- ✅ **Instant UI feedback**: Optimistic state updates immediately
- ✅ **Automatic rollback**: Errors trigger state reversion
- ✅ **Background sync**: `response.waiting` shows refetch status
- ✅ **Fine-grained control**: Reactivity keys target specific atoms
- ✅ **Type-safe mutations**: Full inference from API to UI

### Example: Real-Time Data with Atoms and Streams

```typescript
import { useEffect, useState } from "react";
import { Stream } from "effect";

// Metrics atom - static data with periodic refresh
const metricsAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    return yield* get.result(
      ApiAtom.query("metrics", "getCurrent", {
        reactivityKeys: ["metrics-current"],
      })
    );
  })
).pipe(Atom.setIdleTTL("1 minute"));

// Recent events atom - initial load
const recentEventsAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    return yield* get.result(
      ApiAtom.query("events", "getRecent", {
        reactivityKeys: ["events-recent"],
      })
    );
  })
);

// Real-time events state (not an atom, updated via stream)
const RealtimeDashboard = Meta.Route.make({
  path: "/dashboard",

  component: () => {
    const metricsResult = useAtomValue(metricsAtom);
    const recentEventsResult = useAtomValue(recentEventsAtom);

    // Real-time events from stream
    const [liveEvents, setLiveEvents] = useState<Event[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<
      "connecting" | "connected" | "disconnected"
    >("connecting");

    useEffect(() => {
      // Subscribe to real-time event stream
      const eventSource = new EventSource("/api/events/stream");

      eventSource.onopen = () => {
        setConnectionStatus("connected");
      };

      eventSource.onmessage = (event) => {
        const parsedEvent = JSON.parse(event.data);

        // Add new event to the top, keep last 100
        setLiveEvents((prev) => [parsedEvent, ...prev].slice(0, 100));

        // Optionally trigger metrics refresh on certain events
        if (parsedEvent.type === "metric_update") {
          // Trigger metrics atom to refetch (via reactivity key)
          // This could be done through a mutation or manual refetch
        }
      };

      eventSource.onerror = () => {
        setConnectionStatus("disconnected");
        eventSource.close();

        // Retry connection after delay
        setTimeout(() => {
          setConnectionStatus("connecting");
        }, 5000);
      };

      return () => {
        eventSource.close();
      };
    }, []);

    // Combine initial events with live events
    const allEvents = Result.match(recentEventsResult, {
      onInitial: () => liveEvents,
      onFailure: () => liveEvents,
      onSuccess: (response) => {
        // Merge recent events with live events, dedupe by ID
        const recent = response.value;
        const liveIds = new Set(liveEvents.map((e) => e.id));
        const uniqueRecent = recent.filter((e) => !liveIds.has(e.id));
        return [...liveEvents, ...uniqueRecent].slice(0, 100);
      },
    });

    return (
      <div>
        {/* Connection status indicator */}
        <div className="status-bar">
          <span
            className={`status-indicator ${connectionStatus}`}
            title={connectionStatus}
          />
          {connectionStatus === "connected" && "Live"}
          {connectionStatus === "connecting" && "Connecting..."}
          {connectionStatus === "disconnected" && "Disconnected"}
        </div>

        {/* Metrics panel */}
        {Result.match(metricsResult, {
          onInitial: () => <div>Loading metrics...</div>,
          onFailure: (error) => <div>Error loading metrics</div>,
          onSuccess: (response) => (
            <MetricsPanel
              metrics={response.value}
              updating={response.waiting}
            />
          ),
        })}

        {/* Live event feed */}
        <div className="event-feed">
          <h2>Live Events ({allEvents.length})</h2>
          <EventFeed events={allEvents} />
        </div>
      </div>
    );
  },
});
```

**Alternative: Using Effect Streams with Atoms**

```typescript
// More Effect-idiomatic approach using Stream atoms
const eventStreamAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    // Create an event stream
    const stream = Stream.fromEventSource("/api/events").pipe(
      Stream.mapEffect((rawEvent) =>
        Effect.gen(function* () {
          const parsed = JSON.parse(rawEvent.data);
          return yield* Schema.decodeUnknown(EventSchema)(parsed);
        })
      ),
      Stream.take(100), // Keep last 100 events
      Stream.runCollect // Collect into array
    );

    return yield* stream;
  })
);
```

**Benefits of Atom-Based Real-Time:**
- ✅ **Hybrid approach**: Atoms for static data, streams for real-time updates
- ✅ **Connection management**: Built-in reconnection logic
- ✅ **Status indicators**: Live connection state in UI
- ✅ **Deduplication**: Merge live and historical events intelligently
- ✅ **Selective refresh**: Stream events can trigger specific atom updates
- ✅ **Type safety**: Full schema validation for streamed events

---

## Conclusion

Effect Meta represents a paradigm shift in meta-framework design: **leverage Effect's battle-tested primitives with reactive atoms** rather than reinventing the wheel. By combining Effect's composable abstractions with `@effect-atom/atom-react`'s fine-grained reactivity, we get:

- ✅ **Type safety**: End-to-end, from database → API → atom → UI
- ✅ **Client reactivity**: Atoms automatically re-compute when dependencies change
- ✅ **Performance**: Automatic parallelization, caching (TTL), and granular updates
- ✅ **URL state sync**: Bidirectional binding with `RouteAtom.searchParams()`
- ✅ **Observability**: Built-in tracing, spans, and reactivity keys
- ✅ **Testability**: Layer-based dependency injection + mockable atoms
- ✅ **Portability**: Framework-agnostic core (Remix, Next.js, standalone)
- ✅ **Composability**: Middleware, services, and atoms as composable Effects
- ✅ **No prop drilling**: Components access data directly through atoms
- ✅ **Derived state**: Atoms compose to create automatic dependency graphs

**Key Innovation**: Atoms make Effect Meta truly reactive on the client-side, providing the best developer experience of any meta-framework while maintaining full type safety and composability.

**This could be the killer app that makes Effect the standard for full-stack TypeScript.**

---

**Discussion**: [Effect Discord #ideas](https://discord.gg/effect-ts)
**Feedback**: [GitHub Discussions](https://github.com/Effect-TS/effect/discussions) (TBD)
**Status**: Open for community input

---

_Last updated: 2025-09-30_
