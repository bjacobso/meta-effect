/**
 * Advanced Prisma Transaction Component
 *
 * Demonstrates advanced transaction patterns with Prisma's interactive transaction
 * API, including nested transaction support, manual commit/rollback, and scoped
 * transaction lifecycle.
 *
 * Requires Prisma Client Extensions for $begin, $commit, $rollback.
 * See: https://www.prisma.io/docs/orm/prisma-client/queries/transactions#interactive-transactions-api
 *
 * @example
 * ```ts
 * import { PrismaClient } from '@prisma/client'
 * import { DbClient } from '~/lib/effect-prisma/db-transaction'
 *
 * const prisma = new PrismaClient().$extends({
 *   client: {
 *     $begin: () => prisma.$transaction({ timeout: 5000 }),
 *     // Add $commit and $rollback via extension
 *   }
 * })
 *
 * // Nested transactions with automatic rollback
 * const complexOperation = Effect.gen(function* () {
 *   const db = yield* DbClient
 *
 *   return yield* db.withTransaction(
 *     Effect.gen(function* () {
 *       const db = yield* DbClient
 *       // Operations here use transaction client
 *       yield* db.use((client) => client.user.create({ data: { ... } }))
 *
 *       // Nested transaction reuses parent
 *       yield* db.withTransaction(
 *         Effect.gen(function* () {
 *           const db = yield* DbClient
 *           yield* db.use((client) => client.post.create({ data: { ... } }))
 *         })
 *       )
 *     })
 *   )
 * })
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { Context, Effect, Layer, Schema, Scope, Exit, Option } from "effect"
import type { PrismaClient } from "@prisma/client"

export class DbError extends Schema.TaggedError<DbError>()("DbError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}

type DbClient = PrismaClient & {
  $begin?: (options?: { timeout?: number; maxWait?: number }) => Promise<any>
  $commit?: () => Promise<void>
  $rollback?: () => Promise<void>
}

interface TransactionContext {
  uuid: string
  client: DbClient
  scope: Scope.CloseableScope
}

export class TransactionConnection extends Context.Tag("TransactionConnection")<
  TransactionConnection,
  TransactionContext
>() {}

const makeDbService = (client: DbClient) => {
  const use = <A>(f: (client: DbClient) => Promise<A>): Effect.Effect<A> =>
    Effect.tryPromise({
      try: () => f(client),
      catch: (e) =>
        new DbError({
          message: e instanceof Error ? e.message : "Database Error",
          cause: e,
        }),
    }).pipe(Effect.catchTag("DbError", Effect.die))

  const withTransaction = <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | DbError, R> =>
    Effect.gen(function* () {
      // Check if already in transaction
      const existingTx = yield* Effect.serviceOption(TransactionConnection)
      if (Option.isSome(existingTx)) {
        return yield* effect
      }

      // Create new transaction
      const scope = yield* Scope.make()
      const txClient = yield* Effect.tryPromise({
        try: () => client.$begin!({ timeout: 5000, maxWait: 5000 }),
        catch: (e) =>
          new DbError({
            message: e instanceof Error ? e.message : "Transaction start failed",
            cause: e,
          }),
      })

      const txContext: TransactionContext = {
        uuid: crypto.randomUUID(),
        client: txClient,
        scope,
      }

      // Add finalizer for commit/rollback
      yield* Effect.addFinalizer((exit) =>
        Effect.gen(function* () {
          if (Exit.isSuccess(exit)) {
            yield* Effect.tryPromise(() => txClient.$commit!())
          } else {
            yield* Effect.tryPromise(() => txClient.$rollback!())
          }
          yield* Scope.close(scope, exit)
        }).pipe(Effect.catchAll(() => Effect.void))
      )

      // Run effect with transaction context
      return yield* effect.pipe(
        Effect.provideService(DbClient, makeDbService(txClient)),
        Effect.provideService(TransactionConnection, txContext),
        Effect.annotateLogs({ transaction: txContext.uuid })
      )
    }).pipe(Effect.scoped)

  return { client, use, withTransaction } as const
}

export class DbClient extends Context.Tag("DbClient")<
  DbClient,
  ReturnType<typeof makeDbService>
>() {
  static layer = (client: DbClient) => Layer.succeed(this, makeDbService(client))
}
