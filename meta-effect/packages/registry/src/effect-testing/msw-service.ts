/**
 * MSW Service Layer
 *
 * Effect Service wrapper for Mock Service Worker lifecycle and configuration.
 * Provides a composable way to manage MSW server setup, teardown, and handler
 * management within Effect test suites.
 *
 * @example
 * ```ts
 * import { setupServer } from 'msw/node'
 * import { describe, it, beforeAll, afterAll } from 'vitest'
 * import { Effect } from 'effect'
 * import { MswService } from './lib/effect-testing/msw-service'
 * import { handlers } from './test/handlers'
 *
 * describe('API tests', () => {
 *   const server = setupServer(...handlers)
 *
 *   beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
 *   afterAll(() => server.close())
 *
 *   it.effect('should fetch users', () =>
 *     Effect.gen(function* () {
 *       const msw = yield* MswService
 *       yield* msw.resetHandlers()
 *
 *       // Your test logic here
 *       const response = yield* Effect.promise(() => fetch('/users'))
 *       const users = yield* Effect.promise(() => response.json())
 *
 *       expect(users).toHaveLength(2)
 *     }).pipe(
 *       Effect.provide(MswService.layer(server))
 *     )
 *   )
 * })
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { Effect, Context, Layer } from 'effect'
import type { SetupServer } from 'msw/node'
import type { HttpHandler } from 'msw'

/**
 * MSW Service interface
 */
export class MswService extends Context.Tag('MswService')<
  MswService,
  {
    readonly server: SetupServer
    readonly use: (...handlers: HttpHandler[]) => Effect.Effect<void>
    readonly resetHandlers: (...handlers: HttpHandler[]) => Effect.Effect<void>
    readonly restoreHandlers: () => Effect.Effect<void>
    readonly close: () => Effect.Effect<void>
  }
>() {
  /**
   * Create a Layer from an MSW server instance
   */
  static layer(server: SetupServer): Layer.Layer<MswService> {
    return Layer.succeed(
      MswService,
      MswService.of({
        server,
        use: (...handlers) =>
          Effect.sync(() => {
            server.use(...handlers)
          }),
        resetHandlers: (...handlers) =>
          Effect.sync(() => {
            server.resetHandlers(...handlers)
          }),
        restoreHandlers: () =>
          Effect.sync(() => {
            server.restoreHandlers()
          }),
        close: () =>
          Effect.sync(() => {
            server.close()
          })
      })
    )
  }

  /**
   * Create a scoped Layer that automatically starts and stops the server
   */
  static scopedLayer(
    server: SetupServer,
    options?: { onUnhandledRequest?: 'error' | 'warn' | 'bypass' }
  ): Layer.Layer<MswService> {
    return Layer.scoped(
      MswService,
      Effect.acquireRelease(
        Effect.sync(() => {
          server.listen(options)
          return MswService.of({
            server,
            use: (...handlers) =>
              Effect.sync(() => {
                server.use(...handlers)
              }),
            resetHandlers: (...handlers) =>
              Effect.sync(() => {
                server.resetHandlers(...handlers)
              }),
            restoreHandlers: () =>
              Effect.sync(() => {
                server.restoreHandlers()
              }),
            close: () =>
              Effect.sync(() => {
                server.close()
              })
          })
        }),
        (service) => service.close()
      )
    )
  }
}
