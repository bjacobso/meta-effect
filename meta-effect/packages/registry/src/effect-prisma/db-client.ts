/**
 * Prisma with Effect Component
 *
 * Wraps Prisma Client in Effect services with automatic error handling and
 * transaction support. Provides a clean way to compose database operations
 * with other Effect services.
 *
 * @example
 * ```ts
 * import { PrismaClient } from '@prisma/client'
 * import { DbClient } from '~/lib/effect-prisma/db-client'
 *
 * const prisma = new PrismaClient()
 *
 * // Define your Layer
 * const DbLive = DbClient.layer(prisma)
 *
 * // Use in your Effect programs
 * const getUser = (id: string) =>
 *   Effect.gen(function* () {
 *     const db = yield* DbClient
 *     return yield* db.use((client) => client.user.findUnique({ where: { id } }))
 *   })
 *
 * // With transactions
 * const transferFunds = (from: string, to: string, amount: number) =>
 *   Effect.gen(function* () {
 *     const db = yield* DbClient
 *     return yield* db.withTransaction(
 *       Effect.gen(function* () {
 *         const db = yield* DbClient
 *         yield* db.use((client) =>
 *           client.account.update({
 *             where: { id: from },
 *             data: { balance: { decrement: amount } }
 *           })
 *         )
 *         yield* db.use((client) =>
 *           client.account.update({
 *             where: { id: to },
 *             data: { balance: { increment: amount } }
 *           })
 *         )
 *       })
 *     )
 *   }).pipe(Effect.provide(DbLive))
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { Context, Effect, Layer, Schema, Scope, Exit } from "effect"
import type { PrismaClient } from "@prisma/client"

export class DbError extends Schema.TaggedError<DbError>()("DbError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}

type DbClient = PrismaClient
type DbTxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use">

const makeDbService = <C extends DbClient>(client: C) => {
  /**
   * Execute a Prisma operation and map errors to DbError
   */
  const useWithError = <A>(
    f: (client: C) => Promise<A>
  ): Effect.Effect<A, DbError> =>
    Effect.tryPromise({
      try: () => f(client),
      catch: (e) =>
        new DbError({
          message: e instanceof Error ? e.message : "Database Error",
          cause: e,
        }),
    })

  /**
   * Execute a Prisma operation (throws on error)
   */
  const use = <A>(f: (client: C) => Promise<A>): Effect.Effect<A> =>
    useWithError(f).pipe(Effect.catchTag("DbError", Effect.die))

  /**
   * Run operations in a transaction
   */
  const withTransaction = <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | DbError, R> =>
    Effect.gen(function* () {
      // Use Prisma's interactive transaction API
      return yield* Effect.tryPromise({
        try: () =>
          client.$transaction(async (tx) => {
            // Provide the transaction client to the effect
            const txLayer = DbClient.layer(tx as C)
            return await Effect.runPromise(effect.pipe(Effect.provide(txLayer)))
          }),
        catch: (e) =>
          new DbError({
            message: e instanceof Error ? e.message : "Transaction Error",
            cause: e,
          }),
      })
    })

  return { client, use, useWithError, withTransaction } as const
}

export class DbClient extends Context.Tag("DbClient")<
  DbClient,
  ReturnType<typeof makeDbService>
>() {
  static layer = <C extends DbClient>(client: C) =>
    Layer.succeed(this, makeDbService(client))
}
