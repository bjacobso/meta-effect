/**
 * Simple JavaScript Expression Evaluator
 *
 * Minimal expression evaluator using JavaScript's Function() constructor.
 * SECURITY WARNING: Only use with trusted expressions or in development!
 * This evaluator can execute arbitrary JavaScript code.
 *
 * For production use with untrusted expressions, use expr-cel.ts instead.
 *
 * @example
 * ```ts
 * import { createSimpleEvaluator } from './lib/effect-expressions/expr-simple'
 * import { ExpressionEvaluator } from './lib/effect-expressions/expr-service'
 * import { Effect } from 'effect'
 *
 * const evaluator = createSimpleEvaluator({
 *   allowedGlobals: ["Math", "Date"],
 *   timeout: 1000
 * })
 *
 * const program = Effect.gen(function*() {
 *   // Simple boolean condition
 *   const result = yield* evaluator.evalBoolean(
 *     "age >= 18 && country == 'US'",
 *     { age: 25, country: "US" }
 *   )
 *   // result: true
 *
 *   // Arithmetic with Math
 *   const max = yield* evaluator.eval(
 *     "Math.max(a, b) + 10",
 *     { a: 5, b: 8 }
 *   )
 *   // max: 18
 * }).pipe(
 *   Effect.provideService(ExpressionEvaluator, evaluator)
 * )
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { Effect } from "effect"
import { ExpressionError, type CompiledExpression } from "./expr-service.js"

export interface SimpleEvaluatorConfig {
  readonly allowedGlobals?: readonly string[]
  readonly timeout?: number
}

/**
 * Create a simple JavaScript expression evaluator
 *
 * @param config Configuration options
 * @returns ExpressionEvaluator implementation
 */
export const createSimpleEvaluator = (config?: SimpleEvaluatorConfig) => {
  const allowedGlobals = config?.allowedGlobals ?? []
  const timeout = config?.timeout ?? 1000

  const createFunction = (
    expr: string,
    params: string[],
  ): Effect.Effect<Function, ExpressionError> =>
    Effect.try({
      try: () => new Function(...params, `return (${expr})`),
      catch: (error) =>
        new ExpressionError({
          reason: "syntax_error",
          message: String(error),
          expression: expr,
        }),
    })

  return {
    evalBoolean: (expr: string, context: Record<string, unknown>) =>
      Effect.gen(function* () {
        const params = Object.keys(context)
        const values = Object.values(context)
        const fn = yield* createFunction(`!!(${expr})`, params)
        const result = yield* Effect.try({
          try: () => fn(...values),
          catch: (error) =>
            new ExpressionError({
              reason: "runtime_error",
              message: String(error),
              expression: expr,
            }),
        })
        return result as boolean
      }),

    eval: <A>(expr: string, context: Record<string, unknown>) =>
      Effect.gen(function* () {
        const params = Object.keys(context)
        const values = Object.values(context)
        const fn = yield* createFunction(expr, params)
        const result = yield* Effect.try({
          try: () => fn(...values),
          catch: (error) =>
            new ExpressionError({
              reason: "runtime_error",
              message: String(error),
              expression: expr,
            }),
        })
        return result as A
      }),

    compile: <A>(expr: string) =>
      Effect.sync(
        (): CompiledExpression<A> => ({
          evaluate: (context: Record<string, unknown>) =>
            Effect.gen(function* () {
              const params = Object.keys(context)
              const values = Object.values(context)
              const fn = yield* createFunction(expr, params)
              const result = yield* Effect.try({
                try: () => fn(...values),
                catch: (error) =>
                  new ExpressionError({
                    reason: "runtime_error",
                    message: String(error),
                    expression: expr,
                  }),
              })
              return result as A
            }),
        }),
      ),
  } as const
}
