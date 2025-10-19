/**
 * Compiler Service
 *
 * Generic interface for all compilers. Defines the contract for compiling
 * from a source schema to a target format with validation and preview.
 *
 * @example
 * ```ts
 * import { Compiler, CompilerError } from './lib/effect-compilers/compiler-service'
 * import { Effect } from 'effect'
 *
 * const myCompiler: Compiler<MySource, MyTarget> = {
 *   compile: (source) => Effect.sync(() => transformToTarget(source)),
 *   validate: (source) => Effect.sync(() => validateSource(source)),
 *   preview: (source) => Effect.sync(() => JSON.stringify(source, null, 2))
 * }
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/**
 * Compiler error with phase tracking
 */
export class CompilerError extends Schema.TaggedError<CompilerError>()(
  "CompilerError",
  {
    phase: Schema.Literal("validation", "compilation", "formatting"),
    message: Schema.String,
    source: Schema.Unknown,
    details: Schema.optional(Schema.Unknown),
  }
) {}

/**
 * Generic compiler interface
 */
export interface Compiler<Source, Target> {
  /**
   * Compile source to target
   */
  readonly compile: (source: Source) => Effect.Effect<Target, CompilerError>;

  /**
   * Validate source without compiling
   */
  readonly validate: (source: Source) => Effect.Effect<void, CompilerError>;

  /**
   * Generate human-readable preview of source
   */
  readonly preview: (source: Source) => Effect.Effect<string, never>;
}
