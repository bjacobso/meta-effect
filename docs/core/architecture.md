# Effect Meta Architecture

[← Back to README](../../README.md) | [← Back to Overview](overview.md)

## Core Abstractions

### Route - Fundamental Unit

```typescript
interface Route<Path, Params, Data, Error, Deps> {
  path: Path;
  data: (params: Params) => Effect<Data, Error, Deps>;
  middleware: ReadonlyArray<Middleware<any, any, any>>;
  component: Component<{ data: Data; params: Params }>;
}
```

### Middleware - Composable Effects

```typescript
interface Middleware<Output, Error, Deps> {
  name: string;
  effect: (ctx: RequestContext) => Effect<Output, Error, Deps>;
}
```

### App - Composition Root

```typescript
interface App<Routes> {
  routes: Routes;
  layer: Layer<any, any, any>;
  toRemix(): RemixApp;
  toNext(): NextApp;
  toVite(): ViteApp;
}
```

## Request Lifecycle

1. **Request** → Parsed into `RequestContext`
2. **Middleware** → Composed as `Effect.flatMap` chain
3. **Route matching** → Type-safe params extraction
4. **Data loading** → Atoms fetch in parallel via `Effect.all`
5. **Rendering** → Server/client based on strategy
6. **Mutations** → Trigger atom updates via reactivity keys
7. **Error handling** → Typed errors through Effect channel

## Effect Runtime Integration

Effect Meta creates a fiber-per-request runtime for:

- Request-scoped services (session, tracing)
- Proper cancellation
- Isolated observability spans

## Rendering Strategies

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

## Atom Integration Architecture

### Server-Side Atom Hydration

```typescript
// Server renders initial atom state
const serverAtomState = await Meta.Atoms.renderToState(
  route.atoms,
  requestContext
);

// Serialize and embed in HTML
const html = renderToString(
  <Meta.AtomProvider initialState={serverAtomState}>
    <App />
  </Meta.AtomProvider>
);
```

### Client-Side Rehydration

```typescript
// Client picks up server state
const clientAtomState = Meta.Atoms.hydrateFromSSR(
  window.__ATOM_STATE__
);

// Atoms continue from server state
ReactDOM.hydrateRoot(
  document.getElementById("root"),
  <Meta.AtomProvider initialState={clientAtomState}>
    <App />
  </Meta.AtomProvider>
);
```

## Service Layer Architecture

### Layered Services

```typescript
// Base services
const DatabaseLayer = Layer.succeed(Database, pgClient);
const CacheLayer = Layer.succeed(Cache, redisClient);

// Application services
const UserServiceLayer = Layer.effect(
  UserService,
  Effect.gen(function* () {
    const db = yield* Database;
    const cache = yield* Cache;

    return UserService.of({
      findById: (id) =>
        cache.get(`user:${id}`).pipe(
          Effect.orElse(() =>
            db.query(`SELECT * FROM users WHERE id = $1`, [id]).pipe(
              Effect.tap((user) => cache.set(`user:${id}`, user))
            )
          )
        )
    });
  })
);

// Compose for app
const AppLayer = Layer.mergeAll(
  DatabaseLayer,
  CacheLayer,
  UserServiceLayer,
  SessionServiceLayer
);
```

## Data Flow Architecture

### Unidirectional Data Flow

```
User Action → Atom Update → Effect Execution → State Change → UI Update
     ↑                                                              ↓
     └──────────────── URL State Sync ←────────────────────────────┘
```

### Reactive Dependency Graph

```typescript
// Base atoms
const routeParamsAtom = RouteAtom.params();
const searchParamsAtom = RouteAtom.searchParams();

// Derived atoms form dependency graph
const userIdAtom = Atom.make(
  Effect.sync(() => get(routeParamsAtom).id)
);

const userDataAtom = Atom.make(
  Effect.gen(function* (get) {
    const userId = get(userIdAtom);
    return yield* UserService.findById(userId);
  })
);

const userPostsAtom = Atom.make(
  Effect.gen(function* (get) {
    const userId = get(userIdAtom);
    const filters = get(searchParamsAtom);
    return yield* PostService.findByUser(userId, filters);
  })
);
```

## Error Handling Architecture

### Typed Error Channels

```typescript
// Define error types
class NetworkError extends Data.TaggedClass("NetworkError")<{
  message: string;
  statusCode: number;
}> {}

class ValidationError extends Data.TaggedClass("ValidationError")<{
  field: string;
  message: string;
}> {}

// Routes handle specific errors
const UserRoute = Meta.Route.make({
  path: "/users/:id",
  data: (params) =>
    UserService.findById(params.id).pipe(
      Effect.catchTag("NetworkError", (e) =>
        Effect.succeed({ error: "Network issue, please retry" })
      ),
      Effect.catchTag("ValidationError", (e) =>
        Effect.succeed({ error: `Invalid ${e.field}` })
      )
    )
});
```

## Caching Architecture

### Multi-Level Caching

```typescript
// Browser cache
const browserCacheAtom = Atom.make(
  Effect.gen(function* () {
    return yield* BrowserCache.get(key).pipe(
      Effect.orElse(() => fetchAndCache())
    );
  })
);

// Server cache with TTL
const serverCache = Meta.Cache.make({
  ttl: Duration.minutes(5),
  staleWhileRevalidate: Duration.minutes(1),
  key: (params) => `route:${params.path}`,
});

// Edge cache
const edgeCache = Meta.EdgeCache.make({
  region: "global",
  ttl: Duration.hours(1),
});
```

## Observability Architecture

### Built-in Tracing

```typescript
const TracedRoute = Meta.Route.make({
  path: "/api/users",
  data: Effect.gen(function* () {
    // Automatic span creation
    return yield* Effect.withSpan("fetch-users")(
      UserService.findAll()
    );
  })
});

// Traces flow through system
/*
  request → middleware:auth → route:users → service:findAll → db:query
      ↓          ↓              ↓              ↓                ↓
    span       span           span           span             span
*/
```

## Deployment Architecture

### Platform Adapters

```typescript
// Deploy to different platforms with same code
const app = Meta.App.make({ routes, layer: AppLayer });

// Vercel
export default app.toVercel();

// Netlify
export const handler = app.toNetlify();

// Docker
app.toExpress().listen(3000);

// Cloudflare Workers
export default app.toCloudflare();
```

## Related Documents

- [Framework Overview](overview.md) - High-level introduction
- [Remix Vision](remix-vision.md) - Philosophy and principles
- [Technical RFC](../rfcs/effect-meta-rfc.md) - Complete specification