/**
 * Effect Loader Component
 *
 * Provides patterns for data loading in Remix using Effect services.
 * Handles parallel loading, error boundaries, and request-scoped services.
 *
 * @example
 * ```ts
 * import { effectLoader } from '~/lib/effect-remix/effect-loader'
 * import { UserService, PostService } from '~/services'
 *
 * export const loader = effectLoader({
 *   layer: AppLayer,
 *   handler: ({ params }) =>
 *     Effect.gen(function* () {
 *       // Parallel data loading
 *       const [user, posts] = yield* Effect.all([
 *         UserService.findById(params.id),
 *         PostService.findByAuthor(params.id)
 *       ], { concurrency: "unbounded" })
 *
 *       return { user, posts }
 *     })
 * })
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import type { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Effect, type Layer } from 'effect'

export interface EffectLoaderOptions<E, R, A> {
  /** The Layer to provide to the handler */
  layer: Layer.Layer<R, E, never>
  /** The Effect program to run */
  handler: (args: LoaderFunctionArgs) => Effect.Effect<A, E, R>
  /** Optional error handler */
  onError?: (error: E) => Response
}

/**
 * Create an Effect-powered Remix loader
 */
export function effectLoader<E, R, A>(
  options: EffectLoaderOptions<E, R, A>
) {
  const { layer, handler, onError } = options

  return async (args: LoaderFunctionArgs) => {
    return await Effect.runPromise(
      Effect.gen(function* () {
        const result = yield* handler(args)
        return json(result)
      }).pipe(
        Effect.catchAll((error) => {
          if (onError) {
            return Effect.succeed(onError(error))
          }
          // Default error handling
          return Effect.succeed(
            new Response('Internal Server Error', { status: 500 })
          )
        }),
        Effect.provide(layer)
      )
    )
  }
}

/**
 * Create a loader with typed error handling
 */
export function effectLoaderWithErrors<E, R, A>(
  options: EffectLoaderOptions<E, R, A> & {
    /** Map specific error types to HTTP responses */
    errorMap: Partial<Record<string, (error: any) => Response>>
  }
) {
  const { layer, handler, errorMap } = options

  return async (args: LoaderFunctionArgs) => {
    return await Effect.runPromise(
      Effect.gen(function* () {
        const result = yield* handler(args)
        return json(result)
      }).pipe(
        Effect.catchAll((error: any) => {
          // Check if we have a handler for this error type
          const errorHandler = errorMap[error._tag]
          if (errorHandler) {
            return Effect.succeed(errorHandler(error))
          }
          // Default fallback
          return Effect.succeed(
            new Response('Internal Server Error', { status: 500 })
          )
        }),
        Effect.provide(layer)
      )
    )
  }
}
