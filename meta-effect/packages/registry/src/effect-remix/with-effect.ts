/**
 * Remix with Effect Component
 *
 * Helper utilities for composing Effect services with Remix loaders and actions.
 * Provides a clean way to run Effect programs in Remix route handlers with
 * automatic Layer provision and error handling.
 *
 * @example
 * ```ts
 * // routes/users.$id.tsx
 * import { withEffect } from '~/lib/effect-remix/with-effect'
 * import { UserService } from '~/services/UserService'
 * import { AppLayer } from '~/server/layer'
 *
 * export const loader = withEffect(AppLayer, ({ params }) =>
 *   Effect.gen(function* () {
 *     const user = yield* UserService.findById(params.id)
 *     return { user }
 *   })
 * )
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node'
import { Effect, type Layer } from 'effect'

/**
 * Wrap a Remix loader with Effect runtime
 */
export function withEffect<E, R, A>(
  layer: Layer.Layer<R, E, never>,
  fn: (args: LoaderFunctionArgs) => Effect.Effect<A, E, R>
) {
  return async (args: LoaderFunctionArgs) => {
    return await Effect.runPromise(
      fn(args).pipe(Effect.provide(layer))
    )
  }
}

/**
 * Wrap a Remix action with Effect runtime
 */
export function withEffectAction<E, R, A>(
  layer: Layer.Layer<R, E, never>,
  fn: (args: ActionFunctionArgs) => Effect.Effect<A, E, R>
) {
  return async (args: ActionFunctionArgs) => {
    return await Effect.runPromise(
      fn(args).pipe(Effect.provide(layer))
    )
  }
}

/**
 * Create a loader that provides a request-scoped context
 */
export function withRequestContext<E, R, A>(
  layer: Layer.Layer<R, E, never>,
  fn: (args: LoaderFunctionArgs, context: RequestContext) => Effect.Effect<A, E, R>
) {
  return async (args: LoaderFunctionArgs) => {
    const context: RequestContext = {
      request: args.request,
      params: args.params,
      url: new URL(args.request.url)
    }

    return await Effect.runPromise(
      fn(args, context).pipe(Effect.provide(layer))
    )
  }
}

/**
 * Request context available in loaders/actions
 */
export interface RequestContext {
  request: Request
  params: Record<string, string | undefined>
  url: URL
}
