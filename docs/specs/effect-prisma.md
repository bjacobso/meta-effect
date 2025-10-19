# Effect Prisma Specification

**Status**: ✅ Implemented
**Components**: 2 (~215 lines total)
**Category**: Database Integration

## Overview

Effect Prisma provides vendorable components for integrating Prisma ORM with Effect-TS applications. These components wrap Prisma Client in Effect services with automatic error handling, transaction support, and composability with other Effect services.

## Philosophy

Prisma is already a great database toolkit with type-safety and excellent DX. Effect Prisma doesn't replace Prisma - it wraps it in Effect's composable service pattern, enabling:

1. **Effect-First Architecture**: Database operations as Effect values
2. **Automatic Error Handling**: Type-safe error handling with `DbError`
3. **Transaction Support**: Simple and advanced transaction patterns
4. **Service Composition**: Compose database operations with other Effect services
5. **Zero Magic**: All behavior visible in ~100 lines per component

## Components

### 1. db-client (~105 lines)

**Purpose**: Basic Prisma Client wrapper with Effect services

**Key Features**:
- Wraps `PrismaClient` in Effect `Context.Tag`
- Provides `use()` and `useWithError()` methods
- Simple transaction support via `withTransaction()`
- Type-safe `DbError` for error handling

**API**:
```typescript
class DbClient {
  static layer: (client: PrismaClient) => Layer<DbClient>

  // Service methods
  use: <A>(f: (client: PrismaClient) => Promise<A>) => Effect<A>
  useWithError: <A>(f: (client: PrismaClient) => Promise<A>) => Effect<A, DbError>
  withTransaction: <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E | DbError, R>
}
```

**Example**:
```typescript
import { PrismaClient } from '@prisma/client'
import { DbClient } from '~/lib/effect-prisma/db-client'

const prisma = new PrismaClient()
const DbLive = DbClient.layer(prisma)

// Simple query
const getUser = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DbClient
    return yield* db.use((client) =>
      client.user.findUnique({ where: { id } })
    )
  }).pipe(Effect.provide(DbLive))

// With transaction
const transferFunds = (from: string, to: string, amount: number) =>
  Effect.gen(function* () {
    const db = yield* DbClient
    return yield* db.withTransaction(
      Effect.gen(function* () {
        const db = yield* DbClient
        yield* db.use((client) =>
          client.account.update({
            where: { id: from },
            data: { balance: { decrement: amount } }
          })
        )
        yield* db.use((client) =>
          client.account.update({
            where: { id: to },
            data: { balance: { increment: amount } }
          })
        )
      })
    )
  }).pipe(Effect.provide(DbLive))
```

**When to Use**:
- Standard Prisma operations wrapped in Effect
- Simple transaction requirements
- Basic error handling needs

**Lines**: ~105

---

### 2. db-transaction (~110 lines)

**Purpose**: Advanced transaction patterns with nested transaction support

**Key Features**:
- Prisma interactive transaction API support
- Nested transaction detection (reuses parent transaction)
- Manual transaction lifecycle with `Scope`
- Automatic commit/rollback via finalizers
- Transaction UUID for logging/tracing

**API**:
```typescript
class DbClient {
  static layer: (client: PrismaClient) => Layer<DbClient>

  use: <A>(f: (client: PrismaClient) => Promise<A>) => Effect<A>
  withTransaction: <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E | DbError, R>
}

class TransactionConnection extends Context.Tag {
  uuid: string
  client: PrismaClient
  scope: Scope.CloseableScope
}
```

**Example**:
```typescript
import { PrismaClient } from '@prisma/client'
import { DbClient } from '~/lib/effect-prisma/db-transaction'

// Requires Prisma Client Extensions for $begin, $commit, $rollback
const prisma = new PrismaClient().$extends({
  client: {
    async $begin(options?: { timeout?: number }) {
      // Interactive transaction implementation
    },
    async $commit() { /* ... */ },
    async $rollback() { /* ... */ }
  }
})

// Nested transactions
const complexOperation = Effect.gen(function* () {
  const db = yield* DbClient

  return yield* db.withTransaction(
    Effect.gen(function* () {
      const db = yield* DbClient
      // First operation
      yield* db.use((client) => client.user.create({ data: { ... } }))

      // Nested transaction (reuses parent)
      yield* db.withTransaction(
        Effect.gen(function* () {
          const db = yield* DbClient
          yield* db.use((client) => client.post.create({ data: { ... } }))
        })
      )
    })
  )
})
```

**When to Use**:
- Complex transaction requirements
- Need nested transaction support
- Manual transaction control needed
- Transaction logging/tracing required

**Requires**: Prisma Client Extensions for interactive transaction API

**Lines**: ~110

---

## Common Patterns

### Pattern 1: Repository Service

Create domain-specific repository services that depend on `DbClient`:

```typescript
import { Effect, Context, Layer } from 'effect'
import { DbClient } from '~/lib/effect-prisma/db-client'

export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    findById: (id: string) => Effect.Effect<User | null, DbError>
    create: (data: CreateUserData) => Effect.Effect<User, DbError>
  }
>() {
  static Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const db = yield* DbClient

      return {
        findById: (id: string) =>
          db.use((client) => client.user.findUnique({ where: { id } })),

        create: (data: CreateUserData) =>
          db.use((client) => client.user.create({ data }))
      }
    })
  )
}

// Compose layers
const AppLive = Layer.mergeAll(
  DbClient.layer(prisma),
  UserRepository.Live
)
```

