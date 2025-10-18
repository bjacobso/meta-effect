/**
 * Effect Action Component
 *
 * Provides patterns for handling form actions in Remix using Effect services.
 * Includes Schema validation, typed errors, and automatic error responses.
 *
 * @example
 * ```ts
 * import { effectAction } from '~/lib/effect-remix/effect-action'
 * import { CreateUserSchema } from '~/schemas/user'
 * import { UserService } from '~/services'
 *
 * export const action = effectAction({
 *   layer: AppLayer,
 *   schema: CreateUserSchema,
 *   handler: ({ validated }) =>
 *     Effect.gen(function* () {
 *       const user = yield* UserService.create(validated)
 *       return redirect(`/users/${user.id}`)
 *     })
 * })
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import type { ActionFunctionArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Effect, type Layer, Schema } from 'effect'

export interface EffectActionOptions<I, E, R, A> {
  /** The Layer to provide to the handler */
  layer: Layer.Layer<R, E, never>
  /** Schema for validating form data */
  schema: Schema.Schema<I, any, never>
  /** The Effect program to run with validated data */
  handler: (args: { validated: I; request: Request; params: any }) => Effect.Effect<A, E, R>
}

/**
 * Create an Effect-powered Remix action with schema validation
 */
export function effectAction<I, E, R, A>(
  options: EffectActionOptions<I, E, R, A>
) {
  const { layer, schema, handler } = options

  return async (args: ActionFunctionArgs) => {
    return await Effect.runPromise(
      Effect.gen(function* () {
        // Parse form data
        const formData = yield* Effect.promise(() => args.request.formData())
        const data = Object.fromEntries(formData)

        // Validate with Effect Schema
        const validated = yield* Schema.decode(schema)(data)

        // Run handler with validated data
        const result = yield* handler({
          validated,
          request: args.request,
          params: args.params
        })

        return result
      }).pipe(
        Effect.catchTag('ParseError', (error) =>
          Effect.succeed(
            json(
              { errors: error.message, values: {} },
              { status: 400 }
            )
          )
        ),
        Effect.provide(layer)
      )
    )
  }
}

/**
 * Create an action without schema validation (for DELETE, etc.)
 */
export function effectActionSimple<E, R, A>(
  options: {
    layer: Layer.Layer<R, E, never>
    handler: (args: ActionFunctionArgs) => Effect.Effect<A, E, R>
  }
) {
  const { layer, handler } = options

  return async (args: ActionFunctionArgs) => {
    return await Effect.runPromise(
      handler(args).pipe(Effect.provide(layer))
    )
  }
}

/**
 * Helper for progressive enhancement - returns either Response or data
 */
export function enhancedResponse<T>(data: T): Response | T {
  // In a real implementation, check if request has JavaScript enabled
  // For now, always return JSON
  return json(data)
}
