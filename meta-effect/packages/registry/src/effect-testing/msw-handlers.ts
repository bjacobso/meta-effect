/**
 * MSW API Handlers
 *
 * Type-safe Mock Service Worker handlers generated from Effect HttpApi definitions.
 * Provides automatic request validation, response mocking, and Effect service integration
 * for testing API clients without real network calls.
 *
 * @example
 * ```ts
 * import { http, HttpResponse } from 'msw'
 * import { setupServer } from 'msw/node'
 * import { createMswHandler, mockEffect } from './lib/effect-testing/msw-handlers'
 * import { TodosApiGroup, Todo, TodoNotFound } from './api'
 *
 * // Create handlers from your HttpApi
 * const handlers = [
 *   createMswHandler(TodosApiGroup, 'getAllTodos', () =>
 *     Effect.succeed([
 *       new Todo({ id: 1, text: 'Test todo', done: false })
 *     ])
 *   ),
 *
 *   createMswHandler(TodosApiGroup, 'getTodoById', ({ pathParams }) =>
 *     pathParams.id === 1
 *       ? Effect.succeed(new Todo({ id: 1, text: 'Test todo', done: false }))
 *       : Effect.fail(new TodoNotFound({ id: pathParams.id }))
 *   )
 * ]
 *
 * const server = setupServer(...handlers)
 * server.listen()
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { http, HttpResponse, type HttpHandler } from 'msw'
import { Effect, Schema } from 'effect'
import type { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'

/**
 * Extract path parameters from MSW request params
 */
type PathParams<E> = E extends HttpApiEndpoint.HttpApiEndpoint<
  any,
  any,
  infer Path,
  any,
  any,
  any,
  any,
  any
>
  ? Path extends Schema.Schema<infer A, any, any>
    ? A
    : Record<string, string>
  : Record<string, string>

/**
 * Extract payload type from endpoint
 */
type Payload<E> = E extends HttpApiEndpoint.HttpApiEndpoint<
  any,
  any,
  any,
  any,
  any,
  infer P,
  any,
  any
>
  ? P extends Schema.Schema<infer A, any, any>
    ? A
    : never
  : never

/**
 * Handler context passed to mock implementations
 */
export interface MockContext<E> {
  pathParams: PathParams<E>
  request: Request
  url: URL
}

/**
 * Create an MSW handler from an HttpApi endpoint
 */
export function createMswHandler<
  G extends HttpApiGroup.HttpApiGroup<any, any, any, any>,
  Name extends keyof G['endpoints']
>(
  group: G,
  endpointName: Name,
  handler: (
    ctx: MockContext<G['endpoints'][Name]> & {
      payload?: Payload<G['endpoints'][Name]>
    }
  ) => Effect.Effect<any, any, never>
): HttpHandler {
  const endpoints = group.endpoints as Record<string, any>
  const endpoint = endpoints[endpointName as string]
  const path = endpoint.path
  const method = endpoint.method.toLowerCase()

  const mswMethod = http[method as keyof typeof http] as typeof http.get

  return mswMethod(path, async ({ request, params }: { request: Request; params: Record<string, string> }) => {
    const url = new URL(request.url)

    // Parse payload if present
    let payload: any = undefined
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        payload = await request.json()
      } catch {
        // No payload or invalid JSON
      }
    }

    const ctx = {
      pathParams: params as any,
      request,
      url,
      payload
    }

    // Run the Effect handler
    const result = await Effect.runPromise(
      handler(ctx).pipe(
        Effect.catchAll((error) =>
          Effect.succeed({
            _tag: 'Error' as const,
            error
          })
        )
      )
    )

    // Handle errors
    if (typeof result === 'object' && result !== null && '_tag' in result && result._tag === 'Error') {
      const error = (result as any).error

      // Check if it's a Schema tagged error with status
      const status = error.status ?? 500
      return HttpResponse.json(
        { error: error.message ?? 'Internal Server Error', details: error },
        { status }
      )
    }

    // Return successful response
    return HttpResponse.json(result)
  })
}

/**
 * Helper to run an Effect and return a mock response
 * Useful for inline handlers without group context
 */
export function mockEffect<A, E>(
  effect: Effect.Effect<A, E, never>
): Promise<Response> {
  return Effect.runPromise(
    effect.pipe(
      Effect.map((data) => HttpResponse.json(data)),
      Effect.catchAll((error: any) =>
        Effect.succeed(
          HttpResponse.json(
            { error: error.message ?? 'Error', details: error },
            { status: error.status ?? 500 }
          )
        )
      )
    )
  )
}