### Pattern 2: Cross-Cutting Concerns

Add logging, metrics, or caching to database operations:

```typescript
const withLogging = <A, E, R>(
  label: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> =>
  effect.pipe(
    Effect.tap(() => Effect.log(`${label}: started`)),
    Effect.tapError((e) => Effect.logError(`${label}: failed`, e)),
    Effect.tap((result) => Effect.log(`${label}: completed`))
  )

const getUser = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DbClient
    return yield* withLogging(
      `getUser(${id})`,
      db.use((client) => client.user.findUnique({ where: { id } }))
    )
  })
```

### Pattern 3: Error Discrimination

Handle specific Prisma errors differently:

```typescript
import { Predicate } from 'effect'

const handleNotFound = <A>(
  effect: Effect.Effect<A | null, DbError>
): Effect.Effect<A, DbError | NotFoundError> =>
  effect.pipe(
    Effect.flatMap((result) =>
      result === null
        ? Effect.fail(new NotFoundError())
        : Effect.succeed(result)
    )
  )

const getUser = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DbClient
    return yield* handleNotFound(
      db.use((client) => client.user.findUnique({ where: { id } }))
    )
  })
```

## Integration with Frameworks

### With Remix

```typescript
import { withEffect } from '~/lib/effect-remix/with-effect'
import { DbClient } from '~/lib/effect-prisma/db-client'

const DbLive = DbClient.layer(prisma)

export const loader = withEffect(DbLive, ({ params }) =>
  Effect.gen(function* () {
    const db = yield* DbClient
    const user = yield* db.use((client) =>
      client.user.findUnique({ where: { id: params.id } })
    )
    return { user }
  })
)
```

### With Vite + HttpApi

```typescript
import { HttpApiBuilder } from '@effect/platform'
import { DbClient } from '~/lib/effect-prisma/db-client'

const UserApiLive = HttpApiBuilder.group(UserApi, "users", (handlers) =>
  handlers
    .handle("getById", ({ path }) =>
      Effect.gen(function* () {
        const db = yield* DbClient
        return yield* db.use((client) =>
          client.user.findUnique({ where: { id: path.id } })
        )
      })
    )
).pipe(Layer.provide(DbClient.layer(prisma)))
```

## Customization Examples

### Add Query Caching

```typescript
// After vendoring db-client.ts, add:
import { Cache, Duration } from 'effect'

const makeCachedDbService = (client: PrismaClient) => {
  const cache = Cache.make({
    capacity: 1000,
    timeToLive: Duration.minutes(5)
  })

  const useWithCache = <A>(
    key: string,
    f: (client: PrismaClient) => Promise<A>
  ) =>
    Effect.gen(function* () {
      const c = yield* cache
      return yield* c.getOrElse(key, () =>
        Effect.tryPromise({
          try: () => f(client),
          catch: (e) => new DbError({ message: String(e), cause: e })
        })
      )
    })

  return { ...makeDbService(client), useWithCache }
}
```

### Add Retry Logic

```typescript
// After vendoring, wrap operations with retry policy
import { Schedule } from 'effect'

const useWithRetry = <A>(
  f: (client: PrismaClient) => Promise<A>
) =>
  use(f).pipe(
    Effect.retry(
      Schedule.exponential(Duration.millis(100)).pipe(
        Schedule.upTo(Duration.seconds(5))
      )
    )
  )
```

## Dependencies

### Required
- `effect` - Core Effect library
- `@prisma/client` - Prisma ORM client

### Peer
- Prisma schema defined in your project
- Generated Prisma Client types

## Migration from Old Patterns

### From Raw Prisma

**Before**:
```typescript
const getUser = async (id: string) => {
  try {
    return await prisma.user.findUnique({ where: { id } })
  } catch (e) {
    throw new Error('Database error')
  }
}
```

**After**:
```typescript
const getUser = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DbClient
    return yield* db.use((client) =>
      client.user.findUnique({ where: { id } })
    )
  })
```

### From Callback-Based Transaction

**Before**:
```typescript
await prisma.$transaction(async (tx) => {
  await tx.account.update({ where: { id: from }, data: { ... } })
  await tx.account.update({ where: { id: to }, data: { ... } })
})
```

**After**:
```typescript
yield* db.withTransaction(
  Effect.gen(function* () {
    const db = yield* DbClient
    yield* db.use((client) => client.account.update({ ... }))
    yield* db.use((client) => client.account.update({ ... }))
  })
)
```

## Roadmap

- [ ] Add connection pool management component
- [ ] Add query builder helpers with Schema validation
- [ ] Add migration runner integration
- [ ] Add seed data utilities
- [ ] Document Prisma Middleware integration patterns
- [ ] Add read replica support component

## References

- [Prisma Docs](https://www.prisma.io/docs)
- [Effect Service Pattern](https://effect.website/docs/guides/context-management/services)
- [Effect Error Handling](https://effect.website/docs/guides/error-management)
- [Prisma Interactive Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions#interactive-transactions-api)
