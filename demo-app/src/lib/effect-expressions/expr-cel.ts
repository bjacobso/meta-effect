/**
 * CEL (Common Expression Language) Evaluator
 *
 * Production-grade expression evaluator using CEL for sandboxed, deterministic
 * expression evaluation. Safe for untrusted expressions with built-in resource
 * limits and no access to system resources.
 *
 * CEL is an industry standard used by Google Cloud, Kubernetes, and others.
 *
 * @example
 * ```ts
 * import { createCELEvaluator } from './lib/effect-expressions/expr-cel'
 * import { ExpressionEvaluator } from './lib/effect-expressions/expr-service'
 * import { Effect } from 'effect'
 *
 * const evaluator = createCELEvaluator()
 *
 * const program = Effect.gen(function*() {
 *   // Boolean conditions
 *   const result = yield* evaluator.evalBoolean(
 *     "user.age >= 18 && user.country == 'US'",
 *     { user: { age: 25, country: "US" } }
 *   )
 *   // result: true
 *
 *   // Collection operations with has() macro
 *   const hasRole = yield* evaluator.evalBoolean(
 *     "has(user.roles) && 'admin' in user.roles",
 *     { user: { roles: ['admin', 'user'] } }
 *   )
 *   // hasRole: true
 *
 *   // Arithmetic and comparisons
 *   const discounted = yield* evaluator.eval(
 *     "price * (1.0 - discount)",
 *     { price: 100, discount: 0.2 }
 *   )
 *   // discounted: 80
 * }).pipe(
 *   Effect.provideService(ExpressionEvaluator, evaluator)
 * )
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { Effect } from "effect"
import { evaluate, parse, Environment } from "@marcbachmann/cel-js"
import { ExpressionError, type CompiledExpression } from "./expr-service.js"

export interface CELExtension {
  readonly name: string
  readonly signature: string
  readonly impl: (...args: any[]) => any
}

export interface CELEvaluatorConfig {
  readonly extensions?: readonly CELExtension[]
}

/**
 * Create a CEL expression evaluator with optional custom extensions
 *
 * Requires @marcbachmann/cel-js dependency:
 * ```bash
 * pnpm add @marcbachmann/cel-js
 * ```
 *
 * @param config Configuration options
 * @returns ExpressionEvaluator implementation
 */
export const createCELEvaluator = (config?: CELEvaluatorConfig) => {
  const env = config?.extensions
    ? (() => {
        const e = new Environment()
        for (const ext of config.extensions) {
          e.registerFunction(ext.signature, ext.impl)
        }
        return e
      })()
    : undefined

  return {
    evalBoolean: (expr: string, context: Record<string, unknown>) =>
      Effect.try({
        try: () => {
          const result = env ? env.evaluate(expr, context) : evaluate(expr, context)
          return Boolean(result)
        },
        catch: (error: any) =>
          new ExpressionError({
            reason: error.name === "SyntaxError" ? "syntax_error" : "runtime_error",
            message: String(error.message || error),
            expression: expr,
            details: error,
          }),
      }),

    eval: <A>(expr: string, context: Record<string, unknown>) =>
      Effect.try({
        try: () => {
          const result = env ? env.evaluate(expr, context) : evaluate(expr, context)
          return result as A
        },
        catch: (error: any) =>
          new ExpressionError({
            reason: error.name === "SyntaxError" ? "syntax_error" : "runtime_error",
            message: String(error.message || error),
            expression: expr,
            details: error,
          }),
      }),

    compile: <A>(expr: string) =>
      Effect.try({
        try: (): CompiledExpression<A> => {
          // Parse to validate syntax, but we'll re-evaluate each time
          // since the AST format may not be directly reusable
          if (env) {
            env.parse(expr)
          } else {
            parse(expr)
          }

          return {
            evaluate: (context: Record<string, unknown>) =>
              Effect.try({
                try: () => {
                  const result = env ? env.evaluate(expr, context) : evaluate(expr, context)
                  return result as A
                },
                catch: (error: any) =>
                  new ExpressionError({
                    reason: "runtime_error",
                    message: String(error.message || error),
                    expression: expr,
                    details: error,
                  }),
              }),
          }
        },
        catch: (error: any) =>
          new ExpressionError({
            reason: "syntax_error",
            message: String(error.message || error),
            expression: expr,
            details: error,
          }),
      }),
  } as const
}
