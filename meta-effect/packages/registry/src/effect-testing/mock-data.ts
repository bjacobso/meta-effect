/**
 * Mock Data Generator
 *
 * Generate type-safe mock data from Effect Schemas for testing.
 * Uses @effect/schema's Arbitrary support to create valid instances
 * that conform to your schema constraints.
 *
 * @example
 * ```ts
 * import { Schema } from 'effect'
 * import { generateMock, generateMockArray } from './lib/effect-testing/mock-data'
 *
 * const User = Schema.Struct({
 *   id: Schema.Number,
 *   email: Schema.String.pipe(Schema.pattern(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)),
 *   name: Schema.NonEmptyString,
 *   age: Schema.Number.pipe(Schema.between(18, 100))
 * })
 *
 * // Generate single mock
 * const user = yield* generateMock(User)
 * // => { id: 42, email: 'test@example.com', name: 'John', age: 25 }
 *
 * // Generate multiple mocks
 * const users = yield* generateMockArray(User, 5)
 * // => [user1, user2, user3, user4, user5]
 *
 * // Generate with overrides
 * const admin = yield* generateMock(User, { name: 'Admin User' })
 * // => { id: 42, email: 'test@example.com', name: 'Admin User', age: 25 }
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { Effect, Schema, ParseResult } from 'effect'
import * as Arbitrary from '@effect/schema/Arbitrary'
import * as fc from 'fast-check'

/**
 * Generate a single mock instance from a Schema
 */
export function generateMock<A, I, R>(
  schema: Schema.Schema<A, I, R>,
  overrides?: Partial<A>
): Effect.Effect<A, never, R> {
  return Effect.sync(() => {
    const arb = Arbitrary.make(schema)
    const generated = fc.sample(arb, 1)[0]
    return overrides ? { ...generated, ...overrides } : generated
  })
}

/**
 * Generate an array of mock instances
 */
export function generateMockArray<A, I, R>(
  schema: Schema.Schema<A, I, R>,
  count: number,
  overrides?: (index: number) => Partial<A>
): Effect.Effect<A[], never, R> {
  return Effect.sync(() => {
    const arb = Arbitrary.make(schema)
    const generated = fc.sample(arb, count)
    return overrides
      ? generated.map((item: A, i: number) => ({ ...item, ...overrides(i) }))
      : generated
  })
}

/**
 * Create a mock factory with pre-configured defaults
 */
export function createMockFactory<A, I, R>(
  schema: Schema.Schema<A, I, R>,
  defaults?: Partial<A>
) {
  return {
    /**
     * Generate a single mock with optional overrides
     */
    create: (overrides?: Partial<A>): Effect.Effect<A, never, R> =>
      generateMock(schema, { ...defaults, ...overrides }),

    /**
     * Generate multiple mocks
     */
    createMany: (
      count: number,
      overrides?: (index: number) => Partial<A>
    ): Effect.Effect<A[], never, R> => {
      return Effect.sync(() => {
        const arb = Arbitrary.make(schema)
        const generated = fc.sample(arb, count)
        return generated.map((item: A, i: number) => ({
          ...defaults,
          ...item,
          ...(overrides ? overrides(i) : {})
        }))
      })
    },

    /**
     * Generate a mock with validation
     */
    createValid: (overrides?: Partial<A>): Effect.Effect<A, ParseResult.ParseError, R> =>
      generateMock(schema, { ...defaults, ...overrides }).pipe(
        Effect.flatMap((data) => Schema.decodeUnknown(schema)(data as unknown))
      )
  }
}

/**
 * Reset effect for deterministic test data
 * Call this in beforeEach to get consistent mocks across test runs
 */
export function seedMockGenerator(seed: number): Effect.Effect<void> {
  return Effect.sync(() => {
    fc.configureGlobal({ seed })
  })
}
