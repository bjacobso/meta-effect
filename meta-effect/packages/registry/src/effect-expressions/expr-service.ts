/**
 * Expression Evaluator Service
 *
 * Effect service interface for evaluating expressions safely in Effect programs.
 * Provides typed, sandboxed expression evaluation for gates, conditions, and
 * feature flags. Swap implementations (simple vs CEL) via dependency injection.
 *
 * @example
 * ```ts
 * import { ExpressionEvaluator } from './lib/effect-expressions/expr-service'
 * import { Effect } from 'effect'
 *
 * const program = Effect.gen(function*() {
 *   const evaluator = yield* ExpressionEvaluator
 *
 *   const isCritical = yield* evaluator.evalBoolean(
 *     "severity == 'SEV-1' && customerImpact == true",
 *     { severity: "SEV-1", customerImpact: true }
 *   )
 *
 *   if (isCritical) {
 *     yield* pageExecutives()
 *   }
 * })
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { Context, Effect, Schema as S } from "effect"

/**
 * Expression evaluation error with typed failure reasons
 */
export class ExpressionError extends S.TaggedError<ExpressionError>()(
  "ExpressionError",
  {
    reason: S.Literal("syntax_error", "runtime_error", "type_error"),
    message: S.String,
    expression: S.String,
    position: S.optional(S.Number),
    details: S.optional(S.Unknown),
  },
) {}

/**
 * Compiled expression that can be evaluated multiple times efficiently
 */
export interface CompiledExpression<A> {
  readonly evaluate: (
    context: Record<string, unknown>,
  ) => Effect.Effect<A, ExpressionError>
}

/**
 * Expression evaluator service for safe expression evaluation
 */
export class ExpressionEvaluator extends Context.Tag(
  "ExpressionEvaluator",
)<
  ExpressionEvaluator,
  {
    /**
     * Evaluate expression to boolean value
     */
    readonly evalBoolean: (
      expr: string,
      context: Record<string, unknown>,
    ) => Effect.Effect<boolean, ExpressionError>

    /**
     * Evaluate expression to any value
     */
    readonly eval: <A>(
      expr: string,
      context: Record<string, unknown>,
    ) => Effect.Effect<A, ExpressionError>

    /**
     * Compile expression for efficient reuse
     */
    readonly compile: <A>(
      expr: string,
    ) => Effect.Effect<CompiledExpression<A>, ExpressionError>
  }
>() {}
